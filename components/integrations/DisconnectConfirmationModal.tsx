import React, { useState } from "react";
import { Connector } from "@/types/integrations";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DisconnectConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onConfirmDisconnect: (id: string) => Promise<void>;
}

export function DisconnectConfirmationModal({
  isOpen,
  onClose,
  connector,
  onConfirmDisconnect,
}: DisconnectConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !connector) return null;

  const handleDisconnect = async () => {
    const targetId =
      connector.connectionId || connector.connectionState?.id || connector.id;
    if (!targetId) {
      toast.error("No active connection ID found to disconnect.");
      return;
    }
    setIsDeleting(true);
    try {
      await onConfirmDisconnect(targetId);
      toast.success(`Disconnected ${connector.name} successfully.`);
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to disconnect ${connector.name}.`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text">
              Disconnect {connector.name}?
            </h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Are you sure you want to disconnect this integration? Syncing will immediately halt, and remote configuration credentials will be removed.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-error hover:bg-error-light text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <span>Confirm Disconnect</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
