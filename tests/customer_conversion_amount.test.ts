import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLeadConversionRequestPayload,
  getConversionDealAmountError,
  getUsableSavedLeadBudget,
} from "../components/customers/leadConversionPayload.ts";

const basePayload = { leadId: "lead_1", createDeal: true, dealName: "Lead deal" };

test("conversion without a Deal does not require or send a Deal amount", () => {
  assert.equal(getConversionDealAmountError(false, undefined, undefined), null);
  assert.deepEqual(buildLeadConversionRequestPayload({ ...basePayload, createDeal: false, dealAmount: 0 }), {
    leadId: "lead_1", createDeal: false,
  });
});

test("a positive entered Deal amount is valid and remains numeric in the request", () => {
  assert.equal(getConversionDealAmountError(true, 1250.5, undefined), null);
  assert.deepEqual(buildLeadConversionRequestPayload({ ...basePayload, dealAmount: 1250.5 }), {
    ...basePayload, dealAmount: 1250.5,
  });
});

test("an omitted Deal amount is valid when the selected Lead has a saved positive budget", () => {
  assert.equal(getUsableSavedLeadBudget({ estimatedValue: 0, budget: 8000 }), 8000);
  assert.equal(getConversionDealAmountError(true, undefined, 8000), null);
  assert.deepEqual(buildLeadConversionRequestPayload(basePayload), basePayload);
  assert.equal("dealAmount" in buildLeadConversionRequestPayload(basePayload), false);
});

test("missing amount and missing or unusable saved budget show a clear validation error", () => {
  const message = "Enter a positive Deal amount or select a Lead with a saved positive budget.";
  assert.equal(getConversionDealAmountError(true, undefined, undefined), message);
  assert.equal(getConversionDealAmountError(true, undefined, 0), message);
  assert.equal(getConversionDealAmountError(true, undefined, Number.POSITIVE_INFINITY), message);
});

test("zero, negative, non-finite, and excessive-decimal entered amounts are rejected", () => {
  assert.equal(getConversionDealAmountError(true, 0, 5000), "Deal amount must be greater than 0.");
  assert.equal(getConversionDealAmountError(true, -5, 5000), "Deal amount must be greater than 0.");
  assert.equal(getConversionDealAmountError(true, Number.NaN, 5000), "Deal amount must be a valid number.");
  assert.equal(getConversionDealAmountError(true, Number.POSITIVE_INFINITY, 5000), "Deal amount must be a valid number.");
  assert.equal(getConversionDealAmountError(true, 10.123, 5000), "Deal amount can have at most 2 decimal places.");
});
