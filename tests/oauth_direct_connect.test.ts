import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isProviderManagedOAuth,
  getOAuthPreAuthFields,
  requiresPreAuthUserInput,
  OAUTH_PROVIDERS,
} from "../lib/utils/integrationContracts.ts";
import type { Connector } from "../types/integrations.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("OAuth Direct Connect Flow & Provider Managed Connectors", () => {
  describe("1. Provider Classification & Recognition", () => {
    it("recognizes all 6 OAuth providers as provider-managed OAuth", () => {
      const expectedProviders = [
        "GOOGLE_WORKSPACE",
        "HUBSPOT",
        "SALESFORCE",
        "ZOHO",
        "SLACK",
        "SHOPIFY",
      ];

      for (const provider of expectedProviders) {
        assert.ok(
          OAUTH_PROVIDERS.has(provider),
          `OAUTH_PROVIDERS set must contain ${provider}`
        );

        const mockConnector: Connector = {
          id: `conn-${provider.toLowerCase()}`,
          name: provider,
          description: `${provider} test connector`,
          provider: provider as any,
          category: "CRM" as any,
          authType: "OAUTH2",
          status: "NOT_CONNECTED",
          isConnected: false,
          available: true,
        };

        assert.equal(
          isProviderManagedOAuth(mockConnector),
          true,
          `${provider} should be classified as provider-managed OAuth`
        );

        // Lowercase variant should also be recognized
        const lowercaseConnector: Connector = {
          ...mockConnector,
          provider: provider.toLowerCase() as any,
        };
        assert.equal(
          isProviderManagedOAuth(lowercaseConnector),
          true,
          `Lowercase ${provider.toLowerCase()} should be classified as provider-managed OAuth`
        );
      }
    });

    it("does not classify non-OAuth connectors as provider-managed OAuth", () => {
      const nonOAuthConnectors: Array<Partial<Connector>> = [
        { provider: "CUSTOM_API" as any, authType: "API_KEY" },
        { provider: "CUSTOM_WEBHOOK" as any, authType: "CUSTOM" as any },
        { provider: "STRIPE" as any, authType: "API_KEY" },
        { provider: "RAZORPAY" as any, authType: "API_KEY" },
        { provider: "META_WHATSAPP" as any, authType: "API_KEY" },
      ];

      for (const c of nonOAuthConnectors) {
        assert.equal(
          isProviderManagedOAuth(c as Connector),
          false,
          `${c.provider} should NOT be provider-managed OAuth`
        );
      }
    });
  });

  describe("2. Pre-Auth Configuration & 1-Click Launch Rules", () => {
    it("Google Workspace, HubSpot, and Slack require zero pre-auth inputs (1-click connect)", () => {
      const oneClickProviders = ["GOOGLE_WORKSPACE", "HUBSPOT", "SLACK"];

      for (const provider of oneClickProviders) {
        const connector: Connector = {
          id: `conn-${provider.toLowerCase()}`,
          name: provider,
          description: `${provider} test connector`,
          provider: provider as any,
          category: "COMMUNICATIONS" as any,
          authType: "OAUTH2",
          status: "NOT_CONNECTED",
          isConnected: false,
          available: true,
        };

        const fields = getOAuthPreAuthFields(connector);
        assert.equal(
          fields.length,
          0,
          `${provider} must require 0 pre-auth fields for 1-click connect`
        );
        assert.equal(
          requiresPreAuthUserInput(connector),
          false,
          `${provider} must return requiresPreAuthUserInput = false`
        );
      }
    });

    it("Shopify requires shopDomain pre-auth input", () => {
      const shopifyConnector: Connector = {
        id: "conn-shopify",
        name: "Shopify",
        description: "Shopify test connector",
        provider: "SHOPIFY" as any,
        category: "ECOMMERCE" as any,
        authType: "OAUTH2",
        status: "NOT_CONNECTED",
        isConnected: false,
        available: true,
      };

      const fields = getOAuthPreAuthFields(shopifyConnector);
      assert.ok(fields.length > 0, "Shopify must have pre-auth fields");
      const domainField = fields.find((f) => f.name === "shopDomain");
      assert.ok(domainField, "Shopify must contain shopDomain field");
      assert.equal(domainField?.required, true, "shopDomain must be marked required");
      assert.equal(requiresPreAuthUserInput(shopifyConnector), true);
    });

    it("Zoho supports dataCenter region pre-auth selection", () => {
      const zohoConnector: Connector = {
        id: "conn-zoho",
        name: "Zoho CRM",
        description: "Zoho test connector",
        provider: "ZOHO" as any,
        category: "CRM" as any,
        authType: "OAUTH2",
        status: "NOT_CONNECTED",
        isConnected: false,
        available: true,
      };

      const fields = getOAuthPreAuthFields(zohoConnector);
      const dcField = fields.find((f) => f.name === "dataCenter");
      assert.ok(dcField, "Zoho must have dataCenter field");
      assert.equal(dcField?.defaultValue, "com", "Zoho defaults to US .com");
      assert.ok(Array.isArray(dcField?.options) && dcField.options.length >= 4);
    });

    it("Salesforce supports environment pre-auth selection", () => {
      const sfConnector: Connector = {
        id: "conn-salesforce",
        name: "Salesforce",
        description: "Salesforce test connector",
        provider: "SALESFORCE" as any,
        category: "CRM" as any,
        authType: "OAUTH2",
        status: "NOT_CONNECTED",
        isConnected: false,
        available: true,
      };

      const fields = getOAuthPreAuthFields(sfConnector);
      const envField = fields.find((f) => f.name === "environment");
      assert.ok(envField, "Salesforce must have environment field");
      assert.equal(envField?.defaultValue, "production", "Salesforce defaults to production");
    });
  });

  describe("3. Frontend Integration Page Direct Routing Contracts", () => {
    const pageSrc = fs.readFileSync(
      path.join(ROOT, "app", "(dashboard)", "integrations", "page.tsx"),
      "utf8"
    );

    it("imports OAuthPreConnectModal and contract utilities", () => {
      assert.match(pageSrc, /import\s*\{\s*OAuthPreConnectModal\s*\}\s*from/);
      assert.match(pageSrc, /isProviderManagedOAuth/);
      assert.match(pageSrc, /getOAuthPreAuthFields/);
    });

    it("handleOpenConnect routes provider-managed OAuth directly without opening generic wizard", () => {
      assert.match(pageSrc, /if\s*\(\s*isProviderManagedOAuth\s*\(\s*connector\s*\)\s*\)/);
      assert.match(pageSrc, /handleDirectOAuthConnect\s*\(\s*connector\s*\)/);
      assert.match(pageSrc, /setIsOAuthPreConnectOpen\s*\(\s*true\s*\)/);
    });

    it("protects against rapid/duplicate clicks via connectingConnectorId", () => {
      assert.match(pageSrc, /const\s*\[connectingConnectorId,\s*setConnectingConnectorId\]/);
      assert.match(pageSrc, /if\s*\(\s*connectingConnectorId\s*\)\s*return;/);
      assert.match(pageSrc, /isConnecting=\{connectingConnectorId === \(connector\.id \|\| connector\.provider\)\}/);
    });

    it("handleDirectOAuthConnect obtains authorizationUrl and redirects browser", () => {
      assert.match(pageSrc, /const\s+res\s*=\s*await\s+initiateOAuth\s*\(\s*connector\.provider\s*\)/);
      assert.match(pageSrc, /window\.location\.href\s*=\s*authUrl/);
    });

    it("mounts OAuthPreConnectModal in the JSX tree", () => {
      assert.match(pageSrc, /<OAuthPreConnectModal/);
      assert.match(pageSrc, /isOpen=\{isOAuthPreConnectOpen\}/);
      assert.match(pageSrc, /onInitiateOAuth=\{initiateOAuth\}/);
    });
  });

  describe("4. ConnectorCard Loading & Double-Click Guard", () => {
    const cardSrc = fs.readFileSync(
      path.join(ROOT, "components", "integrations", "ConnectorCard.tsx"),
      "utf8"
    );

    it("supports isConnecting prop and renders spinning Loader2", () => {
      assert.match(cardSrc, /isConnecting\?: boolean/);
      assert.match(cardSrc, /isConnecting = false/);
      assert.match(cardSrc, /disabled=\{!allowCreate \|\| isConnecting\}/);
      assert.match(cardSrc, /<Loader2 className="w-3\.5 h-3\.5 animate-spin" \/>/);
      assert.match(cardSrc, /Connecting\.\.\./);
    });
  });

  describe("5. OAuthPreConnectModal Implementation", () => {
    const modalSrc = fs.readFileSync(
      path.join(ROOT, "components", "integrations", "OAuthPreConnectModal.tsx"),
      "utf8"
    );

    it("validates required fields before dispatching connect", () => {
      assert.match(modalSrc, /if\s*\(!validate\(\)\)/);
      assert.match(modalSrc, /const\s+res\s*=\s*await\s+onInitiateOAuth/);
      assert.match(modalSrc, /window\.location\.href\s*=\s*authUrl/);
    });

    it("formats Shopify shop domain and environment parameters into payload", () => {
      assert.match(modalSrc, /payload\.shop\s*=\s*String\(dynamicFields\.shopDomain\)\.trim\(\)/);
      assert.match(modalSrc, /payload\.dataCenter\s*=/);
      assert.match(modalSrc, /payload\.environment\s*=/);
    });

    it("handles connection errors gracefully and restores submit button", () => {
      assert.match(modalSrc, /toast\.error\(/);
      assert.match(modalSrc, /setIsSubmitting\(false\)/);
    });
  });

  describe("6. IntegrationWizardModal OAuth Fallback Safety", () => {
    const wizardSrc = fs.readFileSync(
      path.join(ROOT, "components", "integrations", "IntegrationWizardModal.tsx"),
      "utf8"
    );

    it("imports isProviderManagedOAuth and defines isOAuthConnector", () => {
      assert.match(wizardSrc, /isProviderManagedOAuth/);
      assert.match(wizardSrc, /const\s+isOAuthConnector\s*=\s*useMemo/);
    });

    it("does not require generic REST endpoint inputs when connector is OAuth", () => {
      assert.match(wizardSrc, /if\s*\(!isOAuthConnector\)\s*\{\s*fieldsToTrigger\.push\(\s*["']apiUrl["']/);
      assert.match(wizardSrc, /if\s*\(!isOAuth\s*&&\s*requiresEndpointUrl/);
    });

    it("renders provider-managed informational banner instead of REST endpoint fields", () => {
      assert.match(wizardSrc, /Provider-Managed Integration Endpoint/);
      assert.match(wizardSrc, /API endpoints, OAuth handshakes, and token lifecycles are automatically managed/);
    });
  });
});

