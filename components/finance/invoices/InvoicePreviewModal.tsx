"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Printer,
  Download,
  Share2,
} from "lucide-react";
import {
  Invoice,
  getInvoiceById,
  generateInvoiceHTML,
  downloadInvoicePdf,
} from "@/lib/api/finance/invoicesApi";

interface InvoicePreviewModalProps {
  invoiceId: string;
  onClose: () => void;
  setToast?: (toast: { type: "success" | "error" | "info"; message: string }) => void;
}

export function InvoicePreviewModal({
  invoiceId,
  onClose,
  setToast,
}: InvoicePreviewModalProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIframeLoaded(false);
    try {
      const data = await getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice preview");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoice.id);
      setToast?.({ type: "success", message: "Invoice PDF opened for download" });
    } catch (err: any) {
      setToast?.({ type: "error", message: err?.message || "Failed to download PDF" });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    const shareUrl = `${window.location.origin}/payment/${invoice.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast?.({ type: "success", message: "Payment link copied to clipboard!" });
    } catch {
      setToast?.({ type: "info", message: `Share link: ${shareUrl}` });
    }
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      // Wait for iframe content to load if not already loaded
      if (iframeLoaded) {
        iframeRef.current.contentWindow.print();
      } else {
        // If not loaded yet, wait a bit and try again
        setTimeout(() => {
          iframeRef.current?.contentWindow?.print();
        }, 500);
      }
    }
  };

  const onIframeLoad = () => {
    setIframeLoaded(true);
  };

  const html = invoice ? generateInvoiceHTML(invoice) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex-shrink-0 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Invoice Preview</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={40} className="animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Failed to load invoice</h3>
              <p className="text-sm text-gray-500 max-w-md">{error}</p>
              <button
                onClick={loadInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          ) : invoice ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ minHeight: "70vh" }}>
              <iframe
                ref={iframeRef}
                srcDoc={html}
                title="Invoice Preview"
                sandbox="allow-scripts allow-same-origin allow-modals"
                className="w-full border-0"
                style={{ height: "100%", minHeight: "70vh" }}
                onLoad={onIframeLoad}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No invoice data
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0 flex flex-wrap justify-end gap-3">
          <button
            onClick={handleShare}
            disabled={loading || !invoice}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-all"
          >
            <Share2 size={16} />
            Copy Payment Link
          </button>
          <button
            onClick={handleDownload}
            disabled={loading || !invoice || downloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || !invoice}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}