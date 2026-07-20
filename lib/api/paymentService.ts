// lib/api/paymentService.ts
// Central service for Razorpay payment API calls.
// All 8 payment endpoints: create-order, verify, status, history, health, analytics, retry, status/:orderId

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
  paymentId?: string;
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
  paymentId?: string;
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

// ── Health ──────────────────────────────────────────────────

export interface SchedulerStatus {
  configured: boolean;
  lastRun: string;
  expiredProcessed: number;
  reconciled: number;
  stuck: number;
  failed: number;
}

export interface PaymentHealthResponse {
  database: string;
  razorpay: string;
  webhookSecret: boolean;
  scheduler: SchedulerStatus;
}

// ── Analytics ───────────────────────────────────────────────

export interface PaymentAnalyticsResponse {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  totalRevenue: number;
  failedRevenue: number;
  successRate: number;
  statusDistribution: { status: string; count: number }[];
  recentPayments: {
    id: string;
    invoiceId: string;
    amount: number;
    paidAt?: string;
    method?: string | null;
  }[];
}

// ── Retry ───────────────────────────────────────────────────

export interface RetryPaymentResponse {
  orderId: string;
  amount: number;
  currency: string;
  key?: string;
  paymentId?: string;
}

// ════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * CHECK PAYMENT SUBSYSTEM HEALTH
 * GET /payments/health
 */
export async function getPaymentHealth(): Promise<PaymentHealthResponse> {
  try {
    const res = await api.get("/payments/health");
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to check payment health";
    throw new Error(msg);
  }
}

/**
 * GET PAYMENT EVENT HISTORY
 * GET /payments/:paymentId/history
 */
export async function getPaymentHistory(
  paymentId: string
): Promise<PaymentEvent[]> {
  try {
    const res = await api.get(`/payments/${paymentId}/history`);
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch payment history";
    throw new Error(msg);
  }
}

/**
 * CREATE RAZORPAY ORDER
 * POST /payments/create-order
 * Step 1 – Create a Razorpay order on the backend.
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
      paymentId: data.paymentId,
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
 * VERIFY RAZORPAY PAYMENT
 * POST /payments/verify
 * Step 2 – Verify the payment signature on the backend.
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
      paymentId: data?.paymentId,
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
 * GET LATEST PAYMENT STATUS (by payment DB ID)
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
 * GET PAYMENT STATUS BY RAZORPAY ORDER ID
 * GET /payments/status/:orderId
 */
export async function getPaymentStatusByOrderId(
  orderId: string
): Promise<PaymentStatusResponse> {
  try {
    const res = await api.get(`/payments/status/${orderId}`);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch payment status by order";
    throw new Error(msg);
  }
}

/**
 * GET PAYMENT ANALYTICS
 * GET /payments/analytics
 */
export async function getPaymentAnalytics(): Promise<PaymentAnalyticsResponse> {
  try {
    const res = await api.get("/payments/analytics");
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch payment analytics";
    throw new Error(msg);
  }
}

/**
 * RETRY PAYMENT FOR AN INVOICE
 * POST /payments/retry/:invoiceId
 */
export async function retryPayment(
  invoiceId: string
): Promise<RetryPaymentResponse> {
  try {
    const res = await api.post(`/payments/retry/${invoiceId}`);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to retry payment";
    throw new Error(msg);
  }
}

/**
 * LIST ALL PAYMENTS
 * GET /payments
 * Returns all payments for the current organization with optional filters.
 */
export async function listPayments(filters?: {
  status?: string;
  invoiceId?: string;
}): Promise<PaymentRecord[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.invoiceId) params.invoiceId = filters.invoiceId;

    const res = await api.get("/payments", { params });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to list payments";
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
