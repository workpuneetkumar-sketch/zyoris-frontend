"use client";

import React, { useState, useRef } from "react";
import { X, PlusCircle } from "lucide-react";

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagsInput({ tags, onChange }: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().replace(/,$/, "");
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleAddClick = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center flex-wrap gap-2 p-2 border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="p-0.5 hover:bg-indigo-100 rounded-full"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="flex flex-1 items-center min-w-[120px]">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          className="flex-1 border-none outline-none text-sm bg-transparent py-1"
        />
        <button
          type="button"
          onClick={handleAddClick}
          disabled={!inputValue.trim()}
          className="ml-1 p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-full"
          title="Add tag"
        >
          <PlusCircle size={18} />
        </button>
      </div>
    </div>
  );
}