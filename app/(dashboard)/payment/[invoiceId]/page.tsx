"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  IndianRupee,
  CreditCard,
  Loader2,
  Banknote,
  FileText,
  Zap,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { usePayment, PaymentRecord } from "@/context/PaymentContext";
import { getInvoiceById, Invoice } from "@/lib/api/finance/invoicesApi";
import RazorpayModal, { MockPaymentResult } from "@/components/payment/RazorpayModal";

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

// ── Schema ───────────────────────────────────────────────────

const PAYMENT_METHODS = ["UPI", "Card", "Bank Transfer", "Cash"] as const;
type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

const METHOD_MAP: Record<PaymentMethodType, PaymentRecord["method"]> = {
  UPI: "UPI",
  Card: "Card",
  "Bank Transfer": "Bank Transfer",
  Cash: "Cash",
};

function buildPaymentSchema(maxAmount: number) {
  return z.object({
    method: z.enum(["UPI", "Card", "Bank Transfer", "Cash"] as const, {
      message: "Please select a payment method",
    }),
    amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be positive")
      .max(maxAmount, `Amount cannot exceed ${formatCurrency(maxAmount)}`),
    transactionId: z.string().optional(),
    paymentDate: z.string().min(1, "Payment date is required"),
    notes: z.string().optional(),
  });
}

type PaymentFormData = z.infer<ReturnType<typeof buildPaymentSchema>>;

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

// ── Method Icon ──────────────────────────────────────────────

function MethodIcon({ method }: { method: string }) {
  const n = method.toLowerCase();
  if (n === "upi") return <span className="text-base">📱</span>;
  if (n === "card") return <CreditCard size={14} />;
  if (n.includes("bank") || n.includes("wallet")) return <Banknote size={14} />;
  return <IndianRupee size={14} />;
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
      <div className="bg-white rounded-2xl border p-8 mb-6">
        <div className="h-6 w-36 bg-gray-200 rounded mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentPage() {
  const params = useParams();
  const invoiceId = params?.invoiceId as string;
  const router = useRouter();
  const { addPayment, getPayments } = usePayment();

  // ── State ────────────────────────────────────────────────
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);

  // ── Online Payment Handler ───────────────────────────────
  const handleOnlinePaymentSuccess = useCallback(
    (result: MockPaymentResult) => {
      addPayment(invoiceId, {
        amount: result.amount,
        method: result.method as PaymentRecord["method"],
        transactionId: result.transactionId,
        date: new Date().toISOString().split("T")[0],
        notes: `Online payment via ${result.method} (${result.paymentId})`,
        status: "COMPLETED",
      });

      setShowRazorpay(false);
      setPaymentSuccess(true);
      toast.success("Online payment completed successfully!");

      setTimeout(() => {
        router.push("/finance/invoices");
      }, 1500);
    },
    [addPayment, invoiceId, router]
  );

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

  // ── Derived Values ───────────────────────────────────────
  const paymentHistory = useMemo(
    () => (invoiceId ? getPayments(invoiceId) : []),
    [invoiceId, getPayments]
  );

  const totalPaid = useMemo(
    () => paymentHistory.reduce((sum, p) => sum + p.amount, 0),
    [paymentHistory]
  );

  const remaining = invoice ? Math.max(0, invoice.totalAmount - totalPaid) : 0;
  const isFullyPaid = invoice ? remaining === 0 : false;

  const schema = useMemo(() => buildPaymentSchema(remaining || 1), [remaining]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
    },
  });

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

  // ── Manual Form Submit ───────────────────────────────────
  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    addPayment(invoiceId, {
      amount: data.amount,
      method: METHOD_MAP[data.method],
      transactionId: data.transactionId || `TXN-${Date.now()}`,
      date: data.paymentDate,
      notes: data.notes,
      status: "COMPLETED",
    });

    setIsSubmitting(false);
    setPaymentSuccess(true);
    toast.success("Payment recorded successfully!");
    reset();

    setTimeout(() => {
      router.push("/finance/invoices");
    }, 1500);
  };

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
            Your payment has been recorded for invoice{" "}
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
    <>
      <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/finance/invoices")}
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
            <StatusBadge status={isFullyPaid ? "PAID" : invoice.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
                <CheckCircle2 size={12} /> Paid
              </p>
              <p className="text-sm font-semibold text-emerald-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <Clock size={12} /> Remaining
              </p>
              <p className={`text-sm font-semibold ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          {/* Due Date */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={12} />
            <span>Due: <span className="font-medium text-gray-700">{formatDate(invoice.dueDate)}</span></span>
            {invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "PAID" && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">OVERDUE</span>
            )}
          </div>

          {/* Progress Bar */}
          {invoice.totalAmount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-gray-400 mb-1.5">
                <span>Payment Progress</span>
                <span>{Math.round((totalPaid / invoice.totalAmount) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalPaid / invoice.totalAmount) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Payment Section ────────────────────────────────── */}
        {!isFullyPaid ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6 shadow-sm">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CreditCard size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Make a Payment</h2>
                  <p className="text-xs text-gray-400">Maximum payable: {formatCurrency(remaining)}</p>
                </div>
              </div>

              {/* Pay Online — quick-access button in header */}
              <button
                type="button"
                onClick={() => setShowRazorpay(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                <Zap size={15} />
                Pay Online
              </button>
            </div>

            {/* Divider with label */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">Manual Payment Entry</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Manual Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <select
                  {...register("method")}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {errors.method && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.method.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Amount <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    {...register("amount", { valueAsNumber: true })}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.amount.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Remaining: {formatCurrency(remaining)}</p>
              </div>

              {/* Transaction ID & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction ID</label>
                  <input
                    type="text"
                    {...register("transactionId")}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="e.g. TXN123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Payment Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    {...register("paymentDate")}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {errors.paymentDate && (
                    <p className="text-red-500 text-xs mt-1.5">{errors.paymentDate.message}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  {...register("notes")}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Any additional notes…"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing…</>
                  ) : (
                    <><Banknote size={16} /> Complete Payment</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRazorpay(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  <Zap size={16} />
                  Pay Online
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/finance/invoices")}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">This invoice is fully paid</p>
              <p className="text-xs text-emerald-600 mt-0.5">Total of {formatCurrency(totalPaid)} received</p>
            </div>
          </div>
        )}

        {/* ── Payment History ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Clock size={20} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
              <p className="text-xs text-gray-400">
                {paymentHistory.length} payment{paymentHistory.length !== 1 ? "s" : ""} recorded
              </p>
            </div>
          </div>

          {paymentHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Clock size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">No payments recorded yet</p>
              <p className="text-xs text-gray-300 mt-1">Payments will appear here once you record a transaction</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Date", "Method", "Amount", "Transaction ID", "Status"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${i === 2 ? "text-right" : i === 4 ? "text-center" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paymentHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-3 text-gray-700">{formatDate(p.date)}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <MethodIcon method={p.method} />
                          {p.method}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                      <td className="px-3 py-3 text-gray-500 font-mono text-xs">{p.transactionId || "—"}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={10} /> {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Razorpay-Style Online Payment Modal ─────────────── */}
      <RazorpayModal
        isOpen={showRazorpay}
        onClose={() => setShowRazorpay(false)}
        onSuccess={handleOnlinePaymentSuccess}
        invoiceNumber={invoice.invoiceNumber}
        clientName={invoice.clientName}
        amount={remaining}
      />
    </>
  );
}
