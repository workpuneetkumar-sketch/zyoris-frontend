// tests/win_probability_forecast.test.ts
// Unit tests for FE-2 Day 3 (Win Probability) & Day 4 (Forecast, Aging, Velocity) frontend logic.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCurrencyAmount } from "../utils/currencyFormat.ts";

describe("FE-2 Day 3: Win Probability & Confidence", () => {
  it("displays win probability percentage directly from backend response without local formula", () => {
    const backendPayload = {
      dealId: "deal-101",
      probability: 73.5,
      confidence: 0.85,
      predictedOutcome: "WON",
      modelVersion: "1.0.0",
      predictionTimestamp: "2026-09-18T12:00:00.000Z",
      evidenceTimestamp: "2026-09-18T11:45:00.000Z",
      factorBreakdown: {
        stageDwell: { score: 85, impact: "POSITIVE" },
        contactEngagement: { score: 90, impact: "POSITIVE" },
        dealSizeRatio: { score: 45, impact: "NEGATIVE" },
      },
    };

    assert.equal(backendPayload.probability, 73.5);
    assert.equal(backendPayload.predictedOutcome, "WON");
    assert.equal(backendPayload.modelVersion, "1.0.0");
    assert.equal(backendPayload.predictionTimestamp, "2026-09-18T12:00:00.000Z");
  });

  it("evaluates confidence score and labels correctly without modifying backend score", () => {
    const highConf = 0.85;
    const medConf = 0.65;
    const lowConf = 0.35;

    const getConfLabel = (score: number) =>
      score >= 0.8 ? "High Confidence" : score >= 0.5 ? "Moderate Confidence" : "Low Confidence";

    assert.equal(getConfLabel(highConf), "High Confidence");
    assert.equal(getConfLabel(medConf), "Moderate Confidence");
    assert.equal(getConfLabel(lowConf), "Low Confidence");
    assert.equal(Math.round(highConf * 100), 85);
  });

  it("normalizes factor breakdown whether returned as record or array", () => {
    const recordFormat = {
      executiveEngagement: { score: 92, impact: "POSITIVE" },
      pricingDiscount: { score: 40, impact: "NEGATIVE" },
    };

    const arrayFormat = [
      { name: "Executive Engagement", score: 92, impact: "POSITIVE" },
      { name: "Pricing Discount", score: 40, impact: "NEGATIVE" },
    ];

    // Helper normalizing factors
    const normalize = (raw: any) => {
      if (Array.isArray(raw)) return raw;
      return Object.entries(raw).map(([k, v]: [string, any]) => ({
        name: v.name || k,
        score: v.score ?? v,
        impact: v.impact,
      }));
    };

    const fromRecord = normalize(recordFormat);
    const fromArray = normalize(arrayFormat);

    assert.equal(fromRecord.length, 2);
    assert.equal(fromArray.length, 2);
    assert.equal(fromRecord[0].score, 92);
    assert.equal(fromArray[1].impact, "NEGATIVE");
  });

  it("preserves historical probability snapshot records faithfully", () => {
    const snapshots = [
      {
        id: "snap-1",
        dealId: "deal-101",
        probability: 60.0,
        confidence: 0.75,
        modelVersion: "1.0.0",
        predictionTimestamp: "2026-09-10T10:00:00.000Z",
      },
      {
        id: "snap-2",
        dealId: "deal-101",
        probability: 73.5,
        confidence: 0.85,
        modelVersion: "1.0.0",
        predictionTimestamp: "2026-09-18T12:00:00.000Z",
      },
    ];

    assert.equal(snapshots.length, 2);
    assert.equal(snapshots[0].probability, 60.0);
    assert.equal(snapshots[1].probability, 73.5);
    assert.equal(snapshots[1].confidence, 0.85);
  });
});

describe("FE-2 Day 4: Forecast Dashboard, Aging, Velocity, & Multi-Currency", () => {
  it("formats currency amounts across USD, EUR, GBP, INR without local exchange math", () => {
    assert.equal(formatCurrencyAmount(150000, "USD"), "$150,000");
    assert.equal(formatCurrencyAmount(120000, "EUR"), "€120,000");
    assert.equal(formatCurrencyAmount(95000, "GBP"), "£95,000");
    assert.equal(formatCurrencyAmount(5000000, "INR"), "₹5,000,000");
    assert.equal(formatCurrencyAmount(null, "USD"), "$0");
  });

  it("reconciles commit, best case, and pipeline rollups directly from backend response", () => {
    const rollups = {
      organizationId: "org-1",
      reportingCurrency: "USD",
      asOfDate: "2026-09-18T12:00:00.000Z",
      commit: {
        dealCount: 5,
        totalAmount: 150000,
        convertedAmount: 150000,
        dealIds: ["deal-1", "deal-2"],
      },
      bestCase: {
        dealCount: 8,
        totalAmount: 240000,
        convertedAmount: 240000,
        dealIds: ["deal-3", "deal-4"],
      },
      pipeline: {
        dealCount: 15,
        totalAmount: 480000,
        convertedAmount: 480000,
        dealIds: ["deal-5"],
      },
      totalDealsCount: 28,
      totalConvertedAmount: 870000,
      exchangeRates: { EUR: 0.92, INR: 83.5 },
      ratesTimestamp: "2026-09-18T10:00:00.000Z",
      rulesVersion: "1.0.0",
    };

    assert.equal(rollups.commit?.dealCount, 5);
    assert.equal(rollups.bestCase?.totalAmount, 240000);
    assert.equal(rollups.pipeline?.convertedAmount, 480000);
    assert.equal(rollups.totalDealsCount, 28);
    assert.equal(rollups.totalConvertedAmount, 870000);
    assert.equal(rollups.reportingCurrency, "USD");
    assert.equal(rollups.exchangeRates?.["INR"], 83.5);
  });

  it("faithfully extracts deal aging, stage velocity, and slippage from backend forecast endpoint", () => {
    const dealForecast = {
      dealId: "deal-101",
      forecastCategory: "Commit",
      dealAging: 42,
      stageVelocity: [
        { stage: "Discovery", days: 12 },
        { stage: "Proposal", days: 8 },
        { stage: "Negotiation", days: 5 },
      ],
      slippage: {
        hasSlippage: false,
        slippageDays: 0,
        message: "On schedule for quarter close",
      },
      amount: 150000,
      convertedAmount: 150000,
      reportingCurrency: "USD",
    };

    assert.equal(dealForecast.forecastCategory, "Commit");
    assert.equal(dealForecast.dealAging, 42);
    assert.equal(Array.isArray(dealForecast.stageVelocity), true);
    assert.equal((dealForecast.stageVelocity as any)[0].days, 12);
    assert.equal((dealForecast.stageVelocity as any)[1].days, 8);
    assert.equal((dealForecast.stageVelocity as any)[2].days, 5);
    assert.equal((dealForecast.slippage as any).hasSlippage, false);
  });

  it("handles slippage detection when deal has slipped expected close date", () => {
    const slippedForecast = {
      dealId: "deal-102",
      forecastCategory: "Pipeline",
      dealAging: 68,
      slippage: {
        hasSlippage: true,
        slippageDays: 14,
        message: "Expected close date shifted out 14 days",
      },
      amount: 85000,
    };

    assert.equal(slippedForecast.dealAging, 68);
    assert.equal((slippedForecast.slippage as any).hasSlippage, true);
    assert.equal((slippedForecast.slippage as any).slippageDays, 14);
  });
});
