"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, UserPlus, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspacePageAssignments } from "@/hooks/useWorkspacePageAssignments";
import { getAssignableScopes } from "@/lib/api/workspaceApi";
import { EmployeeScopeMember } from "@/types/workspaceAssignment";

interface WorkspacePageAssignmentProps {
  pageId: string;
  pageTitle: string;
  canEdit: boolean;
}

export function WorkspacePageAssignment({
  pageId,
  pageTitle,
  canEdit,
}: WorkspacePageAssignmentProps) {
  const { user } = useAuth();
  const { assignments, currentUserId, storageError, saveAssignment, removeAssignment } =
    useWorkspacePageAssignments();
  const assignment = assignments[pageId];
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<EmployeeScopeMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    setSelectedUserId(assignment?.assignedUserId || "");
    getAssignableScopes()
      .then((scopes) => {
        if (!active) return;
        const availableMembers = Array.isArray(scopes.employees) ? scopes.employees : [];
        setMembers(availableMembers);
        if (assignment && !availableMembers.some((member) => member.userId === assignment.assignedUserId)) {
          setSelectedUserId("");
        }
      })
      .catch((cause) => {
        if (!active) return;
        console.error("Failed to load Workspace page assignees:", cause);
        setError(
          cause?.response?.data?.message ||
          cause?.message ||
          "Could not load assignable team members."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, assignment]);

  const handleSave = () => {
    if (!user?.organizationId || !currentUserId) {
      setError("An active organization and signed-in user are required to assign a page.");
      return;
    }
    const member = members.find((item) => item.userId === selectedUserId);
    if (!member) {
      setError("Select a team member to assign this page.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const saved = saveAssignment({
      pageId,
      pageTitle,
      assignedUserId: member.userId,
      assignedUserName: member.name?.trim() || member.email,
      assignedUserEmail: member.email,
      assignedByUserId: currentUserId,
      assignedAt: new Date().toISOString(),
    });
    setIsSaving(false);
    if (saved) setIsOpen(false);
    else setError("The assignment could not be saved in this browser.");
  };

  const handleRemove = () => {
    if (!removeAssignment(pageId)) {
      setError("The page assignment could not be removed.");
      return;
    }
    setIsOpen(false);
  };

  if (!canEdit) {
    return assignment ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        <Users className="h-3.5 w-3.5" />
        Assigned to {assignment.assignedUserName}
      </span>
    ) : null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {assignment ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Users className="h-3.5 w-3.5" />
            Assigned to {assignment.assignedUserName}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950/30"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {assignment ? "Change assignee" : "Assign page"}
        </button>
        {storageError && <span role="alert" className="text-xs text-red-600">{storageError}</span>}
      </div>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-page-assignment-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 id="workspace-page-assignment-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Assign Workspace page
                </h2>
                <p className="mt-1 truncate text-xs text-slate-500">{pageTitle || "Untitled page"}</p>
              </div>
              <button
                type="button"
                aria-label="Close assignment dialog"
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Team member
                </span>
                <select
                  value={selectedUserId}
                  onChange={(event) => {
                    setSelectedUserId(event.target.value);
                    setError(null);
                  }}
                  disabled={isLoading || isSaving}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select a team member</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name?.trim() || member.email}{member.name ? ` · ${member.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />Loading team members…
                </div>
              ) : members.length === 0 && !error ? (
                <p className="text-xs text-amber-700">No assignable team members were returned for your organization.</p>
              ) : null}

              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/70">
                Assignments are saved in this browser and are visible here in the page and Workspace sidebar. The current backend does not provide a page-assignment API, so assignments do not sync to other devices or users and do not change page permissions.
              </p>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
              {assignment ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isSaving || isLoading}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove assignment
                </button>
              ) : <span />}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isLoading || !selectedUserId}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {assignment ? "Save changes" : "Assign page"}
                </button>
              </div>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
