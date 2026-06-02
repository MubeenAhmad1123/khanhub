"use client";

import React, { useMemo } from 'react';
import { FileText, Printer } from 'lucide-react';

type Payment = {
  date: string; // e.g. "28 12 2025"
  amount: number;
  type: 'Admission' | 'Monthly Fee' | 'Canteen' | 'Security' | 'Other';
  status: 'Approved' | 'Pending' | 'Rejected';
  note?: string;
  receivedBy?: string;
};

type MonthlyDetail = {
  month: string; // e.g. "December 2025"
  totalDue: number;
  totalPaid: number;
  remaining: number;
};

interface FinanceHistoryProps {
  payments: Payment[];
  monthlyDetails: MonthlyDetail[];
  totalPackage?: number;
}

export default function FinanceHistory({ payments, monthlyDetails, totalPackage }: FinanceHistoryProps) {
  // Overall totals
  const overallBill = useMemo(() => totalPackage !== undefined ? totalPackage : monthlyDetails.reduce((acc, curr) => acc + curr.totalDue, 0), [monthlyDetails, totalPackage]);
  const overallPaid = useMemo(() => monthlyDetails.reduce((acc, curr) => acc + curr.totalPaid, 0), [monthlyDetails]);
  const overallRemaining = useMemo(() => Math.max(0, overallBill - overallPaid), [overallBill, overallPaid]);

  // Safe Date parsing helper to handle standard formatting DD MM YYYY or generic dates
  const parseDateSafe = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Process transactions chronologically to calculate the accurate running balance
  const processedTransactions = useMemo(() => {
    // Show only Approved payments as requested (Capitalized 'Approved' from Payment type)
    const approved = payments.filter(p => p.status === 'Approved');
    
    // Sort oldest first to calculate running balance
    const sorted = [...approved].sort((a, b) => parseDateSafe(a.date).getTime() - parseDateSafe(b.date).getTime());
    
    let runningBalance = overallBill;
    const computed = sorted.map(payment => {
      runningBalance -= payment.amount;
      return {
        ...payment,
        remainingAfter: Math.max(0, runningBalance)
      };
    });

    // Return latest first for professional user presentation
    return computed.reverse();
  }, [payments, overallBill]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full bg-white text-gray-900 py-6 px-0 overflow-visible relative border border-gray-100 rounded-3xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Simple & Clean Statement Header */}
        <div className="mb-8 border-b border-gray-900 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
              Financial Account Statement
            </h1>
            <p className="text-gray-500 font-semibold text-xs tracking-wider uppercase mt-1">
              Khan Hub Rehabilitation & Recovery Center
            </p>
          </div>
          <button 
            onClick={handlePrint}
            className="no-print flex items-center gap-2 px-4 py-2 border-2 border-gray-950 text-gray-950 hover:bg-gray-50 transition-all rounded-xl text-xs font-black uppercase tracking-wider"
          >
            <Printer size={14} /> Print Statement
          </button>
        </div>

        {/* Minimal Grayscale Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Total Bill / Package Dues</span>
            <span className="text-2xl font-black text-gray-900">PKR {overallBill.toLocaleString('en-PK')}</span>
          </div>
          <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Consolidated Deposited</span>
            <span className="text-2xl font-black text-gray-900">PKR {overallPaid.toLocaleString('en-PK')}</span>
          </div>
          <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Ending Balance / Due</span>
            <span className="text-2xl font-black text-gray-900">PKR {overallRemaining.toLocaleString('en-PK')}</span>
          </div>
        </div>

        {/* Statement Details: Clean Bank Statement Ledger Table */}
        <div className="border border-gray-300 rounded-2xl overflow-hidden bg-white">
          <div className="p-4 bg-gray-50 border-b border-gray-300 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} /> Account Ledger Book
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              {processedTransactions.length} Verified Entries
            </span>
          </div>

          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-gray-300">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Description / Note</th>
                  <th className="py-3.5 px-4">Received By</th>
                  <th className="py-3.5 px-4 text-right">Deposited</th>
                  <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {processedTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors text-xs font-bold text-gray-800">
                    <td className="py-3.5 px-4 whitespace-nowrap">{tx.date}</td>
                    <td className="py-3.5 px-4 truncate max-w-[250px] font-medium text-gray-600">
                      {tx.note || tx.type || 'Monthly Fee Payment'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-semibold">
                      {tx.receivedBy || 'Staff Member'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-gray-900 font-black">
                      ₨{tx.amount.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-gray-900 font-black">
                      ₨{tx.remainingAfter.toLocaleString('en-PK')}
                    </td>
                  </tr>
                ))}
                {processedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic bg-white">
                      No approved payment transactions logged in this statement
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-950 text-gray-900 font-black text-xs">
                  <td colSpan={3} className="py-4 px-4 uppercase tracking-wider text-[10px]">
                    Consolidated Received Balance
                  </td>
                  <td className="py-4 px-4 text-right font-black">
                    ₨{overallPaid.toLocaleString('en-PK')}
                  </td>
                  <td className="py-4 px-4 text-right font-black">
                    ₨{overallRemaining.toLocaleString('en-PK')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Official Disclaimers */}
        <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center text-gray-400 text-[9px] font-semibold uppercase tracking-wider">
          This account statement is generated dynamically and displays approved financial entries only.
        </div>
      </div>
    </div>
  );
}
