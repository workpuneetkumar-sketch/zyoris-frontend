"use client";

import React, { useMemo, useState } from "react";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { normalizeMarkdownContent, sanitizeUrl } from "@/lib/markdownSanitizer";

interface MarkdownContentProps {
  content: string;
  className?: string;
  isDark?: boolean;
}

// ─── Code Block Component with Copy Action ───────────────────────

function CodeBlock({
  code,
  language,
  isDark,
}: {
  code: string;
  language?: string;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Failed to copy code:", e);
    }
  };

  const displayLang = language ? language.toUpperCase() : "CODE";

  return (
    <div
      className={`my-3 rounded-xl border overflow-hidden text-xs font-mono select-text transition-all ${
        isDark
          ? "border-zinc-800 bg-[#0d0d0f] shadow-md"
          : "border-blue-200/80 bg-white/95 shadow-2xs"
      }`}
    >
      {/* Code Header Bar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b select-none ${
          isDark
            ? "border-zinc-800 bg-zinc-900/90 text-zinc-400"
            : "border-blue-100 bg-blue-50/70 text-blue-900 font-semibold"
        }`}
      >
        <span className="text-[11px] tracking-wider uppercase font-medium">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all active:scale-95 text-[11px] ${
            isDark
              ? "hover:bg-zinc-800 text-zinc-300 hover:text-white"
              : "hover:bg-blue-100/80 text-blue-700 hover:text-blue-900"
          }`}
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-3.5 overflow-x-auto leading-relaxed text-xs sm:text-[13px] font-mono whitespace-pre scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Nested List Item Data Structure ─────────────────────────────

interface RawListItem {
  indent: number;
  type: "ul" | "ol";
  num?: number;
  text: string;
}

interface NestedListItem {
  type: "ul" | "ol";
  num?: number;
  text: string;
  children: NestedListItem[];
}

function buildNestedList(items: RawListItem[]): NestedListItem[] {
  const root: NestedListItem[] = [];
  const stack: { indent: number; item: NestedListItem }[] = [];

  for (const raw of items) {
    const node: NestedListItem = {
      type: raw.type,
      num: raw.num,
      text: raw.text,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].indent >= raw.indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].item.children.push(node);
    }

    stack.push({ indent: raw.indent, item: node });
  }

  return root;
}

function renderNestedList(
  nodes: NestedListItem[],
  isDark: boolean,
  keyPrefix = "list"
): React.ReactNode {
  if (!nodes || nodes.length === 0) return null;

  const isOrdered = nodes[0].type === "ol";

  if (isOrdered) {
    return (
      <ol
        key={`${keyPrefix}-ol`}
        className={`my-1.5 space-y-1.5 pl-5 list-decimal marker:font-semibold ${
          isDark
            ? "text-zinc-200 marker:text-blue-400"
            : "text-slate-800 marker:text-blue-600"
        }`}
      >
        {nodes.map((node, idx) => (
          <li key={`${keyPrefix}-li-${idx}`} className="leading-relaxed">
            <div>{renderInline(node.text, isDark)}</div>
            {node.children.length > 0 &&
              renderNestedList(node.children, isDark, `${keyPrefix}-${idx}`)}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul
      key={`${keyPrefix}-ul`}
      className={`my-1.5 space-y-1.5 pl-5 list-disc marker:text-xs ${
        isDark
          ? "text-zinc-200 marker:text-blue-400"
          : "text-slate-800 marker:text-blue-500"
      }`}
    >
      {nodes.map((node, idx) => (
        <li key={`${keyPrefix}-li-${idx}`} className="leading-relaxed">
          <div>{renderInline(node.text, isDark)}</div>
          {node.children.length > 0 &&
            renderNestedList(node.children, isDark, `${keyPrefix}-${idx}`)}
        </li>
      ))}
    </ul>
  );
}

// ─── Table Parser & Renderer ─────────────────────────────────────

function parseTableBlock(
  tableLines: string[],
  key: string,
  isDark: boolean
): React.ReactNode {
  if (tableLines.length < 2) return null;

  // Split lines into cells
  const parseRow = (line: string): string[] => {
    let trimmed = line.trim();
    if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
    if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
    return trimmed.split("|").map((c) => c.trim());
  };

  const headerRow = parseRow(tableLines[0]);
  const separatorRow = parseRow(tableLines[1]);

  // Check if second row is a valid separator
  const isSeparator = separatorRow.every((c) => /^:?-+:?$/.test(c.trim()));
  if (!isSeparator) {
    // If not a standard table, return lines as paragraphs
    return (
      <div key={key} className="my-2 space-y-1">
        {tableLines.map((l, idx) => (
          <p key={idx}>{renderInline(l, isDark)}</p>
        ))}
      </div>
    );
  }

  // Parse alignments
  const alignments: ("left" | "center" | "right")[] = separatorRow.map((c) => {
    const s = c.trim();
    if (s.startsWith(":") && s.endsWith(":")) return "center";
    if (s.endsWith(":")) return "right";
    return "left";
  });

  const dataRows = tableLines.slice(2).map(parseRow);

  return (
    <div
      key={key}
      className={`my-3 overflow-x-auto rounded-xl border shadow-2xs ${
        isDark
          ? "border-zinc-800 bg-zinc-900/60"
          : "border-blue-200/80 bg-white/95"
      }`}
    >
      <table className="min-w-full text-xs text-left border-collapse">
        <thead
          className={`uppercase font-bold tracking-wider ${
            isDark
              ? "bg-zinc-800/80 text-zinc-300"
              : "bg-blue-50/90 text-blue-900 border-b border-blue-200/70"
          }`}
        >
          <tr>
            {headerRow.map((h, i) => (
              <th
                key={i}
                style={{ textAlign: alignments[i] || "left" }}
                className={`px-3.5 py-2.5 border-b font-semibold ${
                  isDark ? "border-zinc-800" : "border-blue-200/70"
                }`}
              >
                {renderInline(h, isDark)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={`divide-y ${
            isDark ? "divide-zinc-800/60" : "divide-blue-100/60"
          }`}
        >
          {dataRows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`transition-colors ${
                isDark
                  ? "hover:bg-zinc-800/40"
                  : rIdx % 2 === 0
                  ? "bg-white/80 hover:bg-blue-50/50"
                  : "bg-blue-50/25 hover:bg-blue-50/50"
              }`}
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  style={{ textAlign: alignments[cIdx] || "left" }}
                  className={`px-3.5 py-2 leading-relaxed ${
                    isDark ? "text-zinc-300" : "text-slate-700"
                  }`}
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

// ─── Main MarkdownContent Component ──────────────────────────────

export function MarkdownContent({
  content,
  className = "",
  isDark = false,
}: MarkdownContentProps) {
  const elements = useMemo(() => {
    if (!content) return null;

    // 1. Contextual pre-normalization of escaped tags, entities, backslashes, etc.
    const normalized = normalizeMarkdownContent(content);
    const lines = normalized.split("\n");

    const parsed: React.ReactNode[] = [];
    let listBuffer: RawListItem[] = [];
    let tableBuffer: string[] = [];
    let blockquoteBuffer: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = "";
    let codeLines: string[] = [];

    const flushList = () => {
      if (listBuffer.length === 0) return;
      const nested = buildNestedList(listBuffer);
      parsed.push(
        renderNestedList(nested, isDark, `list-${parsed.length}`)
      );
      listBuffer = [];
    };

    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      parsed.push(
        parseTableBlock(tableBuffer, `table-${parsed.length}`, isDark)
      );
      tableBuffer = [];
    };

    const flushBlockquote = () => {
      if (blockquoteBuffer.length === 0) return;
      const text = blockquoteBuffer.join("\n");
      parsed.push(
        <blockquote
          key={`quote-${parsed.length}`}
          className={`my-2.5 pl-3.5 py-1.5 border-l-2 rounded-r italic leading-relaxed ${
            isDark
              ? "border-blue-500/80 bg-zinc-900/60 text-zinc-300"
              : "border-blue-500 bg-blue-50/50 text-slate-700"
          }`}
        >
          {text.split("\n").map((line, idx) => (
            <p key={idx} className="my-0.5">
              {renderInline(line, isDark)}
            </p>
          ))}
        </blockquote>
      );
      blockquoteBuffer = [];
    };

    const flushAllBuffers = () => {
      flushList();
      flushTable();
      flushBlockquote();
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ─── Fenced Code Block Handling ─────────────────────────────
      if (line.trim().startsWith("```")) {
        flushAllBuffers();

        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
          codeLines = [];
          continue;
        } else {
          // Closing code fence
          inCodeBlock = false;
          parsed.push(
            <CodeBlock
              key={`code-${parsed.length}`}
              code={codeLines.join("\n")}
              language={codeLanguage}
              isDark={isDark}
            />
          );
          codeLines = [];
          codeLanguage = "";
          continue;
        }
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      const trimmed = line.trim();

      // ─── Markdown Tables ─────────────────────────────────────────
      if (trimmed.includes("|") && (trimmed.startsWith("|") || trimmed.endsWith("|") || /\|.*\|/.test(trimmed))) {
        // Table row candidate
        flushList();
        flushBlockquote();
        tableBuffer.push(trimmed);
        continue;
      } else if (tableBuffer.length > 0) {
        flushTable();
      }

      // ─── Blockquotes ─────────────────────────────────────────────
      if (trimmed.startsWith(">")) {
        flushList();
        flushTable();
        const quoteText = trimmed.replace(/^>\s?/, "");
        blockquoteBuffer.push(quoteText);
        continue;
      } else if (blockquoteBuffer.length > 0) {
        flushBlockquote();
      }

      // ─── Horizontal Rule ─────────────────────────────────────────
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        flushAllBuffers();
        parsed.push(
          <hr
            key={`hr-${i}`}
            className={`my-3 border-t ${
              isDark ? "border-zinc-800" : "border-blue-200/70"
            }`}
          />
        );
        continue;
      }

      // ─── KPI Metric Cards (CRM Specialized formatting) ───────────
      const kpiMatch = trimmed.match(
        /^(?:[•*-]\s*)?\*\*?([A-Za-z\s/&]+)\*\*?:\s*([$€£₹][0-9,]+(?:\.[0-9]+)?(?:\s*(?:[kKmMbB]|million|billion|thousand))?|[0-9,]+(?:\.[0-9]+)?%)(.*)$/
      );
      if (kpiMatch && !trimmed.startsWith("|") && !trimmed.startsWith("#")) {
        flushAllBuffers();
        const label = kpiMatch[1].trim();
        const metricValue = kpiMatch[2].trim();
        const extra = kpiMatch[3].trim();

        parsed.push(
          <div
            key={`kpi-${i}`}
            className={`my-2 p-2.5 px-3.5 rounded-xl border flex items-center justify-between ${
              isDark
                ? "bg-zinc-900 border-zinc-800"
                : "bg-gradient-to-r from-blue-50/80 to-sky-50/60 border-blue-200/80 shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDark
                    ? "bg-zinc-800 text-zinc-200"
                    : "bg-white text-blue-700 border border-blue-200/70 shadow-2xs"
                }`}
              >
                {metricValue.startsWith("$") ||
                metricValue.startsWith("€") ||
                metricValue.startsWith("₹") ? (
                  <DollarSign
                    size={14}
                    className={isDark ? "text-emerald-400" : "text-emerald-600"}
                  />
                ) : metricValue.endsWith("%") ? (
                  <TrendingUp
                    size={14}
                    className={isDark ? "text-blue-400" : "text-blue-600"}
                  />
                ) : (
                  <Layers
                    size={14}
                    className={isDark ? "text-zinc-300" : "text-blue-600"}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider truncate ${
                    isDark ? "text-zinc-400" : "text-blue-700 font-semibold"
                  }`}
                >
                  {label}
                </p>
                <p
                  className={`text-base font-extrabold font-mono tracking-tight ${
                    isDark ? "text-white" : "text-blue-950 font-extrabold"
                  }`}
                >
                  {metricValue}
                </p>
              </div>
            </div>
            {extra && (
              <div
                className={`text-xs pl-2 ${
                  isDark ? "text-zinc-400" : "text-slate-600"
                }`}
              >
                {renderInline(extra, isDark)}
              </div>
            )}
          </div>
        );
        continue;
      }

      // ─── Lists (with arbitrary Nesting & Mixed bullet/numbered) ───
      const listMatch = line.match(/^(\s*)([-*+•]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        flushTable();
        flushBlockquote();

        const indentSpaces = listMatch[1].replace(/\t/g, "  ").length;
        const marker = listMatch[2];
        const itemText = listMatch[3];
        const isNum = /^\d+\.$/.test(marker);

        listBuffer.push({
          indent: indentSpaces,
          type: isNum ? "ol" : "ul",
          num: isNum ? parseInt(marker, 10) : undefined,
          text: itemText,
        });
        continue;
      } else if (listBuffer.length > 0) {
        flushList();
      }

      // ─── Blank Lines ─────────────────────────────────────────────
      if (!trimmed) {
        flushAllBuffers();
        parsed.push(<div key={`sp-${i}`} className="h-1.5" />);
        continue;
      }

      // ─── Headings (H1 to H6) ──────────────────────────────────────
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushAllBuffers();
        const level = headingMatch[1].length;
        const titleText = headingMatch[2];

        switch (level) {
          case 1:
            parsed.push(
              <h1
                key={`h1-${i}`}
                className={`text-lg font-bold mt-4 mb-2 pb-1 border-b ${
                  isDark
                    ? "text-white border-zinc-800"
                    : "text-slate-900 border-blue-200/70"
                }`}
              >
                {renderInline(titleText, isDark)}
              </h1>
            );
            break;
          case 2:
            parsed.push(
              <h2
                key={`h2-${i}`}
                className={`text-base font-bold mt-3.5 mb-1.5 pb-1 border-b ${
                  isDark
                    ? "text-zinc-100 border-zinc-800/80"
                    : "text-slate-900 border-blue-100"
                }`}
              >
                {renderInline(titleText, isDark)}
              </h2>
            );
            break;
          case 3:
            parsed.push(
              <h3
                key={`h3-${i}`}
                className={`text-sm font-semibold mt-3 mb-1 ${
                  isDark ? "text-zinc-200" : "text-blue-950 font-semibold"
                }`}
              >
                {renderInline(titleText, isDark)}
              </h3>
            );
            break;
          case 4:
            parsed.push(
              <h4
                key={`h4-${i}`}
                className={`text-xs font-semibold uppercase tracking-wider mt-2.5 mb-1 ${
                  isDark ? "text-zinc-300" : "text-slate-700 font-semibold"
                }`}
              >
                {renderInline(titleText, isDark)}
              </h4>
            );
            break;
          default:
            parsed.push(
              <h5
                key={`h5-${i}`}
                className={`text-xs font-medium mt-2 mb-0.5 ${
                  isDark ? "text-zinc-400" : "text-slate-600"
                }`}
              >
                {renderInline(titleText, isDark)}
              </h5>
            );
            break;
        }
        continue;
      }

      // ─── Regular Paragraph ───────────────────────────────────────
      parsed.push(
        <p
          key={`p-${i}`}
          className={`my-1.5 leading-relaxed ${
            isDark ? "text-zinc-200" : "text-slate-800"
          }`}
        >
          {renderInline(trimmed, isDark)}
        </p>
      );
    }

    // Flush any leftover buffers
    if (inCodeBlock && codeLines.length > 0) {
      parsed.push(
        <CodeBlock
          key={`code-${parsed.length}`}
          code={codeLines.join("\n")}
          language={codeLanguage}
          isDark={isDark}
        />
      );
    }
    flushAllBuffers();

    return parsed;
  }, [content, isDark]);

  return (
    <div
      className={`text-xs sm:text-sm leading-relaxed break-words overflow-hidden ${className}`}
    >
      {elements}
    </div>
  );
}

// ─── Inline Tokenizer ────────────────────────────────────────────

export function renderInline(
  text: string,
  isDark: boolean = false
): React.ReactNode {
  if (!text) return null;

  // Master Inline Regex prioritizing distinct markdown elements:
  // 1. Bold + Italic: ***text*** or ___text___
  // 2. Bold: **text** or __text__
  // 3. Strikethrough: ~~text~~
  // 4. Italic: *text* or _text_
  // 5. Inline Code: `code`
  // 6. Links: [label](url)
  // 7. Equations: e.g. 5 × $25,000 = $125,000
  // 8. Currencies: $145,000, €50,000, ₹10,000
  // 9. Percentages: 78%, +15.5%
  // 10. System counts: e.g. "10 leads", "5 deals"
  const masterRegex =
    /(\*\*\*.*?\*\*\*|___.*?___|\*\*.*?\*\*|__.*?__|~~.*?~~|(?:\*|_)[^*_\n]+(?:\*|_)|`.*?`|\[.*?\]\(.*?\)|(?:\b\d+(?:,\d{3})*(?:\.\d+)?\s*[×x*\/+-]\s*[$€£₹]?\d+(?:,\d{3})*(?:\.\d+)?\s*=\s*[$€£₹]?\d+(?:,\d{3})*(?:\.\d+)?\b)|(?:[$€£₹]\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s*(?:[kKmMbB]|million|billion|thousand|lakh|crore))?\b)|(?:[+-]?\b\d+(?:\.\d+)?%\b)|(?:\b\d+(?:,\d{3})*\s+(?:leads|deals|contacts|companies|accounts|tasks|opportunities|stages|pipelines|members|users|invoices|calls|emails)\b))/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = masterRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];

    // 1. Bold + Italic
    if (
      (token.startsWith("***") && token.endsWith("***") && token.length >= 6) ||
      (token.startsWith("___") && token.endsWith("___") && token.length >= 6)
    ) {
      const inner = token.slice(3, -3);
      parts.push(
        <strong
          key={`bi-${match.index}`}
          className={`font-bold italic ${isDark ? "text-white" : "text-slate-950"}`}
        >
          {renderInline(inner, isDark)}
        </strong>
      );
    }
    // 2. Bold
    else if (
      (token.startsWith("**") && token.endsWith("**") && token.length >= 4) ||
      (token.startsWith("__") && token.endsWith("__") && token.length >= 4)
    ) {
      const inner = token.slice(2, -2);
      parts.push(
        <strong
          key={`b-${match.index}`}
          className={`font-semibold ${isDark ? "text-white" : "text-slate-950"}`}
        >
          {renderInline(inner, isDark)}
        </strong>
      );
    }
    // 3. Strikethrough
    else if (token.startsWith("~~") && token.endsWith("~~") && token.length >= 4) {
      const inner = token.slice(2, -2);
      parts.push(
        <del
          key={`del-${match.index}`}
          className="line-through opacity-70"
        >
          {renderInline(inner, isDark)}
        </del>
      );
    }
    // 4. Italic
    else if (
      (token.startsWith("*") && token.endsWith("*") && token.length >= 2) ||
      (token.startsWith("_") && token.endsWith("_") && token.length >= 2)
    ) {
      const inner = token.slice(1, -1);
      parts.push(
        <em
          key={`i-${match.index}`}
          className={`italic ${isDark ? "text-zinc-200" : "text-slate-800"}`}
        >
          {renderInline(inner, isDark)}
        </em>
      );
    }
    // 5. Inline Code / Status Pill
    else if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      const codeText = token.slice(1, -1);
      const isStatus = /^(NEW|QUALIFIED|WON|LOST|HOT|WARM|IN_PROGRESS|COMPLETED|PENDING|FAILED|ACTIVE)$/i.test(
        codeText
      );

      parts.push(
        <span
          key={`code-${match.index}`}
          className={`font-mono text-xs px-1.5 py-0.5 rounded border select-text ${
            isStatus
              ? isDark
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800 font-bold"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
              : isDark
              ? "bg-zinc-800 text-zinc-300 border-zinc-700"
              : "bg-blue-50/80 text-blue-900 border-blue-200/70"
          }`}
        >
          {codeText}
        </span>
      );
    }
    // 6. Links [title](url)
    else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        const title = linkMatch[1];
        const rawUrl = linkMatch[2];
        const safeUrl = sanitizeUrl(rawUrl);

        parts.push(
          <a
            key={`a-${match.index}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline font-medium transition-colors ${
              isDark
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-600 hover:text-blue-800"
            }`}
          >
            {title}
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    // 7. Equations
    else if (token.includes("=") && /[×x*\/+-]/.test(token) && /\d/.test(token)) {
      parts.push(
        <span
          key={`eq-${match.index}`}
          className={`inline-flex items-center gap-1 font-mono font-medium px-2 py-0.5 rounded border text-[12px] mx-1 ${
            isDark
              ? "bg-zinc-800/80 text-zinc-200 border-zinc-700"
              : "bg-blue-50/70 text-blue-900 border-blue-200/70"
          }`}
        >
          <Calculator size={11} className={isDark ? "text-zinc-400" : "text-blue-600"} />
          {token}
        </span>
      );
    }
    // 8. Currency values
    else if (/^[$€£₹]/.test(token.trim())) {
      parts.push(
        <span
          key={`curr-${match.index}`}
          className={`inline-flex items-center font-mono font-semibold px-1.5 py-0.5 rounded border text-[12px] mx-0.5 ${
            isDark
              ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/60"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          {token}
        </span>
      );
    }
    // 9. Percentage values
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
    // 10. System counts
    else if (/\b\d/.test(token)) {
      parts.push(
        <span
          key={`cnt-${match.index}`}
          className={`inline-flex items-center font-mono font-medium px-1.5 py-0.5 rounded border text-[12px] mx-0.5 ${
            isDark
              ? "bg-zinc-800/80 text-zinc-300 border-zinc-700"
              : "bg-blue-50/80 text-blue-800 border-blue-200/80"
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
