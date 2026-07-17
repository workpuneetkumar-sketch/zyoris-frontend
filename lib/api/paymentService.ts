// lib/api/paymentService.ts
// Central service for Razorpay payment API calls.
// Backend endpoints: create-order, verify, status, webhook.

import api from "./api";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethodType =
  | "RAZORPAY"
  | "CARD"
  | "CASH"
  | "UPI"
  | "BANK_TRANSFER"
  | "NET_BANKING";

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  orderId?: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  method: PaymentMethodType;
  status: PaymentStatus;
  invoiceNumber?: string;
  clientName?: string;
  clientEmail?: string;
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  previousStatus: PaymentStatus | null;
  currentStatus: PaymentStatus;
  source: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// ── Create Order ────────────────────────────────────────────

export interface CreateOrderRequest {
  invoiceId: string;
  amount: number;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key?: string;
}

// ── Verify Payment ──────────────────────────────────────────

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  invoiceId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  invoiceId?: string;
}

// ── Payment Status ──────────────────────────────────────────

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  orderId?: string;
  razorpayPaymentId?: string;
  failureReason?: string;
  paidAt?: string;
  updatedAt: string;
}

// ════════════════════════════════════════════════════════════════
// API FUNCTIONS (only working backend endpoints)
// ════════════════════════════════════════════════════════════════

/**
 * Step 1 – Create a Razorpay order on the backend.
 * POST /payments/create-order
 * Returns the order details needed to open the Razorpay checkout.
 */
export async function createRazorpayOrder(
  invoiceId: string,
  amount: number
): Promise<CreateOrderResponse> {
  const payload: CreateOrderRequest = { invoiceId, amount };

  try {
    const res = await api.post("/payments/create-order", payload);
    const data = res.data?.data ?? res.data;

    if (!data?.orderId) {
      throw new Error("Invalid order response from server");
    }

    return {
      orderId: data.orderId,
      amount: data.amount ?? amount,
      currency: data.currency ?? "INR",
      key: data.key,
    };
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to create payment order";
    throw new Error(msg);
  }
}

/**
 * Step 2 – Verify the payment signature on the backend.
 * POST /payments/verify
 * Must be called after the Razorpay checkout completes successfully.
 * The backend validates the HMAC signature and marks the invoice as PAID.
 */
export async function verifyRazorpayPayment(
  payload: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  try {
    const res = await api.post("/payments/verify", payload);
    const data = res.data?.data ?? res.data;

    return {
      success: data?.success ?? true,
      message: data?.message,
      invoiceId: data?.invoiceId ?? payload.invoiceId,
    };
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Payment verification failed";
    throw new Error(msg);
  }
}

/**
 * Get the latest status of a specific payment.
 * GET /payments/:paymentId/status
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<PaymentStatusResponse> {
  try {
    const res = await api.get(`/payments/${paymentId}/status`);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch payment status";
    throw new Error(msg);
  }
}

/**
 * Helper: trigger CSV download in the browser.
 */
export function downloadCsvBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
