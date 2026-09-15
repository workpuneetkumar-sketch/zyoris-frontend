// lib/api/paymentApi.ts
// Central type definitions for the payment module.
// Re-exports service functions for single-import convenience.

export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "NET_BANKING";

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  paymentDate: string;
  notes?: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  createdAt: string;
}

export interface CreatePaymentData {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  paymentDate: string;
  notes?: string;
}

// ── Razorpay-specific types ───────────────────────────────────

export interface RazorpayCreateOrderPayload {
  invoiceId: string;
  amount: number;
}

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key?: string;
}

export interface RazorpayVerifyPayload {
  /** Maps to razorpay_order_id from Razorpay checkout response */
  orderId: string;
  /** Maps to razorpay_payment_id from Razorpay checkout response */
  paymentId: string;
  /** Maps to razorpay_signature from Razorpay checkout response */
  signature: string;
  invoiceId: string;
}

export interface RazorpayVerifyResponse {
  success: boolean;
  message?: string;
  invoiceId?: string;
}

// Re-export service functions
export {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentStatus,
  getPaymentStatusByOrderId,
  getPaymentHistory,
  getPaymentHealth,
  getPaymentAnalytics,
  retryPayment,
  listPayments,
  downloadCsvBlob,
} from "./paymentService";

export type {
  PaymentStatus,
  PaymentMethodType,
  PaymentRecord,
  PaymentEvent,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  PaymentStatusResponse,
  PaymentHealthResponse,
  PaymentAnalyticsResponse,
  RetryPaymentResponse,
} from "./paymentService";
