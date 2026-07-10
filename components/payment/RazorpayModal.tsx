"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/api/paymentService";
import { openRazorpayCheckout } from "@/utils/razorpay";
import {
  X,
  Shield,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  ArrowRight,
  Lock,
  IndianRupee,
  Banknote,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────

export interface MockPaymentResult {
  paymentId: string;
  method: string;
  amount: number;
  status: "COMPLETED";
  transactionId: string;
  /** Real Razorpay fields — present when paid via SDK */
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: MockPaymentResult) => void;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  /** Invoice ID — required for the real backend flow */
  invoiceId?: string;
  /** Client email for Razorpay prefill */
  clientEmail?: string;
}

// ── Helpers ────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function generatePaymentId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "pay_";
  for (let i = 0; i < 14; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ── Constants ──────────────────────────────────────────────

type PaymentTab = "upi" | "card" | "netbanking" | "wallet";

const TABS: { id: PaymentTab; label: string; icon: typeof CreditCard }[] = [
  { id: "upi",        label: "UPI",         icon: Smartphone },
  { id: "card",       label: "Card",        icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Building2  },
  { id: "wallet",     label: "Wallet",      icon: Wallet     },
];

const BANKS = [
  { name: "State Bank of India", code: "SBI"   },
  { name: "HDFC Bank",           code: "HDFC"  },
  { name: "ICICI Bank",          code: "ICICI" },
  { name: "Axis Bank",           code: "AXIS"  },
  { name: "Kotak Mahindra",      code: "KOTAK" },
  { name: "Punjab National",     code: "PNB"   },
];

const WALLETS = [
  { name: "Paytm",        color: "bg-blue-500"   },
  { name: "PhonePe",      color: "bg-purple-600" },
  { name: "Amazon Pay",   color: "bg-amber-500"  },
  { name: "Mobikwik",     color: "bg-blue-600"   },
  { name: "Freecharge",   color: "bg-green-500"  },
];

// ── UPI App Shortcuts ──────────────────────────────────────

const UPI_APPS = ["GPay", "PhonePe", "Paytm", "BHIM"];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function RazorpayModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceNumber,
  clientName,
  amount,
  invoiceId,
  clientEmail,
}: RazorpayModalProps) {
  const [activeTab, setActiveTab]         = useState<PaymentTab>("upi");
  const [processing, setProcessing]       = useState(false);
  const [success, setSuccess]             = useState(false);

  // UPI
  const [upiId, setUpiId]                 = useState("");
  const [upiError, setUpiError]           = useState("");

  // Card
  const [cardNumber, setCardNumber]       = useState("");
  const [cardExpiry, setCardExpiry]       = useState("");
  const [cardCvv, setCardCvv]             = useState("");
  const [cardName, setCardName]           = useState("");

  // Net Banking
  const [selectedBank, setSelectedBank]   = useState("");

  // Wallet
  const [selectedWallet, setSelectedWallet] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("upi");
      setProcessing(false);
      setSuccess(false);
      setUpiId("");
      setUpiError("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setCardName("");
      setSelectedBank("");
      setSelectedWallet("");
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !processing) onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, processing, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── Real Razorpay payment flow ───────────────────────────
  const processPayment = useCallback(async (method: string) => {
    setProcessing(true);

    try {
      // ── If we have an invoiceId, use the real Razorpay SDK ──
      if (invoiceId) {
        // 1. Create order on backend
        const order = await createRazorpayOrder(invoiceId, amount);

        const keyId =
          order.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

        if (!keyId) {
          throw new Error(
            "Razorpay Key ID is not configured. Please contact support."
          );
        }

        setProcessing(false);

        // 2. Open Razorpay Checkout (real SDK)
        const paymentResult = await openRazorpayCheckout({
          keyId,
          amountInPaise: order.amount,
          currency: order.currency,
          orderId: order.orderId,
          invoiceId,
          invoiceNumber,
          clientName,
          clientEmail,
        });

        setProcessing(true);

        // 3. Verify payment on backend
        await verifyRazorpayPayment({
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
          invoiceId,
        });

        setProcessing(false);
        setSuccess(true);

        setTimeout(() => {
          onSuccess({
            paymentId: paymentResult.razorpay_payment_id,
            method,
            amount,
            status: "COMPLETED",
            transactionId: paymentResult.razorpay_payment_id,
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_order_id: paymentResult.razorpay_order_id,
            razorpay_signature: paymentResult.razorpay_signature,
          });
        }, 1200);

      } else {
        // ── Fallback: simulate for environments without a backend ──
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 500));
        setProcessing(false);
        setSuccess(true);
        setTimeout(() => {
          onSuccess({
            paymentId: generatePaymentId(),
            method,
            amount,
            status: "COMPLETED",
            transactionId: `TXN${Date.now()}`,
          });
        }, 1200);
      }
    } catch (err: any) {
      setProcessing(false);
      const msg: string = err?.message ?? "Payment failed";
      const isCancelled = msg === "PAYMENT_CANCELLED";

      if (isCancelled) {
        toast.info("Payment cancelled.", {
          description: "You closed the checkout. No amount was charged.",
        });
        onClose();
      } else {
        toast.error("Payment Failed", {
          description: msg,
          duration: 5000,
        });
      }
    }
  }, [amount, invoiceId, invoiceNumber, clientName, clientEmail, onSuccess, onClose]);

  // ── Validate & trigger payment ───────────────────────────
  const handlePay = () => {
    if (activeTab === "upi") {
      if (!upiId || !upiId.includes("@")) {
        setUpiError("Enter a valid UPI ID (e.g. name@upi)");
        return;
      }
      setUpiError("");
      processPayment("UPI");
    } else if (activeTab === "card") {
      processPayment("Card");
    } else if (activeTab === "netbanking") {
      if (!selectedBank) return;
      processPayment("Net Banking");
    } else if (activeTab === "wallet") {
      if (!selectedWallet) return;
      processPayment(`Wallet (${selectedWallet})`);
    }
  };

  const canPay = () => {
    if (activeTab === "upi")        return upiId.trim().length > 0;
    if (activeTab === "card")       return cardNumber.replace(/\s/g, "").length >= 16 && cardExpiry.length >= 5 && cardCvv.length >= 3 && cardName.trim().length > 0;
    if (activeTab === "netbanking") return selectedBank.length > 0;
    if (activeTab === "wallet")     return selectedWallet.length > 0;
    return false;
  };

  if (!isOpen) return null;

  // ── Success screen ───────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ animation: "rzpScaleIn 0.25s ease-out" }}>
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center" style={{ animation: "rzpBounce 0.4s ease-out 0.1s both" }}>
              <CheckCircle2 size={44} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Payment Successful!</h3>
            <p className="text-sm text-gray-500 mb-4">{formatCurrency(amount)} paid for {invoiceNumber}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-600">
              <Shield size={12} />
              <span>Transaction secured • Redirecting…</span>
            </div>
            <div className="mt-6">
              <div className="w-6 h-6 mx-auto border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          </div>
        </div>
        <style>{`@keyframes rzpScaleIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes rzpBounce{0%{transform:scale(0)}50%{transform:scale(1.15)}100%{transform:scale(1)}}`}</style>
      </div>
    );
  }

  // ── Processing screen ────────────────────────────────────
  if (processing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-5 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Processing Payment</h3>
            <p className="text-sm text-gray-500 mb-4">Please do not close this window…</p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock size={11} />
              <span>256-bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main modal ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ animation: "rzpScaleIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <IndianRupee size={16} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">Zyoris Pay</p>
                <p className="text-xs text-blue-200">{clientName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(amount)}</span>
          </div>
          <p className="text-xs text-blue-200 mt-0.5">Invoice {invoiceNumber}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50/50">
          <div className="flex">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-all border-b-2 ${
                    active
                      ? "text-blue-600 border-blue-600 bg-white"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[230px]">

          {/* UPI */}
          {activeTab === "upi" && (
            <div className="space-y-4" style={{ animation: "rzpFadeIn 0.15s ease-out" }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => { setUpiId(e.target.value); setUpiError(""); }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                    upiError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                  placeholder="yourname@upi"
                />
                {upiError && <p className="text-red-500 text-xs mt-1.5">{upiError}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                <span>or pay using app</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {UPI_APPS.map((app) => (
                  <button
                    key={app}
                    onClick={() => setUpiId(`mock@${app.toLowerCase()}`)}
                    className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                  >
                    <Smartphone size={17} className="text-blue-500" />
                    <span className="text-[11px] font-medium text-gray-600">{app}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card */}
          {activeTab === "card" && (
            <div className="space-y-4" style={{ animation: "rzpFadeIn 0.15s ease-out" }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Number</label>
                <input
                  type="text"
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
                    setCardNumber(v);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono tracking-wider transition-all"
                  placeholder="4242 4242 4242 4242"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                      setCardExpiry(v);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-all"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-all"
                    placeholder="•••"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cardholder Name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Name on card"
                />
              </div>
            </div>
          )}

          {/* Net Banking */}
          {activeTab === "netbanking" && (
            <div style={{ animation: "rzpFadeIn 0.15s ease-out" }}>
              <p className="text-sm font-medium text-gray-700 mb-3">Select your bank</p>
              <div className="grid grid-cols-2 gap-2">
                {BANKS.map((bank) => (
                  <button
                    key={bank.code}
                    onClick={() => setSelectedBank(bank.code)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-xl text-sm transition-all text-left ${
                      selectedBank === bank.code
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/30"
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Building2 size={15} className={selectedBank === bank.code ? "text-blue-500" : "text-gray-400"} />
                    <span className="font-medium text-xs truncate">{bank.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wallet */}
          {activeTab === "wallet" && (
            <div style={{ animation: "rzpFadeIn 0.15s ease-out" }}>
              <p className="text-sm font-medium text-gray-700 mb-3">Choose a wallet</p>
              <div className="space-y-2">
                {WALLETS.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => setSelectedWallet(w.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border rounded-xl text-sm transition-all ${
                      selectedWallet === w.name
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/30"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${w.color} flex items-center justify-center shrink-0`}>
                      <Wallet size={14} className="text-white" />
                    </div>
                    <span className="font-medium text-gray-800">{w.name}</span>
                    {selectedWallet === w.name && (
                      <CheckCircle2 size={16} className="ml-auto text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Pay button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handlePay}
            disabled={!canPay()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock size={13} />
            Pay {formatCurrency(amount)}
            <ArrowRight size={14} />
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-gray-400">
            <Shield size={9} />
            <span>Secured by 256-bit SSL • Powered by Zyoris Pay</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rzpScaleIn  { from { opacity:0; transform:scale(.95) translateY(8px)  } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes rzpBounce   { 0%  { transform:scale(0) } 50% { transform:scale(1.15) } 100% { transform:scale(1) } }
        @keyframes rzpFadeIn   { from { opacity:0; transform:translateY(5px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}
