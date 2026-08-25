import React, { useState, useEffect } from "react";
import { Connector, UpdateIntegrationPayload, SyncDirection, SyncFrequency, HttpMethod } from "@/types/integrations";
import { X, Settings, Loader2, Save, Globe } from "lucide-react";
import { toast } from "sonner";

interface EditIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onUpdate: (id: string, payload: UpdateIntegrationPayload) => Promise<any>;
}

export function EditIntegrationModal({
  isOpen,
  onClose,
  connector,
  onUpdate,
}: EditIntegrationModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("HOURLY");
  const [syncDirection, setSyncDirection] = useState<SyncDirection>("BIDIRECTIONAL");
  const [apiUrl, setApiUrl] = useState("");
  const [httpMethod, setHttpMethod] = useState<HttpMethod>("POST");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (connector) {
      setDisplayName(connector.connectionState?.displayName || connector.name || "");
      setSyncFrequency("HOURLY");
      setSyncDirection("BIDIRECTIONAL");
      setApiUrl(connector.configSchema?.endpoint?.defaultUrl || "");
      setHttpMethod((connector.configSchema?.endpoint?.defaultMethod as HttpMethod) || "POST");
    }
  }, [connector, isOpen]);

  if (!isOpen || !connector) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId =
      connector.connectionId || connector.connectionState?.id || connector.id;
    if (!targetId) {
      toast.error("No active connection instance found to update.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateIntegrationPayload = {
        displayName,
        syncFrequency,
        syncDirection,
        ...(apiUrl ? { apiUrl } : {}),
        ...(httpMethod ? { httpMethod } : {}),
      };

      await onUpdate(targetId, payload);
      toast.success("Integration settings updated successfully.");
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update integration configuration."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Edit Integration Settings
              </h3>
              <p className="text-xs text-text-muted">{connector.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                Sync Frequency
              </label>
              <select
                value={syncFrequency}
                onChange={(e) => setSyncFrequency(e.target.value as SyncFrequency)}
                className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
              >
                <option value="REALTIME">Realtime</option>
                <option value="HOURLY">Hourly</option>
                <option value="EVERY_6_HOURS">Every 6 Hours</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MANUAL">Manual Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                Sync Direction
              </label>
              <select
                value={syncDirection}
                onChange={(e) => setSyncDirection(e.target.value as SyncDirection)}
                className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
              >
                <option value="BIDIRECTIONAL">Bidirectional</option>
                <option value="INBOUND">Inbound</option>
                <option value="OUTBOUND">Outbound</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
              Target API URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.connector.com/v1"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
