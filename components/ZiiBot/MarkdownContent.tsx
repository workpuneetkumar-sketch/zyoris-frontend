"use client";

import React, { useMemo } from "react";
import { Calculator, TrendingUp, DollarSign, Layers } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * High-fidelity, safe parser for CRM assistant responses in crisp light theme.
 * Formats mathematical calculations, deal revenue, lead counts, pipeline metrics,
 * percentages, currency values, bullet lists, markdown tables, and headings beautifully.
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  const elements = useMemo(() => {
    if (!content) return null;

    const lines = content.split("\n");
    const parsed: React.ReactNode[] = [];
    let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
    let tableBuffer: string[] | null = null;

    const flushList = () => {
      if (!listBuffer) return;
      if (listBuffer.type === "ul") {
        parsed.push(
          <ul
            key={`ul-${parsed.length}`}
            className="my-2 space-y-1.5 pl-4 list-disc marker:text-blue-600 text-gray-800"
          >
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        parsed.push(
          <ol
            key={`ol-${parsed.length}`}
            className="my-2 space-y-1.5 pl-4 list-decimal marker:text-blue-600 text-gray-800 font-medium"
          >
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
        const dataRows = rows.slice(1).filter((r) => !r.every((c) => c.replace(/[-:]/g, "").length === 0));

        parsed.push(
          <div
            key={`table-${parsed.length}`}
            className="my-3 overflow-x-auto rounded-xl border border-gray-200 shadow-xs bg-white"
          >
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-gray-700 uppercase font-bold tracking-wider">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 border-b border-gray-200">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-gray-700">
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

      // Markdown table row detection
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        flushList();
        if (!tableBuffer) tableBuffer = [];
        tableBuffer.push(trimmed);
        continue;
      } else if (tableBuffer) {
        flushTable();
      }

      // Check for standalone prominent KPI metric line:
      // e.g. "• Total Revenue: $1,450,000" or "**Deal Value**: $450,000 (+15%)"
      const kpiMatch = trimmed.match(
        /^(?:[•*-]\s*)?\*\*?([A-Za-z\s/&]+)\*\*?:\s*([$€£₹][0-9,]+(?:\.[0-9]+)?(?:\s*(?:[kKmMbB]|million|billion|thousand))?|[0-9,]+(?:\.[0-9]+)?%)(.*)$/
      );
      if (kpiMatch && !trimmed.startsWith("|")) {
        flushList();
        const label = kpiMatch[1].trim();
        const metricValue = kpiMatch[2].trim();
        const extra = kpiMatch[3].trim();

        parsed.push(
          <div
            key={`kpi-${i}`}
            className="my-2 p-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-100 shadow-2xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center flex-shrink-0">
                {metricValue.startsWith("$") || metricValue.startsWith("€") || metricValue.startsWith("₹") ? (
                  <DollarSign size={14} className="text-blue-600" />
                ) : metricValue.endsWith("%") ? (
                  <TrendingUp size={14} className="text-indigo-600" />
                ) : (
                  <Layers size={14} className="text-blue-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                  {label}
                </p>
                <p className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                  {metricValue}
                </p>
              </div>
            </div>
            {extra && (
              <div className="text-xs text-slate-600 pl-2">
                {renderInline(extra)}
              </div>
            )}
          </div>
        );
        continue;
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
          <h4 key={`h3-${i}`} className="text-sm font-bold text-blue-700 mt-3 mb-1">
            {renderInline(trimmed.slice(4))}
          </h4>
        );
        continue;
      }
      if (trimmed.startsWith("## ")) {
        parsed.push(
          <h3
            key={`h2-${i}`}
            className="text-base font-bold text-gray-900 mt-3.5 mb-1.5 pb-1 border-b border-gray-100"
          >
            {renderInline(trimmed.slice(3))}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith("# ")) {
        parsed.push(
          <h2
            key={`h1-${i}`}
            className="text-lg font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-200"
          >
            {renderInline(trimmed.slice(2))}
          </h2>
        );
        continue;
      }

      // Regular paragraph line
      parsed.push(
        <p key={`p-${i}`} className="my-1 leading-relaxed text-gray-800">
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
 * Parses bold, inline code, links, currencies, percentages, counts, and math calculations
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Master regex pattern matching:
  // 1. Bold (**text**)
  // 2. Inline code (`code`)
  // 3. Links ([text](url))
  // 4. Equations (e.g. 15 × $10,000 = $150,000 or 12 / 15 = 80%)
  // 5. Currencies (e.g. $1,450,000, $2.5M, €50,000, ₹10,00,000)
  // 6. Percentages (e.g. +18.5%, 92%, -4%)
  // 7. CRM metrics (e.g. 142 leads, 58 deals, 12 tasks)
  const masterRegex =
    /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\)|(?:\b\d+(?:,\d{3})*(?:\.\d+)?\s*[×x*\/+-]\s*[$€£₹]?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*=\s*[$€£₹]?\d+(?:,\d{3})*(?:\.\d+)?)?\b)|(?:[$€£₹]\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s*(?:[kKmMbB]|million|billion|thousand|lakh|crore))?\b)|(?:[+-]?\b\d+(?:\.\d+)?%\b)|(?:\b\d+(?:,\d{3})*\s+(?:leads|deals|contacts|companies|accounts|tasks|opportunities|stages|pipelines|members|users|invoices|calls|emails)\b))/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = masterRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];

    // 1. Bold
    if (token.startsWith("**") && token.endsWith("**")) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-slate-900">
          {renderInline(boldText)}
        </strong>
      );
    }
    // 2. Inline code / Status pill
    else if (token.startsWith("`") && token.endsWith("`")) {
      const codeText = token.slice(1, -1);
      const isStatus = /^(NEW|QUALIFIED|WON|LOST|IN_PROGRESS|COMPLETED|PENDING|FAILED)$/i.test(
        codeText
      );
      parts.push(
        <span
          key={`c-${match.index}`}
          className={`font-mono text-xs px-1.5 py-0.5 rounded ${
            isStatus
              ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
              : "bg-slate-100 text-slate-800 border border-slate-200 font-mono"
          }`}
        >
          {codeText}
        </span>
      );
    }
    // 3. Links
    else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={`a-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 font-semibold"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    // 4. Equations (contains calculation operators)
    else if (/[×x*\/+-]/.test(token) && /\d/.test(token) && token.length > 3) {
      parts.push(
        <span
          key={`eq-${match.index}`}
          className="inline-flex items-center gap-1 font-mono font-bold text-indigo-900 bg-indigo-50/90 px-2 py-0.5 rounded-lg border border-indigo-200/90 shadow-2xs text-[12px] mx-1"
        >
          <Calculator size={11} className="text-indigo-600 inline" />
          {token}
        </span>
      );
    }
    // 5. Currencies
    else if (/^[$€£₹]/.test(token.trim())) {
      parts.push(
        <span
          key={`curr-${match.index}`}
          className="inline-flex items-center font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/90 shadow-2xs text-[12.5px] mx-0.5"
        >
          {token}
        </span>
      );
    }
    // 6. Percentages
    else if (token.endsWith("%")) {
      parts.push(
        <span
          key={`pct-${match.index}`}
          className="inline-flex items-center font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/90 shadow-2xs text-[12px] mx-0.5"
        >
          {token}
        </span>
      );
    }
    // 7. CRM metrics / counts
    else if (/\b\d/.test(token)) {
      parts.push(
        <span
          key={`cnt-${match.index}`}
          className="inline-flex items-center font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-[12px] mx-0.5"
        >
          {token}
        </span>
      );
    } else {
      parts.push(token);
    }

    lastIndex = masterRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
