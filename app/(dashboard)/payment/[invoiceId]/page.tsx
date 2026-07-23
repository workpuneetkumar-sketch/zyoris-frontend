"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PaymentErrorBoundary from "@/components/payment/ErrorBoundary";
import {
  ArrowLeft,
  Receipt,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  IndianRupee,
  CreditCard,
  Loader2,
  FileText,
  Shield,
  Lock,
  RefreshCw,
  Hash,
  Building2,
  Sparkles,
  Smartphone,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getInvoiceById, Invoice } from "@/lib/api/finance/invoicesApi";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "@/lib/api/paymentService";
import { openRazorpayCheckout } from "@/utils/razorpay";

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(dueDate: string, status: string): boolean {
  return status !== "PAID" && new Date(dueDate) < new Date();
}

/** Generate a stable idempotency key per session + invoice */
function generateIdempotencyKey(invoiceId: string): string {
  const session = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${invoiceId}-${session}-${rand}`;
}

// ── Status config ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  PAID:    { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200",  dot: "bg-emerald-500"  },
  SENT:    { bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200",     dot: "bg-blue-500"     },
  DRAFT:   { bg: "bg-slate-50",    text: "text-slate-600",    border: "border-slate-200",    dot: "bg-slate-400"    },
  OVERDUE: { bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200",      dot: "bg-red-500"      },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="h-4 w-28 bg-gray-200 rounded-full mb-6 animate-pulse" />
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 animate-pulse">
          <div className="h-6 w-40 bg-gray-100 rounded mb-3" />
          <div className="h-10 w-56 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 animate-pulse">
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
                <div className="h-5 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result Modal — Success ────────────────────────────────────

interface SuccessModalProps {
  invoice: Invoice;
  paymentId: string;
  onOk: () => void;
}

function SuccessModal({ invoice, paymentId, onOk }: SuccessModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden"
        style={{ animation: "scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Green glow background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white pointer-events-none" />

        <div className="relative">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-100">
            <CheckCircle2 size={40} className="text-emerald-500" strokeWidth={2} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={14} className="text-emerald-500" />
            <h2 className="text-2xl font-bold text-gray-900">Payment Successful</h2>
            <Sparkles size={14} className="text-emerald-500" />
          </div>

          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Your payment has been successfully verified and your invoice has been marked as Paid.
          </p>

          {/* Details */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 font-medium">Amount Paid</span>
              <span className="text-base font-bold text-emerald-600">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 font-medium">Invoice No.</span>
              <span className="text-sm font-semibold text-gray-800 font-mono">{invoice.invoiceNumber}</span>
            </div>
            {paymentId && (
              <>
                <div className="border-t border-gray-100" />
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-gray-400 font-medium shrink-0">Payment ID</span>
                  <span className="text-xs font-mono text-gray-600 truncate text-right">{paymentId}</span>
                </div>
              </>
            )}
          </div>

          <button
            id="payment-success-ok-btn"
            onClick={onOk}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-[0.98]"
          >
            OK — Back to Invoices
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Result Modal — Failed ─────────────────────────────────────

interface FailedModalProps {
  errorMessage: string;
  onRetry: () => void;
  onBack: () => void;
}

function FailedModal({ errorMessage, onRetry, onBack }: FailedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden"
        style={{ animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-white pointer-events-none" />

        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-100 flex items-center justify-center shadow-lg shadow-red-100">
            <XCircle size={40} className="text-red-500" strokeWidth={2} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>

          <p className="text-sm text-gray-500 mb-6 leading-relaxed px-2">
            {errorMessage || "An unexpected error occurred while processing your payment."}
          </p>

          <div className="flex flex-col gap-3">
            <button
              id="payment-retry-btn"
              onClick={onRetry}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Retry Payment
            </button>
            <button
              id="payment-back-btn"
              onClick={onBack}
              className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentPageWrapper() {
  return (
    <PaymentErrorBoundary pageName="Invoice Payment">
      <PaymentPage />
    </PaymentErrorBoundary>
  );
}

function PaymentPage() {
  const params = useParams();
  const invoiceId = params?.invoiceId as string;
  const router = useRouter();

  // ── State ───────────────────────────────────────────────
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Modal state
  const [successModal, setSuccessModal] = useState<{ paymentId: string } | null>(null);
  const [failedModal, setFailedModal] = useState<{ message: string } | null>(null);

  // Guard against duplicate payment submissions
  const isProcessingRef = useRef(false);
  // Stable idempotency key per component mount (regenerated on retry)
  const idempotencyKeyRef = useRef<string>("");

  useEffect(() => {
    if (invoiceId) {
      idempotencyKeyRef.current = generateIdempotencyKey(invoiceId);
    }
  }, [invoiceId]);

  // ── Refresh invoice from API ───────────────────────────
  const refreshInvoice = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const updated = await getInvoiceById(invoiceId);
      setInvoice(updated);
    } catch {
      // silently ignore refresh failures — modal still shows
    }
  }, [invoiceId]);

  // ── Fetch Invoice ────────────────────────────────────
  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setFetchLoading(true);
    setFetchError(null);
    try {
      const data = await getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load invoice");
    } finally {
      setFetchLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // ── Razorpay Payment Flow ────────────────────────────
  const handleRazorpayPayment = useCallback(async () => {
    if (!invoice || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setProcessing(true);
    setFailedModal(null);

    try {
      toast.loading("Initialising payment…", { id: "rzp-pay" });

      const order = await createRazorpayOrder(
        invoice.id,
        invoice.totalAmount,
        idempotencyKeyRef.current
      );

      const keyId = order.key || process.env.KEY_ID || "";
      if (!keyId) {
        throw new Error("Razorpay Key ID is not configured. Please contact support.");
      }

      toast.dismiss("rzp-pay");

      const paymentResult = await openRazorpayCheckout({
        keyId,
        amountInPaise: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
      });

      toast.loading("Verifying payment…", { id: "rzp-verify" });

      // ✅ Map Razorpay response fields to backend-expected field names
      const verifyResult = await verifyRazorpayPayment({
        invoiceId: invoice.id,
        orderId: paymentResult.razorpay_order_id,
        paymentId: paymentResult.razorpay_payment_id,
        signature: paymentResult.razorpay_signature,
      });

      toast.dismiss("rzp-verify");

      // Refresh invoice data from backend before showing modal
      await refreshInvoice();

      // Show success modal
      setSuccessModal({
        paymentId: verifyResult.paymentId || paymentResult.razorpay_payment_id,
      });
    } catch (err: any) {
      toast.dismiss("rzp-pay");
      toast.dismiss("rzp-verify");

      const msg: string = err?.message ?? "Payment failed";
      const isCancelled = msg === "PAYMENT_CANCELLED";

      if (isCancelled) {
        toast.info("Payment cancelled.", {
          description: "You closed the payment window. No amount was charged.",
        });
        // Don't show failure modal for user cancellation
      } else {
        setFailedModal({ message: msg });
      }
    } finally {
      isProcessingRef.current = false;
      setProcessing(false);
    }
  }, [invoice, refreshInvoice]);

  // ── Success → redirect to invoices ──────────────────
  const handleSuccessOk = useCallback(() => {
    router.push("/finance/invoices?refresh=1");
  }, [router]);

  // ── Failed retry ─────────────────────────────────────
  const handleRetry = useCallback(() => {
    // Generate fresh idempotency key for the retry
    if (invoiceId) {
      idempotencyKeyRef.current = generateIdempotencyKey(invoiceId);
    }
    setFailedModal(null);
    handleRazorpayPayment();
  }, [invoiceId, handleRazorpayPayment]);

  const handleBackToInvoices = useCallback(() => {
    router.push("/finance/invoices");
  }, [router]);

  // ── Computed ─────────────────────────────────────────
  const isPaid = invoice?.status === "PAID";
  const overdue = invoice ? isOverdue(invoice.dueDate, invoice.status) : false;

  // ── Loading State ────────────────────────────────────
  if (fetchLoading) return <PageSkeleton />;

  // ── Error / Not Found ────────────────────────────────
  if (fetchError || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {fetchError ? "Failed to Load Invoice" : "Invoice Not Found"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {fetchError || "The invoice you're looking for doesn't exist or has been removed."}
          </p>
          <button
            onClick={() => router.push("/finance/invoices")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-all border border-gray-200 shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Result Modals ──────────────────────────────── */}
      {successModal && invoice && (
        <SuccessModal
          invoice={invoice}
          paymentId={successModal.paymentId}
          onOk={handleSuccessOk}
        />
      )}
      {failedModal && (
        <FailedModal
          errorMessage={failedModal.message}
          onRetry={handleRetry}
          onBack={handleBackToInvoices}
        />
      )}

      {/* ── Main Layout ────────────────────────────────── */}
      <div className="min-h-screen bg-gray-50">
        {/* ── Light Header ─────────────────────────────── */}
        <div className="px-4 pt-6 pb-4 max-w-3xl mx-auto">
          <button
            onClick={() => router.push("/finance/invoices")}
            className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Invoices
          </button>

          {/* Invoice header card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Receipt size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Invoice</p>
                  <h1 className="text-lg font-bold text-gray-900 font-mono tracking-wide">
                    {invoice.invoiceNumber}
                  </h1>
                </div>
              </div>
              <StatusBadge status={overdue && !isPaid ? "OVERDUE" : invoice.status} />
            </div>

            {/* Amount */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Total Amount Due</p>
              <p className="text-4xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(invoice.totalAmount)}
              </p>
              {overdue && !isPaid && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-red-500 font-medium">
                  <AlertCircle size={11} />
                  This invoice is overdue
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Content Area ─────────────────────────────── */}
        <div className="px-4 pb-12 max-w-3xl mx-auto space-y-4">
          {/* ── Invoice Details Card ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Invoice Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Client */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Client</p>
                  <p className="text-sm font-semibold text-gray-800">{invoice.clientName}</p>
                  {invoice.clientEmail && (
                    <p className="text-xs text-gray-400 mt-0.5">{invoice.clientEmail}</p>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <IndianRupee size={14} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Amount</p>
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(invoice.totalAmount)}</p>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${overdue && !isPaid ? "bg-red-50" : "bg-amber-50"}`}>
                  <Calendar size={14} className={overdue && !isPaid ? "text-red-500" : "text-amber-500"} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Due Date</p>
                  <p className={`text-sm font-semibold ${overdue && !isPaid ? "text-red-600" : "text-gray-800"}`}>
                    {formatDate(invoice.dueDate)}
                  </p>
                  {overdue && !isPaid && (
                    <span className="text-[10px] font-semibold text-red-500">OVERDUE</span>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice ID */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
              <Hash size={11} />
              <span>Invoice ID:</span>
              <code className="font-mono text-gray-500">{invoice.id}</code>
            </div>
          </div>

          {/* ── Payment Section ─────────────────────────── */}
          {!isPaid ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard size={15} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Secure Payment</h2>
              </div>

              {/* Payment methods info */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: "UPI",         Icon: Smartphone },
                  { label: "Cards",       Icon: CreditCard },
                  { label: "Net Banking", Icon: Building2  },
                  { label: "Wallets",     Icon: Wallet     },
                ].map(({ label, Icon }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <Icon size={18} className="text-gray-500" />
                    <span className="text-[10px] font-medium text-gray-500">{label}</span>
                  </div>
                ))}
              </div>

              {/* Amount summary */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 mb-5 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Total to Pay</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
              </div>

              {/* Pay button */}
              <button
                id="pay-now-btn"
                onClick={handleRazorpayPayment}
                disabled={processing}
                className="w-full inline-flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white text-base font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing Payment…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Pay {formatCurrency(invoice.totalAmount)} Securely
                    <CreditCard size={16} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 mt-4">
                <p className="text-center text-xs text-gray-400 flex items-center gap-1.5">
                  <Shield size={11} />
                  256-bit SSL Encrypted
                </p>
                <span className="text-gray-200">•</span>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Building2 size={11} />
                  Powered by Razorpay
                </p>
              </div>
            </div>
          ) : (
            /* ── Already Paid State ── */
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Invoice Fully Paid</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatCurrency(invoice.totalAmount)} received successfully
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <button
                  onClick={() => router.push("/finance/invoices")}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Invoices
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
