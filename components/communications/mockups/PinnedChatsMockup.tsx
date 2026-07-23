import React from 'react';
import { Pin, MessageSquare, Phone } from 'lucide-react';

const PINNED_CHATS = [
  { id: '1', name: 'Acme Corp Team', lastMessage: 'Let\'s review the contract tomorrow.', time: '10:45 AM', unread: 2, isGroup: true },
  { id: '2', name: 'Sarah Jenkins', lastMessage: 'The mockups look great!', time: 'Yesterday', unread: 0, isGroup: false },
  { id: '3', name: 'Support Escalations', lastMessage: 'Ticket #4029 resolved.', time: 'Tue', unread: 0, isGroup: true },
];

export function PinnedChatsMockup() {
  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between sticky top-0">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Pin size={12} className="text-blue-500 fill-blue-500/20" />
          Pinned Conversations
        </h3>
        <span className="text-[10px] font-medium bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
          {PINNED_CHATS.length}
        </span>
      </div>
      
      <div className="flex flex-col">
        {PINNED_CHATS.map((chat) => (
          <div 
            key={chat.id} 
            className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer transition-colors group relative"
          >
            {/* Hover actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-gray-50 pl-2">
              <button className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md transition-colors" title="Unpin">
                <Pin size={14} className="fill-current" />
              </button>
            </div>

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-semibold text-sm">
              {chat.name.charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="text-sm font-medium text-gray-900 truncate pr-2">
                  {chat.name}
                </h4>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {chat.time}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {chat.isGroup ? (
                  <MessageSquare size={12} className="text-gray-400 shrink-0" />
                ) : (
                  <Phone size={12} className="text-gray-400 shrink-0" />
                )}
                <p className="text-xs text-gray-500 truncate">
                  {chat.lastMessage}
                </p>
              </div>
            </div>
            
            {chat.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm shadow-blue-200">
                {chat.unread}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
