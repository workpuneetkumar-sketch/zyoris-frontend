"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useInvoiceContext } from "@/context/InvoiceContext";
import { PaymentMethod } from "@/lib/api/paymentApi";

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "NET_BANKING"] as const, {
    message: "Please select a payment method",
  }),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive")
    .max(9999999999, "Amount too high"),
  transactionId: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  invoiceId: string;
  maxAmount: number;
  onSuccess: () => void;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "NET_BANKING", label: "Net Banking" },
];

export default function PaymentForm({
  invoiceId,
  maxAmount,
  onSuccess,
}: PaymentFormProps) {
  const { addPayment } = useInvoiceContext();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(
      paymentSchema.refine((data) => data.amount <= maxAmount, {
        message: `Amount cannot exceed ₹${maxAmount.toLocaleString("en-IN")}`,
        path: ["amount"],
      })
    ),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await addPayment({
        invoiceId,
        amount: data.amount,
        method: data.method,
        transactionId: data.transactionId,
        paymentDate: data.paymentDate,
        notes: data.notes,
      });
      toast.success("Payment recorded successfully!");
      reset(); // resets to defaultValues (date preserved, others cleared)
      onSuccess();
    } catch (err: any) {
      toast.error("Payment failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Method *
        </label>
        <select
          {...register("method")}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Select method</option>
          {METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.method && (
          <p className="text-red-500 text-xs mt-1">{errors.method.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            ₹
          </span>
          <input
            type="number"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            placeholder="0.00"
          />
        </div>
        {errors.amount && (
          <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Max: ₹{maxAmount.toLocaleString("en-IN")}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Transaction ID
        </label>
        <input
          type="text"
          {...register("transactionId")}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          placeholder="e.g. TXN123456"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Date *
        </label>
        <input
          type="date"
          {...register("paymentDate")}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        {errors.paymentDate && (
          <p className="text-red-500 text-xs mt-1">
            {errors.paymentDate.message}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          {...register("notes")}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
          placeholder="Any additional notes..."
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          "Pay Now"
        )}
      </button>
    </form>
  );
}