import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { PERMISSIONS } from "../lib/constants/permissions.ts";
import { resolveIntegrationUiPermissions } from "../lib/utils/integrationPermissions.ts";
import {
  CANONICAL_TARGET_MODULES,
  buildEditIntegrationPayload,
  buildPreflightDiscoverPayload,
  buildPreflightTestPayload,
  buildReconnectModalPayload,
  buildRotateModalPayload,
  buildWizardIntegrationPayload,
  extractConnectorConfigFields,
  isDynamicSchemaProvider,
  isSecretConfigField,
  normalizeOptionalSecret,
  toStrictUpdatePayload,
} from "../lib/utils/integrationContracts.ts";
import type {
  Connector,
  ConnectorSchemaField,
  TargetEntityDefinition,
} from "../types/integrations.ts";

describe("Phase 2: Integration UI RBAC Permission Resolution", () => {
  it("exposes exact canonical integration permission strings", () => {
    assert.equal(PERMISSIONS.INTEGRATIONS_VIEW, "integrations.view");
    assert.equal(PERMISSIONS.INTEGRATIONS_CREATE, "integrations.create");
    assert.equal(PERMISSIONS.INTEGRATIONS_UPDATE, "integrations.update");
    assert.equal(PERMISSIONS.INTEGRATIONS_DELETE, "integrations.delete");
  });

  it("grants full permissions for privileged administrative roles without restricting explicit denied checks", () => {
    for (const role of ["SUPER_ADMIN", "SUPERADMIN", "ORG_ADMIN", "ADMIN", "OWNER"]) {
      const perms = resolveIntegrationUiPermissions({ role });
      assert.deepEqual(perms, {
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canManage: true,
        canConfigure: true,
      });
    }
  });

  it("denies create/update/delete for viewer/employee roles unless explicitly granted", () => {
    const viewerPerms = resolveIntegrationUiPermissions({
      role: "EMPLOYEE",
      userPermissions: { "integrations.view": true },
    });
    assert.deepEqual(viewerPerms, {
      canView: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canManage: false,
      canConfigure: false,
    });

    const restrictedPerms = resolveIntegrationUiPermissions({
      role: "VIEWER",
      userPermissions: { "integrations.view": true, "integrations.update": true },
    });
    assert.deepEqual(restrictedPerms, {
      canView: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
      canManage: true,
      canConfigure: true,
    });
  });

  it("prefers hasPermission predicate when provided by auth context", () => {
    const allowed = new Set<string>(["integrations.view", "integrations.create"]);
    const perms = resolveIntegrationUiPermissions({
      role: "EMPLOYEE",
      hasPermission: (key) => allowed.has(key),
    });
    assert.deepEqual(perms, {
      canView: true,
      canCreate: true,
      canUpdate: false,
      canDelete: false,
      canManage: true,
      canConfigure: true,
    });
  });
});

describe("Phase 3B: Canonical Target Entities & Dynamic Provider Helpers", () => {
  it("aligns CANONICAL_TARGET_MODULES with backend TARGET_SCHEMAS entities and required field names", () => {
    const entities: TargetEntityDefinition[] = CANONICAL_TARGET_MODULES.flatMap(
      (m) => m.entities
    );
    assert.deepEqual(
      entities.map((e) => e.id),
      ["Lead", "Contact", "Company", "Deal", "Customer", "Invoice"]
    );

    const dealEntity = entities.find((e) => e.id === "Deal");
    assert.ok(dealEntity);
    assert.ok(dealEntity.targetFields.some((f) => f.key === "name" && f.required));
    assert.ok(dealEntity.targetFields.some((f) => f.key === "stage" && f.required));

    const invoiceEntity = entities.find((e) => e.id === "Invoice");
    assert.ok(invoiceEntity);
    assert.ok(
      invoiceEntity.targetFields.some((f) => f.key === "invoiceNumber" && f.required)
    );
    assert.ok(invoiceEntity.targetFields.some((f) => f.key === "total" && f.required));
  });

  it("identifies dynamic schema providers and secret config fields accurately", () => {
    assert.equal(isDynamicSchemaProvider("CUSTOM_API"), true);
    assert.equal(isDynamicSchemaProvider("custom_webhook"), true);
    assert.equal(isDynamicSchemaProvider("HUBSPOT"), false);
    assert.equal(isDynamicSchemaProvider("STRIPE"), false);

    assert.equal(normalizeOptionalSecret("   "), undefined);
    assert.equal(normalizeOptionalSecret("  secret_123  "), "secret_123");

    const secretField: ConnectorSchemaField = {
      name: "apiSecret",
      label: "API Secret",
      type: "secret",
      required: true,
    };
    const secretNamedTextField: ConnectorSchemaField = {
      name: "webhookSecret",
      label: "Webhook Secret",
      type: "text",
    };
    const sensitiveFlagField: ConnectorSchemaField = {
      name: "signingSalt",
      label: "Signing Salt",
      type: "text",
      sensitive: true,
    };
    const nonSecretField: ConnectorSchemaField = {
      name: "dataCenter",
      label: "Data Center",
      type: "select",
      options: [{ label: "US (.com)", value: "com" }],
    };

    assert.equal(isSecretConfigField(secretField), true);
    assert.equal(isSecretConfigField(secretNamedTextField), true);
    assert.equal(isSecretConfigField(sensitiveFlagField), true);
    assert.equal(isSecretConfigField(nonSecretField), false);

    const connector = {
      provider: "CUSTOM_API",
      configFields: [secretField, nonSecretField],
    } as Connector;
    assert.equal(extractConnectorConfigFields(connector).length, 2);
  });
});

describe("Phase 3B: Strict Payload Alignment Across Wizard, Edit, Reconnect, Rotate & Preflight", () => {
  it("routes secret configFields to customSecrets, omits blanks, and projects strictly for PATCH", () => {
    const configFields: ConnectorSchemaField[] = [
      { name: "dataCenter", label: "Data Center", type: "select" },
      { name: "apiSecret", label: "API Secret", type: "secret" },
      { name: "signingKey", label: "Signing Key", type: "secret" },
    ];

    const wizardPayload = buildWizardIntegrationPayload({
      connector: {
        id: "razorpay",
        provider: "RAZORPAY",
        name: "Razorpay",
        configFields,
      } as Connector,
      displayName: "Razorpay Production",
      targetModule: "finance",
      targetEntity: "Invoice",
      apiUrl: "https://api.razorpay.com/v1",
      httpMethod: "GET",
      authType: "API_KEY",
      apiKeyValue: "rzp_live_123",
      bearerToken: "",
      webhookSecret: "   ",
      headers: [{ key: "X-Custom", value: "val" }],
      syncFrequency: "HOURLY",
      syncDirection: "BIDIRECTIONAL",
      dynamicFields: {
        dataCenter: "in",
        apiSecret: "should_not_stay_in_config",
      },
      dynamicSecrets: {
        apiSecret: "rzp_secret_abc",
        signingKey: "custom_signing_xyz",
      },
    });

    assert.equal(wizardPayload.provider, "RAZORPAY");
    assert.equal(wizardPayload.apiKey, "rzp_live_123");
    assert.equal(wizardPayload.apiSecret, "rzp_secret_abc");
    assert.equal(wizardPayload.webhookSecret, undefined);
    assert.deepEqual(wizardPayload.customSecrets, { signingKey: "custom_signing_xyz" });
    assert.equal(wizardPayload.config?.dataCenter, "in");
    assert.equal("apiSecret" in (wizardPayload.config || {}), false);

    const strictUpdate = toStrictUpdatePayload(wizardPayload);
    assert.equal("provider" in strictUpdate, false);
    assert.equal("authType" in strictUpdate, false);
    assert.equal(strictUpdate.name, "Razorpay Production");
    assert.equal(strictUpdate.apiSecret, "rzp_secret_abc");
    assert.deepEqual(strictUpdate.customSecrets, { signingKey: "custom_signing_xyz" });
  });

  it("maps OAUTH2 bearer token cleanly in edit payload and preserves untouched secrets when blank", () => {
    const editPayload = buildEditIntegrationPayload({
      provider: "HUBSPOT",
      displayName: "HubSpot Updated",
      syncFrequency: "HOURLY",
      syncDirection: "INBOUND",
      apiUrl: "https://api.hubapi.com",
      httpMethod: "GET",
      headers: [],
      isUpdatingCredentials: true,
      authType: "OAUTH2",
      apiKeyValue: "ignored_when_oauth",
      bearerToken: "oauth_pat_new",
      webhookSecret: "  ",
      dynamicSecrets: { signingKey: "" },
    });

    assert.equal(editPayload.name, "HubSpot Updated");
    assert.equal(editPayload.accessToken, "oauth_pat_new");
    assert.equal(editPayload.apiKey, undefined);
    assert.equal(editPayload.webhookSecret, undefined);
    assert.equal(editPayload.customSecrets, undefined);
  });

  it("builds preflight test and preflight discovery payloads without persisted integration IDs", () => {
    const wizardPayload = buildWizardIntegrationPayload({
      connector: {
        id: "custom_api",
        provider: "CUSTOM_API",
        name: "Custom REST API",
      } as Connector,
      displayName: "Custom Preflight",
      targetModule: "crm",
      targetEntity: "Contact",
      apiUrl: "https://api.example.com",
      httpMethod: "GET",
      authType: "BEARER_TOKEN",
      bearerToken: "bearer_preflight_123",
      syncFrequency: "MANUAL",
      syncDirection: "INBOUND",
      dynamicFields: { tenantSlug: "acme" },
    });

    const preflightTest = buildPreflightTestPayload(wizardPayload);
    assert.equal(preflightTest.provider, "CUSTOM_API");
    assert.equal(preflightTest.accessToken, "bearer_preflight_123");
    assert.equal(preflightTest.baseUrl, "https://api.example.com");
    assert.equal(preflightTest.config?.tenantSlug, "acme");

    const preflightDiscover = buildPreflightDiscoverPayload(wizardPayload, {
      customer: { email: "test@example.com" },
    });
    assert.equal(preflightDiscover.provider, "CUSTOM_API");
    assert.equal(preflightDiscover.accessToken, "bearer_preflight_123");
    assert.deepEqual(preflightDiscover.samplePayload, {
      customer: { email: "test@example.com" },
    });
  });

  it("builds Reconnect and Rotate modal payloads with ISO expiry conversion and customSecrets", () => {
    const reconnect = buildReconnectModalPayload({
      updateCredentials: true,
      authType: "API_KEY",
      apiKey: "rzp_reconnected_key",
      apiSecret: "rzp_reconnected_secret",
    });
    assert.ok(reconnect);
    assert.equal(reconnect.apiKey, "rzp_reconnected_key");
    assert.equal(reconnect.apiSecret, "rzp_reconnected_secret");

    const rotate = buildRotateModalPayload({
      accessToken: "new_access_123",
      webhookSecret: "whsec_new_456",
      customSecrets: [{ key: "apiSecret", value: "new_client_style_secret" }],
      tokenExpiresAt: "2027-01-15T10:30",
    });
    assert.equal(rotate.accessToken, "new_access_123");
    assert.equal(rotate.webhookSecret, "whsec_new_456");
    assert.deepEqual(rotate.customSecrets, { apiSecret: "new_client_style_secret" });
    assert.ok(rotate.tokenExpiresAt && rotate.tokenExpiresAt.endsWith("Z"));

    const invalidDateRotate = buildRotateModalPayload({
      apiKey: "key_valid",
      tokenExpiresAt: "not-a-date",
    });
    assert.equal(invalidDateRotate.tokenExpiresAt, undefined);
  });
});

describe("Phase 3B Source Contract Verification", () => {
  it("routes unsaved schema discovery to /api/v1/integrations/schema/discover-preflight", () => {
    const root = process.cwd();
    const apiSrc = fs.readFileSync(path.join(root, "lib", "api", "integrationsApi.ts"), "utf8");
    const wizardSrc = fs.readFileSync(
      path.join(root, "components", "integrations", "IntegrationWizardModal.tsx"),
      "utf8"
    );
    const mappingSrc = fs.readFileSync(
      path.join(root, "components", "integrations", "wizard", "EntitySelectionMappingFlow.tsx"),
      "utf8"
    );

    assert.match(apiSrc, /export async function discoverPreflightSchemaApi/);
    assert.match(apiSrc, /\/api\/v1\/integrations\/schema\/discover-preflight/);
    assert.match(wizardSrc, /discoverPreflightSchemaApi/);
    assert.match(mappingSrc, /CANONICAL_TARGET_MODULES/);
    assert.match(mappingSrc, /isDynamicSchemaProvider/);
  });
});
