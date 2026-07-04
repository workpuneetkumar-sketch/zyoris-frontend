import React from "react";
import { Clock } from "lucide-react";
import { Payment } from "@/lib/api/paymentApi";

interface PaymentHistoryProps {
  payments: Payment[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Clock size={32} className="mx-auto mb-2" />
        <p className="text-sm">No payment records yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">
              Date
            </th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">
              Method
            </th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">
              Amount
            </th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">
              Transaction ID
            </th>
            <th className="text-center px-3 py-2 font-medium text-gray-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50 transition">
              <td className="px-3 py-2 text-gray-700">
                {formatDate(p.paymentDate)}
              </td>
              <td className="px-3 py-2 text-gray-700 capitalize">
                {p.method.replace("_", " ").toLowerCase()}
              </td>
              <td className="px-3 py-2 text-right font-medium text-gray-900">
                ₹{p.amount.toLocaleString("en-IN")}
              </td>
              <td className="px-3 py-2 text-gray-600">
                {p.transactionId || "—"}
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === "SUCCESS"
                      ? "bg-green-100 text-green-700"
                      : p.status === "FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}