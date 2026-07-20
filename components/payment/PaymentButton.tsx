// components/payment/PaymentButton.tsx
// Reusable "Pay Now" button that orchestrates the full Razorpay payment flow:
//   1. POST /payments/create-order
//   2. Open Razorpay Checkout (real SDK)
//   3. POST /payments/verify
//   4. Notify parent via callbacks

"use client";

import React, { useState } from "react";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/api/paymentService";
import { openRazorpayCheckout } from "@/utils/razorpay";

// ── Types ────────────────────────────────────────────────────

export interface PaymentButtonInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  totalAmount: number;
  status: string;
}

export interface PaymentSuccessResult {
  invoiceId: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface PaymentButtonProps {
  invoice: PaymentButtonInvoice;
  /** Called after successful verification */
  onSuccess?: (result: PaymentSuccessResult) => void;
  /** Called on failure or cancellation */
  onError?: (error: Error) => void;
  /** Override button label */
  label?: string;
  /** Extra Tailwind classes for the button */
  className?: string;
  /** Disable even if not processing (e.g. parent is loading) */
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getRazorpayKeyId(): string {
  const key = process.env.KEY_ID ?? "";
  return key;
}

// ── Component ────────────────────────────────────────────────

export default function PaymentButton({
  invoice,
  onSuccess,
  onError,
  label,
  className = "",
  disabled = false,
}: PaymentButtonProps) {
  const [processing, setProcessing] = useState(false);

  const isPaid = invoice.status === "PAID";
  const isDisabled = disabled || processing || isPaid;

  const handlePay = async () => {
    if (isDisabled) return;

    // ── Guard: duplicate payment prevention ──────────────
    if (processing) {
      toast.info("Payment is already in progress.");
      return;
    }

    setProcessing(true);

    try {
      // ── Step 1: Create order on backend ─────────────────
      toast.loading("Initialising payment…", { id: "rzp-pay" });

      const order = await createRazorpayOrder(
        invoice.id,
        invoice.totalAmount
      );

      // Razorpay Key: prefer backend response, fall back to env
      const keyId = order.key || getRazorpayKeyId();

      if (!keyId) {
        throw new Error(
          "Razorpay Key ID is not configured. Please contact support."
        );
      }

      toast.dismiss("rzp-pay");

      // ── Step 2: Open Razorpay Checkout ───────────────────
      const paymentResult = await openRazorpayCheckout({
        keyId,
        // Razorpay expects amount in paise (×100)
        amountInPaise: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
      });

      // ── Step 3: Verify payment on backend ────────────────
      toast.loading("Verifying payment…", { id: "rzp-verify" });

      await verifyRazorpayPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        invoiceId: invoice.id,
      });

      toast.dismiss("rzp-verify");

      // ── Step 4: Success ──────────────────────────────────
      toast.success("Payment Successful! 🎉", {
        description: `${formatCurrency(invoice.totalAmount)} paid for ${invoice.invoiceNumber}`,
        duration: 4000,
      });

      onSuccess?.({
        invoiceId: invoice.id,
        ...paymentResult,
      });
    } catch (err: any) {
      toast.dismiss("rzp-pay");
      toast.dismiss("rzp-verify");

      const errorMessage: string = err?.message ?? "An unexpected error occurred";
      const isCancelled = errorMessage === "PAYMENT_CANCELLED";

      if (isCancelled) {
        toast.info("Payment cancelled.", {
          description: "You closed the payment window. No amount was charged.",
        });
      } else {
        toast.error("Payment Failed", {
          description: errorMessage,
          duration: 5000,
        });
      }

      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setProcessing(false);
    }
  };

  // ── Already Paid State ───────────────────────────────────
  if (isPaid) {
    return (
      <span
        className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default ${className}`}
      >
        <CheckCircle2 size={16} />
        Invoice Paid
      </span>
    );
  }

  // ── Pay Now Button ───────────────────────────────────────
  return (
    <button
      id={`pay-now-btn-${invoice.id}`}
      type="button"
      onClick={handlePay}
      disabled={isDisabled}
      aria-label={`Pay ${formatCurrency(invoice.totalAmount)} for invoice ${invoice.invoiceNumber}`}
      aria-busy={processing}
      className={`
        inline-flex items-center gap-2 px-5 py-2.5
        text-sm font-semibold rounded-xl shadow-sm
        transition-all duration-150
        bg-gradient-to-r from-blue-600 to-indigo-600
        hover:from-blue-700 hover:to-indigo-700
        active:scale-[0.98]
        text-white
        disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
        focus:outline-none focus:ring-2 focus:ring-blue-500/40
        ${className}
      `}
    >
      {processing ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Processing…
        </>
      ) : (
        <>
          <CreditCard size={16} />
          {label ?? `Pay Now · ${formatCurrency(invoice.totalAmount)}`}
        </>
      )}
    </button>
  );
}
