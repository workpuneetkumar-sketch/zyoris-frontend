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