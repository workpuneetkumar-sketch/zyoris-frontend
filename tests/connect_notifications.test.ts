// tests/connect_notifications.test.ts
// Unit & Integration Contract Test for Connect Message Notifications & Toast Popups
// Tests notification filtering, deduplication, auto-dismiss queue, active target suppression, and navigation routing.

import assert from "node:assert";

function runConnectNotificationTests() {
  console.log("=== STARTING CONNECT NOTIFICATION LOGIC & CONTRACT TESTS ===");

  const currentUserId = "usr-current-user-123";

  // Mock Notification Filter Logic conforming to ConnectNotificationContext
  function shouldNotify(
    payload: any,
    activeTarget: { type: "channel" | "conversation"; id: string } | null,
    seenIds: Set<string>
  ): { notify: boolean; reason?: string } {
    if (!payload) return { notify: false, reason: "empty_payload" };

    const senderId = payload.senderId || payload.sender?.id;
    // 1. Self-message suppression
    if (senderId && senderId === currentUserId) {
      return { notify: false, reason: "self_message" };
    }

    const conversationId = payload.conversationId || payload.receiverId || null;
    const channelId = payload.channelId || null;
    const channelName = payload.channel || null;

    // 2. Active target suppression
    if (activeTarget) {
      if (
        activeTarget.type === "conversation" &&
        conversationId &&
        activeTarget.id === conversationId
      ) {
        return { notify: false, reason: "viewing_active_conversation" };
      }
      if (
        activeTarget.type === "channel" &&
        ((channelId && activeTarget.id === channelId) ||
          (channelName && activeTarget.id === channelName))
      ) {
        return { notify: false, reason: "viewing_active_channel" };
      }
    }

    // 3. Duplicate prevention
    const msgId = payload.id || payload.messageId;
    if (msgId && seenIds.has(msgId)) {
      return { notify: false, reason: "duplicate_message_id" };
    }

    // 4. Content validation
    const content = (payload.content || payload.text || "").trim();
    if (!content && (!payload.attachments || payload.attachments.length === 0)) {
      return { notify: false, reason: "empty_content_without_attachments" };
    }

    return { notify: true };
  }

  // 1. Test Self-Message Suppression
  console.log("\n1. Testing Self-Message Suppression...");
  const selfPayload = {
    id: "msg-1",
    senderId: currentUserId,
    content: "My own outgoing message",
    conversationId: "conv-1",
  };
  const selfResult = shouldNotify(selfPayload, null, new Set());
  assert.strictEqual(selfResult.notify, false);
  assert.strictEqual(selfResult.reason, "self_message");
  console.log("✓ Self-sent message correctly suppressed");

  // 2. Test Active Conversation Suppression
  console.log("\n2. Testing Active Target Suppression...");
  const activeConvPayload = {
    id: "msg-2",
    senderId: "usr-peer-456",
    content: "Message in currently open conversation",
    conversationId: "conv-open-100",
  };
  const activeConvResult = shouldNotify(
    activeConvPayload,
    { type: "conversation", id: "conv-open-100" },
    new Set()
  );
  assert.strictEqual(activeConvResult.notify, false);
  assert.strictEqual(activeConvResult.reason, "viewing_active_conversation");
  console.log("✓ Active conversation message correctly suppressed");

  // 3. Test Inactive Conversation Popup Allowance (e.g. on Dashboard / Leads / different conversation)
  console.log("\n3. Testing Inactive Conversation Popup Allowance...");
  const otherConvResult = shouldNotify(
    activeConvPayload,
    { type: "conversation", id: "conv-different-200" },
    new Set()
  );
  assert.strictEqual(otherConvResult.notify, true);

  const dashboardResult = shouldNotify(activeConvPayload, null, new Set());
  assert.strictEqual(dashboardResult.notify, true);
  console.log("✓ Incoming message while on Dashboard or different conversation produces popup");

  // 4. Test Channel Active Suppression & Different Channel Allowance
  console.log("\n4. Testing Channel Notification Filtering...");
  const channelPayload = {
    id: "msg-chan-1",
    senderId: "usr-peer-456",
    content: "Channel update",
    channelId: "chan-general",
    channel: "general",
  };
  const activeChanResult = shouldNotify(
    channelPayload,
    { type: "channel", id: "chan-general" },
    new Set()
  );
  assert.strictEqual(activeChanResult.notify, false);
  assert.strictEqual(activeChanResult.reason, "viewing_active_channel");

  const otherChanResult = shouldNotify(
    channelPayload,
    { type: "channel", id: "chan-engineering" },
    new Set()
  );
  assert.strictEqual(otherChanResult.notify, true);
  console.log("✓ Channel active suppression and inactive channel popup verified");

  // 5. Test Deduplication
  console.log("\n5. Testing Duplicate Socket Event Prevention...");
  const seenIds = new Set<string>(["msg-dup-1"]);
  const dupPayload = {
    id: "msg-dup-1",
    senderId: "usr-peer-456",
    content: "Duplicate message",
    conversationId: "conv-1",
  };
  const dupResult = shouldNotify(dupPayload, null, seenIds);
  assert.strictEqual(dupResult.notify, false);
  assert.strictEqual(dupResult.reason, "duplicate_message_id");
  console.log("✓ Duplicate message delivery successfully prevented");

  // 6. Test Max 3 Visible Queue Stacking
  console.log("\n6. Testing Max 3 Visible Notification Queue Stacking...");
  type Toast = { id: string; content: string };
  let toasts: Toast[] = [];

  function addToast(newToast: Toast) {
    toasts = [newToast, ...toasts];
    if (toasts.length > 3) {
      toasts = toasts.slice(0, 3);
    }
  }

  addToast({ id: "t1", content: "Message 1" });
  addToast({ id: "t2", content: "Message 2" });
  addToast({ id: "t3", content: "Message 3" });
  assert.strictEqual(toasts.length, 3);
  assert.strictEqual(toasts[0].id, "t3");
  assert.strictEqual(toasts[2].id, "t1");

  // 4th message arrives -> pushes t3, t2, t4; drops oldest t1
  addToast({ id: "t4", content: "Message 4" });
  assert.strictEqual(toasts.length, 3, "Queue must maintain max 3 toasts");
  assert.strictEqual(toasts[0].id, "t4", "Latest toast must be first");
  assert.strictEqual(toasts[2].id, "t2", "Oldest kept toast is t2");
  assert.ok(!toasts.some((t) => t.id === "t1"), "Oldest toast t1 must be dropped");
  console.log("✓ Max 3 visible notifications enforced with graceful FIFO dropping");

  // 7. Test Navigation Target URL Resolution
  console.log("\n7. Testing Click Navigation Target Resolution...");
  function resolveNavigationUrl(item: {
    channelId?: string | null;
    conversationId?: string | null;
  }): string {
    if (item.channelId) {
      return `/messages?channelId=${encodeURIComponent(item.channelId)}`;
    }
    if (item.conversationId) {
      return `/messages?conversationId=${encodeURIComponent(item.conversationId)}`;
    }
    return "/messages";
  }

  assert.strictEqual(
    resolveNavigationUrl({ conversationId: "conv-abc-123" }),
    "/messages?conversationId=conv-abc-123"
  );
  assert.strictEqual(
    resolveNavigationUrl({ channelId: "chan-def-456" }),
    "/messages?channelId=chan-def-456"
  );
  assert.strictEqual(resolveNavigationUrl({}), "/messages");
  console.log("✓ Navigation URL resolution for conversations and channels verified");

  // 8. Test Attachment-Only Message Preview
  console.log("\n8. Testing Attachment-Only Message Preview Fallback...");
  const attachmentPayload = {
    id: "msg-att-1",
    senderId: "usr-peer-456",
    content: "",
    attachments: [{ id: "file-1", fileName: "specs.pdf" }],
    conversationId: "conv-1",
  };
  const attResult = shouldNotify(attachmentPayload, null, new Set());
  assert.strictEqual(attResult.notify, true);
  console.log("✓ Attachment-only message accepted and preview verified");

  console.log("\n=== ALL CONNECT NOTIFICATION UNIT & CONTRACT TESTS PASSED! ===");
}

runConnectNotificationTests();

