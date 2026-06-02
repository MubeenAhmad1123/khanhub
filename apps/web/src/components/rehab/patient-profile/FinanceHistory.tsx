"use client";

import React, { useMemo, useState } from 'react';
import { FileText, Printer, Trash2 } from 'lucide-react';

export type Payment = {
  id?: string;
  date: string;           // e.g. "28 12 2025"
  amount: number;         // e.g. 15000
  receivedBy: string;     // e.g. "Dilshad saab"
  verifiedByHQ: boolean;
  status: "Approved" | "Pending" | "Rejected";
  note?: string;         // Additional comments
};

export type MonthRecord = {
  label: string;          // e.g. "DEC 2025"
  package: number;
  totalPaid: number;
  remaining: number;
  payments: Payment[];
};

export type FinanceHistoryProps = {
  patientName: string;
  records: MonthRecord[];
  onDeletePayments?: (paymentIds: string[]) => void;
  totalPackage?: number;
};

const FinanceHistory: React.FC<FinanceHistoryProps> = ({ patientName, records, onDeletePayments, totalPackage }) => {
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  // Overall totals
  const totalPackageOverall = useMemo(() => totalPackage !== undefined ? totalPackage : records.reduce((acc, curr) => acc + curr.package, 0), [records, totalPackage]);
  const totalPaidOverall = useMemo(() => records.reduce((acc, curr) => acc + curr.totalPaid, 0), [records]);
  const totalRemainingOverall = useMemo(() => Math.max(0, totalPackageOverall - totalPaidOverall), [totalPackageOverall, totalPaidOverall]);

  // Aggregate all payments across months
  const allPayments = useMemo(() => {
    const list: Payment[] = [];
    records.forEach(rec => {
      rec.payments.forEach(p => {
        list.push(p);
      });
    });
    return list;
  }, [records]);

  // Safe Date parsing helper
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

  // Filter and compute running balance chronologically
  const processedTransactions = useMemo(() => {
    // Show only Approved payments in statement (capitalized 'Approved' matches Payment union type exactly)
    const approved = allPayments.filter(p => p.status === 'Approved');
    
    // Sort oldest first
    const sorted = [...approved].sort((a, b) => parseDateSafe(a.date).getTime() - parseDateSafe(b.date).getTime());
    
    let runningBalance = totalPackageOverall;
    const computed = sorted.map(payment => {
      runningBalance -= payment.amount;
      return {
        ...payment,
        remainingAfter: Math.max(0, runningBalance)
      };
    });

    // Return latest first
    return computed.reverse();
  }, [allPayments, totalPackageOverall]);

  const handleDelete = () => {
    if (onDeletePayments && selectedPayments.length > 0) {
      onDeletePayments(selectedPayments);
      setSelectedPayments([]);
    }
  };

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
              A/C Holder: {patientName} • Khan Hub Rehabilitation Center
            </p>
          </div>
          <button 
            onClick={handlePrint}
            className="no-print flex items-center gap-2 px-4 py-2 border-2 border-gray-950 text-gray-950 hover:bg-gray-50 transition-all rounded-xl text-xs font-black uppercase tracking-wider"
          >
            <Printer size={14} /> Print Statement
          </button>
        </div>

        {/* Bulk Delete Actions Bar */}
        {selectedPayments.length > 0 && onDeletePayments && (
          <div className="no-print bg-gray-950 border border-gray-800 text-white p-5 mb-8 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0" />
              <p className="font-bold text-sm">
                Selected {selectedPayments.length} transaction{selectedPayments.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setSelectedPayments([])}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-bold text-xs transition-colors border border-gray-700"
              >
                Cancel Selection
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 border border-red-500 shadow-lg"
              >
                <Trash2 size={14} /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Minimal Grayscale Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Total Bill / Package Dues</span>
            <span className="text-2xl font-black text-gray-900">PKR {totalPackageOverall.toLocaleString('en-PK')}</span>
          </div>
          <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Consolidated Deposited</span>
            <span className="text-2xl font-black text-gray-900">PKR {totalPaidOverall.toLocaleString('en-PK')}</span>
          </div>
          <div className="border border-gray-300 p-5 rounded-2xl bg-[#FCFCFC]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Ending Balance / Due</span>
            <span className="text-2xl font-black text-gray-900">PKR {totalRemainingOverall.toLocaleString('en-PK')}</span>
          </div>
        </div>

        {/* Statement Details Table */}
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
                  {onDeletePayments && <th className="py-3.5 px-4 no-print w-10">Select</th>}
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Description / Note</th>
                  <th className="py-3.5 px-4">Received By</th>
                  <th className="py-3.5 px-4 text-right">Deposited</th>
                  <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {processedTransactions.map((tx, idx) => {
                  const paymentId = tx.id || `${tx.date}-${tx.amount}-${tx.receivedBy}`;
                  const isSelected = selectedPayments.includes(paymentId);
                  return (
                    <tr key={idx} className={`hover:bg-gray-50 transition-colors text-xs font-bold text-gray-800 ${isSelected ? 'bg-red-50/20' : ''}`}>
                      {onDeletePayments && (
                        <td className="py-3.5 px-4 no-print">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayments(prev => [...prev, paymentId]);
                              } else {
                                setSelectedPayments(prev => prev.filter(id => id !== paymentId));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4 whitespace-nowrap">{tx.date}</td>
                      <td className="py-3.5 px-4 truncate max-w-[250px] font-medium text-gray-600">
                        {tx.note || 'Monthly Fee Payment'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-semibold">
                        {tx.receivedBy}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-900 font-black">
                        ₨{tx.amount.toLocaleString('en-PK')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-900 font-black">
                        ₨{tx.remainingAfter.toLocaleString('en-PK')}
                      </td>
                    </tr>
                  );
                })}
                {processedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={onDeletePayments ? 6 : 5} className="py-16 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic bg-white">
                      No approved payment transactions logged in this statement
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-950 text-gray-900 font-black text-xs">
                  <td colSpan={onDeletePayments ? 4 : 3} className="py-4 px-4 uppercase tracking-wider text-[10px]">
                    Consolidated Received Balance
                  </td>
                  <td className="py-4 px-4 text-right font-black">
                    ₨{totalPaidOverall.toLocaleString('en-PK')}
                  </td>
                  <td className="py-4 px-4 text-right font-black">
                    ₨{totalRemainingOverall.toLocaleString('en-PK')}
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
};

export default FinanceHistory;
