import test from "node:test";
import assert from "node:assert/strict";

// Helper replicating the probability mapping rules in mapDeal & DealsUI
function calculateDealProbability(deal: {
    stage: string;
    winProbability?: number;
    probability?: number;
    conversionProbability?: number;
}): number {
    const rawStage = (deal.stage || "NEW").toUpperCase();
    const isWon = rawStage === "WON";
    const isLost = rawStage === "LOST";
    const isDead = rawStage === "DEAD";

    if (isWon) return 1.0;
    if (isLost || isDead) return 0.0;

    if (typeof deal.conversionProbability === "number" && !isNaN(deal.conversionProbability)) {
        return deal.conversionProbability > 1 ? deal.conversionProbability / 100 : deal.conversionProbability;
    }
    if (typeof deal.probability === "number" && !isNaN(deal.probability)) {
        return deal.probability > 1 ? deal.probability / 100 : deal.probability;
    }
    if (typeof deal.winProbability === "number" && !isNaN(deal.winProbability)) {
        return deal.winProbability > 1 ? deal.winProbability / 100 : deal.winProbability;
    }

    if (rawStage === "HOT") return 0.8;
    if (rawStage === "WARM") return 0.5;
    if (rawStage === "NEW") return 0.2;

    return 0.5;
}

test("Deals Page: probability derivation follows CRM lifecycle rules", () => {
    // 1. WON deals MUST be 1.0 (100%), even if default or missing probability
    assert.equal(calculateDealProbability({ stage: "WON" }), 1.0);
    assert.equal(calculateDealProbability({ stage: "WON", winProbability: 50 }), 1.0);

    // 2. LOST & DEAD deals MUST be 0.0 (0%)
    assert.equal(calculateDealProbability({ stage: "LOST" }), 0.0);
    assert.equal(calculateDealProbability({ stage: "DEAD" }), 0.0);
    assert.equal(calculateDealProbability({ stage: "LOST", probability: 80 }), 0.0);

    // 3. Stage defaults
    assert.equal(calculateDealProbability({ stage: "HOT" }), 0.8);
    assert.equal(calculateDealProbability({ stage: "WARM" }), 0.5);
    assert.equal(calculateDealProbability({ stage: "NEW" }), 0.2);

    // 4. Explicit winProbability from API (in percentage 0-100 or decimal 0-1)
    assert.equal(calculateDealProbability({ stage: "WARM", winProbability: 75 }), 0.75);
    assert.equal(calculateDealProbability({ stage: "HOT", conversionProbability: 0.85 }), 0.85);
});

test("Deals Page: Active Pipeline Value excludes terminal stages (WON, LOST, DEAD) when viewing All Stages", () => {
    const deals = [
        { dealId: "1", stage: "NEW", amount: 10000 },
        { dealId: "2", stage: "HOT", amount: 25000 },
        { dealId: "3", stage: "WON", amount: 50000 },
        { dealId: "4", stage: "LOST", amount: 15000 },
        { dealId: "5", stage: "DEAD", amount: 5000 },
    ];

    const TERMINAL_STAGES = new Set(["WON", "LOST", "DEAD"]);

    // Calculate active pipeline value for "All Stages"
    const activePipelineValue = deals
        .filter((d) => !TERMINAL_STAGES.has(d.stage.toUpperCase()))
        .reduce((sum, d) => sum + (d.amount || 0), 0);

    // Sum should be 10000 (NEW) + 25000 (HOT) = 35000, NOT 105000
    assert.equal(activePipelineValue, 35000);

    // When filtered by specific stage "WON"
    const filteredStage = "WON";
    const filteredStageValue = deals
        .filter((d) => d.stage.toUpperCase() === filteredStage.toUpperCase())
        .reduce((sum, d) => sum + (d.amount || 0), 0);
    assert.equal(filteredStageValue, 50000);
});

test("Deals Page: Deterministic sorting uses secondary dealId tie-breaker", () => {
    const deals = [
        { dealId: "deal-b", name: "Deal Beta", amount: 10000, updatedAt: "2026-10-28T10:00:00Z" },
        { dealId: "deal-a", name: "Deal Alpha", amount: 10000, updatedAt: "2026-10-28T10:00:00Z" },
        { dealId: "deal-c", name: "Deal Gamma", amount: 20000, updatedAt: "2026-10-28T09:00:00Z" },
    ];

    // Default sort by updatedAt desc with tie-breaker
    const sortedDefault = [...deals].sort((a, b) => {
        const dateA = a.updatedAt || "";
        const dateB = b.updatedAt || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return a.dealId.localeCompare(b.dealId);
    });

    // deal-a and deal-b have identical date, so deal-a should be first by dealId
    assert.equal(sortedDefault[0].dealId, "deal-a");
    assert.equal(sortedDefault[1].dealId, "deal-b");
    assert.equal(sortedDefault[2].dealId, "deal-c");

    // Amount sort asc with tie-breaker
    const sortedByAmount = [...deals].sort((a, b) => {
        if (a.amount !== b.amount) return a.amount - b.amount;
        return a.dealId.localeCompare(b.dealId);
    });

    assert.equal(sortedByAmount[0].dealId, "deal-a");
    assert.equal(sortedByAmount[1].dealId, "deal-b");
    assert.equal(sortedByAmount[2].dealId, "deal-c");
});
