export const STAGE_CHIP: Record<string, string> = {
    Negotiation: "bg-orange-50 text-orange-600",
    Proposal: "bg-blue-50 text-blue-600",
    Qualified: "bg-green-50 text-green-600",
    Demo: "bg-violet-50 text-violet-600",
};

export const PRIORITY_BORDER: Record<string, string> = {
    high: "border-l-red-400",
    med: "border-l-amber-400",
    low: "border-l-green-500",
};

export const PRIORITY_TAG: Record<string, { cls: string; label: string }> = {
    high: { cls: "bg-red-50 text-red-600", label: "High Priority" },
    med: { cls: "bg-amber-50 text-amber-600", label: "Medium Priority" },
    low: { cls: "bg-green-50 text-green-600", label: "Low Priority" },
};

export const SOURCE_COLORS = [
    "#1a4fc4",
    "#4477d4",
    "#6e9ce0",
    "#a8c4f0",
    "#d0e1f9",
];

// Demo fallback data
const generateDemoDates = (days: number): string[] => {
    const dates: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
};

export const DEMO_FORECAST_90D = {
    currency: "USD",
    period_days: 90,
    datapoints: generateDemoDates(90).map((date, i) => {
        const base = 150000 + (i * 1500) + (Math.sin(i / 10) * 20000);
        return {
            label: date,
            forecast: Math.round(base),
            upper: Math.round(base * 1.1),
            lower: Math.round(base * 0.9),
        };
    }),
};

export const DEMO_FORECAST_30D = {
    ...DEMO_FORECAST_90D,
    period_days: 30,
    datapoints: generateDemoDates(30).map((date, i) => {
        const base = 140000 + (i * 2000) + (Math.sin(i / 5) * 15000);
        return {
            label: date,
            forecast: Math.round(base),
            upper: Math.round(base * 1.1),
            lower: Math.round(base * 0.9),
        };
    }),
};

export const DEMO_FORECAST_7D = {
    ...DEMO_FORECAST_90D,
    period_days: 7,
    datapoints: generateDemoDates(7).map((date, i) => {
        const base = 180000 + (i * 1000);
        return {
            label: date,
            forecast: Math.round(base),
            upper: Math.round(base * 1.08),
            lower: Math.round(base * 0.92),
        };
    }),
};

export const DEMO_FORECAST_1Y = {
    ...DEMO_FORECAST_90D,
    period_days: 365,
    datapoints: generateDemoDates(180).map((date, i) => {
        const base = 120000 + (i * 1000) + (Math.sin(i / 20) * 30000);
        return {
            label: date,
            forecast: Math.round(base),
            upper: Math.round(base * 1.12),
            lower: Math.round(base * 0.88),
        };
    }),
};

export const DEMO_DEMAND = {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    demand: [120, 150, 180, 160, 210, 250, 230, 270, 300, 320, 350, 380],
    inventory: [150, 140, 130, 170, 180, 200, 190, 210, 220, 240, 260, 250],
};

export const DEMO_SEGMENTS = [
    { name: "Enterprise", share: 0.35, color: "#1a4fc4" },
    { name: "Mid-Market", share: 0.30, color: "#4477d4" },
    { name: "SMB", share: 0.20, color: "#6e9ce0" },
    { name: "Startup", share: 0.15, color: "#a8c4f0" },
];

export const DEMO_DRIVERS = {
    totals: {
        totalRevenue: 4500000,
        totalMarketing: 650000,
        totalExpenses: 2800000,
        margin: 1700000,
        marginPct: 0.377,
        marketingRoi: 6.92,
    },
    channels: [
        { name: "Direct Sales", revenue: 1800000, marketing: 200000, expenses: 950000 },
        { name: "Partner Referrals", revenue: 1200000, marketing: 150000, expenses: 700000 },
        { name: "Paid Ads", revenue: 900000, marketing: 250000, expenses: 600000 },
        { name: "Content Marketing", revenue: 450000, marketing: 50000, expenses: 350000 },
        { name: "Organic Search", revenue: 150000, marketing: 0, expenses: 200000 },
    ],
};