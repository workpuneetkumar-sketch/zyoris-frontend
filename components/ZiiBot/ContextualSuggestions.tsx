'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Users, TrendingUp, CheckSquare, Database } from 'lucide-react';

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
    { text: 'What is the status of recent lead import and extraction jobs?', category: 'leads', icon: '📥' },
    { text: 'What datasets and schemas are loaded in the CRM?', category: 'insights', icon: '🗄️' },
    { text: 'Show recent CRM activity logs and contact touchpoints', category: 'tasks', icon: '📋' },
    { text: 'How do CRM assignment and deduplication workflows work?', category: 'insights', icon: '⚙️' },
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
      <div className="flex items-center gap-1.5 mb-2.5 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <Sparkles size={13} className="text-cyan-500 animate-pulse" />
        <span>Suggested CRM questions:</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((sug, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(sug.text)}
            className="flex items-start gap-2 text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-850/80 hover:bg-blue-50/70 dark:hover:bg-slate-800 hover:border-blue-400/50 dark:hover:border-cyan-500/40 text-slate-700 dark:text-slate-300 transition-all text-xs group shadow-sm hover:shadow"
          >
            <span className="text-sm select-none flex-shrink-0 group-hover:scale-110 transition-transform">
              {sug.icon}
            </span>
            <span className="leading-snug line-clamp-2 text-[11px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-cyan-400">
              {sug.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
