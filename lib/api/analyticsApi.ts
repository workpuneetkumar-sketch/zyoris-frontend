// ─────────────────────────────────────────────────────────
// analyticsApi.ts
// All network calls for the Analytics module.
// TypeScript version
// ─────────────────────────────────────────────────────────

// ── Config ───────────────────────────────────────────────

export const BASE_URL = "https://your-api.zyoris.com";
export const TOKEN = "YOUR_BEARER_TOKEN";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface ForecastDatapoint {
    label: string;
    forecast: number;
    upper: number;
    lower: number;
}

export interface Forecast {
    currency: string;
    period_days: number;
    datapoints: ForecastDatapoint[];
}

export interface Demand {
    months: string[];
    demand: number[];
    inventory: number[];
}

export interface Segment {
    name: string;
    share: number;
    color: string;
}

export interface Conversion {
    deal: string;
    company: string;
    stage: string;
    value: number;
    score: number;
}

export interface Driver {
    name: string;
    roi: number;
    impact: number;
    icon: string;
}

export interface Recommendation {
    priority: "high" | "med" | "low";
    icon: string;
    title: string;
    body: string;
}

export interface AnalyticsData {
    forecast: Forecast;
    demand: Demand;
    segments: Segment[];
    conversion: Conversion[];
    drivers: Driver[];
    recommendations: Recommendation[];
}

// ─────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────

export const MOCK_DATA: AnalyticsData = {
    forecast: {
        currency: "USD",
        period_days: 90,
        datapoints: [
            { label: "May 1", forecast: 14000, upper: 15680, lower: 12320 },
            { label: "May 6", forecast: 14500, upper: 16240, lower: 12760 },
            { label: "May 11", forecast: 15200, upper: 17024, lower: 13376 },
            { label: "May 16", forecast: 15900, upper: 17808, lower: 13992 },
            { label: "May 21", forecast: 16800, upper: 18816, lower: 14784 },
            { label: "May 26", forecast: 18100, upper: 20272, lower: 15928 },
            { label: "May 31", forecast: 19400, upper: 21728, lower: 17072 },
            { label: "Jun 5", forecast: 20200, upper: 22624, lower: 17776 },
            { label: "Jun 10", forecast: 21500, upper: 24080, lower: 18920 },
            { label: "Jun 15", forecast: 22800, upper: 25536, lower: 20064 },
            { label: "Jun 20", forecast: 24100, upper: 26992, lower: 21208 },
            { label: "Jun 25", forecast: 25600, upper: 28672, lower: 22528 },
            { label: "Jun 30", forecast: 27000, upper: 30240, lower: 23760 },
        ],
    },

    demand: {
        months: ["Dec", "Jan", "Feb", "Mar", "Apr", "May"],
        demand: [38, 42, 36, 51, 47, 60],
        inventory: [55, 52, 61, 48, 63, 57],
    },

    segments: [
        { name: "High-value Enterprise", share: 0.78, color: "#1a4fc4" },
        { name: "Mid-market Growth", share: 0.55, color: "#1e9e5a" },
        { name: "SMB Transactional", share: 0.42, color: "#f59e0b" },
        { name: "At-risk Churn", share: 0.18, color: "#e05252" },
        { name: "New / Trial", share: 0.30, color: "#9b30b5" },
    ],

    conversion: [
        {
            deal: "Enterprise License Q2",
            company: "Acme Corp",
            stage: "Negotiation",
            value: 8500,
            score: 0.92,
        },
        {
            deal: "Platform Expansion",
            company: "Globex Inc",
            stage: "Proposal",
            value: 5200,
            score: 0.74,
        },
        {
            deal: "API Integration Pack",
            company: "Initech",
            stage: "Demo",
            value: 3100,
            score: 0.61,
        },
        {
            deal: "Starter Bundle",
            company: "Umbrella Ltd",
            stage: "Negotiation",
            value: 1800,
            score: 0.38,
        },
        {
            deal: "Cloud Migration",
            company: "Soylent Corp",
            stage: "Proposal",
            value: 6400,
            score: 0.82,
        },
        {
            deal: "Analytics Add-on",
            company: "Weyland-Yutani",
            stage: "Qualified",
            value: 2200,
            score: 0.49,
        },
    ],

    drivers: [
        {
            name: "Email Campaigns",
            roi: 3.2,
            impact: 4200,
            icon: "envelope",
        },
        {
            name: "Paid Search",
            roi: 2.8,
            impact: 3100,
            icon: "magnifying-glass",
        },
        {
            name: "Referrals",
            roi: 5.1,
            impact: 2700,
            icon: "users",
        },
        {
            name: "Social Ads",
            roi: 1.9,
            impact: 1800,
            icon: "bullhorn",
        },
        {
            name: "Direct / Brand",
            roi: 4.0,
            impact: 3500,
            icon: "star",
        },
    ],

    recommendations: [
        {
            priority: "high",
            icon: "🔴",
            title: "Recover At-risk Segment",
            body: "18% of your customer base shows churn signals.",
        },
        {
            priority: "med",
            icon: "🟡",
            title: "Scale Referral Channel",
            body: "Referrals deliver a 5.1× ROI.",
        },
        {
            priority: "low",
            icon: "🟢",
            title: "Optimise Enterprise Pipeline",
            body: "Enterprise deals have a 78% cluster share.",
        },
        {
            priority: "high",
            icon: "🔴",
            title: "Improve Conversion Rate",
            body: "Current conversion rate sits at 18.7%.",
        },
        {
            priority: "med",
            icon: "🟡",
            title: "Inventory vs. Demand Gap",
            body: "Demand trends outpaced inventory in May.",
        },
        {
            priority: "low",
            icon: "🟢",
            title: "Expand Mid-market Outreach",
            body: "Mid-market Growth segment has strong engagement.",
        },
    ],
};

// ─────────────────────────────────────────────────────────
// Core Fetch Helper
// ─────────────────────────────────────────────────────────

/**
 * Fetches a single analytics endpoint.
 * Falls back to mock data on error.
 */
async function apiFetch<K extends keyof AnalyticsData>(
    path: string,
    mockKey: K
): Promise<AnalyticsData[K]> {
    try {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (TOKEN) {
            headers["Authorization"] = `Bearer ${TOKEN}`;
        }

        const res = await fetch(`${BASE_URL}${path}`, {
            headers,
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.warn(
            `[zyoris] API unavailable for ${path}, using mock.`,
            (err as Error).message
        );

        return MOCK_DATA[mockKey];
    }
}

// ─────────────────────────────────────────────────────────
// Named Endpoint Functions
// ─────────────────────────────────────────────────────────

/** GET /analytics/revenue/forecast */
export const fetchForecast = (): Promise<Forecast> =>
    apiFetch("/analytics/revenue/forecast", "forecast");

/** GET /analytics/demand/trends */
export const fetchDemand = (): Promise<Demand> =>
    apiFetch("/analytics/demand/trends", "demand");

/** GET /analytics/segments */
export const fetchSegments = (): Promise<Segment[]> =>
    apiFetch("/analytics/segments", "segments");

/** GET /analytics/conversion/scores */
export const fetchConversion = (): Promise<Conversion[]> =>
    apiFetch("/analytics/conversion/scores", "conversion");

/** GET /analytics/revenue/drivers */
export const fetchDrivers = (): Promise<Driver[]> =>
    apiFetch("/analytics/revenue/drivers", "drivers");

/** GET /recommendations */
export const fetchRecommendations = (): Promise<Recommendation[]> =>
    apiFetch("/recommendations", "recommendations");

// ─────────────────────────────────────────────────────────
// Fetch All Analytics
// ─────────────────────────────────────────────────────────

/**
 * Fetches all analytics endpoints in parallel.
 */
export async function fetchAllAnalytics(): Promise<AnalyticsData> {
    const [
        forecast,
        demand,
        segments,
        conversion,
        drivers,
        recommendations,
    ] = await Promise.all([
        fetchForecast(),
        fetchDemand(),
        fetchSegments(),
        fetchConversion(),
        fetchDrivers(),
        fetchRecommendations(),
    ]);

    return {
        forecast,
        demand,
        segments,
        conversion,
        drivers,
        recommendations,
    };
}