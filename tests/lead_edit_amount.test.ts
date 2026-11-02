import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadEditPayload, getLeadEstimatedValueError } from "../components/leads/leadEditPayload.ts";

const leadForm = {
    name: "Lead Example",
    email: "lead@example.com",
    phone: "1234567890",
    company: "Example Inc",
    city: "Mumbai",
    source: "Website",
    status: "WARM",
    estimatedValue: "7000.50",
    assignedToId: "",
    tags: ["customer"],
};

test("Lead edit PATCH payload contains the edited estimated value as a number", () => {
    const payload = buildLeadEditPayload(leadForm);
    assert.equal(payload.estimatedValue, 7000.5);
});

test("Lead edit PATCH payload retains an unchanged amount and omits a blank amount", () => {
    assert.equal(buildLeadEditPayload({ ...leadForm, estimatedValue: "5000" }).estimatedValue, 5000);
    assert.equal("estimatedValue" in buildLeadEditPayload({ ...leadForm, estimatedValue: "" }), false);
});

test("blank Estimated Value is valid and omitted from the PATCH payload", () => {
    assert.equal(getLeadEstimatedValueError(" "), null);
    assert.equal("estimatedValue" in buildLeadEditPayload({ ...leadForm, estimatedValue: " " }), false);
});

test("zero and positive Estimated Values are valid numeric PATCH values", () => {
    assert.equal(buildLeadEditPayload({ ...leadForm, estimatedValue: "0" }).estimatedValue, 0);
    assert.equal(buildLeadEditPayload({ ...leadForm, estimatedValue: "1250.75" }).estimatedValue, 1250.75);
});

test("Estimated Values with up to two decimal places are accepted", () => {
    for (const [value, expected] of [["10", 10], ["10.1", 10.1], ["10.12", 10.12]] as const) {
        assert.equal(getLeadEstimatedValueError(value), null);
        assert.equal(buildLeadEditPayload({ ...leadForm, estimatedValue: value }).estimatedValue, expected);
    }
});

test("Estimated Values with more than two decimal places are rejected", () => {
    const message = "Estimated Value can have at most two decimal places.";
    assert.equal(getLeadEstimatedValueError("10.123"), message);
    assert.throws(
        () => buildLeadEditPayload({ ...leadForm, estimatedValue: "10.123" }),
        { message },
    );
});

test("negative Estimated Value is rejected with a clear validation message", () => {
    assert.equal(getLeadEstimatedValueError("-5"), "Estimated Value cannot be negative.");
    assert.throws(
        () => buildLeadEditPayload({ ...leadForm, estimatedValue: "-5" }),
        { message: "Estimated Value cannot be negative." },
    );
});

test("invalid and non-finite Estimated Values are rejected instead of omitted", () => {
    for (const value of ["not a number", "Infinity", "1e999"]) {
        assert.equal(getLeadEstimatedValueError(value), "Estimated Value must be a valid number.");
        assert.throws(() => buildLeadEditPayload({ ...leadForm, estimatedValue: value }));
    }
});
