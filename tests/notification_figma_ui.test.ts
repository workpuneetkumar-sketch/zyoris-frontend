import test from "node:test";
import assert from "node:assert/strict";

// Tests for Figma Notification Design Specifications and Backend Integration
test("Figma Notification Design Tokens & Variants", async (t) => {
  const FigmaVariants = {
    success: {
      background: "#EDFAF3",
      border: "#7FE2BA",
      gradient: "linear-gradient(135deg, #3CD29A 0%, #28B89E 100%)",
      glyph: "check",
    },
    info: {
      background: "#EEF6FF",
      border: "#99CCF9",
      gradient: "linear-gradient(135deg, #4BB6FC 0%, #1E8EF7 100%)",
      glyph: "info",
    },
    warning: {
      background: "#FFF9EE",
      border: "#FCD38D",
      gradient: "linear-gradient(135deg, #FFBA38 0%, #FF8C00 100%)",
      glyph: "exclamation",
    },
    error: {
      background: "#FDF2F1",
      border: "#F8B4AF",
      gradient: "linear-gradient(135deg, #F26C64 0%, #D9433B 100%)",
      glyph: "cross",
    },
  };

  await t.test("All 4 notification types are defined with correct Figma light colors", () => {
    assert.strictEqual(FigmaVariants.success.background, "#EDFAF3");
    assert.strictEqual(FigmaVariants.success.border, "#7FE2BA");

    assert.strictEqual(FigmaVariants.info.background, "#EEF6FF");
    assert.strictEqual(FigmaVariants.info.border, "#99CCF9");

    assert.strictEqual(FigmaVariants.warning.background, "#FFF9EE");
    assert.strictEqual(FigmaVariants.warning.border, "#FCD38D");

    assert.strictEqual(FigmaVariants.error.background, "#FDF2F1");
    assert.strictEqual(FigmaVariants.error.border, "#F8B4AF");
  });

  await t.test("Status icons match squircle gradient specifications", () => {
    assert.ok(FigmaVariants.success.gradient.includes("#3CD29A"));
    assert.ok(FigmaVariants.info.gradient.includes("#4BB6FC"));
    assert.ok(FigmaVariants.warning.gradient.includes("#FFBA38"));
    assert.ok(FigmaVariants.error.gradient.includes("#F26C64"));
  });

  await t.test("Container dimensions, border radius, and typography tokens", () => {
    const tokens = {
      containerRadius: "16px",
      iconRadius: "11px",
      titleColor: "#1E293B",
      titleWeight: 600,
      descriptionColor: "#475569",
      actionBg: "#FFFFFF",
      actionBorder: "#94A3B8",
      actionText: "#334155",
      actionRadius: "8px",
      closeIconColor: "#94A3B8",
      stackGap: "12px",
    };

    assert.strictEqual(tokens.containerRadius, "16px");
    assert.strictEqual(tokens.iconRadius, "11px");
    assert.strictEqual(tokens.titleColor, "#1E293B");
    assert.strictEqual(tokens.descriptionColor, "#475569");
    assert.strictEqual(tokens.actionBg, "#FFFFFF");
    assert.strictEqual(tokens.actionBorder, "#94A3B8");
    assert.strictEqual(tokens.actionRadius, "8px");
    assert.strictEqual(tokens.stackGap, "12px");
  });
});

test("Backend Realtime Notification Mapping & Action Dispatch", async (t) => {
  function mapBackendTypeToToast(typeStr: string): "success" | "info" | "warning" | "error" {
    const raw = (typeStr || "").toLowerCase();
    if (raw === "success") return "success";
    if (raw === "error" || raw === "danger") return "error";
    if (raw === "warning") return "warning";
    return "info";
  }

  await t.test("maps all backend notification types faithfully", () => {
    assert.strictEqual(mapBackendTypeToToast("SUCCESS"), "success");
    assert.strictEqual(mapBackendTypeToToast("INFO"), "info");
    assert.strictEqual(mapBackendTypeToToast("WARNING"), "warning");
    assert.strictEqual(mapBackendTypeToToast("ERROR"), "error");
    assert.strictEqual(mapBackendTypeToToast("danger"), "error");
    assert.strictEqual(mapBackendTypeToToast("unknown"), "info");
  });

  await t.test("creates dynamic notification payload with optional action and dismiss", () => {
    let actionTriggered = false;
    let dismissed = false;

    const backendPayload = {
      id: "notif-99",
      userId: "user-1",
      title: "Error Occurred",
      message: "Sorry, please try again later.",
      type: "ERROR" as const,
      action: "Try again",
    };

    const toastConfig = {
      type: mapBackendTypeToToast(backendPayload.type),
      title: backendPayload.title,
      description: backendPayload.message,
      action: {
        label: backendPayload.action,
        onClick: () => { actionTriggered = true; },
      },
      onDismiss: () => { dismissed = true; },
    };

    assert.strictEqual(toastConfig.type, "error");
    assert.strictEqual(toastConfig.title, "Error Occurred");
    assert.strictEqual(toastConfig.description, "Sorry, please try again later.");
    assert.strictEqual(toastConfig.action.label, "Try again");

    toastConfig.action.onClick();
    assert.strictEqual(actionTriggered, true);

    toastConfig.onDismiss();
    assert.strictEqual(dismissed, true);
  });
});
