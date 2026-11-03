'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles } from 'lucide-react';

interface Suggestion {
  text: string;
  category: 'leads' | 'deals' | 'tasks' | 'insights';
  icon: string;
}

const crmSuggestionsByRole: Record<string, Suggestion[]> = {
  CEO: [
    { text: 'How is our deal pipeline performing this month?', category: 'deals', icon: '📈' },
    { text: 'What is our total lead count and conversion rate?', category: 'leads', icon: '🎯' },
    { text: 'What are the top insights generated from recent dataset analysis?', category: 'insights', icon: '💡' },
    { text: 'Which deals are at health risk and need attention?', category: 'deals', icon: '⚠️' },
  ],
  CFO: [
    { text: 'What is the projected revenue in the deal pipeline?', category: 'deals', icon: '💰' },
    { text: 'Show deal health and win probability distribution', category: 'deals', icon: '📊' },
    { text: 'What datasets and financial metrics are available for reporting?', category: 'insights', icon: '📑' },
    { text: 'What tasks require attention before period closing?', category: 'tasks', icon: '✅' },
  ],
  SALES_HEAD: [
    { text: 'What are the most recent leads and their current statuses?', category: 'leads', icon: '👥' },
    { text: 'What deals are currently in the negotiation stage?', category: 'deals', icon: '🤝' },
    { text: 'What happened during the latest lead import job?', category: 'leads', icon: '📥' },
    { text: 'Which sales tasks and activities are pending for my team?', category: 'tasks', icon: '⏰' },
  ],
  ADMIN: [
    { text: 'What is our total deal revenue and pipeline value?', category: 'deals', icon: '💰' },
    { text: 'What is our lead revenue potential and win rate?', category: 'leads', icon: '📈' },
    { text: 'What is the status of recent lead import and extraction jobs?', category: 'leads', icon: '📥' },
    { text: 'What datasets and schemas are loaded in the CRM?', category: 'insights', icon: '🗄️' },
  ],
  DEFAULT: [
    { text: 'How many active leads are currently assigned to me?', category: 'leads', icon: '👤' },
    { text: 'What deals are currently open in the pipeline?', category: 'deals', icon: '💼' },
    { text: 'Which tasks require my immediate attention today?', category: 'tasks', icon: '⚡' },
    { text: 'What recent activities or WhatsApp touchpoints were logged?', category: 'tasks', icon: '💬' },
  ],
};

export function ContextualSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const { user } = useAuth();

  const suggestions = useMemo(() => {
    const roleKey = user?.role ? user.role.toUpperCase() : 'DEFAULT';
    return crmSuggestionsByRole[roleKey] || crmSuggestionsByRole.DEFAULT;
  }, [user?.role]);

  return (
    <div className="w-full py-2">
      <div className="flex items-center gap-1.5 mb-2.5 px-1 text-xs font-semibold text-gray-500">
        <Sparkles size={13} className="text-blue-600 animate-pulse" />
        <span>Suggested CRM questions:</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((sug, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(sug.text)}
            className="flex items-start gap-2 text-left p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-blue-50/70 hover:border-blue-300 text-gray-700 transition-all text-xs group shadow-xs hover:shadow-sm"
          >
            <span className="text-sm select-none flex-shrink-0 group-hover:scale-110 transition-transform">
              {sug.icon}
            </span>
            <span className="leading-snug line-clamp-2 text-[11px] font-medium text-gray-700 group-hover:text-blue-700">
              {sug.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
