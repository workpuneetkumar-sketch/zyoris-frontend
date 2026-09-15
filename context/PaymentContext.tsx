// context/PaymentContext.tsx
"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface PaymentRecord {
  id: string; // unique id for payment entry
  date: string; // ISO string
  method: "UPI" | "Card" | "Bank Transfer" | "Cash";
  amount: number;
  transactionId: string;
  notes?: string;
  status: "COMPLETED";
}

interface PaymentContextValue {
  addPayment: (invoiceId: string, payment: Omit<PaymentRecord, "id">) => void;
  getPayments: (invoiceId: string) => PaymentRecord[];
}

const PaymentContext = createContext<PaymentContextValue | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [store, setStore] = useState<Record<string, PaymentRecord[]>>({});

  // optional persistence to localStorage
  useEffect(() => {
    const data = typeof window !== "undefined" ? localStorage.getItem("paymentStore") : null;
    if (data) {
      setStore(JSON.parse(data));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("paymentStore", JSON.stringify(store));
    }
  }, [store]);

  const addPayment = (invoiceId: string, payment: Omit<PaymentRecord, "id">) => {
    setStore((prev) => {
      const existing = prev[invoiceId] || [];
      const newPayment: PaymentRecord = {
        ...payment,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        status: "COMPLETED",
      };
      return { ...prev, [invoiceId]: [newPayment, ...existing] };
    });
  };

  const getPayments = (invoiceId: string) => {
    return store[invoiceId] ?? [];
  };

  return (
    <PaymentContext.Provider value={{ addPayment, getPayments }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const ctx = useContext(PaymentContext);
  if (!ctx) {
    throw new Error("usePayment must be used within PaymentProvider");
  }
  return ctx;
};
