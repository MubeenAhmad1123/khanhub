'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Loader2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Building2,
  FileText,
} from 'lucide-react';
import {
  fetchDailyBreakdown,
  type DailyBreakdownResult,
  type DailyDeptBreakdown,
} from '@/lib/hq/superadmin/finance';
import { cn } from '@/lib/utils';

type Level = 'breakdown' | 'txList';

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerateReport: (transactions: any[]) => void;
}

const slideIn = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const slideBack = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

const fmtPKR = (v: number) => {
  return 'PKR ' + Number(v || 0).toLocaleString('en-PK');
};

const getIsExpense = (tx: any): boolean => {
  return (
    tx.type === 'expense' ||
    String(tx.categoryName || tx.category || '').toLowerCase().includes('expense')
  );
};

export function TransactionsFlowModal({ open, onClose, onGenerateReport }: Props) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>('breakdown');
  const [activeDept, setActiveDept] = useState<DailyDeptBreakdown | null>(null);
  const [data, setData] = useState<DailyBreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Fetch breakdown on mount/open
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDailyBreakdown(new Date());
      setData(res);
    } catch (e) {
      console.error('Failed to fetch daily breakdown:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLevel('breakdown');
      setActiveDept(null);
      loadData();
    }
  }, [open, loadData]);

  const goBack = useCallback(() => {
    setDirection('back');
    setLevel('breakdown');
    setActiveDept(null);
  }, []);

  const drillIntoDept = useCallback((dept: DailyDeptBreakdown) => {
    if (dept.txCount === 0) return;
    setDirection('forward');
    setActiveDept(dept);
    setLevel('txList');
  }, []);

  const handleGenerateTodayReport = () => {
    if (!data) return;
    // Combine all transactions from all departments
    const allTxs = data.departments.flatMap((d) => d.transactions);
    onGenerateReport(allTxs);
  };

  const slideVariants = direction === 'forward' ? slideIn : slideBack;

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full sm:w-[520px] max-h-[90vh] bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-gray-100 shadow-2xl flex flex-col overflow-hidden text-gray-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-7 pt-5 sm:pt-7 pb-4 sm:pb-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {level === 'txList' && (
              <button
                onClick={goBack}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95 cursor-pointer flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-black" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5 animate-pulse truncate">
                <CreditCard className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                <span className="truncate">
                  {level === 'breakdown' ? 'Daily Transaction Monitor' : `${activeDept?.deptName} Ledger`}
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-gray-900 leading-tight truncate">
                {level === 'breakdown' ? (
                  <>
                    Today's Flow: <span className="text-emerald-600">{loading ? '—' : fmtPKR(data?.grandNet ?? 0)}</span>
                  </>
                ) : (
                  <>
                    Net: <span className={cn(activeDept && activeDept.net >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{activeDept ? fmtPKR(activeDept.net) : '—'}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95 cursor-pointer flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.div
                key="loader"
                variants={slideVariants}
                className="py-24 flex flex-col items-center gap-4 text-center px-4"
              >
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Consolidating daily ledger pipelines…
                </p>
              </motion.div>
            ) : level === 'breakdown' ? (
              <motion.div
                key="breakdown"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 sm:p-7 space-y-3 sm:space-y-4"
              >
                {/* Generate Today's Report Card Button */}
                {data && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleGenerateTodayReport}
                    className="w-full flex items-center justify-between p-4 sm:p-5 rounded-3xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition-all text-indigo-900 font-bold shadow-sm shadow-indigo-600/5 group cursor-pointer gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 flex-shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-700 truncate">
                          Generate Today's Report
                        </p>
                        <p className="text-[9.5px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5 truncate">
                          Combine and print all departments
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-indigo-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 flex-shrink-0" />
                  </motion.button>
                )}

                {/* Scorecards */}
                {data && (
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-0.5">Inflow Today</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-700 truncate block">{fmtPKR(data.grandIncome)}</span>
                      </div>
                      <TrendingUp size={18} className="text-emerald-500 flex-shrink-0" />
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl border border-rose-100 bg-rose-50/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest block mb-0.5">Outflow Today</span>
                        <span className="text-xs sm:text-sm font-black text-rose-700 truncate block">{fmtPKR(data.grandExpense)}</span>
                      </div>
                      <TrendingDown size={18} className="text-rose-500 flex-shrink-0" />
                    </div>
                  </div>
                )}

                {/* Department List */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Departmental breakdown</p>
                  {data?.departments.map((dept, i) => {
                    const hasTransactions = dept.txCount > 0;
                    return (
                      <motion.button
                        key={dept.deptId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={hasTransactions ? { x: 4 } : undefined}
                        onClick={() => drillIntoDept(dept)}
                        disabled={!hasTransactions}
                        className={cn(
                          'w-full flex items-center justify-between p-3.5 sm:p-4.5 rounded-2xl border transition-all text-left gap-2',
                          hasTransactions
                            ? 'bg-zinc-50 border-zinc-200/60 hover:bg-zinc-100/50 cursor-pointer'
                            : 'bg-zinc-50/40 border-zinc-100 text-zinc-400 cursor-not-allowed opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', hasTransactions ? 'bg-indigo-600' : 'bg-zinc-300')} />
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-wider text-gray-900 leading-tight truncate">
                              {dept.deptName}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                              {dept.txCount} transactions
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className={cn('text-xs font-black tabular-nums', hasTransactions ? 'text-gray-900' : 'text-zinc-400')}>
                              {fmtPKR(dept.income - dept.expense)}
                            </p>
                          </div>
                          {hasTransactions && (
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`list-${activeDept?.deptId}`}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 sm:p-7 space-y-4"
              >
                <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                  {activeDept?.transactions.map((tx, i) => {
                    const isExp = getIsExpense(tx);
                    const formattedTime = tx._date
                      ? new Date(tx._date).toLocaleTimeString('en-PK', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                         })
                      : 'N/A';

                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex flex-col xs:flex-row xs:items-center justify-between p-3 sm:p-4 rounded-2xl border border-zinc-100 bg-white hover:bg-zinc-50 transition-all group gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black",
                            isExp ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {isExp ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-xs sm:text-sm text-gray-900 uppercase tracking-tight truncate">
                              {tx.description || tx.category || 'General Ledger'}
                            </p>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                {tx.category || 'Revenue'}
                              </span>
                              <span className="text-[9px] font-bold text-gray-300 sm:inline hidden">•</span>
                              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} />
                                {formattedTime}
                              </span>
                              <span className="text-[9px] font-bold text-gray-300 sm:inline hidden">•</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                {tx.paymentMethod || 'Cash'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex xs:flex-col items-center xs:items-end justify-between xs:justify-center flex-shrink-0 border-t xs:border-t-0 pt-2 xs:pt-0 border-zinc-100 mt-1 xs:mt-0">
                          <p className={cn("text-xs sm:text-sm font-black tabular-nums", isExp ? "text-rose-600" : "text-emerald-600")}>
                            {isExp ? '-' : '+'}{fmtPKR(tx.amount)}
                          </p>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border xs:mt-1 inline-block",
                            tx.status === 'approved'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : 'bg-amber-50 border-amber-100 text-amber-600'
                          )}>
                            {tx.status}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Breadcrumb & Central Link */}
        <div className="px-4 sm:px-7 py-3 sm:py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
              <span
                className={cn(
                  'cursor-pointer transition-colors hover:text-indigo-600',
                  level === 'breakdown' && 'text-gray-900 font-extrabold'
                )}
                onClick={level === 'txList' ? goBack : undefined}
              >
                Today
              </span>
              {level === 'txList' && activeDept && (
                <>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                  <span className="font-extrabold text-indigo-600">
                    {activeDept.deptName}
                  </span>
                </>
              )}
            </div>
            
            <button
              onClick={() => {
                onClose();
                router.push('/hq/dashboard/superadmin/finance');
              }}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              Central Hub
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
