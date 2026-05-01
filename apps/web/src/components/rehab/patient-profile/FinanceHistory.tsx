"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, TrendingUp, DollarSign, 
  Users, ChevronDown, ChevronUp, ShieldCheck, Receipt,
  ArrowRightCircle, History, Trash2
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

  const totalPaidOverall = localRecords.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalRemainingOverall = localRecords.reduce((acc, curr) => acc + curr.remaining, 0);

  const handleDelete = () => {
    if (onDeletePayments) {
      onDeletePayments(selectedPayments);
    }
    // Also update UI state locally
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
      className="w-full bg-white dark:bg-gray-950 py-6 sm:py-10 px-0 sm:px-0 overflow-visible relative"
    >
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .journey-line {
          background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%);
        }
      `}</style>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]"
        style={{ 
          backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-blue-100">
                <History size={12} /> Financial Audit
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
                Payment <span className="text-blue-600">Journey</span>
              </h1>
              <p className="text-slate-500 font-bold flex items-center gap-2 mt-4 text-sm sm:text-base">
                <Users size={18} className="text-blue-400" /> 
                Patient Account: <span className="text-slate-800">{patientName}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 w-full sm:w-auto">
              <SummaryStats icon={<DollarSign size={16} />} label="Total Paid" value={`PKR ${totalPaidOverall.toLocaleString('en-PK')}`} color="bg-emerald-50 text-emerald-700 border-emerald-100" />
              <SummaryStats icon={<TrendingUp size={16} />} label="Balance" value={`PKR ${totalRemainingOverall.toLocaleString('en-PK')}`} color="bg-orange-50 text-orange-700 border-orange-100" />
            </div>
          </div>
        </div>

        {/* Bulk Actions Interface */}
        {selectedPayments.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 text-white p-4 mb-8 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl animate-fade-in transition-all duration-300">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 border border-rose-500 shadow-lg shadow-rose-500/20"
              >
                <Trash2 size={14} /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Vertical Timeline Journey */}
        <div className="relative pl-6 sm:pl-12 border-l-4 border-slate-100 py-4 space-y-12">
          {localRecords.map((month, mIdx) => (
            <div 
              key={mIdx} 
              className={`relative transition-all duration-700 delay-[${mIdx * 100}ms] ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
              style={{ animationDelay: `${mIdx * 0.1}s` }}
            >
              {/* Timeline Marker */}
              <div className={`absolute left-[-22px] sm:left-[-60px] top-6 w-10 sm:w-16 h-1 bg-slate-100 z-0 hidden sm:block`} />
              <div className={`absolute left-[-32px] sm:left-[-62px] top-2 w-10 h-10 rounded-2xl bg-white border-4 border-blue-600 shadow-xl shadow-blue-100 flex items-center justify-center z-10 transition-transform hover:scale-110 duration-300`}>
                <Calendar size={20} className="text-blue-600" />
              </div>

              {/* Month Card */}
              <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden group">
                {/* Card Header (Expandable Trigger) */}
                <div 
                  onClick={() => toggleMonth(mIdx)}
                  className="p-5 sm:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
                        {month.label}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          Period Context
                        </span>
                        {month.remaining === 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600">
                            <CheckCircle2 size={12} /> Fully Paid
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 ${expandedMonths[mIdx] ? 'rotate-180 bg-blue-600 text-white' : ''}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Package</p>
                      <p className="text-lg font-black text-slate-800">PKR {month.package.toLocaleString('en-PK')}</p>
                    </div>
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Paid</p>
                      <p className="text-lg font-black text-emerald-700">PKR {month.totalPaid.toLocaleString('en-PK')}</p>
                    </div>
                    <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Remaining</p>
                      <p className="text-lg font-black text-orange-700">PKR {month.remaining.toLocaleString('en-PK')}</p>
                    </div>
                  </div>

                  {/* Tiny progress bar */}
                  <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${month.remaining === 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (month.totalPaid / month.package) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Details: Transaction History */}
                <div 
                  className={`border-t border-slate-50 bg-slate-50/30 overflow-hidden transition-all duration-500 ease-in-out ${
                    expandedMonths[mIdx] ? 'max-h-[1000px] opacity-100 p-5 sm:p-8' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-6 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <ArrowRightCircle size={14} className="text-blue-500" /> Transaction Audit Trail
                  </div>

                  <div className="space-y-4">
                    {month.payments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm italic">
                        No transactions recorded for this period.
                      </div>
                    ) : (
                      month.payments.map((p, pIdx) => {
                        const paymentId = p.id || `${p.date}-${p.amount}-${p.receivedBy}`;
                        const isSelected = selectedPayments.includes(paymentId);
                        return (
                          <div key={pIdx} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow group/item flex flex-row gap-4 items-start">
                            <div className="flex-shrink-0 pt-3">
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
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 group-hover/item:scale-110 transition-transform">
                                    <Receipt size={20} />
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-black text-slate-900 leading-none">
                                      PKR {p.amount.toLocaleString('en-PK')}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Clock size={12} className="text-slate-400" />
                                      <span className="text-xs text-slate-500 font-bold">{p.date}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    p.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                    p.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                                    'bg-rose-100 text-rose-700'
                                  }`}>
                                    {p.status}
                                  </div>
                                  {p.verifiedByHQ && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
                                      <ShieldCheck size={12} /> HQ Verified
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col sm:flex-row gap-4 text-xs font-bold leading-relaxed">
                                <div className="flex-1">
                                  <span className="text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Received By</span>
                                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 w-fit">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700">
                                      {p.receivedBy.charAt(0)}
                                    </div>
                                    {p.receivedBy}
                                  </div>
                                </div>
                                
                                {(p.note || p.receivedBy.includes('sir')) && (
                                  <div className="flex-1">
                                    <span className="text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Transaction Note</span>
                                    <div className="text-slate-500 bg-blue-50/30 px-3 py-2 rounded-xl border border-blue-100/50 italic">
                                      "{p.note || `Payment verified and processed via ${p.receivedBy}`}"
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

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
            End of Transaction Journey
          </p>
        </div>
      </div>
    </div>
  );
};

const SummaryStats = ({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <div className={`flex flex-col p-3 sm:px-6 sm:py-4 rounded-[1.5rem] border shadow-sm flex-1 ${color}`}>
    <div className="flex items-center gap-2 mb-1 opacity-60">
      {icon}
      <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
    </div>
    <span className="text-sm sm:text-lg font-black">{value}</span>
  </div>
);

export default FinanceHistory;

