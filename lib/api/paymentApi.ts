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
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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
} from "./paymentService";
