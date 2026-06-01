'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Loader2,
  Phone,
  User,
  ArrowUpRight,
  Info,
  Search,
} from 'lucide-react';
import {
  fetchRemainingBalances,
  type RemainingDataResult,
  type RemainingItem,
} from '@/lib/hq/superadmin/remainings';
import { cn } from '@/lib/utils';

type Level = 'breakdown' | 'personList';

interface Props {
  open: boolean;
  onClose: () => void;
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

export function RemainingFlowModal({ open, onClose }: Props) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>('breakdown');
  const [activeDept, setActiveDept] = useState<'rehab' | 'spims' | null>(null);
  const [data, setData] = useState<RemainingDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch balances on mount/open
  useEffect(() => {
    if (open) {
      setLevel('breakdown');
      setActiveDept(null);
      setSearchQuery('');
      setLoading(true);
      fetchRemainingBalances()
        .then((res) => setData(res))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const goBack = useCallback(() => {
    setDirection('back');
    setLevel('breakdown');
    setActiveDept(null);
    setSearchQuery('');
  }, []);

  const drillIntoDept = useCallback((dept: 'rehab' | 'spims') => {
    setDirection('forward');
    setActiveDept(dept);
    setLevel('personList');
  }, []);

  const openProfile = useCallback(
    (item: RemainingItem, dept: 'rehab' | 'spims') => {
      onClose();
      if (dept === 'rehab') {
        router.push(`/hq/dashboard/superadmin/rehab/patients/${item.id}`);
      } else {
        router.push(`/hq/dashboard/superadmin/spims/students/${item.id}`);
      }
    },
    [onClose, router]
  );

  // Filter list based on search
  const filteredList = useMemo(() => {
    if (!data || !activeDept) return [];
    const rawList = activeDept === 'rehab' ? data.rehabList : data.spimsList;
    if (!searchQuery.trim()) return rawList;

    const q = searchQuery.toLowerCase();
    return rawList.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.rollNo && item.rollNo.toLowerCase().includes(q)) ||
        (item.patientId && item.patientId.toLowerCase().includes(q)) ||
        (item.course && item.course.toLowerCase().includes(q))
    );
  }, [data, activeDept, searchQuery]);

  const slideVariants = direction === 'forward' ? slideIn : slideBack;

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
        className="relative w-full sm:w-[520px] max-h-[90vh] bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-gray-100 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {level === 'personList' && (
              <button
                onClick={goBack}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 text-black" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                <Wallet className="w-3 h-3 text-indigo-600 animate-pulse" />
                {level === 'breakdown' ? 'Institution Debt Matrix' : activeDept === 'rehab' ? 'Rehab Center Debtors' : 'SPIMS Academy Debtors'}
              </div>
              <p className="text-lg font-black text-gray-900 leading-tight">
                {level === 'breakdown' ? (
                  <>
                    <span className="text-indigo-600">{loading ? '—' : fmtPKR(data?.total ?? 0)}</span> outstanding
                  </>
                ) : (
                  <>
                    <span className="text-indigo-600 mr-1">{filteredList.length}</span> active outstanding
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95"
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
                className="py-24 flex flex-col items-center gap-4"
              >
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Aggregating outstanding ledgers…
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
                className="p-7 space-y-4"
              >
                {/* Rehab Dept Card */}
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => drillIntoDept('rehab')}
                  className="w-full flex items-center justify-between p-5 rounded-3xl border border-teal-100 bg-teal-50/50 hover:bg-teal-50 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-teal-500 flex-shrink-0 animate-pulse" />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-0.5">
                        Rehab Center
                      </p>
                      <p className="text-2xl font-black text-teal-800 tabular-nums">
                        {fmtPKR(data?.rehabTotal ?? 0)}
                      </p>
                      <p className="text-[9px] font-bold text-teal-500 uppercase tracking-widest mt-0.5">
                        {data?.rehabList.length ?? 0} outstanding accounts
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-teal-600 transition-transform group-hover:translate-x-1" />
                </motion.button>

                {/* SPIMS Dept Card */}
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => drillIntoDept('spims')}
                  className="w-full flex items-center justify-between p-5 rounded-3xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-purple-500 flex-shrink-0 animate-pulse" />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-0.5">
                        SPIMS Academy
                      </p>
                      <p className="text-2xl font-black text-purple-800 tabular-nums">
                        {fmtPKR(data?.spimsTotal ?? 0)}
                      </p>
                      <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">
                        {data?.spimsList.length ?? 0} outstanding accounts
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-600 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key={`list-${activeDept}`}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="p-7 space-y-4"
              >
                {/* Search box */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, roll no, or inpatient ID..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold transition-all"
                  />
                </div>

                {filteredList.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-3">📭</p>
                    <p className="text-sm font-black uppercase tracking-widest text-gray-400">
                      No debtor profiles found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                    {filteredList.map((item, i) => {
                      const initials = item.name
                        .split(' ')
                        .map((w) => w[0] ?? '')
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                              {initials || <User className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-sm text-gray-900 uppercase tracking-tight truncate">
                                {item.name}
                              </p>
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                  {activeDept === 'rehab' ? 'Rehab Inpatient' : 'SPIMS Student'}
                                </span>
                                <span className="text-[9px] font-bold text-gray-300">•</span>
                                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                                  ID: {item.patientId || item.rollNo}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3 flex-shrink-0">
                            <div>
                              <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-0.5">Due</p>
                              <p className="text-sm font-black text-red-600 tabular-nums">
                                {fmtPKR(item.remaining)}
                              </p>
                            </div>
                            <button
                              onClick={() => openProfile(item, activeDept!)}
                              className="flex items-center justify-center p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95"
                              title="Go to Master Profile"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Breadcrumb */}
        <div className="px-7 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
            <span
              className={cn(
                'cursor-pointer transition-colors hover:text-indigo-600',
                level === 'breakdown' && 'text-gray-900 font-extrabold'
              )}
              onClick={level === 'personList' ? goBack : undefined}
            >
              Institutional Breakdown
            </span>
            {level === 'personList' && activeDept && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className={cn('font-extrabold', activeDept === 'rehab' ? 'text-teal-600' : 'text-purple-600')}>
                  {activeDept === 'rehab' ? 'Rehab Center' : 'SPIMS Academy'}
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
