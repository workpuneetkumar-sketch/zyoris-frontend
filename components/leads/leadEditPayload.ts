import type { Lead } from "@/types/leads";

interface LeadEditFormData {
    name: string;
    email: string;
    phone: string;
    company: string;
    city: string;
    source: string;
    status: string;
    estimatedValue: string;
    assignedToId: string;
    tags: Array<string | { label?: string }>;
}

export function getLeadEstimatedValueError(value: string): string | null {
    const trimmedValue = value.trim();
    if (trimmedValue === "") return null;

    const amount = Number(trimmedValue);
    if (!Number.isFinite(amount)) return "Estimated Value must be a valid number.";
    if (amount < 0) return "Estimated Value cannot be negative.";
    if (Math.abs(amount * 100 - Math.round(amount * 100)) >= 1e-8) {
        return "Estimated Value can have at most two decimal places.";
    }
    return null;
}

export function buildLeadEditPayload(updatedData: LeadEditFormData): Partial<Lead> {
    const amountInput = updatedData.estimatedValue.trim();
    const amountError = getLeadEstimatedValueError(amountInput);
    if (amountError) throw new Error(amountError);
    const estimatedValue = amountInput === "" ? undefined : Number(amountInput);

    return {
        name: updatedData.name.trim(),
        email: updatedData.email.trim() || undefined,
        phone: updatedData.phone.trim() || undefined,
        company: updatedData.company.trim() || undefined,
        city: updatedData.city.trim() || undefined,
        source: updatedData.source.trim() || undefined,
        status: updatedData.status,
        assignedToId: updatedData.assignedToId.trim() || null,
        tags: updatedData.tags.map((tag) => typeof tag === "string" ? tag : tag.label || ""),
        ...(estimatedValue !== undefined ? { estimatedValue } : {}),
    };
}
