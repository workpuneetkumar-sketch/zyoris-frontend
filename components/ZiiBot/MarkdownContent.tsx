"use client";

import React, { useMemo } from "react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Lightweight, safe parser for CRM assistant responses.
 * Supports bold, italic, code blocks, bullet/numbered lists, tables, and headers.
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  const elements = useMemo(() => {
    if (!content) return null;

    // Split content by paragraphs/blocks
    const lines = content.split("\n");
    const parsed: React.ReactNode[] = [];
    let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
    let tableBuffer: string[] | null = null;

    const flushList = () => {
      if (!listBuffer) return;
      if (listBuffer.type === "ul") {
        parsed.push(
          <ul key={`ul-${parsed.length}`} className="my-2 space-y-1 pl-4 list-disc marker:text-cyan-500">
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        parsed.push(
          <ol key={`ol-${parsed.length}`} className="my-2 space-y-1 pl-4 list-decimal marker:text-blue-500 font-medium">
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      listBuffer = null;
    };

    const flushTable = () => {
      if (!tableBuffer || tableBuffer.length === 0) return;
      const rows = tableBuffer
        .filter((l) => l.trim().startsWith("|") && l.includes("|"))
        .map((l) =>
          l
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );

      if (rows.length >= 2) {
        const headers = rows[0];
        // Skip separator row (e.g. |---|---|)
        const dataRows = rows.slice(1).filter((r) => !r.every((c) => c.replace(/[-:]/g, "").length === 0));

        parsed.push(
          <div key={`table-${parsed.length}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800/80 text-slate-200 uppercase font-semibold">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 border-b border-slate-700">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-300">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table row detection
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        flushList();
        if (!tableBuffer) tableBuffer = [];
        tableBuffer.push(trimmed);
        continue;
      } else if (tableBuffer) {
        flushTable();
      }

      // Unordered list item
      if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemText = trimmed.slice(2);
        if (!listBuffer || listBuffer.type !== "ul") {
          flushList();
          listBuffer = { type: "ul", items: [] };
        }
        listBuffer.items.push(itemText);
        continue;
      }

      // Ordered list item
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const itemText = numMatch[2];
        if (!listBuffer || listBuffer.type !== "ol") {
          flushList();
          listBuffer = { type: "ol", items: [] };
        }
        listBuffer.items.push(itemText);
        continue;
      }

      // Not in a list, flush any active list
      flushList();

      if (!trimmed) {
        parsed.push(<div key={`sp-${i}`} className="h-2" />);
        continue;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        parsed.push(
          <h4 key={`h3-${i}`} className="text-sm font-bold text-cyan-400 mt-3 mb-1">
            {renderInline(trimmed.slice(4))}
          </h4>
        );
        continue;
      }
      if (trimmed.startsWith("## ")) {
        parsed.push(
          <h3 key={`h2-${i}`} className="text-base font-bold text-white mt-3.5 mb-1.5 pb-1 border-b border-slate-700/60">
            {renderInline(trimmed.slice(3))}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith("# ")) {
        parsed.push(
          <h2 key={`h1-${i}`} className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-700">
            {renderInline(trimmed.slice(2))}
          </h2>
        );
        continue;
      }

      // Regular paragraph line
      parsed.push(
        <p key={`p-${i}`} className="my-1 leading-relaxed text-inherit">
          {renderInline(trimmed)}
        </p>
      );
    }

    flushList();
    flushTable();

    return parsed;
  }, [content]);

  return <div className={`text-sm leading-relaxed ${className}`}>{elements}</div>;
}

/**
 * Parses bold, inline code, and status badges within a string line
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split tokens by bold (`**...**`), inline code (`` `...` ``), and links `[text](url)`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-cyan-400 dark:text-cyan-300">
          {boldText}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const codeText = token.slice(1, -1);
      // Status tag badge style
      const isStatus = /^(NEW|QUALIFIED|WON|LOST|IN_PROGRESS|COMPLETED|PENDING|FAILED)$/i.test(codeText);
      parts.push(
        <span
          key={`c-${match.index}`}
          className={`font-mono text-xs px-1.5 py-0.5 rounded ${
            isStatus
              ? "bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold"
              : "bg-slate-800 text-amber-300 font-mono"
          }`}
        >
          {codeText}
        </span>
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={`a-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline hover:text-cyan-300 font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
