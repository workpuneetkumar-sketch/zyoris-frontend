import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("Phase 2: Frontend OAuth Callback & Reconnect Contracts", () => {
  it("callbackOAuthApi requests format=json from the backend callback route", () => {
    const apiSrc = fs.readFileSync(
      path.join(ROOT, "lib", "api", "integrationsApi.ts"),
      "utf8"
    );
    assert.match(apiSrc, /format:\s*["']json["']/);
    assert.match(apiSrc, /\/api\/v1\/integrations\/\$\{encodeURIComponent\(provider\)\}\/callback/);
  });

  it("ReconnectModal redirects to authorizationUrl when reconnecting an OAuth integration", () => {
    const modalSrc = fs.readFileSync(
      path.join(ROOT, "components", "integrations", "ReconnectModal.tsx"),
      "utf8"
    );
    assert.match(modalSrc, /if\s*\(\s*res\?\.authorizationUrl\s*\)/);
    assert.match(modalSrc, /window\.location\.href\s*=\s*res\.authorizationUrl/);
  });

  it("both OAuth callback pages handle backend redirects, cancellation, StrictMode replay guard, and URL scrubbing", () => {
    const providerCallback = fs.readFileSync(
      path.join(ROOT, "app", "(dashboard)", "integrations", "callback", "[provider]", "page.tsx"),
      "utf8"
    );
    const genericCallback = fs.readFileSync(
      path.join(ROOT, "app", "(dashboard)", "integrations", "callback", "page.tsx"),
      "utf8"
    );

    for (const src of [providerCallback, genericCallback]) {
      assert.match(src, /handledKeyRef/);
      assert.match(src, /window\.history\.replaceState/);
      assert.match(src, /backendStatus === ["']cancelled["']/);
      assert.match(src, /Connection Cancelled/);
      assert.match(src, /access_denied/);
    }
  });
});

