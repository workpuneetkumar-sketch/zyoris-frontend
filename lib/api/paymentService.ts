// lib/api/paymentService.ts
// Central service for all Razorpay payment-related API calls.
// Uses the shared axios instance (JWT auth, retries, 401 refresh all handled automatically).

import api from "./api";

// ── Request / Response Types ──────────────────────────────────

export interface CreateOrderRequest {
  invoiceId: string;
  amount: number;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  /** Some backends return the Razorpay key in the order response */
  key?: string;
}

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

// ── API Functions ─────────────────────────────────────────────

/**
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
