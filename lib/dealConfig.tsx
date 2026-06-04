// lib/dealConfig.ts
import { CheckCircle2, XCircle } from "lucide-react";

export const STAGE_CONFIG: Record<
  string,
  {
    label: string;
    color: string;       // text color class
    borderColor: string; // Tailwind border-t class
    icon?: React.ReactNode;
  }
> = {
  NEW: {
    label: "New",
    color: "text-gray-500",
    borderColor: "border-t-gray-500",
  },
  QUALIFIED: {
    label: "Qualified",
    color: "text-blue-500",
    borderColor: "border-t-blue-500",
  },
  PROPOSAL: {
    label: "Proposal",
    color: "text-purple-500",
    borderColor: "border-t-purple-500",
  },
  NEGOTIATION: {
    label: "Negotiation",
    color: "text-yellow-500",
    borderColor: "border-t-yellow-400",
  },
  WON: {
    label: "Won",
    color: "text-green-500",
    borderColor: "border-t-green-500",
    icon: <CheckCircle2 size={15} className="text-green-500" />,
  },
  LOST: {
    label: "Lost",
    color: "text-red-500",
    borderColor: "border-t-red-500",
    icon: <XCircle size={15} className="text-red-400" />,
  },
};
