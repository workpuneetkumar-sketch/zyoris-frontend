import React from 'react';
import { AiBadge } from './AiBadge';
import { MapPin, Building2, Calendar, IndianRupee } from 'lucide-react';

interface ExtractionData {
  project?: string | null;
  budget?: number | null;
  city?: string | null;
  timeline?: string | null;
  interest?: string | null;
}

interface AiExtractionCardProps {
  data: ExtractionData;
  className?: string;
}

const formatBudget = (budget?: number | null) => {
  if (!budget) return 'Not specified';
  if (budget >= 10000000) {
    return `₹${(budget / 10000000).toFixed(2)} Cr`;
  } else if (budget >= 100000) {
    return `₹${(budget / 100000).toFixed(2)} L`;
  }
  return `₹${budget.toLocaleString('en-IN')}`;
};

export const AiExtractionCard: React.FC<AiExtractionCardProps> = ({ data, className = "" }) => {
  return (
    <div className={`bg-white/60 backdrop-blur-md border border-purple-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${className}`}>
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-semibold text-gray-900">AI Extraction Summary</h3>
        <AiBadge label="WhatsApp AI" />
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Project / Interest</p>
            <p className="text-sm font-medium text-gray-900 truncate" title={data.project || data.interest || "Not specified"}>
              {data.project || data.interest || "Not specified"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-green-50 text-green-600 rounded-lg shrink-0">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Budget</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {formatBudget(data.budget)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">City</p>
            <p className="text-sm font-medium text-gray-900 truncate" title={data.city || "Not specified"}>
              {data.city || "Not specified"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Timeline</p>
            <p className="text-sm font-medium text-gray-900 truncate" title={data.timeline || "Not specified"}>
              {data.timeline || "Not specified"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
