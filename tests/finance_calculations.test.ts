import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateInvoiceTotals,
  isInvoiceOverdue,
  getInvoiceReceivable,
  generateInvoiceHTML,
  type Invoice,
} from "../lib/api/finance/invoiceUtils.ts";

test("calculateInvoiceTotals computes subtotal, 18% GST, and grandTotal accurately", () => {
  const res = calculateInvoiceTotals([{ quantity: 1, price: 100 }], 18);
  assert.equal(res.subtotal, 100);
  assert.equal(res.taxRate, 18);
  assert.equal(res.taxAmount, 18);
  assert.equal(res.grandTotal, 118);

  const multi = calculateInvoiceTotals(
    [
      { quantity: 2, price: 150.25 },
      { quantity: 3, price: 33.33 },
    ],
    18
  );
  assert.equal(multi.subtotal, 400.49);
  assert.equal(multi.taxAmount, 72.09);
  assert.equal(multi.grandTotal, 472.58);

  const zeroGst = calculateInvoiceTotals([{ quantity: 2, price: 500 }], 0);
  assert.equal(zeroGst.subtotal, 1000);
  assert.equal(zeroGst.taxAmount, 0);
  assert.equal(zeroGst.grandTotal, 1000);
});

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test("isInvoiceOverdue handles paid, unpaid, partial, and due-date boundaries", () => {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  const todayStr = toLocalDateStr(now);

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowStr = toLocalDateStr(tomorrow);

  assert.equal(isInvoiceOverdue({ status: "SENT", dueDate: yesterdayStr, totalAmount: 10000 }, 0), true);
  assert.equal(isInvoiceOverdue({ status: "SENT", dueDate: yesterdayStr, totalAmount: 10000 }, 4000), true);
  assert.equal(isInvoiceOverdue({ status: "SENT", dueDate: yesterdayStr, totalAmount: 10000 }, 10000), false);
  assert.equal(isInvoiceOverdue({ status: "PAID", dueDate: yesterdayStr, totalAmount: 10000 }, 0), false);
  assert.equal(isInvoiceOverdue({ status: "SENT", dueDate: todayStr, totalAmount: 10000 }, 0), false);
  assert.equal(isInvoiceOverdue({ status: "SENT", dueDate: tomorrowStr, totalAmount: 10000 }, 0), false);
});

test("getInvoiceReceivable computes unpaid, partial, and fully paid balances", () => {
  assert.equal(getInvoiceReceivable({ status: "SENT", totalAmount: 10000 }, 0), 10000);
  assert.equal(getInvoiceReceivable({ status: "SENT", totalAmount: 10000 }, 4000), 6000);
  assert.equal(getInvoiceReceivable({ status: "SENT", totalAmount: 10000 }, 10000), 0);
  assert.equal(getInvoiceReceivable({ status: "PAID", totalAmount: 10000 }, 0), 0);
});

test("Draft invoice price & GST edits recalculate line subtotal, GST, and Grand Total accurately", () => {
  // Updating price from 100 to 500 (qty 1, GST 18%)
  const updatedSingle = calculateInvoiceTotals([{ quantity: 1, price: 500 }], 18);
  assert.equal(updatedSingle.subtotal, 500);
  assert.equal(updatedSingle.taxAmount, 90);
  assert.equal(updatedSingle.grandTotal, 590);

  // Updating price from 100 to 500 when quantity is 2 (GST 18%)
  const updatedQty2 = calculateInvoiceTotals([{ quantity: 2, price: 500 }], 18);
  assert.equal(updatedQty2.subtotal, 1000);
  assert.equal(updatedQty2.taxAmount, 180);
  assert.equal(updatedQty2.grandTotal, 1180);

  // Updating price and GST simultaneously (qty 2, price 500, GST 12%)
  const updatedBoth = calculateInvoiceTotals([{ quantity: 2, price: 500 }], 12);
  assert.equal(updatedBoth.subtotal, 1000);
  assert.equal(updatedBoth.taxAmount, 120);
  assert.equal(updatedBoth.grandTotal, 1120);
});

test("generateInvoiceHTML includes GST, Grand Total, and escaped client email/address", () => {
  const invoice: Invoice = {
    id: "inv-1",
    invoiceNumber: "INV-2026-001",
    clientName: "Acme <Corp>",
    clientEmail: "billing@acme.com",
    clientAddress: "123 Tech Park, Noida",
    dueDate: "2026-12-10",
    status: "SENT",
    items: [{ description: "Consulting", quantity: 1, price: 100 }],
    subtotal: 100,
    taxRate: 18,
    taxAmount: 18,
    totalAmount: 118,
    createdAt: "2026-11-26",
    updatedAt: "2026-11-26",
    notes: "Net 15",
  };
  const html = generateInvoiceHTML(invoice);
  assert.match(html, /Invoice ID: inv-1/);
  assert.match(html, /GST \(18%\)/);
  assert.match(html, /₹18\.00/);
  assert.match(html, /₹118\.00/);
  assert.match(html, /billing@acme\.com/);
  assert.match(html, /123 Tech Park, Noida/);
  assert.match(html, /Acme &lt;Corp&gt;/);
});

test("generateInvoiceHTML produces identical Subtotal, GST, and Grand Total for 18%, 0%, and 12% GST (Item1 ₹100 + Item2 ₹100)", () => {
  const items = [
    { description: "Service A", quantity: 1, price: 100 },
    { description: "Service B", quantity: 1, price: 100 },
  ];

  // 18% GST: Subtotal 200, GST 36, Grand Total 236
  const t18 = calculateInvoiceTotals(items, 18);
  const html18 = generateInvoiceHTML({
    id: "inv-200-18",
    invoiceNumber: "INV-200-18",
    clientName: "Test Client",
    clientEmail: "test@client.com",
    clientAddress: "Sector 62, Noida",
    dueDate: "2026-12-15",
    status: "SENT",
    items,
    subtotal: t18.subtotal,
    taxRate: t18.taxRate,
    taxAmount: t18.taxAmount,
    totalAmount: t18.grandTotal,
    createdAt: "2026-11-26",
    updatedAt: "2026-11-26",
  });
  assert.match(html18, /₹200\.00/);
  assert.match(html18, /GST \(18%\)/);
  assert.match(html18, /₹36\.00/);
  assert.match(html18, /₹236\.00/);
  assert.match(html18, /test@client\.com/);
  assert.match(html18, /Sector 62, Noida/);

  // 0% GST: Subtotal 200, GST 0, Grand Total 200
  const t0 = calculateInvoiceTotals(items, 0);
  const html0 = generateInvoiceHTML({
    id: "inv-200-0",
    invoiceNumber: "INV-200-0",
    clientName: "Test Client",
    dueDate: "2026-12-15",
    status: "DRAFT",
    items,
    subtotal: t0.subtotal,
    taxRate: t0.taxRate,
    taxAmount: t0.taxAmount,
    totalAmount: t0.grandTotal,
    createdAt: "2026-11-26",
    updatedAt: "2026-11-26",
  });
  assert.match(html0, /GST \(0%\)/);
  assert.match(html0, /₹0\.00/);
  assert.match(html0, /₹200\.00/);

  // 12% GST: Subtotal 200, GST 24, Grand Total 224
  const t12 = calculateInvoiceTotals(items, 12);
  const html12 = generateInvoiceHTML({
    id: "inv-200-12",
    invoiceNumber: "INV-200-12",
    clientName: "Test Client",
    dueDate: "2026-12-15",
    status: "SENT",
    items,
    subtotal: t12.subtotal,
    taxRate: t12.taxRate,
    taxAmount: t12.taxAmount,
    totalAmount: t12.grandTotal,
    createdAt: "2026-11-26",
    updatedAt: "2026-11-26",
  });
  assert.match(html12, /GST \(12%\)/);
  assert.match(html12, /₹24\.00/);
  assert.match(html12, /₹224\.00/);
});
