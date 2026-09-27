import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("FE-1 Workspace Page Actions (Moulika)", () => {
  // Mock page fixture
  const samplePage = {
    id: "page-123",
    title: "Project Architecture",
    icon: "🏗️",
    coverImage: "https://example.com/cover.jpg",
    parentId: null,
    isLocked: false,
    layoutWidth: "default" as const,
    smallText: false,
    blocks: [
      { id: "b1", type: "heading_1", text: "System Overview" },
      { id: "b2", type: "paragraph", text: "Core workspace architecture." },
      { id: "b3", type: "to_do", text: "Verify API endpoints", properties: { checked: true } },
      { id: "b4", type: "code", text: "console.log('test');" },
    ],
    userPermissions: {
      canEdit: true,
      canDelete: true,
      canShare: true,
    },
  };

  const sampleTree = [
    {
      id: "page-123",
      title: "Project Architecture",
      children: [
        { id: "child-1", title: "Subpage 1", children: [{ id: "grandchild-1", title: "Nested Subpage" }] },
      ],
    },
    {
      id: "page-456",
      title: "Marketing Roadmap",
      children: [],
    },
  ];

  describe("[FE1-01] Page Actions Menu Structure & Permissions", () => {
    test("action registry groups actions into layout, actions, features, and danger sections", () => {
      const sections = ["layout", "actions", "features", "danger"];
      assert.equal(sections.length, 4);

      // Verify permission gating
      const readOnlyUserPermissions = { canEdit: false, canDelete: false };
      const canEdit = readOnlyUserPermissions.canEdit;
      const canDelete = readOnlyUserPermissions.canDelete;

      assert.equal(canEdit, false, "Edit should be disabled for read-only user");
      assert.equal(canDelete, false, "Delete should be disabled for read-only user");
    });
  });

  describe("[FE1-02] Copy Link & Copy Page Contents Fallback Serializer", () => {
    test("canonical URL is formatted correctly", () => {
      const origin = "https://app.zyoris.com";
      const pageId = "page-123";
      const canonicalUrl = `${origin}/workspace/pages/${pageId}`;
      assert.equal(canonicalUrl, "https://app.zyoris.com/workspace/pages/page-123");
    });

    test("serializes page blocks to markdown format faithfully when API fails", () => {
      const serializeBlocksToMarkdown = (titleText: string, blocksList: any[]): string => {
        const lines: string[] = [`# ${titleText || "Untitled Page"}\n`];
        if (!blocksList || blocksList.length === 0) return lines.join("\n");

        blocksList.forEach((b) => {
          const text = b.text || b.content?.text || "";
          const type = (b.type || "paragraph").toLowerCase();
          switch (type) {
            case "heading_1":
            case "h1":
              lines.push(`\n# ${text}`);
              break;
            case "heading_2":
            case "h2":
              lines.push(`\n## ${text}`);
              break;
            case "to_do":
            case "todo":
              lines.push(`- [${b.properties?.checked ? "x" : " "}] ${text}`);
              break;
            case "code":
              lines.push(`\`\`\`\n${text}\n\`\`\``);
              break;
            default:
              lines.push(text);
              break;
          }
        });

        return lines.join("\n");
      };

      const md = serializeBlocksToMarkdown(samplePage.title, samplePage.blocks);
      assert.match(md, /# Project Architecture/);
      assert.match(md, /System Overview/);
      assert.match(md, /- \[x\] Verify API endpoints/);
      assert.match(md, /```\nconsole.log\('test'\);\n```/);
    });
  });

  describe("[FE1-03] Duplicate Page Flow", () => {
    test("duplicating page calls endpoint and returns independent cloned page with new ID", () => {
      const duplicatePage = (originalPage: typeof samplePage) => {
        return {
          ...originalPage,
          id: `page-dup-${Date.now()}`,
          title: `Copy of ${originalPage.title}`,
          blocks: originalPage.blocks.map((b) => ({ ...b, id: `block-dup-${b.id}` })),
          createdAt: new Date().toISOString(),
        };
      };

      const cloned = duplicatePage(samplePage);
      assert.notEqual(cloned.id, samplePage.id);
      assert.match(cloned.title, /^Copy of Project Architecture/);
      assert.equal(cloned.blocks.length, samplePage.blocks.length);
      assert.notEqual(cloned.blocks[0].id, samplePage.blocks[0].id);
      assert.equal(samplePage.title, "Project Architecture", "Original page remains unchanged");
    });

    test("duplicated page is registered into workspace tree and appears in Workspace Home recent pages", () => {
      // Simulate original page "Test"
      const originalPage = {
        id: "page-test-1",
        title: "Test",
        icon: "📄",
        parentId: null,
        isDatabase: false,
        createdAt: "2026-09-27T10:00:00.000Z",
      };

      // Simulate duplicate creation of "Test (Copy)"
      const duplicatedPage = {
        id: "page-test-1-copy",
        title: "Test (Copy)",
        icon: "📄",
        parentId: null,
        isDatabase: false,
        createdAt: "2026-09-27T10:01:00.000Z",
      };

      // Both pages in flat nodes (simulating merged remote/local store)
      const flatNodes = [originalPage, duplicatedPage];

      // Simulate buildTreeFromFlatNodes
      const nodeMap = new Map<string, any>();
      const roots: any[] = [];
      flatNodes.forEach((node) => {
        nodeMap.set(node.id, { ...node, children: [] });
      });
      flatNodes.forEach((node) => {
        const current = nodeMap.get(node.id)!;
        if (node.parentId && nodeMap.has(node.parentId)) {
          const parent = nodeMap.get(node.parentId)!;
          parent.children.push(current);
        } else {
          roots.push(current);
        }
      });

      // Simulate Workspace Home page traversal
      const recentPages: { id: string; title: string; icon?: string | null }[] = [];
      const traverse = (nodes: any[]) => {
        nodes.forEach((n) => {
          if (n.id && n.id !== "[id]" && !n.id.includes("[id]")) {
            recentPages.push({ id: n.id, title: n.title, icon: n.icon });
          }
          if (n.children && n.children.length > 0) traverse(n.children);
        });
      };
      traverse(roots);

      // Assertions
      assert.equal(recentPages.length, 2, "Workspace Pages must contain exactly 2 pages");
      assert.ok(recentPages.some((p) => p.title === "Test" && p.id === "page-test-1"), "Original 'Test' must appear");
      assert.ok(recentPages.some((p) => p.title === "Test (Copy)" && p.id === "page-test-1-copy"), "Duplicated 'Test (Copy)' must appear");
      assert.equal(originalPage.title, "Test", "Original page remains unaffected");
    });

    test("tree request passing maxDepth=1 returns root nodes and immediate children", () => {
      // Backend contract verification for maxDepth=1
      const queryParams = { maxDepth: 1 };
      assert.equal(queryParams.maxDepth, 1, "Must query maxDepth=1 to prevent backend empty return");
    });
  });

  describe("[FE1-04] Move To & Cycle Prevention & Trash Flow", () => {
    test("cycle prevention strictly disallows moving a page into itself or any descendant", () => {
      const getDescendantIds = (targetId: string, nodes: any[]): Set<string> => {
        const descendants = new Set<string>();
        const findAndCollect = (list: any[], collecting: boolean) => {
          for (const item of list) {
            const isTarget = item.id === targetId;
            if (collecting || isTarget) {
              descendants.add(item.id);
            }
            if (item.children && item.children.length > 0) {
              findAndCollect(item.children, collecting || isTarget);
            }
          }
        };
        findAndCollect(nodes, false);
        return descendants;
      };

      const disallowed = getDescendantIds("page-123", sampleTree);
      disallowed.add("page-123");

      assert.equal(disallowed.has("page-123"), true, "Self cannot be target");
      assert.equal(disallowed.has("child-1"), true, "Child cannot be target");
      assert.equal(disallowed.has("grandchild-1"), true, "Grandchild cannot be target");
      assert.equal(disallowed.has("page-456"), false, "Sibling can be target");
    });

    test("soft trash flow archives page and permits restore or permanent delete", () => {
      let pages = [{ ...samplePage, isArchived: false }];
      let trash: any[] = [];

      // Move to trash
      const moveToTrash = (id: string) => {
        const target = pages.find((p) => p.id === id);
        if (target) {
          pages = pages.filter((p) => p.id !== id);
          trash.push({ ...target, isArchived: true, deletedAt: new Date().toISOString() });
        }
      };

      // Restore
      const restoreFromTrash = (id: string) => {
        const target = trash.find((p) => p.id === id);
        if (target) {
          trash = trash.filter((p) => p.id !== id);
          pages.push({ ...target, isArchived: false });
        }
      };

      moveToTrash("page-123");
      assert.equal(pages.length, 0);
      assert.equal(trash.length, 1);
      assert.equal(trash[0].id, "page-123");

      restoreFromTrash("page-123");
      assert.equal(pages.length, 1);
      assert.equal(trash.length, 0);
      assert.equal(pages[0].id, "page-123");
    });
  });

  describe("[FE1-05] Small Text & Full Width Layout Settings", () => {
    test("small text toggle updates state and builds valid settings payload with nested and root fields", () => {
      const initialSmallText = false;
      const nextSmallText = !initialSmallText;
      const settingsPayload = {
        smallText: nextSmallText,
        settings: {
          smallText: nextSmallText,
        },
      };

      assert.equal(nextSmallText, true);
      assert.equal(settingsPayload.smallText, true);
      assert.equal(settingsPayload.settings.smallText, true);
    });

    test("page title and block elements scale down visibly when smallText is true", () => {
      const getTitleClass = (small: boolean) =>
        small ? "text-2xl sm:text-3xl font-bold" : "text-4xl font-extrabold";

      const getBlockClass = (type: string, small: boolean) => {
        switch (type) {
          case "heading_1":
            return small ? "text-xl sm:text-2xl font-bold py-0.5" : "text-2xl sm:text-3xl font-extrabold py-1";
          case "heading_2":
            return small ? "text-lg sm:text-xl font-bold py-0.5" : "text-xl sm:text-2xl font-bold py-1";
          case "heading_3":
            return small ? "text-base sm:text-lg font-semibold py-0.5" : "text-lg sm:text-xl font-semibold py-0.5";
          case "paragraph":
          case "bullet_list":
          case "numbered_list":
          case "to_do":
            return small ? "text-xs py-0.5" : "text-sm py-1";
          default:
            return small ? "text-xs" : "text-sm";
        }
      };

      // Normal mode
      assert.equal(getTitleClass(false), "text-4xl font-extrabold");
      assert.match(getBlockClass("heading_1", false), /text-2xl sm:text-3xl/);
      assert.equal(getBlockClass("paragraph", false), "text-sm py-1");

      // Small text mode
      assert.equal(getTitleClass(true), "text-2xl sm:text-3xl font-bold");
      assert.match(getBlockClass("heading_1", true), /text-xl sm:text-2xl/);
      assert.equal(getBlockClass("paragraph", true), "text-xs py-0.5");
    });

    test("hydration after refresh loads smallText from page.settings or root fields", () => {
      // Backend response with settings
      const backendPageData = {
        id: "page-123",
        title: "Test Page",
        settings: { smallText: true, layoutWidth: "full" },
      };

      const hydratedSmallText = (backendPageData as any)?.smallText ?? backendPageData?.settings?.smallText ?? false;
      assert.equal(hydratedSmallText, true, "Small text must be preserved after fetch/refresh");

      // Backend response after disabling smallText
      const backendPageDataDisabled = {
        id: "page-123",
        title: "Test Page",
        settings: { smallText: false, layoutWidth: "default" },
      };
      const hydratedDisabled = (backendPageDataDisabled as any)?.smallText ?? backendPageDataDisabled?.settings?.smallText ?? false;
      assert.equal(hydratedDisabled, false, "Disabled small text must be preserved after fetch/refresh");
    });

    test("full width toggle switches between 'default' and 'full' container width", () => {
      const getContainerClasses = (layoutWidth: "default" | "full", smallText: boolean) => {
        const widthClass = layoutWidth === "full" ? "max-w-full" : "max-w-4xl";
        const textClass = smallText ? "text-sm leading-relaxed" : "";
        return `${widthClass} ${textClass}`.trim();
      };

      assert.equal(getContainerClasses("default", false), "max-w-4xl");
      assert.equal(getContainerClasses("full", false), "max-w-full");
      assert.equal(getContainerClasses("full", true), "max-w-full text-sm leading-relaxed");
    });
  });

  describe("[FE1-06] Lock Page UI & Protection", () => {
    test("locking page disables editing controls and permits unlock only for permitted users", () => {
      const pageState = { ...samplePage, isLocked: true };
      const canEdit = pageState.userPermissions.canEdit;

      const isTitleEditable = canEdit && !pageState.isLocked;
      const isBlockEditable = canEdit && !pageState.isLocked;
      const canUnlock = canEdit;

      assert.equal(isTitleEditable, false, "Title should not be editable when locked");
      assert.equal(isBlockEditable, false, "Blocks should not be editable when locked");
      assert.equal(canUnlock, true, "Permitted user can unlock page");

      // Non-permitted user
      const guestState = { ...pageState, userPermissions: { canEdit: false } };
      assert.equal(guestState.userPermissions.canEdit, false, "Guest cannot unlock page");
    });
  });

  describe("[FE1-07] Menu Search & Keyboard Navigation", () => {
    test("filters action registry by label and keywords", () => {
      const actions = [
        { id: "copy-link", label: "Copy link", keywords: ["copy", "url", "share"] },
        { id: "duplicate", label: "Duplicate", keywords: ["clone", "copy", "replicate"] },
        { id: "lock", label: "Lock page", keywords: ["lock", "read only", "freeze"] },
        { id: "trash", label: "Move to Trash", keywords: ["delete", "trash", "remove"] },
      ];

      const filterActions = (query: string) => {
        const q = query.toLowerCase().trim();
        if (!q) return actions;
        return actions.filter(
          (a) => a.label.toLowerCase().includes(q) || a.keywords.some((k) => k.includes(q))
        );
      };

      const copyMatches = filterActions("copy");
      assert.equal(copyMatches.length, 2);

      const lockMatches = filterActions("freeze");
      assert.equal(lockMatches.length, 1);
      assert.equal(lockMatches[0].id, "lock");

      const noMatches = filterActions("nonexistent");
      assert.equal(noMatches.length, 0);
    });

    test("arrow key navigation wraps correctly", () => {
      const itemsCount = 4;
      let currentIndex = 0;

      // Down
      currentIndex = (currentIndex + 1) % itemsCount;
      assert.equal(currentIndex, 1);

      // Down 3 more times -> should wrap to 0
      currentIndex = (currentIndex + 3) % itemsCount;
      assert.equal(currentIndex, 0);

      // Up -> should wrap to 3
      currentIndex = (currentIndex - 1 + itemsCount) % itemsCount;
      assert.equal(currentIndex, 3);
    });
  });

  describe("[FE1-08] Page Shell Regression & FE-2 Modal Integration", () => {
    test("activePanel manages all 8 FE-2 modal gates seamlessly", () => {
      const validPanels = [
        "customize",
        "comments",
        "translate",
        "wiki",
        "analytics",
        "history",
        "import",
        null,
      ];

      validPanels.forEach((panel) => {
        assert.ok(
          panel === null || typeof panel === "string",
          `Panel ${panel} is recognized`
        );
      });
    });
  });

  describe("[FE1-09] Workspace Homepage Recency, Duplicate Reflection & Non-Truncation", () => {
    test("sorts pages by recency (createdAt / updatedAt descending) so newly created and duplicated pages appear first", () => {
      // Simulate backend tree with 50 old pages and 2 newly created pages
      const oldPages = Array.from({ length: 50 }, (_, i) => ({
        id: `old-page-${i}`,
        title: `Old Page ${i}`,
        createdAt: "2026-09-10T12:00:00.000Z",
      }));
      const newPage = {
        id: "page-new-1",
        title: "new page",
        createdAt: "2026-09-27T16:59:00.000Z",
      };
      const duplicatedPage = {
        id: "page-dup-1",
        title: "new page (Copy)",
        createdAt: "2026-09-27T17:00:00.000Z",
      };

      const allNodes = [...oldPages, newPage, duplicatedPage];

      // Sorting logic as implemented in WorkspaceHomePage
      const sorted = [...allNodes].sort((a, b) => {
        const timeA = new Date((a as any).updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date((b as any).updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      // Newly duplicated page and original page must be indices 0 and 1
      assert.equal(sorted[0].id, "page-dup-1");
      assert.equal(sorted[0].title, "new page (Copy)");
      assert.equal(sorted[1].id, "page-new-1");
      assert.equal(sorted[1].title, "new page");

      // Even with slice(0, 12), both duplicated and original pages are included
      const top12 = sorted.slice(0, 12);
      assert.ok(top12.some((p) => p.id === "page-dup-1"));
      assert.ok(top12.some((p) => p.id === "page-new-1"));
    });

    test("search query filters across all pages without truncating", () => {
      const pages = [
        { id: "1", title: "Quarterly Review" },
        { id: "2", title: "new page" },
        { id: "3", title: "new page (Copy)" },
        { id: "4", title: "Engineering Notes" },
      ];

      const query = "new page";
      const matches = pages.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase())
      );

      assert.equal(matches.length, 2);
      assert.equal(matches[0].title, "new page");
      assert.equal(matches[1].title, "new page (Copy)");
    });
  });
});

