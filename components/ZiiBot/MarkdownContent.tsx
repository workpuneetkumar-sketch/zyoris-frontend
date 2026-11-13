"use client";

import React, { useMemo } from "react";
import { Calculator, TrendingUp, DollarSign, Layers } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
  isDark?: boolean;
}

/**
 * High-fidelity, safe parser for OS assistant responses with dual theme support.
 * Formats mathematical calculations, deal revenue, lead counts, pipeline metrics,
 * percentages, currency values, bullet lists, markdown tables, and headings beautifully.
 */
export function MarkdownContent({ content, className = "", isDark = false }: MarkdownContentProps) {
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
            className={`my-2 space-y-1.5 pl-4 list-disc marker:text-emerald-500 ${
              isDark ? "text-zinc-300" : "text-zinc-800"
            }`}
          >
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item, isDark)}
              </li>
            ))}
          </ul>
        );
      } else {
        parsed.push(
          <ol
            key={`ol-${parsed.length}`}
            className={`my-2 space-y-1.5 pl-4 list-decimal marker:text-emerald-500 font-medium ${
              isDark ? "text-zinc-300" : "text-zinc-800"
            }`}
          >
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInline(item, isDark)}
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
            className={`my-3 overflow-x-auto rounded-xl border shadow-xs ${
              isDark ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-white"
            }`}
          >
            <table className="min-w-full text-xs text-left border-collapse">
              <thead
                className={`uppercase font-bold tracking-wider ${
                  isDark ? "bg-zinc-800/80 text-zinc-300" : "bg-zinc-50 text-zinc-700"
                }`}
              >
                <tr>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className={`px-3 py-2 border-b ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
                    >
                      {renderInline(h, isDark)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-zinc-800/60" : "divide-zinc-100"}`}>
                {dataRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`transition-colors ${
                      isDark ? "hover:bg-zinc-800/40" : "hover:bg-zinc-50"
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-3 py-2 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                      >
                        {renderInline(cell, isDark)}
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
            className={`my-2 p-2.5 px-3.5 rounded-xl border flex items-center justify-between ${
              isDark
                ? "bg-zinc-900 border-zinc-800"
                : "bg-zinc-50 border-zinc-200"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDark ? "bg-zinc-800 text-zinc-200" : "bg-zinc-200 text-zinc-800"
                }`}
              >
                {metricValue.startsWith("$") || metricValue.startsWith("€") || metricValue.startsWith("₹") ? (
                  <DollarSign size={14} className={isDark ? "text-emerald-400" : "text-emerald-600"} />
                ) : metricValue.endsWith("%") ? (
                  <TrendingUp size={14} className={isDark ? "text-blue-400" : "text-blue-600"} />
                ) : (
                  <Layers size={14} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider truncate ${
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  {label}
                </p>
                <p
                  className={`text-base font-extrabold font-mono tracking-tight ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  {metricValue}
                </p>
              </div>
            </div>
            {extra && (
              <div className={`text-xs pl-2 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                {renderInline(extra, isDark)}
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
          <h4
            key={`h3-${i}`}
            className={`text-sm font-semibold mt-3 mb-1 ${
              isDark ? "text-zinc-200" : "text-zinc-900"
            }`}
          >
            {renderInline(trimmed.slice(4), isDark)}
          </h4>
        );
        continue;
      }
      if (trimmed.startsWith("## ")) {
        parsed.push(
          <h3
            key={`h2-${i}`}
            className={`text-base font-bold mt-3.5 mb-1.5 pb-1 border-b ${
              isDark ? "text-white border-zinc-800" : "text-zinc-950 border-zinc-200"
            }`}
          >
            {renderInline(trimmed.slice(3), isDark)}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith("# ")) {
        parsed.push(
          <h2
            key={`h1-${i}`}
            className={`text-lg font-bold mt-4 mb-2 pb-1 border-b ${
              isDark ? "text-white border-zinc-800" : "text-zinc-950 border-zinc-200"
            }`}
          >
            {renderInline(trimmed.slice(2), isDark)}
          </h2>
        );
        continue;
      }

      // Regular paragraph line
      parsed.push(
        <p
          key={`p-${i}`}
          className={`my-1 leading-relaxed ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
        >
          {renderInline(trimmed, isDark)}
        </p>
      );
    }

    flushList();
    flushTable();

    return parsed;
  }, [content, isDark]);

  return <div className={`text-sm leading-relaxed ${className}`}>{elements}</div>;
}

/**
 * Parses bold, inline code, links, currencies, percentages, counts, and math calculations
 */
function renderInline(text: string, isDark: boolean = false): React.ReactNode {
  if (!text) return null;

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
        <strong
          key={`b-${match.index}`}
          className={`font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}
        >
          {renderInline(boldText, isDark)}
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
          className={`font-mono text-xs px-1.5 py-0.5 rounded border ${
            isStatus
              ? isDark
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800 font-bold"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
              : isDark
              ? "bg-zinc-800 text-zinc-300 border-zinc-700 font-mono"
              : "bg-zinc-100 text-zinc-800 border-zinc-200 font-mono"
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
            className={`underline font-medium ${
              isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
            }`}
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
          className={`inline-flex items-center gap-1 font-mono font-medium px-2 py-0.5 rounded border text-[12px] mx-1 ${
            isDark
              ? "bg-zinc-800/80 text-zinc-200 border-zinc-700"
              : "bg-zinc-100 text-zinc-800 border-zinc-200"
          }`}
        >
          <Calculator size={11} className={isDark ? "text-zinc-400" : "text-zinc-600"} />
          {token}
        </span>
      );
    }
    // 5. Currencies
    else if (/^[$€£₹]/.test(token.trim())) {
      parts.push(
        <span
          key={`curr-${match.index}`}
          className={`inline-flex items-center font-mono font-semibold px-2 py-0.5 rounded border text-[12px] mx-0.5 ${
            isDark
              ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/60"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
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
          className={`inline-flex items-center font-mono font-semibold px-1.5 py-0.5 rounded border text-[12px] mx-0.5 ${
            isDark
              ? "bg-blue-950/50 text-blue-400 border-blue-800/60"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          {token}
        </span>
      );
    }
    // 7. System metrics / counts
    else if (/\b\d/.test(token)) {
      parts.push(
        <span
          key={`cnt-${match.index}`}
          className={`inline-flex items-center font-mono font-medium px-1.5 py-0.5 rounded border text-[12px] mx-0.5 ${
            isDark
              ? "bg-zinc-800/80 text-zinc-300 border-zinc-700"
              : "bg-zinc-100 text-zinc-800 border-zinc-200"
          }`}
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
