"use client";

import React from "react";
import { WorkspaceBlock } from "@/types/workspace";
import { Info, Code, Quote, CheckSquare, Square } from "lucide-react";

interface BlockRendererProps {
  block: WorkspaceBlock;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block }) => {
  if (!block) return null;

  // Extract text/content safely from block properties or text field or content string/object
  const getTextContent = (): string => {
    if (typeof block.content === "string") return block.content;
    if (block.text) return block.text;
    if (block.properties?.title) {
      if (Array.isArray(block.properties.title)) {
        return block.properties.title.map((item: any) => (Array.isArray(item) ? item[0] : item)).join("");
      }
      return String(block.properties.title);
    }
    if (block.content && typeof block.content === "object") {
      if (block.content.text) return String(block.content.text);
      if (block.content.title) return String(block.content.title);
    }
    return "";
  };

  const text = getTextContent();
  const type = block.type ? block.type.toLowerCase() : "paragraph";

  switch (type) {
    case "heading_1":
    case "h1":
      return (
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-6 mb-2 tracking-tight">
          {text || <span className="text-slate-400 italic">Empty heading</span>}
        </h1>
      );

    case "heading_2":
    case "h2":
      return (
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2 tracking-tight">
          {text || <span className="text-slate-400 italic">Empty heading</span>}
        </h2>
      );

    case "heading_3":
    case "h3":
      return (
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-1">
          {text || <span className="text-slate-400 italic">Empty heading</span>}
        </h3>
      );

    case "paragraph":
    case "text":
      return (
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed min-h-[1.5rem] my-1">
          {text}
        </p>
      );

    case "bulleted_list_item":
    case "bullet_list":
      return (
        <div className="flex items-start space-x-2 my-1 pl-2">
          <span className="text-slate-500 font-bold select-none">•</span>
          <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{text}</span>
        </div>
      );

    case "numbered_list_item":
    case "numbered_list":
      return (
        <div className="flex items-start space-x-2 my-1 pl-2">
          <span className="text-slate-500 font-medium select-none">1.</span>
          <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{text}</span>
        </div>
      );

    case "to_do":
    case "todo":
    case "checkbox":
      const isChecked = block.properties?.checked || block.content?.checked || false;
      return (
        <div className="flex items-center space-x-2.5 my-1 pl-1">
          {isChecked ? (
            <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className={`text-slate-700 dark:text-slate-300 ${isChecked ? "line-through text-slate-400" : ""}`}>
            {text}
          </span>
        </div>
      );

    case "quote":
      return (
        <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-1.5 my-3 italic text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 rounded-r">
          <div className="flex items-start space-x-2">
            <Quote className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
            <span>{text}</span>
          </div>
        </blockquote>
      );

    case "code":
      return (
        <div className="my-3 bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800 pb-1">
            <span className="flex items-center space-x-1">
              <Code className="w-3.5 h-3.5" />
              <span>Code</span>
            </span>
          </div>
          <pre>{text}</pre>
        </div>
      );

    case "callout":
      return (
        <div className="my-3 p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-lg flex items-start space-x-3 text-slate-800 dark:text-blue-100">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-relaxed">{text}</div>
        </div>
      );

    case "divider":
      return <hr className="my-6 border-slate-200 dark:border-slate-700" />;

    default:
      return (
        <div className="my-2 p-2.5 bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-500 flex items-center justify-between">
          <span className="font-medium">Unsupported block type: <code className="text-slate-700 dark:text-slate-300 font-mono">{block.type}</code></span>
          {text && <span className="truncate max-w-xs text-slate-400 ml-2">{text}</span>}
        </div>
      );
  }
};
