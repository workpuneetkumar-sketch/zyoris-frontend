import type { ConvertLeadPayload } from "@/types/customers";

const isUsableSavedBudget = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function getUsableSavedLeadBudget(lead: { estimatedValue?: unknown; budget?: unknown } | undefined): number | undefined {
  if (isUsableSavedBudget(lead?.estimatedValue)) return lead.estimatedValue;
  if (isUsableSavedBudget(lead?.budget)) return lead.budget;
  return undefined;
}

export function getConversionDealAmountError(
  createDeal: boolean,
  amount: number | null | undefined,
  savedLeadBudget: unknown,
): string | null {
  if (!createDeal) return null;
  if (amount === undefined || amount === null) {
    return isUsableSavedBudget(savedLeadBudget)
      ? null
      : "Enter a positive Deal amount or select a Lead with a saved positive budget.";
  }
  if (!Number.isFinite(amount)) return "Deal amount must be a valid number.";
  if (amount <= 0) return "Deal amount must be greater than 0.";
  if (Math.abs(amount * 100 - Math.round(amount * 100)) >= 1e-8) {
    return "Deal amount can have at most 2 decimal places.";
  }
  return null;
}

export function buildLeadConversionRequestPayload(payload: ConvertLeadPayload): ConvertLeadPayload {
  const requestPayload = { ...payload };
  if (!requestPayload.companyId?.trim()) delete requestPayload.companyId;
  if (!requestPayload.ownerId?.trim()) delete requestPayload.ownerId;
  if (!requestPayload.createDeal) {
    delete requestPayload.dealName;
    delete requestPayload.dealAmount;
  } else {
    if (!requestPayload.dealName?.trim()) delete requestPayload.dealName;
    if (requestPayload.dealAmount === undefined || requestPayload.dealAmount === null) {
      delete requestPayload.dealAmount;
    }
  }
  return requestPayload;
}
