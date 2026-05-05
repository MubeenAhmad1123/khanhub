"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, TrendingUp, DollarSign, 
  Users, ChevronDown, ChevronUp, ShieldCheck, Receipt,
  ArrowRightCircle, History, Trash2, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

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
};

const FinanceHistory: React.FC<FinanceHistoryProps> = ({ patientName, records: initialRecords, onDeletePayments }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({ 0: true }); // Expand first month by default
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [localRecords, setLocalRecords] = useState<MonthRecord[]>(initialRecords);

  useEffect(() => {
    setLocalRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const toggleMonth = (idx: number) => {
    setExpandedMonths(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const totalPackageOverall = localRecords.reduce((acc, curr) => acc + curr.package, 0);
  const totalPaidOverall = localRecords.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalRemainingOverall = localRecords.reduce((acc, curr) => acc + curr.remaining, 0);

  const handleDelete = () => {
    if (onDeletePayments) {
      onDeletePayments(selectedPayments);
    }
    const updated = localRecords.map(record => {
      const remainingPayments = record.payments.filter(p => {
        const pId = p.id || `${p.date}-${p.amount}-${p.receivedBy}`;
        return !selectedPayments.includes(pId);
      });
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, record.package - totalPaid);
      return {
        ...record,
        payments: remainingPayments,
        totalPaid,
        remaining
      };
    });
    setLocalRecords(updated);
    setSelectedPayments([]);
  };

  return (
    <div 
      ref={sectionRef}
      className="w-full bg-slate-50/50 dark:bg-gray-950/20 py-8 sm:py-12 px-0 overflow-visible relative"
    >
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="max-w-5xl mx-auto relative z-10 px-4 sm:px-6">
        {/* Statement Style Header */}
        <div className={`mb-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 border border-indigo-100/50">
                <History size={12} /> Financial Bank Statement
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                Patient Account <span className="text-indigo-600 dark:text-indigo-400">Statement</span>
              </h1>
              <p className="text-slate-500 font-bold flex items-center gap-2 text-sm sm:text-base">
                <Users size={18} className="text-indigo-400" /> 
                A/C Holder: <span className="text-slate-800 dark:text-slate-200">{patientName}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <SummaryStats icon={<DollarSign size={16} />} label="Total Bill" value={`PKR ${totalPackageOverall.toLocaleString('en-PK')}`} color="bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100/60 dark:border-blue-800/40" />
              <SummaryStats icon={<ArrowUpRight size={16} />} label="Total Paid" value={`PKR ${totalPaidOverall.toLocaleString('en-PK')}`} color="bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100/60 dark:border-emerald-800/40" />
              <SummaryStats icon={<ArrowDownLeft size={16} />} label="Total Remaining" value={`PKR ${totalRemainingOverall.toLocaleString('en-PK')}`} color="bg-rose-50/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100/60 dark:border-rose-800/40" />
            </div>
          </div>
        </div>

        {/* Bulk Actions Interface */}
        {selectedPayments.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 text-white p-5 mb-8 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl animate-fade-in transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse flex-shrink-0" />
              <p className="font-bold text-sm">
                Selected {selectedPayments.length} transaction{selectedPayments.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setSelectedPayments([])}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-colors border border-slate-700"
              >
                Cancel Selection
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 border border-rose-500 shadow-lg"
              >
                <Trash2 size={14} /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Monthly Ledger Statement List */}
        <div className="space-y-6">
          {localRecords.map((month, mIdx) => (
            <div 
              key={mIdx} 
              className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
              style={{ animationDelay: `${mIdx * 0.1}s` }}
            >
              {/* Statement Record Container */}
              <div className="bg-white dark:bg-slate-900/60 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/60 overflow-hidden group">
                
                {/* Statement Header */}
                <div 
                  onClick={() => toggleMonth(mIdx)}
                  className="p-6 sm:p-8 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-100/50 dark:border-indigo-800/30 mb-2 inline-block">
                        Monthly Balance Sheet
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Statement Period: {month.label}
                      </h2>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 ${expandedMonths[mIdx] ? 'rotate-180 bg-indigo-600 text-white' : ''}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100/60 dark:border-slate-800/40">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Package / Bill</p>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-200">PKR {month.package.toLocaleString('en-PK')}</p>
                    </div>
                    <div className="bg-emerald-50/40 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100/40 dark:border-emerald-800/20">
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Amount Credited / Paid</p>
                      <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">PKR {month.totalPaid.toLocaleString('en-PK')}</p>
                    </div>
                    <div className="bg-rose-50/40 dark:bg-rose-900/10 rounded-2xl p-4 border border-rose-100/40 dark:border-rose-800/20">
                      <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Ending Balance / Due</p>
                      <p className="text-lg font-black text-rose-700 dark:text-rose-400">PKR {month.remaining.toLocaleString('en-PK')}</p>
                    </div>
                  </div>

                  {/* Aesthetic Statement progress line */}
                  <div className="mt-6 h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${month.remaining === 0 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min(100, (month.totalPaid / month.package) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Details: Statement Entries */}
                <div 
                  className={`border-t border-slate-50 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-800/10 overflow-hidden transition-all duration-500 ease-in-out ${
                    expandedMonths[mIdx] ? 'max-h-[1000px] opacity-100 p-6 sm:p-8' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-6 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <ArrowRightCircle size={14} className="text-indigo-500" /> Individual Statement Transactions
                  </div>

                  <div className="space-y-4">
                    {month.payments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm italic">
                        No transactions found for this period.
                      </div>
                    ) : (
                      month.payments.map((p, pIdx) => {
                        const paymentId = p.id || `${p.date}-${p.amount}-${p.receivedBy}`;
                        const isSelected = selectedPayments.includes(paymentId);
                        return (
                          <div key={pIdx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 items-start">
                            <div className="flex-shrink-0 pt-2">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPayments(prev => [...prev, paymentId]);
                                  } else {
                                    setSelectedPayments(prev => prev.filter(id => id !== paymentId));
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Receipt size={20} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Transaction Amount</p>
                                    <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                                      + PKR {p.amount.toLocaleString('en-PK')}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <Clock size={12} className="text-slate-400" />
                                      <span className="text-xs text-slate-500 font-bold">{p.date}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    p.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                    p.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                                    'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                  }`}>
                                    {p.status}
                                  </div>
                                  {p.verifiedByHQ && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-200/50">
                                      <ShieldCheck size={12} /> HQ Verified
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-4 text-xs font-bold leading-relaxed">
                                <div className="flex-1">
                                  <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px] block mb-1">Certified By</span>
                                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/40 w-fit">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] text-indigo-700 dark:text-indigo-400">
                                      {p.receivedBy.charAt(0)}
                                    </div>
                                    {p.receivedBy}
                                  </div>
                                </div>
                                
                                {(p.note || p.receivedBy.includes('sir')) && (
                                  <div className="flex-1">
                                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px] block mb-1">Statement memo / Note</span>
                                    <div className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/40 italic">
                                      "{p.note || `Payment processed and audited via ${p.receivedBy}`}"
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Statement Summary Info */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-wider">
            End of Official Statement
          </p>
        </div>
      </div>
    </div>
  );
};

const SummaryStats = ({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <div className={`flex flex-col p-4 sm:px-6 sm:py-4 rounded-2xl border shadow-sm flex-1 min-w-[150px] ${color}`}>
    <div className="flex items-center gap-2 mb-1 opacity-70">
      {icon}
      <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
    </div>
    <span className="text-base sm:text-xl font-black tracking-tight">{value}</span>
  </div>
);

export default FinanceHistory;
