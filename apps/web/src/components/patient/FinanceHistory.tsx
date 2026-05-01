"use client";

import React, { useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, TrendingUp, DollarSign, 
  Users, ChevronDown, Receipt, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

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
}

export default function FinanceHistory({ payments, monthlyDetails }: FinanceHistoryProps) {
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({ 0: true });

  const toggleMonth = (idx: number) => {
    setExpandedMonths(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const overallPaid = monthlyDetails.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const overallRemaining = monthlyDetails.reduce((acc, curr) => acc + curr.remaining, 0);

  return (
    <div className="w-full bg-slate-50/50 dark:bg-gray-950/20 py-8 sm:py-12 px-0 overflow-visible relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Aesthetic Page Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 border border-indigo-100/50">
                <Calendar size={12} /> Family Portal Statement
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                Your Account <span className="text-indigo-600 dark:text-indigo-400">Statement</span>
              </h1>
              <p className="text-slate-500 font-bold flex items-center gap-2 text-sm">
                <Users size={16} className="text-indigo-400" /> Complete financial summary and billing receipts
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <SummaryStats icon={<ArrowUpRight size={16} />} label="Total Deposited" value={`₨${overallPaid.toLocaleString('en-PK')}`} color="bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100/60 dark:border-emerald-800/40" />
              <SummaryStats icon={<ArrowDownLeft size={16} />} label="Remaining Balance" value={`₨${overallRemaining.toLocaleString('en-PK')}`} color="bg-rose-50/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100/60 dark:border-rose-800/40" />
            </div>
          </div>
        </div>

        {/* Ledger Balance Sheets */}
        <div className="space-y-6">
          {monthlyDetails.map((detail, idx) => {
            const relatedPayments = payments.filter(p => {
              const parts = p.date.split(' ');
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              return monthNames.some((mName, mIdx) => {
                const mNum = String(mIdx + 1).padStart(2, '0');
                return detail.month.includes(mName) && (parts.includes(mName) || parts.includes(mNum) || parts.includes(String(mIdx + 1)));
              });
            });

            return (
              <div key={idx} className="bg-white dark:bg-slate-900/60 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/60 overflow-hidden group">
                
                {/* Expandable Period Panel */}
                <div 
                  onClick={() => toggleMonth(idx)}
                  className="p-6 sm:p-8 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-100/50 dark:border-indigo-800/30 mb-2 inline-block">
                        Billing Period
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Statement: {detail.month}
                      </h2>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 ${expandedMonths[idx] ? 'rotate-180 bg-indigo-600 text-white' : ''}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100/60 dark:border-slate-800/40">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Bill / Package</p>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-200">₨{detail.totalDue.toLocaleString('en-PK')}</p>
                    </div>
                    <div className="bg-emerald-50/40 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100/40 dark:border-emerald-800/20">
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Paid Amount</p>
                      <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">₨{detail.totalPaid.toLocaleString('en-PK')}</p>
                    </div>
                    <div className="bg-rose-50/40 dark:bg-rose-900/10 rounded-2xl p-4 border border-rose-100/40 dark:border-rose-800/20">
                      <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Amount Due</p>
                      <p className="text-lg font-black text-rose-700 dark:text-rose-400">₨{detail.remaining.toLocaleString('en-PK')}</p>
                    </div>
                  </div>

                  {/* Elegant Progress Line */}
                  <div className="mt-6 h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${detail.remaining === 0 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min(100, (detail.totalPaid / detail.totalDue) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Individual Receipts Table */}
                <div className={`border-t border-slate-50 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-800/10 overflow-hidden transition-all duration-500 ease-in-out ${
                  expandedMonths[idx] ? 'max-h-[1000px] opacity-100 p-6 sm:p-8' : 'max-h-0 opacity-0'
                }`}>
                  <div className="space-y-4">
                    {relatedPayments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm italic">
                        No individual payment transactions recorded for this month.
                      </div>
                    ) : (
                      relatedPayments.map((p, pIdx) => (
                        <div key={pIdx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Receipt size={20} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Credit Receipt</p>
                                <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                                  + ₨{p.amount.toLocaleString('en-PK')}
                                </h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Clock size={12} className="text-slate-400" />
                                  <span className="text-xs text-slate-500 font-bold">{p.date}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                p.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                p.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                                'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                              }`}>
                                {p.status}
                              </span>
                              <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                                {p.type || 'Standard Payment'}
                              </span>
                            </div>
                          </div>

                          {(p.note || p.receivedBy) && (
                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-4 text-xs font-bold leading-relaxed">
                              {p.receivedBy && (
                                <div className="flex-1">
                                  <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px] block mb-1">Verified By</span>
                                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/40 w-fit">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] text-indigo-700 dark:text-indigo-400">
                                      {p.receivedBy.charAt(0)}
                                    </div>
                                    {p.receivedBy}
                                  </div>
                                </div>
                              )}
                              
                              {p.note && (
                                <div className="flex-1">
                                  <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px] block mb-1">Receipt Note</span>
                                  <div className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/40 italic">
                                    "{p.note}"
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-wider">
            Official Family Portal Statement
          </p>
        </div>
      </div>
    </div>
  );
}

const SummaryStats = ({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <div className={`flex flex-col p-4 sm:px-6 sm:py-4 rounded-2xl border shadow-sm flex-1 min-w-[150px] ${color}`}>
    <div className="flex items-center gap-2 mb-1 opacity-70">
      {icon}
      <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
    </div>
    <span className="text-base sm:text-xl font-black tracking-tight">{value}</span>
  </div>
);
