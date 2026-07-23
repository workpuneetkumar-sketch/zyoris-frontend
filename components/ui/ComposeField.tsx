"use client";

import React, { useRef, useEffect } from 'react';
import { Paperclip, Send, Loader2 } from 'lucide-react';

export interface ComposeFieldProps {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onAttach?: () => void;
  isSubmitting?: boolean;
}

export function ComposeField({
  placeholder = 'Type a message...',
  value,
  onChange,
  onSubmit,
  onAttach,
  isSubmitting = false,
}: ComposeFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Max height of 120px, then scroll
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit();
      }
    }
  };

  return (
    <div className="flex items-end gap-2 p-2 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
      {onAttach && (
        <button
          onClick={onAttach}
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 mb-0.5"
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </button>
      )}
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 max-h-[120px] bg-transparent py-2 px-1 text-sm text-gray-700 placeholder-gray-400 resize-none outline-none focus:ring-0"
      />
      
      <button
        onClick={onSubmit}
        disabled={!value.trim() || isSubmitting}
        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex-shrink-0 mb-0.5 flex items-center justify-center w-[36px] h-[36px]"
        aria-label="Send message"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
      </button>
    </div>
  );
}
