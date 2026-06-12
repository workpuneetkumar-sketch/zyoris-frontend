import { LeadStatus } from "@/types/leads";

export interface LeadStatusInfo {
  label: string;
  emoji: string;
  style: string;
}

const STATUS_INFO: Partial<Record<LeadStatus, LeadStatusInfo>> = {
  NEW: {
    label: "New Lead",
    emoji: "🆕",
    style: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  WARM: {
    label: "Warm Lead",
    emoji: "🌤️",
    style: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  HOT: {
    label: "Hot Lead",
    emoji: "🔥",
    style: "bg-red-50 text-red-700 border border-red-200",
  },
  DEAD: {
    label: "Dead Lead",
    emoji: "🧊",
    style: "bg-gray-50 text-gray-600 border border-gray-200",
  },
};

const LEGACY_STATUS_MAP: Record<string, LeadStatus> = {
  CONTACTED: "WARM",
  QUALIFIED: "HOT",
  PROPOSAL: "HOT",
  NEGOTIATION: "HOT",
  CLOSED: "DEAD",
};

export function getLeadStatusInfo(status: string | null | undefined): LeadStatusInfo {
  // Default to NEW for any null/undefined status
  if (!status) {
    return STATUS_INFO.NEW!;
  }

  // Check if it's a legacy status
  const mappedStatus = LEGACY_STATUS_MAP[status.toUpperCase()];
  if (mappedStatus) {
    return STATUS_INFO[mappedStatus]!;
  }

  // Check if it's a new status (NEW, WARM, HOT, DEAD)
  if (status in STATUS_INFO) {
    return STATUS_INFO[status as keyof typeof STATUS_INFO]!;
  }

  // Fallback to NEW for any unknown status
  return STATUS_INFO.NEW!;
}
