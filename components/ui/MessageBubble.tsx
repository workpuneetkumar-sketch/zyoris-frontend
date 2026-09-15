import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

export type ReadReceiptState = 'sent' | 'delivered' | 'read' | 'none';

export interface MessageBubbleProps {
  content: React.ReactNode;
  timestamp: string;
  isOwnMessage: boolean;
  senderName?: string;
  readReceipt?: ReadReceiptState;
}

export function MessageBubble({
  content,
  timestamp,
  isOwnMessage,
  senderName,
  readReceipt = 'none',
}: MessageBubbleProps) {
  return (
    <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 flex flex-col shadow-sm ${
          isOwnMessage
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        {!isOwnMessage && senderName && (
          <span className="text-xs font-semibold text-blue-600 mb-1">
            {senderName}
          </span>
        )}
        
        <div className="text-sm break-words whitespace-pre-wrap">
          {content}
        </div>
        
        <div 
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
            isOwnMessage ? 'text-blue-200' : 'text-gray-400'
          }`}
        >
          <span>{timestamp}</span>
          
          {isOwnMessage && readReceipt !== 'none' && (
            <span className="ml-1">
              {readReceipt === 'sent' && <Check size={12} />}
              {readReceipt === 'delivered' && <CheckCheck size={12} />}
              {readReceipt === 'read' && <CheckCheck size={12} className="text-blue-300" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
