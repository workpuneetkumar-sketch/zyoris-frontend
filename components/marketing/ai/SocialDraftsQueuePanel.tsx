"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Trash2,
  Pencil,
  RefreshCw,
  FileEdit,
  Lock,
  Save,
  X,
} from "lucide-react";
import {
  deleteSocialPostDraft,
  updateSocialPostDraft,
} from "@/lib/api/marketingAiApi";
import {
  formatVariationForClipboard,
  MARKETING_PLATFORMS,
  normalizeHashtags,
  SocialPostDraft,
} from "@/lib/schemas/marketingAiSchemas";
import { NormalizedMarketingAiError } from "@/lib/utils/marketingAiErrors";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { AiErrorAlert } from "@/components/marketing/ai/AiErrorAlert";

interface SocialDraftsQueuePanelProps {
  drafts: SocialPostDraft[];
  loading: boolean;
  error: NormalizedMarketingAiError | null;
  onRefresh: () => void;
  onDraftUpdated: (draft: SocialPostDraft) => void;
  onDraftDeleted: (id: string) => void;
  onGoToStudio: () => void;
  onNotify: (type: "success" | "error", message: string) => void;
}

export const SocialDraftsQueuePanel: React.FC<SocialDraftsQueuePanelProps> = ({
  drafts,
  loading,
  error,
  onRefresh,
  onDraftUpdated,
  onDraftDeleted,
  onGoToStudio,
  onNotify,
}) => {
  const requestConfirmation = useConfirm();
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    copy: string;
    cta: string;
    hashtagsText: string;
  }>({ title: "", copy: "", cta: "", hashtagsText: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const filteredDrafts =
    platformFilter === "ALL"
      ? drafts
      : drafts.filter((d) => d.platform === platformFilter);

  const startEdit = (draft: SocialPostDraft) => {
    setEditingId(draft.id);
    setEditForm({
      title: draft.title,
      copy: draft.copy,
      cta: draft.cta,
      hashtagsText: (draft.hashtags || []).join(" "),
    });
  };

  const handleSaveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const updated = await updateSocialPostDraft(id, {
        title: editForm.title,
        copy: editForm.copy,
        cta: editForm.cta,
        hashtags: normalizeHashtags(editForm.hashtagsText),
      });
      onDraftUpdated(updated);
      setEditingId(null);
      onNotify("success", "Social draft updated");
    } catch (err: any) {
      onNotify(
        "error",
        err?.response?.data?.message || err?.message || "Failed to update draft"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (draft: SocialPostDraft) => {
    const ok = await requestConfirmation({
      title: "Delete Social Draft",
      message: `Delete draft "${draft.title}"? This cannot be undone.`,
      confirmText: "Delete Draft",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await deleteSocialPostDraft(draft.id);
      onDraftDeleted(draft.id);
      onNotify("success", "Draft deleted");
    } catch (err: any) {
      onNotify(
        "error",
        err?.response?.data?.message || err?.message || "Delete failed"
      );
    }
  };

  const handleCopy = async (draft: SocialPostDraft) => {
    const text = formatVariationForClipboard({
      headline: draft.headline || draft.title,
      copy: draft.copy,
      cta: draft.cta,
      hashtags: draft.hashtags,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(draft.id);
      onNotify("success", "Draft copied to clipboard");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onNotify("error", "Clipboard access failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Social Media Drafts (Composer Handoff)
          </h2>
          <p className="text-xs text-gray-500">
            All AI outputs land here strictly as <strong>DRAFT</strong>. Publishing requires explicit review & connected channel approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Platforms</option>
            {MARKETING_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && <AiErrorAlert error={error} onRetry={onRefresh} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 w-1/3 bg-gray-100 rounded" />
              <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-3">
            <FileEdit size={22} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            No social drafts saved yet
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
            Generate copy variations in AI Content Studio and click &quot;Send to Social Draft Composer&quot; to save them here.
          </p>
          <button
            type="button"
            onClick={onGoToStudio}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
          >
            Open AI Content Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDrafts.map((draft) => {
            const isEditing = editingId === draft.id;
            return (
              <div
                key={draft.id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                        {draft.platform}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold">
                        {draft.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {draft.objective}
                      </span>
                    </div>
                    {draft.createdAt && (
                      <span className="text-[11px] text-gray-400">
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900"
                      />
                      <textarea
                        rows={4}
                        value={editForm.copy}
                        onChange={(e) =>
                          setEditForm({ ...editForm, copy: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800"
                      />
                      <input
                        type="text"
                        value={editForm.cta}
                        onChange={(e) =>
                          setEditForm({ ...editForm, cta: e.target.value })
                        }
                        placeholder="CTA"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800"
                      />
                      <input
                        type="text"
                        value={editForm.hashtagsText}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            hashtagsText: e.target.value,
                          })
                        }
                        placeholder="#hashtags"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800"
                      />
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-gray-900">
                        {draft.title}
                      </h3>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {draft.copy}
                      </p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>
                          <span className="font-semibold text-gray-800">
                            CTA:
                          </span>{" "}
                          {draft.cta}
                        </p>
                        {draft.hashtags && draft.hashtags.length > 0 && (
                          <p className="text-indigo-600">
                            {draft.hashtags.join(" ")}
                          </p>
                        )}
                        {draft.suggestedCreativeBrief && (
                          <p className="text-gray-500">
                            <span className="font-semibold text-gray-700">
                              Creative brief:
                            </span>{" "}
                            {draft.suggestedCreativeBrief}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  {isEditing ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <X size={13} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(draft.id)}
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-60"
                      >
                        <Save size={13} /> Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(draft)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {copiedId === draft.id ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              Copy
                            </>
                          )}
                        </button>

                        <PermissionGuard
                          permission="campaigns.update"
                          action="disable"
                        >
                          <button
                            type="button"
                            onClick={() => startEdit(draft)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                        </PermissionGuard>

                        <PermissionGuard
                          permission="campaigns.delete"
                          action="disable"
                        >
                          <button
                            type="button"
                            onClick={() => handleDelete(draft)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </PermissionGuard>
                      </div>

                      <span
                        title="Direct auto-publishing is disabled. Review and approve inside your Social Composer or connected channel."
                        className="inline-flex items-center gap-1 text-[11px] text-gray-400"
                      >
                        <Lock size={11} /> Draft only
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
