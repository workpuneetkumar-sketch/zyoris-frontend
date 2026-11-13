import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { SyncRunStatus } from "../types/integrations.ts";

describe("Phase 3 Frontend Sync Contracts & Error Resolution", () => {
  it("removes localStorage fallback from integrationsApi error resolution and exposes Phase 3 schedule/webhook APIs", () => {
    const apiPath = path.resolve(process.cwd(), "lib/api/integrationsApi.ts");
    const content = fs.readFileSync(apiPath, "utf8");

    assert.equal(
      content.includes("zyoris_error_resolutions"),
      false,
      "resolveIntegrationErrorApi must persist exclusively to backend DB, never localStorage",
    );
    assert.ok(content.includes("updateIntegrationScheduleApi"));
    assert.ok(content.includes("getWebhookDeliveriesApi"));
    assert.ok(content.includes("testDispatchWebhookApi"));
    assert.ok(content.includes("direction?: \"INBOUND\" | \"OUTBOUND\" | \"BIDIRECTIONAL\""));
    assert.ok(content.includes("fullSync?: boolean"));
  });

  it("supports QUEUED and PARTIAL_SUCCESS statuses in SyncRunStatus union", () => {
    const queued: SyncRunStatus = "QUEUED";
    const partial: SyncRunStatus = "PARTIAL_SUCCESS";
    assert.equal(queued, "QUEUED");
    assert.equal(partial, "PARTIAL_SUCCESS");
  });
});

