"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Check, Users } from "lucide-react";
import { EntityOption } from "@/hooks/useSalesEntities";
import { formatLeadOptionLabel, isTechnicalId } from "@/lib/utils/leadDisplay";

export interface SalesLeadDropdownProps {
  leads: EntityOption[];
  selectedId?: string;
  onSelect: (leadId: string, lead?: EntityOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const SalesLeadDropdown: React.FC<SalesLeadDropdownProps> = ({
  leads,
  selectedId = "",
  onSelect,
  placeholder = "-- Choose Lead/Meeting --",
  disabled = false,
  className = "",
  style,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Identify currently selected lead
  const selectedLead = useMemo(() => {
    if (!selectedId) return null;
    return leads.find((l) => l.id === selectedId) || null;
  }, [leads, selectedId]);

  // Compute human-readable display label for trigger
  const displayLabel = useMemo(() => {
    if (selectedLead) {
      return formatLeadOptionLabel(selectedLead);
    }
    if (!selectedId) {
      return placeholder;
    }
    // If selectedId is a technical identifier/CUID, never show raw ID
    if (isTechnicalId(selectedId)) {
      return "Active Session";
    }
    return selectedId;
  }, [selectedLead, selectedId, placeholder]);

  // Filter leads based on search query
  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => {
      const name = (l.name || "").toLowerCase();
      const details = (l.details || "").toLowerCase();
      const email = (l.email || "").toLowerCase();
      return name.includes(q) || details.includes(q) || email.includes(q);
    });
  }, [leads, search]);

  const handleSelect = (lead: EntityOption) => {
    onSelect(lead.id, lead);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div
      ref={containerRef}
      className={`sales-lead-dropdown-root ${className}`}
      style={{
        position: "relative",
        width: "260px",
        ...style,
      }}
    >
      {/* Dropdown Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="sales-select sales-lead-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={displayLabel}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          width: "100%",
          padding: "0.625rem 0.875rem",
          userSelect: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            color: selectedLead || (selectedId && !isTechnicalId(selectedId))
              ? "var(--color-text)"
              : "var(--color-text-secondary)",
            fontWeight: selectedLead ? 600 : 400,
          }}
        >
          {displayLabel}
        </span>
        {isOpen ? (
          <ChevronUp
            size={16}
            style={{ flexShrink: 0, color: "var(--color-text-muted)" }}
          />
        ) : (
          <ChevronDown
            size={16}
            style={{ flexShrink: 0, color: "var(--color-text-muted)" }}
          />
        )}
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="sales-lead-popover"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            minWidth: "280px",
            maxWidth: "360px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "10px",
            boxShadow:
              "0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 6px 12px -2px rgba(0, 0, 0, 0.08)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search Filter Header */}
          <div
            style={{
              padding: "0.5rem 0.625rem",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-background-secondary)",
            }}
          >
            <div className="sales-search-wrap" style={{ minWidth: "unset", width: "100%" }}>
              <Search
                size={14}
                className="sales-search-icon"
                style={{ left: "0.625rem" }}
              />
              <input
                ref={searchInputRef}
                type="text"
                className="sales-input sales-search-input"
                placeholder="Search leads by name or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  fontSize: "0.8125rem",
                  padding: "0.45rem 0.625rem 0.45rem 2rem",
                  background: "var(--color-surface)",
                }}
              />
            </div>
          </div>

          {/* Scrollable Lead List */}
          <div
            className="sales-lead-list-scroll"
            onWheel={(e) => e.stopPropagation()}
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              padding: "0.25rem 0",
              scrollbarWidth: "thin",
            }}
          >
            {filteredLeads.length > 0 ? (
              filteredLeads.map((l) => {
                const isSelected = selectedId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(l)}
                    className="sales-lead-option-item"
                    title={formatLeadOptionLabel(l)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      background: isSelected
                        ? "rgba(37, 99, 235, 0.08)"
                        : "transparent",
                      border: "none",
                      borderLeft: isSelected
                        ? "3px solid var(--color-primary)"
                        : "3px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background =
                          "var(--color-surface-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.15rem",
                        overflow: "hidden",
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected
                            ? "var(--color-primary)"
                            : "var(--color-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {l.name || "Lead"}
                      </span>
                      {(l.details || l.email) && (
                        <span
                          style={{
                            fontSize: "0.725rem",
                            color: "var(--color-text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {l.details || l.email}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check
                        size={15}
                        style={{
                          color: "var(--color-primary)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })
            ) : (
              <div
                style={{
                  padding: "1.25rem 1rem",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                  fontSize: "0.8125rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Users size={18} style={{ opacity: 0.5 }} />
                <span>No leads matching search</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesLeadDropdown;
