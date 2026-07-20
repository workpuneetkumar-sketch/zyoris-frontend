"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PaymentErrorBoundary from "@/components/payment/ErrorBoundary";
import {
  ArrowLeft,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  IndianRupee,
  CreditCard,
  Loader2,
  FileText,
  Shield,
  Lock,
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

function getRazorpayKeyId(): string {
  return process.env.KEY_ID ?? "";
}

// ── Status Badge ─────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  PAID:    { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2 },
  SENT:    { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    icon: FileText },
  DRAFT:   { bg: "bg-gray-50 border-gray-200",       text: "text-gray-600",    icon: FileText },
  OVERDUE: { bg: "bg-red-50 border-red-200",         text: "text-red-700",     icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-5xl mx-auto animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-8" />
      <div className="bg-white rounded-2xl border p-8 mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
              <div className="h-5 w-28 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
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

  // ── State ────────────────────────────────────────────────
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  // ── Refresh invoice from API ───────────────────────────────
  const refreshInvoice = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const updated = await getInvoiceById(invoiceId);
      setInvoice(updated);
    } catch {
      // silently ignore refresh failures
    }
  }, [invoiceId]);

  // ── Real Razorpay Payment Flow ────────────────────────────
  const handleRazorpayPayment = useCallback(async () => {
    if (!invoice || processing) return;

    setProcessing(true);
    try {
      toast.loading("Initialising payment…", { id: "rzp-pay" });

      const order = await createRazorpayOrder(invoice.id, invoice.totalAmount);

      const keyId = order.key || getRazorpayKeyId();
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

      await verifyRazorpayPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        invoiceId: invoice.id,
      });

      toast.dismiss("rzp-verify");

      toast.success("Payment Successful! 🎉", {
        description: `${formatCurrency(invoice.totalAmount)} paid for ${invoice.invoiceNumber}`,
        duration: 4000,
      });

      await refreshInvoice();
      setInvoice((prev) => (prev ? { ...prev, status: "PAID" as const } : prev));
      setPaymentSuccess(true);

      setTimeout(() => {
        router.push("/payment/invoices");
      }, 1800);
    } catch (err: any) {
      toast.dismiss("rzp-pay");
      toast.dismiss("rzp-verify");

      const msg: string = err?.message ?? "Payment failed";
      const isCancelled = msg === "PAYMENT_CANCELLED";

      if (isCancelled) {
        toast.info("Payment cancelled.", {
          description: "You closed the payment window. No amount was charged.",
        });
      } else {
        toast.error("Payment Failed", {
          description: msg,
          duration: 5000,
        });
      }
    } finally {
      setProcessing(false);
    }
  }, [invoice, processing, refreshInvoice, router]);

  // ── Fetch Invoice ────────────────────────────────────────
  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;

    const load = async () => {
      setFetchLoading(true);
      setFetchError(null);
      try {
        const data = await getInvoiceById(invoiceId);
        if (!cancelled) setInvoice(data);
      } catch (err: any) {
        if (!cancelled) setFetchError(err.message || "Failed to load invoice");
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [invoiceId]);

  const isPaid = invoice?.status === "PAID";

  // ── Loading State ────────────────────────────────────────
  if (fetchLoading) return <PageSkeleton />;

  // ── Error / Not Found ────────────────────────────────────
  if (fetchError || !invoice) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {fetchError ? "Failed to load invoice" : "Invoice not found"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {fetchError || "The invoice you're looking for doesn't exist or has been removed."}
          </p>
          <button
            onClick={() => router.push("/finance/invoices")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  // ── Success State ────────────────────────────────────────
  if (paymentSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm" style={{ animation: "fadeIn 0.4s ease-out" }}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-sm text-gray-500 mb-1">
            Your payment has been processed for invoice{" "}
            <span className="font-semibold text-gray-700">{invoice.invoiceNumber}</span>.
          </p>
          <p className="text-xs text-gray-400">Redirecting to invoices…</p>
          <div className="mt-6">
            <div className="w-8 h-8 mx-auto border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push("/payment/invoices")}
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Invoices
      </button>

      {/* ── Invoice Details Card ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Receipt size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <p className="text-xs text-gray-400">Invoice Details</p>
            </div>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <User size={12} /> Client
            </p>
            <p className="text-sm font-semibold text-gray-800">{invoice.clientName}</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <IndianRupee size={12} /> Total Amount
            </p>
            <p className="text-sm font-semibold text-gray-800">{formatCurrency(invoice.totalAmount)}</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Calendar size={12} /> Due Date
            </p>
            <p className="text-sm font-semibold text-gray-800">
              {new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              {invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "PAID" && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">OVERDUE</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Payment Section ────────────────────────────────── */}
      {!isPaid ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CreditCard size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pay Online</h2>
              <p className="text-xs text-gray-400">
                Amount: {formatCurrency(invoice.totalAmount)}
              </p>
            </div>
          </div>

          <button
            onClick={handleRazorpayPayment}
            disabled={processing}
            className="w-full inline-flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing Payment…
              </>
            ) : (
              <>
                <Lock size={16} />
                Pay {formatCurrency(invoice.totalAmount)} Online
                <CreditCard size={16} />
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            <Shield size={10} className="inline mr-1" />
            Secured by Razorpay • UPI, Cards, Net Banking, Wallets
          </p>
        </div>
      ) : (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">This invoice is fully paid</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {formatCurrency(invoice.totalAmount)} received
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
