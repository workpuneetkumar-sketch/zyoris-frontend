"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Invoice, UpdateInvoiceData, getInvoices } from "@/lib/api/finance/invoicesApi";
import { Payment, CreatePaymentData } from "@/lib/api/paymentApi";

interface InvoiceContextType {
  invoices: Invoice[];
  payments: Payment[];
  loading: boolean;
  addPayment: (data: CreatePaymentData) => Promise<void>;
  updateInvoiceStatus: (id: string, status: Invoice["status"]) => Promise<void>;
  getInvoiceById: (id: string) => Invoice | undefined;
  refetch: () => Promise<void>;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error("Failed to load invoices:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const getInvoiceById = useCallback(
    (id: string) => invoices.find((inv) => inv.id === id),
    [invoices]
  );

  const addPayment = useCallback(
    async (data: CreatePaymentData) => {
      const newPayment: Payment = {
        id: Date.now().toString(),
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        transactionId: data.transactionId || undefined,
        paymentDate: data.paymentDate,
        notes: data.notes,
        status: "SUCCESS",
        createdAt: new Date().toISOString(),
      };

      setPayments((prev) => {
        const updatedPayments = [newPayment, ...prev];

        const invoice = invoices.find((inv) => inv.id === data.invoiceId);
        if (!invoice) return updatedPayments;

        const totalPaid = updatedPayments
          .filter((p) => p.invoiceId === data.invoiceId && p.status === "SUCCESS")
          .reduce((sum, p) => sum + p.amount, 0);

        let newStatus: Invoice["status"] = invoice.status;
        if (totalPaid >= invoice.totalAmount) {
          newStatus = "PAID";
        } else if (invoice.status === "DRAFT") {
          newStatus = "SENT";
        }

        if (newStatus !== invoice.status) {
          setInvoices((prevInvoices) =>
            prevInvoices.map((inv) =>
              inv.id === data.invoiceId
                ? { ...inv, status: newStatus, updatedAt: new Date().toISOString() }
                : inv
            )
          );
        }

        return updatedPayments;
      });
    },
    [invoices]
  );

  const updateInvoiceStatus = useCallback(
    async (id: string, status: Invoice["status"]) => {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? { ...inv, status, updatedAt: new Date().toISOString() }
            : inv
        )
      );
    },
    []
  );

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        payments,
        loading,
        addPayment,
        updateInvoiceStatus,
        getInvoiceById,
        refetch: fetchInvoices,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoiceContext() {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error("useInvoiceContext must be used within InvoiceProvider");
  return ctx;
}
