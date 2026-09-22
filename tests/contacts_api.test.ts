import test from "node:test";
import assert from "node:assert/strict";

import { normalizeContact } from "../lib/contactNormalization.ts";

test("normalizeContact handles null names and nested company payloads", () => {
  const normalized = normalizeContact({
    id: "c1",
    name: null,
    email: null,
    phone: null,
    company: { id: "co1", name: "Acme Labs" },
    companyName: "Acme Labs",
    position: "VP Sales",
    city: "New York",
    source: "Website",
    status: "Lead",
    notes: "Interested in pricing",
    createdAt: "2024-01-05T00:00:00.000Z",
  });

  assert.equal(normalized.name, "Unnamed Contact");
  assert.equal(normalized.email, "");
  assert.equal(normalized.company, "Acme Labs");
  assert.equal(normalized.note, "Interested in pricing");
  assert.equal(normalized.createdAt, "2024-01-05T00:00:00.000Z");
});
