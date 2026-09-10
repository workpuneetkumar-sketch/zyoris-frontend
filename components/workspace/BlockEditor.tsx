"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { WorkspaceBlock, ReorderBlockItem, BlockFormatting } from "@/types/workspace";
import {
  createWorkspaceBlock,
  updateWorkspaceBlock,
  deleteWorkspaceBlock,
  reorderWorkspaceBlocks,
} from "@/lib/api/workspaceApi";
import { SlashMenu } from "./SlashMenu";
import { FormattingToolbar } from "./FormattingToolbar";
import {
  GripVertical,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Quote,
  Code,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface BlockEditorProps {
  pageId: string;
  initialBlocks?: WorkspaceBlock[];
  canEdit?: boolean;
}

type SaveStatus = "saved" | "saving" | "error";

export const BlockEditor: React.FC<BlockEditorProps> = ({
  pageId,
  initialBlocks = [],
  canEdit = true,
}) => {
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>(initialBlocks);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [activeSlashIndex, setActiveSlashIndex] = useState<number | null>(null);
  const [slashQuery, setSlashQuery] = useState<string>("");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // Debounce timers & version map for autosave
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const currentVersionRef = useRef<Record<string, number>>({});

  // Sync initial blocks if changed externally
  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0) {
      setBlocks(
        [...initialBlocks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      );
    }
  }, [initialBlocks]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /* BLOCK CREATION                                                             */
  /* -------------------------------------------------------------------------- */
  const handleCreateBlock = async (type: string = "paragraph", index?: number) => {
    const targetIdx = index !== undefined ? index : blocks.length;
    const prevPos = targetIdx > 0 ? blocks[targetIdx - 1]?.position ?? (targetIdx - 1) * 10 : 0;
    const nextPos = targetIdx < blocks.length ? blocks[targetIdx]?.position ?? (targetIdx + 1) * 10 : prevPos + 20;
    const newPosition = (prevPos + nextPos) / 2 || (targetIdx + 1) * 10;

    const tempId = `temp-${Date.now()}`;
    const newBlockDraft: WorkspaceBlock = {
      id: tempId,
      pageId,
      type,
      text: "",
      position: newPosition,
      createdAt: new Date().toISOString(),
    };

    setBlocks((prev) => {
      const nextArr = [...prev];
      nextArr.splice(targetIdx, 0, newBlockDraft);
      return nextArr;
    });

    setFocusedIndex(targetIdx);

    try {
      setSaveStatus("saving");
      const savedBlock = await createWorkspaceBlock(pageId, {
        type,
        text: "",
        position: newPosition,
      });

      setBlocks((prev) =>
        prev.map((b) => (b.id === tempId ? { ...savedBlock, position: newPosition } : b))
      );
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to create block:", err);
      setSaveStatus("error");
    }
  };

  /* -------------------------------------------------------------------------- */
  /* BLOCK EDITING & DEBOUNCED AUTOSAVE                                         */
  /* -------------------------------------------------------------------------- */
  const triggerAutosave = useCallback(
    (blockId: string, updatedFields: Partial<WorkspaceBlock>) => {
      if (blockId.startsWith("temp-")) return;

      const newVer = (currentVersionRef.current[blockId] || 0) + 1;
      currentVersionRef.current[blockId] = newVer;

      setSaveStatus("saving");

      if (saveTimersRef.current[blockId]) {
        clearTimeout(saveTimersRef.current[blockId]);
      }

      saveTimersRef.current[blockId] = setTimeout(async () => {
        try {
          if (currentVersionRef.current[blockId] > newVer) {
            return;
          }

          await updateWorkspaceBlock(pageId, blockId, {
            type: updatedFields.type,
            text: updatedFields.text,
            content: updatedFields.content,
            properties: updatedFields.properties,
            parentBlockId: updatedFields.parentBlockId || updatedFields.parentId,
            position: updatedFields.position,
          });

          setSaveStatus("saved");
        } catch (err) {
          console.error(`Failed to autosave block ${blockId}:`, err);
          setSaveStatus("error");
        }
      }, 750); // 750ms debounce
    },
    [pageId]
  );

  const handleRetryAutosave = async () => {
    if (!pageId || pageId === "[id]") return;
    setSaveStatus("saving");
    try {
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.id.startsWith("temp-")) {
          const saved = await createWorkspaceBlock(pageId, {
            type: b.type,
            text: b.text || "",
            position: b.position,
          });
          setBlocks((prev) => prev.map((item, idx) => (idx === i ? saved : item)));
        } else {
          await updateWorkspaceBlock(pageId, b.id, {
            type: b.type,
            text: b.text || "",
            content: b.content,
            properties: b.properties,
            position: b.position,
          });
        }
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Retry autosave failed:", err);
      setSaveStatus("error");
    }
  };

  const handleUpdateBlockText = (index: number, newText: string) => {
    const targetBlock = blocks[index];
    if (!targetBlock) return;

    if (newText.startsWith("/")) {
      setActiveSlashIndex(index);
      setSlashQuery(newText.slice(1));
    } else if (activeSlashIndex === index) {
      setActiveSlashIndex(null);
      setSlashQuery("");
    }

    setBlocks((prev) => {
      const nextArr = [...prev];
      nextArr[index] = { ...nextArr[index], text: newText };
      return nextArr;
    });

    triggerAutosave(targetBlock.id, { ...targetBlock, text: newText });
  };

  const handleApplyFormatting = (index: number, updates: Partial<BlockFormatting>) => {
    const targetBlock = blocks[index];
    if (!targetBlock) return;

    const newFormatting = { ...targetBlock.formatting, ...updates };

    setBlocks((prev) => {
      const nextArr = [...prev];
      nextArr[index] = { ...nextArr[index], formatting: newFormatting };
      return nextArr;
    });

    triggerAutosave(targetBlock.id, {
      ...targetBlock,
      properties: { ...targetBlock.properties, formatting: newFormatting },
    });
  };

  const handleUpdateBlockType = (index: number, newType: string) => {
    const targetBlock = blocks[index];
    if (!targetBlock) return;

    const cleanedText = targetBlock.text?.replace(/^\/[a-z0-9]*/i, "") || "";

    setBlocks((prev) => {
      const nextArr = [...prev];
      nextArr[index] = { ...nextArr[index], type: newType, text: cleanedText };
      return nextArr;
    });

    setActiveSlashIndex(null);
    setSlashQuery("");

    triggerAutosave(targetBlock.id, {
      ...targetBlock,
      type: newType,
      text: cleanedText,
    });
  };

  const handleToggleCheckbox = (index: number) => {
    const targetBlock = blocks[index];
    if (!targetBlock) return;

    const currentChecked = !!targetBlock.properties?.checked;
    const newProperties = { ...targetBlock.properties, checked: !currentChecked };

    setBlocks((prev) => {
      const nextArr = [...prev];
      nextArr[index] = { ...nextArr[index], properties: newProperties };
      return nextArr;
    });

    triggerAutosave(targetBlock.id, { ...targetBlock, properties: newProperties });
  };

  /* -------------------------------------------------------------------------- */
  /* BLOCK DELETION                                                             */
  /* -------------------------------------------------------------------------- */
  const handleDeleteBlock = async (index: number) => {
    const targetBlock = blocks[index];
    if (!targetBlock) return;

    setBlocks((prev) => prev.filter((_, i) => i !== index));

    if (targetBlock.id.startsWith("temp-")) return;

    try {
      setSaveStatus("saving");
      await deleteWorkspaceBlock(pageId, targetBlock.id);
      setSaveStatus("saved");
    } catch (err) {
      console.error(`Failed to delete block ${targetBlock.id}:`, err);
      setSaveStatus("error");
    }
  };

  /* -------------------------------------------------------------------------- */
  /* REORDER / DRAG AND DROP (FLOAT POSITIONS)                                 */
  /* -------------------------------------------------------------------------- */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const nextArr = [...blocks];
    const [movedBlock] = nextArr.splice(draggedIndex, 1);
    nextArr.splice(dropIndex, 0, movedBlock);

    // Float position generation according to Swagger specification
    const reorderedWithFloats: WorkspaceBlock[] = nextArr.map((blk, idx) => {
      const floatPos = (idx + 1) * 10.0;
      return { ...blk, position: floatPos };
    });

    setBlocks(reorderedWithFloats);
    setDraggedIndex(null);
    setDragOverIndex(null);

    const reorderPayload: ReorderBlockItem[] = reorderedWithFloats.map((b) => ({
      id: b.id,
      position: b.position!,
      parentBlockId: b.parentBlockId || b.parentId,
    }));

    try {
      setSaveStatus("saving");
      await reorderWorkspaceBlocks(pageId, reorderPayload);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to persist block reordering:", err);
      setSaveStatus("error");
    }
  };

  /* -------------------------------------------------------------------------- */
  /* KEYBOARD NAVIGATION (Enter, Backspace, Tab)                                */
  /* -------------------------------------------------------------------------- */
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (activeSlashIndex === index) return;
      e.preventDefault();
      handleCreateBlock("paragraph", index + 1);
    } else if (e.key === "Backspace" && (blocks[index]?.text === "" || blocks[index]?.text === undefined)) {
      if (blocks.length > 1) {
        e.preventDefault();
        handleDeleteBlock(index);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const targetBlock = blocks[index];
      if (!targetBlock) return;
      if (!e.shiftKey && index > 0) {
        const potentialParent = blocks[index - 1];
        const newParentId = potentialParent.id;
        setBlocks((prev) => {
          const nextArr = [...prev];
          nextArr[index] = { ...nextArr[index], parentBlockId: newParentId, parentId: newParentId };
          return nextArr;
        });
        triggerAutosave(targetBlock.id, { ...targetBlock, parentBlockId: newParentId });
      } else if (e.shiftKey) {
        setBlocks((prev) => {
          const nextArr = [...prev];
          nextArr[index] = { ...nextArr[index], parentBlockId: null, parentId: null };
          return nextArr;
        });
        triggerAutosave(targetBlock.id, { ...targetBlock, parentBlockId: null });
      }
    }
  };

  return (
    <div className="relative space-y-2" ref={editorRef}>
      {/* Floating Selection Formatting Toolbar */}
      {focusedIndex !== null && blocks[focusedIndex] && canEdit && (
        <FormattingToolbar
          formatting={blocks[focusedIndex].formatting}
          onApplyFormatting={(updates) => handleApplyFormatting(focusedIndex, updates)}
          containerRef={editorRef}
        />
      )}

      {/* Autosave Status Header Badge */}
      <div className="flex items-center justify-between pb-3 text-xs border-b border-slate-100 dark:border-slate-800">
        <span className="text-slate-400 font-medium">
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </span>

        <div className="flex items-center space-x-2">
          {saveStatus === "saving" && (
            <span className="inline-flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900/50 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span className="inline-flex items-center space-x-1.5 text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Unable to save</span>
              <button
                type="button"
                onClick={handleRetryAutosave}
                className="ml-1 inline-flex items-center space-x-1 text-xs font-bold underline hover:text-red-800 dark:hover:text-red-200 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Render Blocks List */}
      <div className="space-y-1 pt-2 min-h-[250px]">
        {blocks.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-400 mb-3">No blocks on this page yet.</p>
            <button
              type="button"
              onClick={() => handleCreateBlock("paragraph", 0)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add first block</span>
            </button>
          </div>
        ) : (
          blocks.map((block, index) => {
            const isIndented = !!(block.parentBlockId || block.parentId);
            const isDragged = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={block.id || index}
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onFocus={() => setFocusedIndex(index)}
                className={`group relative flex items-start space-x-2 rounded-xl px-2 py-1 transition-all ${
                  isIndented ? "ml-6 border-l-2 border-slate-200 dark:border-slate-700 pl-3" : ""
                } ${isDragged ? "opacity-40 bg-blue-50 dark:bg-blue-950/30" : ""} ${
                  isDragOver ? "border-t-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" : ""
                }`}
              >
                {/* Drag Handle & Plus Menu */}
                {canEdit && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 pt-1.5 flex-shrink-0 transition">
                    <button
                      type="button"
                      onClick={() => handleCreateBlock("paragraph", index + 1)}
                      title="Add block below"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="cursor-grab text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 p-0.5">
                      <GripVertical className="w-4 h-4" />
                    </span>
                  </div>
                )}

                {/* Block Content Input based on Type */}
                <div className="flex-1 min-w-0">
                  {renderBlockInput(
                    block,
                    index,
                    handleUpdateBlockText,
                    handleToggleCheckbox,
                    handleKeyDown,
                    canEdit
                  )}

                  {/* Slash Menu Popup */}
                  {activeSlashIndex === index && (
                    <SlashMenu
                      isOpen={true}
                      filterText={slashQuery}
                      onSelect={(newType) => handleUpdateBlockType(index, newType)}
                      onClose={() => setActiveSlashIndex(null)}
                    />
                  )}
                </div>

                {/* Delete button */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(index)}
                    title="Delete block"
                    className="opacity-0 group-hover:opacity-100 p-1.5 pt-2 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom quick add button */}
      {canEdit && blocks.length > 0 && (
        <div className="pt-4">
          <button
            type="button"
            onClick={() => handleCreateBlock("paragraph")}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition w-full"
          >
            <Plus className="w-4 h-4" />
            <span>Click to add a block or press Enter</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* Helper function to render editable inputs per block type with inline formatting and interactive URL links */
function renderBlockInput(
  block: WorkspaceBlock,
  index: number,
  onChangeText: (index: number, val: string) => void,
  onToggleCheck: (index: number) => void,
  onKeyDown: (e: React.KeyboardEvent, index: number) => void,
  canEdit: boolean
) {
  const type = block.type ? block.type.toLowerCase() : "paragraph";
  const text = block.text ?? (typeof block.content === "string" ? block.content : "");
  const fmt = block.formatting || {};

  // Extract URL target if formatting link exists or text itself is a URL
  const extractUrl = (rawText: string): string | null => {
    if (fmt.link) return fmt.link;
    const trimmed = rawText.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (trimmed.startsWith("www.") || /^[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  };

  const detectedUrl = extractUrl(text);

  const getFormatClasses = () => {
    let classes = "";
    if (fmt.bold) classes += " font-bold";
    if (fmt.italic) classes += " italic";
    if (fmt.underline) classes += " underline";
    if (fmt.strikethrough) classes += " line-through";
    if (fmt.code) classes += " font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-pink-500";
    return classes;
  };

  switch (type) {
    case "heading_1":
    case "h1":
      return (
        <input
          type="text"
          value={text}
          disabled={!canEdit}
          onChange={(e) => onChangeText(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, index)}
          placeholder="Heading 1..."
          className={`w-full bg-transparent text-2xl font-extrabold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none py-1 ${getFormatClasses()}`}
        />
      );

    case "heading_2":
    case "h2":
      return (
        <input
          type="text"
          value={text}
          disabled={!canEdit}
          onChange={(e) => onChangeText(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, index)}
          placeholder="Heading 2..."
          className={`w-full bg-transparent text-xl font-bold text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none py-1 ${getFormatClasses()}`}
        />
      );

    case "heading_3":
    case "h3":
      return (
        <input
          type="text"
          value={text}
          disabled={!canEdit}
          onChange={(e) => onChangeText(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, index)}
          placeholder="Heading 3..."
          className={`w-full bg-transparent text-lg font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none py-0.5 ${getFormatClasses()}`}
        />
      );

    case "bulleted_list_item":
    case "bullet_list":
      return (
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-bold select-none text-base">•</span>
          <input
            type="text"
            value={text}
            disabled={!canEdit}
            onChange={(e) => onChangeText(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            placeholder="List item..."
            className={`w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-none py-1 ${getFormatClasses()}`}
          />
        </div>
      );

    case "numbered_list_item":
    case "numbered_list":
      return (
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-semibold select-none text-xs w-4">{index + 1}.</span>
          <input
            type="text"
            value={text}
            disabled={!canEdit}
            onChange={(e) => onChangeText(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            placeholder="Numbered list item..."
            className={`w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-none py-1 ${getFormatClasses()}`}
          />
        </div>
      );

    case "to_do":
    case "todo":
    case "checkbox":
      const isChecked = !!block.properties?.checked;
      return (
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => onToggleCheck(index)}
            className="p-0.5 rounded text-slate-400 hover:text-blue-600"
          >
            {isChecked ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <input
            type="text"
            value={text}
            disabled={!canEdit}
            onChange={(e) => onChangeText(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            placeholder="To-do task..."
            className={`w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-none py-1 ${
              isChecked ? "line-through text-slate-400" : ""
            } ${getFormatClasses()}`}
          />
        </div>
      );

    case "quote":
      return (
        <div className="flex items-center space-x-2 pl-3 border-l-4 border-slate-300 dark:border-slate-600 py-1 bg-slate-50/60 dark:bg-slate-800/40 rounded-r-lg">
          <Quote className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={text}
            disabled={!canEdit}
            onChange={(e) => onChangeText(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            placeholder="Empty quote..."
            className={`w-full bg-transparent text-sm italic text-slate-700 dark:text-slate-300 focus:outline-none ${getFormatClasses()}`}
          />
        </div>
      );

    case "code":
      return (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1.5 mb-2">
            <span className="flex items-center space-x-1">
              <Code className="w-3.5 h-3.5" />
              <span>Code Block</span>
            </span>
          </div>
          <textarea
            value={text}
            disabled={!canEdit}
            onChange={(e) => onChangeText(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            placeholder="// Type code here..."
            rows={3}
            className="w-full bg-transparent text-slate-100 focus:outline-none resize-y font-mono text-xs leading-relaxed"
          />
        </div>
      );

    case "divider":
      return (
        <div className="py-2">
          <hr className="border-slate-200 dark:border-slate-700" />
        </div>
      );

    case "link":
      return (
        <div className="flex items-center justify-between space-x-2 p-2 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <input
              type="text"
              value={text}
              disabled={!canEdit}
              onChange={(e) => onChangeText(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              placeholder="Link text or https://..."
              className="w-full bg-transparent text-xs text-blue-600 dark:text-blue-400 font-semibold focus:outline-none underline decoration-blue-300"
            />
          </div>
          {detectedUrl && (
            <a
              href={detectedUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex-shrink-0 shadow-xs transition"
              title={`Open ${detectedUrl}`}
            >
              <span>Open Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );

    default:
      return (
        <div className="flex items-center space-x-2 w-full">
          <input
            type="text"
            value={text}
            disabled={!canEdit}
            onChange={(e) => onChangeText(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            placeholder="Type '/' for commands..."
            className={`w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none py-1 ${getFormatClasses()}`}
          />
          {detectedUrl && (
            <a
              href={detectedUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 hover:underline rounded text-xs font-medium flex-shrink-0"
              title={`Open ${detectedUrl}`}
            >
              <span>Link ↗</span>
            </a>
          )}
        </div>
      );
  }
}
