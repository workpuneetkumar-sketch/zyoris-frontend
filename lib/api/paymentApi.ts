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