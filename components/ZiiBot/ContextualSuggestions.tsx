'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Suggestion {
  text: string;
  icon: string;
}

const roleSuggestions: Record<string, Suggestion[]> = {
  'CEO': [
    { text: 'Show me revenue forecast for next quarter', icon: '📊' },
    { text: 'What are our top growth opportunities?', icon: '🚀' },
    { text: 'How is our pipeline performing?', icon: '📈' },
    { text: 'Recommend cost optimization strategies', icon: '💰' },
    { text: 'What are the key metrics I should track?', icon: '🎯' },
  ],
  'CFO': [
    { text: 'Show me expense breakdown by category', icon: '📊' },
    { text: 'What is our current burn rate?', icon: '🔥' },
    { text: 'Revenue vs expense trend analysis', icon: '📈' },
    { text: 'Investment recommendations for growth', icon: '💡' },
    { text: 'Cash flow forecast for next quarter', icon: '💵' },
  ],
  'SALES_HEAD': [
    { text: 'Show me deal pipeline velocity', icon: '⚡' },
    { text: 'What are our win rates by segment?', icon: '🏆' },
    { text: 'Which leads are most likely to convert?', icon: '🎯' },
    { text: 'Sales team performance overview', icon: '👥' },
    { text: 'How can we improve conversion rates?', icon: '📈' },
  ],
  'OPERATIONS_HEAD': [
    { text: 'Show me resource utilization', icon: '📊' },
    { text: 'Project delivery status overview', icon: '📋' },
    { text: 'Operational efficiency metrics', icon: '⚙️' },
    { text: 'Process improvement suggestions', icon: '🔄' },
    { text: 'What are the bottlenecks in operations?', icon: '🔍' },
  ],
  'ADMIN': [
    { text: 'System health and performance metrics', icon: '🖥️' },
    { text: 'User activity and engagement overview', icon: '👤' },
    { text: 'Data integration status', icon: '🔗' },
    { text: 'Platform security recommendations', icon: '🔒' },
  ],
};

export function ContextualSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (user?.role) {
      const roleSuggest = roleSuggestions[user.role] || roleSuggestions['CEO'];
      setSuggestions(roleSuggest);
    } else {
      setSuggestions(roleSuggestions['CEO']);
    }
  }, [user]);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-2 mt-4 pr-2">
      {suggestions.map((sug, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(sug.text)}
          className="text-[13px] font-medium text-blue-600 bg-white border border-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-full transition-colors shadow-sm"
        >
          {sug.text}
        </button>
      ))}
    </div>
  );
}