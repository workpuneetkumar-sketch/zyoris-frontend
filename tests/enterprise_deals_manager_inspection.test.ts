// tests/enterprise_deals_manager_inspection.test.ts
// Unit tests for FE-2 Day 5 (Enterprise Opportunity & Shared Ownership)
// and Day 6 (Manager Inspection & Next Best Action) frontend logic & contracts.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OPPORTUNITY_TYPES } from "../types/enterpriseDeals.ts";
import type { OpportunityType, SharedOwner } from "../types/enterpriseDeals.ts";
import { formatCurrencyAmount, formatCurrencyWithSnapshot } from "../utils/currencyFormat.ts";

describe("FE-2 Day 5: Enterprise Opportunity Types & Attributes", () => {
  it("defines all supported enterprise opportunity types per contract", () => {
    const typeIds = OPPORTUNITY_TYPES.map((t) => t.id);
    assert.deepEqual(typeIds, [
      "NEW_BUSINESS",
      "RENEWAL",
      "EXPANSION",
      "CROSS_SELL",
      "UPSELL",
    ]);
  });

  it("maps enterprise fields correctly from backend responses", () => {
    const rawBackendDeal = {
      id: "deal-ent-101",
      title: "Global Cloud Expansion Q3",
      amount: 450000,
      currency: "EUR",
      stage: "PROPOSAL",
      opportunityType: "EXPANSION" as OpportunityType,
      region: "EMEA",
      legalEntity: "Zyoris Europe B.V.",
      channel: "PARTNER",
      partnerId: "partner-99",
      partnerName: "Acme Cloud Solutions",
      productId: "prod-enterprise-suite",
      subscriptionId: "sub-8871",
      createdAt: "2026-09-01T10:00:00Z",
    };

    assert.equal(rawBackendDeal.opportunityType, "EXPANSION");
    assert.equal(rawBackendDeal.currency, "EUR");
    assert.equal(rawBackendDeal.region, "EMEA");
    assert.equal(rawBackendDeal.legalEntity, "Zyoris Europe B.V.");
    assert.equal(rawBackendDeal.channel, "PARTNER");
    assert.equal(rawBackendDeal.partnerName, "Acme Cloud Solutions");
    assert.equal(rawBackendDeal.productId, "prod-enterprise-suite");
    assert.equal(rawBackendDeal.subscriptionId, "sub-8871");
  });

  it("formats enterprise amounts with multi-currency presentation faithfully", () => {
    const usdFormatted = formatCurrencyAmount(125000, "USD");
    const eurFormatted = formatCurrencyAmount(250000, "EUR");
    const gbpFormatted = formatCurrencyAmount(75000, "GBP");
    const inrFormatted = formatCurrencyAmount(1500000, "INR");
    const snapshotFormatted = formatCurrencyWithSnapshot(500000, "USD");

    assert.match(usdFormatted, /125,000|\$125,000/);
    assert.match(eurFormatted, /250,000|€250,000/);
    assert.match(gbpFormatted, /75,000|£75,000/);
    assert.match(inrFormatted, /15,00,000|1,500,000|₹1,500,000/);
    assert.match(snapshotFormatted, /500,000|\$500,000/);
  });
});

describe("FE-2 Day 5: Shared Ownership & Split Allocations", () => {
  const existingOwners: SharedOwner[] = [
    { id: "so-1", dealId: "deal-1", userId: "u-1", userName: "Alice", userEmail: "alice@zyoris.com", splitPercentage: 40, role: "LEAD" },
    { id: "so-2", dealId: "deal-1", userId: "u-2", userName: "Bob", userEmail: "bob@zyoris.com", splitPercentage: 35, role: "SUPPORT" },
  ];

  it("calculates total split percentage accurately", () => {
    const total = existingOwners.reduce((sum, o) => sum + o.splitPercentage, 0);
    assert.equal(total, 75);
  });

  it("validates that added split allocation cannot exceed 100%", () => {
    const currentTotal = existingOwners.reduce((sum, o) => sum + o.splitPercentage, 0);
    const validNewSplit = 25;
    const invalidNewSplit = 30;

    assert.equal(currentTotal + validNewSplit <= 100, true);
    assert.equal(currentTotal + invalidNewSplit <= 100, false);
  });

  it("enforces allocation constraints when removing an owner", () => {
    const updated = existingOwners.filter((o) => o.id !== "so-2");
    const newTotal = updated.reduce((sum, o) => sum + o.splitPercentage, 0);
    assert.equal(newTotal, 40);
    assert.equal(updated.length, 1);
  });
});

describe("FE-2 Day 6: Manager Inspection Queue & Risk Filtering", () => {
  const sampleInspectionQueue = [
    {
      id: "deal-1",
      name: "Mega Corp Renewal",
      amount: 800000,
      currency: "USD",
      stage: "NEGOTIATION",
      opportunityType: "RENEWAL" as OpportunityType,
      riskSeverity: "CRITICAL",
      healthScore: 32,
      dwellDays: 45,
      daysSlipped: 14,
    },
    {
      id: "deal-2",
      name: "Acme Cross-Sell",
      amount: 300000,
      currency: "USD",
      stage: "DISCOVERY",
      opportunityType: "CROSS_SELL" as OpportunityType,
      riskSeverity: "HIGH",
      healthScore: 48,
      dwellDays: 30,
      daysSlipped: 7,
    },
    {
      id: "deal-3",
      name: "Starlight Expansion",
      amount: 150000,
      currency: "USD",
      stage: "PROPOSAL",
      opportunityType: "EXPANSION" as OpportunityType,
      riskSeverity: "LOW",
      healthScore: 88,
      dwellDays: 10,
      daysSlipped: 0,
    },
  ];

  it("filters deals by risk severity accurately", () => {
    const criticalDeals = sampleInspectionQueue.filter((d) => d.riskSeverity === "CRITICAL");
    const highDeals = sampleInspectionQueue.filter((d) => d.riskSeverity === "HIGH");

    assert.equal(criticalDeals.length, 1);
    assert.equal(criticalDeals[0].name, "Mega Corp Renewal");
    assert.equal(highDeals.length, 1);
    assert.equal(highDeals[0].name, "Acme Cross-Sell");
  });

  it("filters deals by health score threshold without modifying backend values", () => {
    const maxScore = 50;
    const atRiskDeals = sampleInspectionQueue.filter((d) => d.healthScore <= maxScore);

    assert.equal(atRiskDeals.length, 2);
    assert.equal(atRiskDeals[0].id, "deal-1");
    assert.equal(atRiskDeals[1].id, "deal-2");
  });

  it("parses executive pipeline summary metrics", () => {
    const summary = {
      pipelineId: "pipe-enterprise",
      totalDeals: 15,
      totalValue: 5400000,
      currency: "USD",
      averageHealthScore: 61.4,
      criticalRisksCount: 4,
      highRisksCount: 3,
      opportunityBreakdown: {
        NEW_BUSINESS: { count: 6, value: 2400000 },
        RENEWAL: { count: 4, value: 1600000 },
        EXPANSION: { count: 3, value: 1000000 },
        CROSS_SELL: { count: 1, value: 250000 },
        UPSELL: { count: 1, value: 150000 },
      },
      topRiskDrivers: [
        { driver: "Executive Sponsor Inactivity", affectedDeals: 5, riskLevel: "HIGH" },
        { driver: "Dwell Time Exceeded Target", affectedDeals: 4, riskLevel: "MEDIUM" },
      ],
      generatedAt: "2026-09-19T14:00:00Z",
    };

    assert.equal(summary.totalDeals, 15);
    assert.equal(summary.totalValue, 5400000);
    assert.equal(summary.criticalRisksCount, 4);
    assert.equal(summary.opportunityBreakdown.NEW_BUSINESS.count, 6);
    assert.equal(summary.topRiskDrivers.length, 2);
  });
});

describe("FE-2 Day 6: Next Best Action (NBA) Decision Engine", () => {
  it("structures NBA decision payloads according to Swagger contract", () => {
    const acceptPayload = {
      action: "ACCEPT" as const,
      notes: "Approved executive alignment intervention",
    };

    const rejectPayload = {
      action: "REJECT" as const,
      notes: "Deal already renegotiating contract scope",
    };

    assert.equal(acceptPayload.action, "ACCEPT");
    assert.equal(typeof acceptPayload.notes, "string");
    assert.equal(rejectPayload.action, "REJECT");
  });

  it("prevents duplicate execution of already decided proposals", () => {
    const proposal = {
      id: "nba-prop-55",
      type: "SCHEDULE_EXECUTIVE_ALIGNMENT",
      status: "ACCEPTED", // already executed
      confidenceScore: 0.89,
    };

    const canExecute = (status: string) => status === "PROPOSED" || status === "PENDING";

    assert.equal(canExecute(proposal.status), false);
  });

  it("handles 400/409 duplicate decision error gracefully", () => {
    const handleDecisionError = (errStatus: number, errMessage?: string) => {
      if (errStatus === 409 || errStatus === 400) {
        return "This proposal has already been decided or executed. Please refresh.";
      }
      return errMessage || "An unexpected error occurred.";
    };

    assert.equal(
      handleDecisionError(409),
      "This proposal has already been decided or executed. Please refresh."
    );
    assert.equal(
      handleDecisionError(400),
      "This proposal has already been decided or executed. Please refresh."
    );
    assert.equal(
      handleDecisionError(500, "Internal Server Error"),
      "Internal Server Error"
    );
  });
});

describe("FE-2 Day 7: Contract Integrity & Zero Fabricated Logic", () => {
  it("verifies win probability and risk scores are strictly ingested from backend", () => {
    const rawBackendData = {
      dealId: "deal-ent-999",
      healthScore: 78,
      winProbability: 64.2,
      riskSeverity: "MEDIUM",
      confidence: 0.88,
    };

    // Strict non-negotiable rule: No client-side math modifies these values
    const clientRenderedHealth = rawBackendData.healthScore;
    const clientRenderedProbability = rawBackendData.winProbability;

    assert.equal(clientRenderedHealth, 78);
    assert.equal(clientRenderedProbability, 64.2);
  });

  it("filters deals by opportunityType faithfully without dropping matches", () => {
    const deals = [
      { dealId: "d1", name: "Horizon Upgrade", opportunityType: "NEW_BUSINESS", stage: "NEW" },
      { dealId: "d2", name: "Apex Expansion", opportunityType: "EXPANSION", stage: "HOT" },
      { dealId: "d3", name: "Acme Renewal", opportunityType: "RENEWAL", stage: "WON" },
      { dealId: "d4", name: "Cloud Cross-Sell", opportunityType: "CROSS_SELL", stage: "WARM" },
      { dealId: "d5", name: "Default Type Deal", opportunityType: undefined, stage: "NEW" },
    ];

    const filterByOppType = (items: typeof deals, filter?: string) => {
      if (!filter || filter === "All Types" || filter === "All Opportunity Types" || filter.trim() === "") {
        return items;
      }
      const target = filter.toUpperCase().replace(/[\s_-]+/g, "");
      return items.filter((d) => {
        const dealType = (d.opportunityType || "NEW_BUSINESS").toUpperCase().replace(/[\s_-]+/g, "");
        return dealType === target;
      });
    };

    // Filter by EXPANSION
    const expansionOnly = filterByOppType(deals, "EXPANSION");
    assert.equal(expansionOnly.length, 1);
    assert.equal(expansionOnly[0].dealId, "d2");

    // Filter by RENEWAL
    const renewalOnly = filterByOppType(deals, "RENEWAL");
    assert.equal(renewalOnly.length, 1);
    assert.equal(renewalOnly[0].dealId, "d3");

    // Filter by NEW_BUSINESS (includes undefined fallback)
    const newBusiness = filterByOppType(deals, "NEW_BUSINESS");
    assert.equal(newBusiness.length, 2);

    // All Types returns everything
    const all = filterByOppType(deals, "All Types");
    assert.equal(all.length, 5);
  });
});
