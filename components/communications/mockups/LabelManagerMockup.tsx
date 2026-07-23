import React from 'react';
import { Tag, Plus, Settings2 } from 'lucide-react';
import { LabelChip } from '@/components/ui/LabelChip';

const MOCK_LABELS = [
  { id: '1', label: 'VIP Client', bgColorClass: 'bg-purple-100', textColorClass: 'text-purple-700' },
  { id: '2', label: 'Urgent', bgColorClass: 'bg-red-100', textColorClass: 'text-red-700' },
  { id: '3', label: 'Follow Up', bgColorClass: 'bg-orange-100', textColorClass: 'text-orange-700' },
  { id: '4', label: 'Internal', bgColorClass: 'bg-gray-200', textColorClass: 'text-gray-800' },
  { id: '5', label: 'Invoiced', bgColorClass: 'bg-emerald-100', textColorClass: 'text-emerald-700' },
];

export function LabelManagerMockup() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Tag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Workspace Labels</h2>
            <p className="text-sm text-gray-500">Manage tags for chats and emails</p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
          <Settings2 size={20} />
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        <input 
          type="text" 
          placeholder="New label name..." 
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
        />
        <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all">
          <option>Blue</option>
          <option>Red</option>
          <option>Green</option>
          <option>Purple</option>
          <option>Orange</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={16} /> Add
        </button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Existing Labels</h3>
        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          {MOCK_LABELS.map(label => (
            <LabelChip
              key={label.id}
              label={label.label}
              bgColorClass={label.bgColorClass}
              textColorClass={label.textColorClass}
              onRemove={() => console.log('Remove', label.id)}
              className="px-3 py-1 text-sm"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
