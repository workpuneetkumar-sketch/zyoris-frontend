// utils/razorpay.ts
// Razorpay SDK helper.
//
// Loads the Razorpay checkout script dynamically (CDN) so it doesn't
// bloat the initial bundle. Opens the checkout and returns a Promise
// that resolves with payment data or rejects on failure / cancellation.

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let scriptLoadPromise: Promise<void> | null = null;

// ── Script Loader ─────────────────────────────────────────────

/**
 * Idempotently loads the Razorpay checkout script.
 * Subsequent calls return the same Promise so the script is only fetched once.
 */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is not available server-side"));
  }

  // Already loaded
  if (window.Razorpay) return Promise.resolve();

  // Already loading
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );

    if (existingScript) {
      // Script tag exists but window.Razorpay not yet set — wait for load
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Razorpay script"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay script. Check your network connection."));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

// ── Checkout Options ──────────────────────────────────────────

export interface RazorpayCheckoutOptions {
  /** Razorpay Key ID (rzp_test_xxx or rzp_live_xxx) */
  keyId: string;
  /** Amount in **paise** (multiply INR amount × 100) */
  amountInPaise: number;
  currency?: string;
  orderId: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  /** Optional client email for prefill */
  clientEmail?: string;
}

export interface RazorpayPaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ── Open Checkout ─────────────────────────────────────────────

/**
 * Opens the Razorpay checkout modal.
 *
 * @returns A Promise that resolves with the payment result on success,
 *          or rejects with an error on failure / user dismissal.
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayPaymentResult> {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error(
      "Razorpay SDK failed to initialize. Please refresh and try again."
    );
  }

  return new Promise<RazorpayPaymentResult>((resolve, reject) => {
    const rzpOptions = {
      key: options.keyId,
      amount: options.amountInPaise,
      currency: options.currency ?? "INR",
      order_id: options.orderId,
      name: "Zyoris",
      description: `Invoice ${options.invoiceNumber}`,
      image: "/logo.png", // optional – use your app logo
      prefill: {
        name: options.clientName,
        email: options.clientEmail ?? "",
      },
      notes: {
        invoiceId: options.invoiceId,
        invoiceNumber: options.invoiceNumber,
      },
      theme: {
        color: "#2563eb",
      },
      modal: {
        ondismiss: () => {
          reject(new Error("PAYMENT_CANCELLED"));
        },
      },
      handler: (response: RazorpayPaymentResult) => {
        resolve(response);
      },
    };

    const rzp = new window.Razorpay(rzpOptions);

    // Handle payment failure events emitted by the SDK
    rzp.on("payment.failed", (response: any) => {
      const description =
        response?.error?.description ||
        response?.error?.reason ||
        "Payment failed";
      reject(new Error(description));
    });

    rzp.open();
  });
}
