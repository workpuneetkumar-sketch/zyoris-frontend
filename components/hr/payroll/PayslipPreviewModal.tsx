"use client";

import React, { useRef } from "react";
import { X, Download, Printer, Building2, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import type { Payslip } from "@/lib/api/payrollApi";

interface PayslipPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: Payslip | null;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";

  const intPart = Math.floor(num);

  function convertToWords(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertToWords(n % 100) : "");
    if (n < 100000) return convertToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convertToWords(n % 1000) : "");
    if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convertToWords(n % 100000) : "");
    return convertToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convertToWords(n % 10000000) : "");
  }

  return convertToWords(intPart) + " Rupees Only";
}

export default function PayslipPreviewModal({
  isOpen,
  onClose,
  payslip,
}: PayslipPreviewModalProps) {
  const payslipRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payslip) return null;

  const earningsItems = [
    { label: "Basic Salary", value: payslip.earnings.basic },
    { label: "House Rent Allowance (HRA)", value: payslip.earnings.hra },
    { label: "Dearness Allowance (DA)", value: payslip.earnings.da },
    { label: "Special Allowance", value: payslip.earnings.specialAllowance },
    { label: "Conveyance Allowance", value: payslip.earnings.conveyance },
    { label: "Medical Allowance", value: payslip.earnings.medicalAllowance },
    { label: "Other Allowances", value: payslip.earnings.otherAllowances },
  ];

  const deductionItems = [
    { label: "Provident Fund (PF)", value: payslip.deductions.pf },
    { label: "Employee State Insurance (ESI)", value: payslip.deductions.esi },
    { label: "Tax Deducted at Source (TDS)", value: payslip.deductions.tds },
    { label: "Professional Tax", value: payslip.deductions.professionalTax },
    { label: "Loan Recovery", value: payslip.deductions.loanRecovery },
    { label: "Other Deductions", value: payslip.deductions.otherDeductions },
  ];

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Company Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(payslip.companyName, pageWidth / 2, 12, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(payslip.companyAddress, pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Payslip for ${formatMonth(payslip.month)}`, pageWidth / 2, 25, { align: "center" });

    y = 36;
    doc.setTextColor(0, 0, 0);

    // Payslip Number
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Payslip No: ${payslip.payslipNumber}`, 15, y);
    y += 8;

    // Employee Details Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, pageWidth - 30, 32, 2, 2, "FD");
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("EMPLOYEE DETAILS", 20, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;

    doc.text(`Name: ${payslip.employeeName}`, leftCol, y);
    doc.text(`Employee ID: ${payslip.employeeId}`, rightCol, y);
    y += 5;
    doc.text(`Designation: ${payslip.designation}`, leftCol, y);
    doc.text(`Department: ${payslip.department}`, rightCol, y);
    y += 5;
    doc.text(`PAN: ${payslip.panNumber}`, leftCol, y);
    doc.text(`UAN: ${payslip.uanNumber}`, rightCol, y);
    y += 5;
    doc.text(`Paid Days: ${payslip.paidDays}`, leftCol, y);
    doc.text(`LOP Days: ${payslip.lopDays}`, rightCol, y);

    y += 12;

    // Earnings & Deductions Side by Side
    const colWidth = (pageWidth - 35) / 2;
    const earnX = 15;
    const dedX = earnX + colWidth + 5;

    // Earnings Header
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(earnX, y, colWidth, 8, 1, 1, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 128, 61);
    doc.text("EARNINGS", earnX + 4, y + 5.5);
    doc.text("Amount (₹)", earnX + colWidth - 4, y + 5.5, { align: "right" });

    // Deductions Header
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(dedX, y, colWidth, 8, 1, 1, "F");
    doc.setTextColor(185, 28, 28);
    doc.text("DEDUCTIONS", dedX + 4, y + 5.5);
    doc.text("Amount (₹)", dedX + colWidth - 4, y + 5.5, { align: "right" });

    y += 12;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    const maxRows = Math.max(earningsItems.length, deductionItems.length);
    for (let i = 0; i < maxRows; i++) {
      if (i < earningsItems.length) {
        doc.text(earningsItems[i].label, earnX + 4, y);
        doc.text(earningsItems[i].value.toLocaleString("en-IN"), earnX + colWidth - 4, y, { align: "right" });
      }
      if (i < deductionItems.length) {
        doc.text(deductionItems[i].label, dedX + 4, y);
        doc.text(deductionItems[i].value.toLocaleString("en-IN"), dedX + colWidth - 4, y, { align: "right" });
      }
      y += 6;
    }

    y += 2;
    // Divider lines
    doc.setDrawColor(203, 213, 225);
    doc.line(earnX, y, earnX + colWidth, y);
    doc.line(dedX, y, dedX + colWidth, y);
    y += 5;

    // Totals
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 128, 61);
    doc.text("Gross Earnings", earnX + 4, y);
    doc.text(`₹${payslip.grossEarnings.toLocaleString("en-IN")}`, earnX + colWidth - 4, y, { align: "right" });

    doc.setTextColor(185, 28, 28);
    doc.text("Total Deductions", dedX + 4, y);
    doc.text(`₹${payslip.totalDeductions.toLocaleString("en-IN")}`, dedX + colWidth - 4, y, { align: "right" });

    y += 12;

    // Net Pay Box
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(15, y, pageWidth - 30, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("NET PAY", 20, y + 9);
    doc.setFontSize(13);
    doc.text(`₹${payslip.netPay.toLocaleString("en-IN")}`, pageWidth - 20, y + 9, { align: "right" });

    y += 20;

    // Amount in Words
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(`Amount in words: ${numberToWords(payslip.netPay)}`, 15, y);

    y += 10;

    // Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, pageWidth - 15, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("This is a system-generated payslip and does not require a signature.", pageWidth / 2, y, { align: "center" });

    // Save
    const fileName = `Payslip_${payslip.employeeName.replace(/\s+/g, "_")}_${payslip.month}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Payslip Preview
                </h2>
                <p className="text-xs text-gray-400">
                  {payslip.payslipNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-1"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Payslip Content */}
          <div ref={payslipRef} className="px-6 py-5 space-y-5 print:px-0">
            {/* Company Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building2 size={20} />
                <h3 className="text-lg font-bold">{payslip.companyName}</h3>
              </div>
              <p className="text-xs text-blue-100">{payslip.companyAddress}</p>
              <div className="mt-3 inline-block bg-white/15 backdrop-blur-sm rounded-lg px-4 py-1.5">
                <p className="text-sm font-semibold">
                  Payslip for {formatMonth(payslip.month)}
                </p>
              </div>
            </div>

            {/* Employee Info */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Employee Details
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Name</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.employeeName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Employee ID</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.employeeId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Designation</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.designation}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Department</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.department}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">PAN</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.panNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">UAN</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.uanNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Paid Days</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.paidDays} / {payslip.totalDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">LOP Days</p>
                  <p className="font-semibold text-gray-800">
                    {payslip.lopDays}
                  </p>
                </div>
              </div>
            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="border border-emerald-100 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Earnings
                  </p>
                  <p className="text-xs font-bold text-emerald-700">
                    Amount (₹)
                  </p>
                </div>
                <div className="divide-y divide-emerald-50">
                  {earningsItems.map((item) => (
                    <div
                      key={item.label}
                      className="px-4 py-2.5 flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-800">
                        {item.value.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                  <div className="px-4 py-3 flex items-center justify-between bg-emerald-50/50">
                    <span className="text-sm font-bold text-emerald-700">
                      Gross Earnings
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatCurrency(payslip.grossEarnings)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-red-100 rounded-xl overflow-hidden">
                <div className="bg-red-50 px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
                    Deductions
                  </p>
                  <p className="text-xs font-bold text-red-700">Amount (₹)</p>
                </div>
                <div className="divide-y divide-red-50">
                  {deductionItems.map((item) => (
                    <div
                      key={item.label}
                      className="px-4 py-2.5 flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-800">
                        {item.value.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                  <div className="px-4 py-3 flex items-center justify-between bg-red-50/50">
                    <span className="text-sm font-bold text-red-700">
                      Total Deductions
                    </span>
                    <span className="text-sm font-bold text-red-700">
                      {formatCurrency(payslip.totalDeductions)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 flex items-center justify-between text-white">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Net Payable Amount
                </p>
                <p className="text-xs text-blue-200 mt-0.5">
                  {numberToWords(payslip.netPay)}
                </p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">
                {formatCurrency(payslip.netPay)}
              </p>
            </div>

            {/* Footer Note */}
            <p className="text-[11px] text-gray-400 text-center pt-2 border-t border-gray-100">
              This is a system-generated payslip and does not require a
              signature. For any discrepancies, please contact the HR
              department.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scaleIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
