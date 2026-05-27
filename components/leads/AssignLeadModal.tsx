"use client";

import { useState, useEffect, useRef } from "react";
import classNames from "classnames";
import {
    UserPlus,
    Check,
    Search,
    X,
    ChevronDown,
} from "lucide-react";

import { assignLead } from "@/lib/api/leadsApi";

// ── Types ──────────────────────────────────────────────────────────────

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
}

interface AssignLeadProps {
    leadId: string;
    currentAssignee?: TeamMember | null;
    onAssign?: (
        leadId: string,
        member: TeamMember | null
    ) => void;

    /** optional: pass members directly */
    members?: TeamMember[];

    /** optional members API endpoint */
    apiEndpoint?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
}

function Avatar({
    member,
    size = 28,
}: {
    member: TeamMember;
    size?: number;
}) {
    if (member.avatarUrl) {
        return (
            <img
                src={member.avatarUrl}
                alt={member.name}
                style={{ width: size, height: size }}
                className="rounded-full object-cover border border-gray-200 shrink-0"
            />
        );
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                background: "#e8eaf6",
                color: "#1a237e",
                fontSize: size * 0.38,
            }}
            className="rounded-full flex items-center justify-center font-bold shrink-0 border border-blue-100"
        >
            {getInitials(member.name)}
        </div>
    );
}

// ── Component ──────────────────────────────────────────────────────────────

export function AssignLead({
    leadId,
    currentAssignee = null,
    onAssign,
    members: propMembers,
    apiEndpoint = "/api/team/members",
}: AssignLeadProps) {

    const [open, setOpen] = useState(false);

    const [members, setMembers] = useState<TeamMember[]>(
        propMembers ?? []
    );

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(
        null
    );

    const [search, setSearch] = useState("");

    const [assignee, setAssignee] =
        useState<TeamMember | null>(currentAssignee);

    const [saving, setSaving] = useState(false);

    const containerRef =
        useRef<HTMLDivElement>(null);

    const searchRef =
        useRef<HTMLInputElement>(null);

    // ── Fetch members ─────────────────────────────────────────────────────

    useEffect(() => {

        if (propMembers) return;

        if (!open || members.length > 0) return;

        setLoading(true);

        setError(null);

        fetch(apiEndpoint)
            .then((res) => {

                if (!res.ok) {
                    throw new Error(
                        "Failed to fetch team members"
                    );
                }

                return res.json();
            })

            .then((data: TeamMember[]) => {
                setMembers(data);
            })

            .catch((err) => {
                setError(err.message);
            })

            .finally(() => {
                setLoading(false);
            });

    }, [
        open,
        apiEndpoint,
        propMembers,
        members.length,
    ]);

    // ── Close dropdown outside click ─────────────────────────────────────

    useEffect(() => {

        function handleClickOutside(
            e: MouseEvent
        ) {

            if (
                containerRef.current &&
                !containerRef.current.contains(
                    e.target as Node
                )
            ) {
                setOpen(false);
                setSearch("");
            }
        }

        if (open) {
            document.addEventListener(
                "mousedown",
                handleClickOutside
            );
        }

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };

    }, [open]);

    // ── Focus search ─────────────────────────────────────────────────────

    useEffect(() => {

        if (open) {
            setTimeout(() => {
                searchRef.current?.focus();
            }, 50);
        }

    }, [open]);

    // ── Assign handler ───────────────────────────────────────────────────

    async function handleAssign(
        member: TeamMember | null
    ) {

        setSaving(true);

        try {

            // optimistic UI
            setAssignee(member);

            setOpen(false);

            setSearch("");

            // assign lead
            if (member?.id) {

                console.log(
                    "Assigning lead:",
                    leadId,
                    "to:",
                    member.id
                );

                await assignLead(
                    leadId,
                    member.id
                );
            }

            onAssign?.(
                leadId,
                member
            );

        } catch (err) {

            console.error(err);

            // rollback
            setAssignee(currentAssignee);

            setError(
                "Failed to assign lead"
            );

        } finally {

            setSaving(false);
        }
    }

    // ── Filtered members ─────────────────────────────────────────────────

    const filtered = members.filter(
        (m) =>
            m.name
                .toLowerCase()
                .includes(search.toLowerCase()) ||

            m.email
                .toLowerCase()
                .includes(search.toLowerCase()) ||

            m.role
                .toLowerCase()
                .includes(search.toLowerCase())
    );

    // ── UI ───────────────────────────────────────────────────────────────

    return (
        <div
            ref={containerRef}
            className="relative inline-block"
        >

            {/* Trigger */}

            <button
                onClick={() =>
                    setOpen((v) => !v)
                }

                disabled={saving}

                className={classNames(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all duration-150",

                    assignee
                        ? "bg-white border-blue-200 text-[#1a237e] hover:border-blue-400 hover:bg-blue-50"
                        : "bg-white border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-[#1a237e] hover:bg-blue-50"
                )}
            >

                {saving ? (

                    <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />

                ) : assignee ? (

                    <Avatar
                        member={assignee}
                        size={22}
                    />

                ) : (

                    <UserPlus
                        size={14}
                        className="shrink-0"
                    />
                )}

                <span className="max-w-[100px] truncate">
                    {assignee
                        ? assignee.name.split(" ")[0]
                        : "Assign"}
                </span>

                <ChevronDown
                    size={12}
                    className={classNames(
                        "shrink-0 transition-transform duration-150",
                        open ? "rotate-180" : ""
                    )}
                />
            </button>

            {/* Dropdown */}

            {open && (

                <div className="absolute left-0 top-full mt-1.5 w-[260px] bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">

                    {/* Search */}

                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">

                        <Search
                            size={13}
                            className="text-gray-400 shrink-0"
                        />

                        <input
                            ref={searchRef}

                            value={search}

                            onChange={(e) =>
                                setSearch(e.target.value)
                            }

                            placeholder="Search team members..."

                            className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                        />

                        {search && (

                            <button
                                onClick={() =>
                                    setSearch("")
                                }
                            >
                                <X
                                    size={12}
                                    className="text-gray-400 hover:text-gray-600"
                                />
                            </button>
                        )}
                    </div>

                    {/* Loading */}

                    {loading && (

                        <div className="flex items-center justify-center py-6">

                            <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />

                        </div>
                    )}

                    {/* Error */}

                    {error && (

                        <p className="text-[12px] text-red-500 text-center py-4 px-3">

                            {error}

                        </p>
                    )}

                    {/* Empty */}

                    {!loading &&
                        !error &&
                        filtered.length === 0 && (

                            <p className="text-[12px] text-gray-400 text-center py-4">

                                No members found

                            </p>
                        )}

                    {/* Members */}

                    <div className="max-h-[220px] overflow-y-auto py-1">

                        {!loading &&
                            !error &&
                            filtered.map((member) => {

                                const isSelected =
                                    assignee?.id === member.id;

                                return (

                                    <button
                                        key={member.id}

                                        onClick={() =>
                                            handleAssign(member)
                                        }

                                        className={classNames(
                                            "w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left",

                                            isSelected
                                                ? "bg-blue-50"
                                                : "hover:bg-gray-50"
                                        )}
                                    >

                                        <Avatar
                                            member={member}
                                            size={28}
                                        />

                                        <div className="flex-1 min-w-0">

                                            <p
                                                className={classNames(
                                                    "text-[13px] font-medium truncate",

                                                    isSelected
                                                        ? "text-blue-600"
                                                        : "text-gray-800"
                                                )}
                                            >
                                                {member.name}
                                            </p>

                                            <p className="text-[11px] text-gray-400 truncate">

                                                {member.role}

                                            </p>
                                        </div>

                                        {isSelected && (

                                            <Check
                                                size={14}
                                                className="text-blue-600 shrink-0"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
}