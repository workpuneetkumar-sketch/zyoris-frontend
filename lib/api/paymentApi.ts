// lib/api/paymentApi.ts
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

/** Payload sent to POST /payments/create-order */
export interface RazorpayCreateOrderPayload {
  invoiceId: string;
  amount: number;
}

/** Response from POST /payments/create-order */
export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;   // amount in paise
  currency: string;
  key?: string;     // Razorpay Key ID (some backends include this)
}

/** Payload sent to POST /payments/verify */
export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  invoiceId: string;
}

/** Response from POST /payments/verify */
export interface RazorpayVerifyResponse {
  success: boolean;
  message?: string;
  invoiceId?: string;
}

// Re-export service functions for consumers who prefer a single import path
export { createRazorpayOrder, verifyRazorpayPayment } from "./paymentService";