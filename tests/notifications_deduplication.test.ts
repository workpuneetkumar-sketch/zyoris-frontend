import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeNotificationId,
  deduplicateNotifications,
  mergeNotifications,
  prependNotification,
} from "../utils/notificationDeduplication.ts";

interface MockNotification {
  id: string | number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read?: boolean;
}

test("Notification Deduplication & Synchronization Logic", async (t) => {
  await t.test("normalizeNotificationId normalizes string, number, and trims whitespace", () => {
    assert.strictEqual(normalizeNotificationId("102"), "102");
    assert.strictEqual(normalizeNotificationId(102), "102");
    assert.strictEqual(normalizeNotificationId("  102  "), "102");
    assert.strictEqual(normalizeNotificationId(null), "");
    assert.strictEqual(normalizeNotificationId(undefined), "");
  });

  await t.test("Numeric ID 102 vs string ID '102' must deduplicate correctly", () => {
    const list: MockNotification[] = [
      { id: 102, title: "Lead Created", message: "New lead", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "102", title: "Lead Created", message: "New lead", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "101", title: "Deal Updated", message: "Stage won", type: "SUCCESS", createdAt: "2026-09-22T09:00:00Z" },
    ];

    const result = deduplicateNotifications(list);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(String(result[0].id), "102");
    assert.strictEqual(String(result[1].id), "101");
  });

  await t.test("Duplicate REST result is deduplicated strictly by ID", () => {
    const restBatch: MockNotification[] = [
      { id: "102", title: "Lead 1", message: "Msg 1", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "102", title: "Lead 1 duplicate", message: "Msg 1 dup", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "101", title: "Lead 2", message: "Msg 2", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
    ];

    const result = deduplicateNotifications(restBatch);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result.map((n) => String(n.id)), ["102", "101"]);
  });

  await t.test("Duplicate Socket.IO event does not insert a second copy", () => {
    const current: MockNotification[] = [
      { id: "101", title: "Initial Lead", message: "Msg", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
    ];
    const socketEvent: MockNotification = {
      id: "102",
      title: "New Lead Created",
      message: "Lead added",
      type: "INFO",
      createdAt: "2026-09-22T10:00:00Z",
    };

    // First socket event
    const afterFirst = prependNotification(current, socketEvent);
    assert.strictEqual(afterFirst.length, 2);
    assert.deepStrictEqual(afterFirst.map((n) => String(n.id)), ["102", "101"]);

    // Duplicate socket event with same ID
    const afterSecond = prependNotification(afterFirst, socketEvent);
    assert.strictEqual(afterSecond.length, 2);
    assert.deepStrictEqual(afterSecond.map((n) => String(n.id)), ["102", "101"]);

    // Duplicate socket event with numeric ID 102
    const afterNumeric = prependNotification(afterSecond, { ...socketEvent, id: 102 });
    assert.strictEqual(afterNumeric.length, 2);
    assert.deepStrictEqual(afterNumeric.map((n) => String(n.id)), ["102", "101"]);
  });

  await t.test("Same title/message/type but different IDs must remain separate", () => {
    const items: MockNotification[] = [
      { id: "lead-event-1", title: "Lead Created", message: "New lead added", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "lead-event-2", title: "Lead Created", message: "New lead added", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
    ];

    const result = deduplicateNotifications(items);
    assert.strictEqual(result.length, 2, "Different IDs must never be deduplicated, even with identical fields");
    assert.strictEqual(result[0].id, "lead-event-1");
    assert.strictEqual(result[1].id, "lead-event-2");
  });

  await t.test("REST followed by Socket.IO: state preserves newest-first order without duplicates", () => {
    // Initial REST: [id=101, id=100]
    const initialRest: MockNotification[] = [
      { id: "101", title: "Lead 101", message: "Msg 101", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
      { id: "100", title: "Lead 100", message: "Msg 100", type: "INFO", createdAt: "2026-09-22T08:00:00Z" },
    ];

    // Socket.IO: id=102
    const socketNotification: MockNotification = {
      id: "102",
      title: "Lead 102",
      message: "Msg 102",
      type: "INFO",
      createdAt: "2026-09-22T10:00:00Z",
    };

    const result = prependNotification(initialRest, socketNotification);
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result.map((n) => String(n.id)), ["102", "101", "100"]);
  });

  await t.test("Socket.IO followed by REST: state merges safely and avoids duplicate 102", () => {
    // Socket.IO arrives first: id=102
    const currentWithSocket: MockNotification[] = [
      { id: "102", title: "Lead 102", message: "Msg 102", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
    ];

    // REST returns: [id=102, id=101, id=100]
    const incomingRest: MockNotification[] = [
      { id: "102", title: "Lead 102", message: "Msg 102", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "101", title: "Lead 101", message: "Msg 101", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
      { id: "100", title: "Lead 100", message: "Msg 100", type: "INFO", createdAt: "2026-09-22T08:00:00Z" },
    ];

    const merged = mergeNotifications(incomingRest, currentWithSocket);
    assert.strictEqual(merged.length, 3);
    assert.deepStrictEqual(merged.map((n) => String(n.id)), ["102", "101", "100"]);
  });

  await t.test("Full race condition sequence (A -> B -> C -> D) remains strictly [102, 101, 100]", () => {
    // A. REST returns [101, 100]
    let state: MockNotification[] = deduplicateNotifications([
      { id: "101", title: "Lead 101", message: "Msg", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
      { id: "100", title: "Lead 100", message: "Msg", type: "INFO", createdAt: "2026-09-22T08:00:00Z" },
    ]);
    assert.deepStrictEqual(state.map((n) => String(n.id)), ["101", "100"]);

    // B. Socket emits 102
    const socketNotif: MockNotification = {
      id: "102",
      title: "Lead 102",
      message: "Msg",
      type: "INFO",
      createdAt: "2026-09-22T10:00:00Z",
    };
    state = prependNotification(state, socketNotif);
    assert.deepStrictEqual(state.map((n) => String(n.id)), ["102", "101", "100"]);

    // C. REST refetch returns [102, 101, 100]
    const restRefetch: MockNotification[] = [
      { id: "102", title: "Lead 102", message: "Msg", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "101", title: "Lead 101", message: "Msg", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
      { id: "100", title: "Lead 100", message: "Msg", type: "INFO", createdAt: "2026-09-22T08:00:00Z" },
    ];
    state = mergeNotifications(restRefetch, state);
    assert.deepStrictEqual(state.map((n) => String(n.id)), ["102", "101", "100"]);

    // D. Socket emits 102 again
    state = prependNotification(state, socketNotif);
    assert.deepStrictEqual(state.map((n) => String(n.id)), ["102", "101", "100"]);

    // Verify exactly one instance of each ID
    const idCounts: Record<string, number> = {};
    state.forEach((n) => {
      const id = String(n.id);
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    assert.strictEqual(idCounts["102"], 1);
    assert.strictEqual(idCounts["101"], 1);
    assert.strictEqual(idCounts["100"], 1);
  });

  await t.test("Preserves socket notifications when REST refetch arrives before server persistence/indexing", () => {
    // Current state has realtime event [id=103] and previous items [102, 101]
    const current: MockNotification[] = [
      { id: "103", title: "Realtime Lead", message: "Just arrived", type: "INFO", createdAt: "2026-09-22T11:00:00Z" },
      { id: "102", title: "Lead 102", message: "Msg", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "101", title: "Lead 101", message: "Msg", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
    ];

    // Stale REST refetch only returns [102, 101]
    const staleRest: MockNotification[] = [
      { id: "102", title: "Lead 102", message: "Msg", type: "INFO", createdAt: "2026-09-22T10:00:00Z" },
      { id: "101", title: "Lead 101", message: "Msg", type: "INFO", createdAt: "2026-09-22T09:00:00Z" },
    ];

    const merged = mergeNotifications(staleRest, current);
    assert.strictEqual(merged.length, 3);
    assert.deepStrictEqual(merged.map((n) => String(n.id)), ["103", "102", "101"]);
    assert.strictEqual(String(merged[0].id), "103", "Unpersisted socket notification must remain at top");
  });
});

test("Axios Auto-Notification Endpoint Filtering (Root Cause Fix)", async (t) => {
  const { shouldTriggerAutoNotification } = await import("../lib/api/api.ts");

  await t.test("Allows primary entity creation: POST /leads/create-leads", () => {
    const res = shouldTriggerAutoNotification("POST", "/leads/create-leads");
    assert.strictEqual(res.shouldTrigger, true);
    assert.strictEqual(res.entityName, "Lead");
    assert.strictEqual(res.action, "Created");
  });

  await t.test("Allows primary entity creation: POST /leads", () => {
    const res = shouldTriggerAutoNotification("POST", "/leads");
    assert.strictEqual(res.shouldTrigger, true);
    assert.strictEqual(res.entityName, "Lead");
    assert.strictEqual(res.action, "Created");
  });

  await t.test("Blocks sub-resource action: POST /leads/:id/execute-assignment-rule", () => {
    const res = shouldTriggerAutoNotification("POST", "/leads/cmucr7fw900lcjrsdrvryu0en/execute-assignment-rule");
    assert.strictEqual(res.shouldTrigger, false);
  });

  await t.test("Blocks sub-resource action: POST /leads/assign-lead/:id", () => {
    const res = shouldTriggerAutoNotification("POST", "/leads/assign-lead/cmucr7fw900lcjrsdrvryu0en");
    assert.strictEqual(res.shouldTrigger, false);
  });

  await t.test("Blocks sub-resource action: POST /leads/:id/qualify", () => {
    const res = shouldTriggerAutoNotification("POST", "/leads/cmucr7fw900lcjrsdrvryu0en/qualify");
    assert.strictEqual(res.shouldTrigger, false);
  });

  await t.test("Blocks when explicit x-skip-auto-notification header is provided", () => {
    const res = shouldTriggerAutoNotification(
      "POST",
      "/leads/create-leads",
      { "x-skip-auto-notification": "true" }
    );
    assert.strictEqual(res.shouldTrigger, false);
  });

  await t.test("Allows primary update and delete", () => {
    const updateRes = shouldTriggerAutoNotification("PATCH", "/leads/update-lead/123");
    assert.strictEqual(updateRes.shouldTrigger, true);
    assert.strictEqual(updateRes.entityName, "Lead");
    assert.strictEqual(updateRes.action, "Updated");

    const deleteRes = shouldTriggerAutoNotification("DELETE", "/leads/123");
    assert.strictEqual(deleteRes.shouldTrigger, true);
    assert.strictEqual(deleteRes.entityName, "Lead");
    assert.strictEqual(deleteRes.action, "Deleted");
  });
});

