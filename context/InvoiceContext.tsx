"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Invoice, UpdateInvoiceData } from "@/lib/api/finance/invoicesApi";
import { Payment, CreatePaymentData } from "@/lib/api/paymentApi";

// Demo invoices – keep yours exactly as they are
const initialInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-001",
    clientName: "Acme Corp",
    clientEmail: "billing@acme.com",
    clientAddress: "123 Main St, Mumbai",
    dueDate: "2025-03-15",
    status: "SENT",
    items: [
      { description: "Web Development", quantity: 1, price: 25000 },
      { description: "Hosting (1 year)", quantity: 1, price: 5000 },
    ],
    totalAmount: 30000,
    createdAt: "2025-02-15",
    updatedAt: "2025-02-15",
  },
  {
    id: "2",
    invoiceNumber: "INV-002",
    clientName: "Globex Inc",
    clientEmail: "accounts@globex.com",
    dueDate: "2025-04-01",
    status: "DRAFT",
    items: [{ description: "Consulting", quantity: 10, price: 2000 }],
    totalAmount: 20000,
    createdAt: "2025-03-01",
    updatedAt: "2025-03-01",
  },
  {
    id: "3",
    invoiceNumber: "INV-003",
    clientName: "Initech",
    dueDate: "2025-03-10",
    status: "PAID",
    items: [{ description: "API Integration", quantity: 1, price: 15000 }],
    totalAmount: 15000,
    createdAt: "2025-02-20",
    updatedAt: "2025-02-25",
  },
];

interface InvoiceContextType {
  invoices: Invoice[];
  payments: Payment[];
  addPayment: (data: CreatePaymentData) => Promise<void>;
  updateInvoiceStatus: (id: string, status: Invoice["status"]) => Promise<void>;
  getInvoiceById: (id: string) => Invoice | undefined;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [payments, setPayments] = useState<Payment[]>([]);

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

      // Update payments and then derive new invoice status
      setPayments((prev) => {
        const updatedPayments = [newPayment, ...prev];

        // Compute total paid for this invoice after adding the new payment
        const invoice = invoices.find((inv) => inv.id === data.invoiceId);
        if (!invoice) return updatedPayments;

        const totalPaid = updatedPayments
          .filter((p) => p.invoiceId === data.invoiceId && p.status === "SUCCESS")
          .reduce((sum, p) => sum + p.amount, 0);

        let newStatus: Invoice["status"] = invoice.status;
        if (totalPaid >= invoice.totalAmount) {
          newStatus = "PAID";
        } else if (invoice.status === "DRAFT") {
          // Any partial payment moves DRAFT → SENT
          newStatus = "SENT";
        }

        // Update invoice status only if it changed
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
        addPayment,
        updateInvoiceStatus,
        getInvoiceById,
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