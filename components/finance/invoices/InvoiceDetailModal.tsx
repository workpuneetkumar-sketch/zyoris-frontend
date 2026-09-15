// components/finance/InvoiceDetailModal.tsx
'use client';

import { Invoice, InvoiceStatus } from '@/lib/api/finance/invoicesApi';
import { X, Download, Printer } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
  onStatusUpdate: (invoiceId: string, newStatus: InvoiceStatus) => void;
  onDownloadPDF: (invoiceId: string) => void;
}

export default function InvoiceDetailModal({ 
  invoice, 
  onClose, 
  onStatusUpdate, 
  onDownloadPDF 
}: InvoiceDetailModalProps) {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
            <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Actions */}
          <div className="flex gap-3 justify-end print:hidden">
            <button
              onClick={() => onDownloadPDF(invoice.id)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={18} />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Printer size={18} />
              Print
            </button>
          </div>

          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">From</h3>
              <div className="text-gray-600">
                <p className="font-medium text-gray-900">Your Company Name</p>
                <p>123 Business Street</p>
                <p>City, State 12345</p>
                <p>contact@yourcompany.com</p>
                <p>+1 234 567 890</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h3>
              <div className="text-gray-600">
                <p className="font-medium text-gray-900">{invoice.clientName}</p>
                {invoice.clientAddress && <p>{invoice.clientAddress}</p>}
                {invoice.clientEmail && <p>{invoice.clientEmail}</p>}
              </div>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Invoice Number</p>
              <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Issue Date</p>
              <p className="font-medium text-gray-900">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-gray-600">Description</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-600">Quantity</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-600">Rate</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="p-3 text-gray-900">{item.description}</td>
                      <td className="p-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="p-3 text-right text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="p-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="p-3 text-right font-semibold text-gray-900">
                      Subtotal
                    </td>
                    <td className="p-3 text-right font-semibold text-gray-900">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-3 text-right font-semibold text-gray-900">
                      Total
                    </td>
                    <td className="p-3 text-right text-xl font-bold text-gray-900">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Status Update Section (if not paid) */}
          {invoice.status !== 'PAID' && (
            <div className="pt-6 border-t border-gray-200 print:hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
              <div className="flex gap-3">
                {invoice.status === 'DRAFT' && (
                  <button
                    onClick={() => onStatusUpdate(invoice.id, 'SENT')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Mark as Sent
                  </button>
                )}
                {invoice.status === 'SENT' && (
                  <button
                    onClick={() => onStatusUpdate(invoice.id, 'PAID')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}