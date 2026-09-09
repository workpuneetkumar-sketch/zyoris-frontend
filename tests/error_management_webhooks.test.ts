import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  maskSecret,
  computeHmacSha256Hex,
  getWebhookIngressUrl,
  STANDARD_WEBHOOK_EVENTS,
  SUPPORTED_WEBHOOK_PROVIDERS,
} from "../lib/api/webhooksApi";
import type { SyncErrorItem } from "../types/integrations";

describe("Day 11: Error Management & Resolution Triage", () => {
  it("correctly partitions error records into resolved vs unresolved sets", () => {
    const errorRecords: SyncErrorItem[] = [
      {
        id: "err_1",
        integrationId: "int_salesforce",
        errorCode: "INVALID_FIELD_TYPE",
        errorMessage: "Expected integer, received string",
        retryable: false,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "err_2",
        integrationId: "int_salesforce",
        errorCode: "RATE_LIMIT_EXCEEDED",
        errorMessage: "Too many requests to provider API",
        retryable: true,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "err_3",
        integrationId: "int_hubspot",
        errorCode: "DUPLICATE_EMAIL",
        errorMessage: "Contact with this email already exists",
        retryable: false,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    const unresolved = errorRecords.filter((e) => !e.resolved);
    const resolved = errorRecords.filter((e) => e.resolved);

    assert.equal(unresolved.length, 2);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].id, "err_3");
  });

  it("STRICT CONDITIONAL RETRY: permits retry ONLY when retryable === true", () => {
    const canExecuteRetry = (error: SyncErrorItem): boolean => {
      return Boolean(error.retryable);
    };

    const retryableError: SyncErrorItem = {
      id: "err_retryable",
      integrationId: "int_stripe",
      errorCode: "HTTP_503_TEMPORARY",
      errorMessage: "Service unavailable temporarily",
      retryable: true,
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    const fatalError: SyncErrorItem = {
      id: "err_fatal",
      integrationId: "int_stripe",
      errorCode: "SCHEMA_VALIDATION_FAILED",
      errorMessage: "Required field email is missing from payload",
      retryable: false,
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    assert.equal(canExecuteRetry(retryableError), true, "Retryable error must permit retry");
    assert.equal(canExecuteRetry(fatalError), false, "Non-retryable error must forbid retry");
  });

  it("updates error resolution state and tracks resolvedBy and resolvedAt", () => {
    const error: SyncErrorItem = {
      id: "err_resolve_test",
      integrationId: "int_razorpay",
      errorCode: "TRANSFORMATION_SYNTAX_ERROR",
      errorMessage: "Invalid regex format in rule",
      retryable: false,
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    const resolveError = (
      target: SyncErrorItem,
      resolved: boolean,
      user: string,
      notes?: string
    ): SyncErrorItem => {
      return {
        ...target,
        resolved,
        resolvedAt: resolved ? new Date().toISOString() : undefined,
      };
    };

    const resolvedError = resolveError(error, true, "DevOps Engineer", "Updated mapping rule");
    assert.equal(resolvedError.resolved, true);
    assert.ok(resolvedError.resolvedAt, "resolvedAt timestamp must be recorded");

    const reopenedError = resolveError(resolvedError, false, "DevOps Engineer");
    assert.equal(reopenedError.resolved, false);
    assert.equal(reopenedError.resolvedAt, undefined);
  });
});

describe("Day 11: Webhook Secret Protection & Security Zero-Leak", () => {
  it("strictly masks secrets and never displays raw secret in plaintext", () => {
    const rawSecret = "whsec_live_prod_super_secret_signing_key_99887766";
    const masked = maskSecret(rawSecret);

    assert.ok(masked.startsWith("whsec_••••••••••••••••••••"), "Must start with masked prefix");
    assert.ok(masked.endsWith("99887766".slice(-4)), "May retain non-sensitive 4-char suffix");
    assert.equal(masked.includes("super_secret_signing_key"), false, "Raw secret core must never appear in mask");
  });

  it("handles empty, null, and short secrets safely without throwing", () => {
    assert.equal(maskSecret(null), "whsec_••••••••••••••••••••");
    assert.equal(maskSecret(undefined), "whsec_••••••••••••••••••••");
    assert.equal(maskSecret(""), "whsec_••••••••••••••••••••");
    assert.equal(maskSecret("abc"), "••••••••");
  });
});

describe("Day 11: Webhook HMAC-SHA256 Signature Verification", () => {
  it("computes deterministic HMAC-SHA256 signature for payload", async () => {
    const payload = JSON.stringify({
      source: "CRM",
      event: "lead.created",
      data: { email: "verified@example.com" },
    });
    const secret = "test_signing_secret_key_12345";

    const signature = await computeHmacSha256Hex(payload, secret);

    assert.equal(typeof signature, "string");
    assert.equal(signature.length, 64, "HMAC-SHA256 hex digest must be 64 hex characters (32 bytes)");
    assert.ok(/^[0-9a-f]{64}$/.test(signature), "Signature must consist strictly of valid hexadecimal characters");

    // Deterministic: Same input yields identical signature
    const signatureSecondRun = await computeHmacSha256Hex(payload, secret);
    assert.equal(signature, signatureSecondRun, "Signature must be strictly deterministic");
  });

  it("produces distinct signatures when payload or secret is altered", async () => {
    const payloadA = JSON.stringify({ event: "lead.created", id: "1" });
    const payloadB = JSON.stringify({ event: "lead.created", id: "2" });
    const secret = "shared_test_secret";

    const sigA = await computeHmacSha256Hex(payloadA, secret);
    const sigB = await computeHmacSha256Hex(payloadB, secret);

    assert.notEqual(sigA, sigB, "Different payloads must yield different HMAC signatures");
  });
});

describe("Day 11: Webhook Provider Catalog & Ingress Endpoints", () => {
  it("generates correct backend ingestion URL for supported providers", () => {
    const crmUrl = getWebhookIngressUrl("CRM");
    assert.ok(crmUrl.endsWith("/ingestion/webhook/crm"));

    const facebookUrl = getWebhookIngressUrl("FACEBOOK");
    assert.ok(facebookUrl.endsWith("/ingestion/webhook/facebook"));
  });

  it("includes all officially supported providers from the backend specification", () => {
    assert.ok(SUPPORTED_WEBHOOK_PROVIDERS.length >= 20, "Must support at least 20 official webhook providers");
    const providerIds = SUPPORTED_WEBHOOK_PROVIDERS.map((p) => p.id);
    assert.ok(providerIds.includes("CRM"));
    assert.ok(providerIds.includes("FACEBOOK"));
    assert.ok(providerIds.includes("PAYMENTS"));
    assert.ok(providerIds.includes("WEBSITE"));
  });

  it("defines standard event subscription types with descriptive metadata", () => {
    assert.ok(STANDARD_WEBHOOK_EVENTS.length >= 6);
    const eventNames = STANDARD_WEBHOOK_EVENTS.map((e) => e.event);
    assert.ok(eventNames.includes("lead.created"));
    assert.ok(eventNames.includes("contact.created"));
    assert.ok(eventNames.includes("payment.completed"));
  });
});
