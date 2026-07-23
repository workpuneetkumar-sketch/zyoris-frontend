import React from 'react';
import { Mail, Send, FileEdit, Trash2, Search, Filter, Star, Clock } from 'lucide-react';
import { LabelChip } from '@/components/ui/LabelChip';

const MOCK_EMAILS = [
  { id: '1', sender: 'Alex Morgan', subject: 'Project Alpha Q3 Report', snippet: 'Attached is the final report for Q3. Please review before the meeting.', time: '10:30 AM', isUnread: true, isStarred: true, labels: [{ label: 'VIP Client', bgColorClass: 'bg-purple-100', textColorClass: 'text-purple-700' }] },
  { id: '2', sender: 'Billing Department', subject: 'Invoice #4928 Due', snippet: 'Your invoice for the period of July is now available and due next week.', time: 'Yesterday', isUnread: false, isStarred: false, labels: [{ label: 'Urgent', bgColorClass: 'bg-red-100', textColorClass: 'text-red-700' }] },
  { id: '3', sender: 'HR Team', subject: 'Upcoming Holiday Schedule', snippet: 'Just a reminder about the office closure dates for next month.', time: 'Jul 20', isUnread: false, isStarred: false, labels: [{ label: 'Internal', bgColorClass: 'bg-gray-200', textColorClass: 'text-gray-800' }] },
];

export function EmailInboxMockup() {
  return (
    <div className="flex h-[600px] w-full max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4">
          <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm shadow-blue-200">
            <FileEdit size={16} />
            Compose
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          <a href="#" className="flex items-center justify-between px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
            <div className="flex items-center gap-3">
              <Mail size={16} /> Inbox
            </div>
            <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">12</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
            <Star size={16} /> Starred
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
            <Clock size={16} /> Snoozed
          </a>
          <a href="#" className="flex items-center justify-between px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
            <div className="flex items-center gap-3">
              <Send size={16} /> Sent
            </div>
          </a>
          <a href="#" className="flex items-center justify-between px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
            <div className="flex items-center gap-3">
              <FileEdit size={16} /> Drafts
            </div>
            <span className="text-gray-400 text-xs font-semibold">2</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
            <Trash2 size={16} /> Trash
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header toolbar */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search emails..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <Filter size={16} />
          </button>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {MOCK_EMAILS.map((email) => (
            <div 
              key={email.id} 
              className={`flex items-center gap-4 px-6 py-4 border-b border-gray-100 cursor-pointer transition-colors group ${
                email.isUnread ? 'bg-white' : 'bg-gray-50/30'
              } hover:bg-gray-50`}
            >
              <div className="flex items-center gap-3 shrink-0">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <button className="text-gray-300 hover:text-yellow-400 transition-colors">
                  <Star size={18} className={email.isStarred ? "fill-yellow-400 text-yellow-400" : ""} />
                </button>
              </div>
              
              <div className="w-48 shrink-0">
                <span className={`text-sm truncate block ${email.isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                  {email.sender}
                </span>
              </div>
              
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="truncate text-sm">
                  <span className={`${email.isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {email.subject}
                  </span>
                  <span className="text-gray-400 mx-2">-</span>
                  <span className="text-gray-500">{email.snippet}</span>
                </div>
                {email.labels.map((l, i) => (
                  <LabelChip key={i} label={l.label} bgColorClass={l.bgColorClass} textColorClass={l.textColorClass} />
                ))}
              </div>
              
              <div className="w-20 text-right shrink-0">
                <span className={`text-xs ${email.isUnread ? 'font-bold text-blue-600' : 'font-medium text-gray-400'}`}>
                  {email.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
