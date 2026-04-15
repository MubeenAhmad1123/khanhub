'use client';
// apps/web/src/components/hq/superadmin/ClientsFlowModal.tsx
// 3-level drilldown: Overview → Department List → Client Row → Profile

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  Loader2,
  Phone,
  Clock,
  User,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import {
  ClientDept,
  DeptClientCount,
  TodayClient,
  fetchTodayClientsByDept,
  formatPKTTime,
  formatPKTDate,
} from '@/lib/hq/superadmin/clients';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Level = 'breakdown' | 'clientList';

interface Props {
  open: boolean;
  onClose: () => void;
  byDept: DeptClientCount[];
  total: number;
  todayLabel: string; // e.g. "15 Apr 2026"
}

// ─── Slide animation variants ─────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeptRow({
  dept,
  onClick,
}: {
  dept: DeptClientCount;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-5 rounded-2xl border transition-all group active:scale-[0.98]',
        dept.bgColor,
        dept.borderColor
      )}
    >
      <div className="flex items-center gap-4">
        <span className={cn('w-3 h-3 rounded-full flex-shrink-0', dept.dotColor)} />
        <div className="text-left">
          <p className={cn('text-[10px] font-black uppercase tracking-widest mb-0.5', dept.color)}>
            {dept.label}
          </p>
          <p className="text-2xl font-black text-black dark:text-white tabular-nums">
            {dept.count}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {dept.count === 0 ? 'None today' : 'View all'}
        </span>
        {dept.count > 0 && (
          <ChevronRight
            className={cn('w-4 h-4 transition-transform group-hover:translate-x-1', dept.color)}
          />
        )}
      </div>
    </motion.button>
  );
}

function ClientRow({
  client,
  onProfile,
}: {
  client: TodayClient;
  onProfile: (c: TodayClient) => void;
}) {
  const initials = client.name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-5 py-4 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
    >
      {/* Avatar + metadata */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-black flex-shrink-0 shadow-lg">
          {initials || <User className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="font-black text-sm text-black dark:text-white uppercase tracking-tight truncate">
            {client.name}
          </p>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {client.meta && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate">
                <Info className="w-2.5 h-2.5 inline mr-0.5" />
                {client.meta}
              </span>
            )}
            {client.phone && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                <Phone className="w-2.5 h-2.5 inline mr-0.5" />
                {client.phone}
              </span>
            )}
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              <Clock className="w-2.5 h-2.5 inline mr-0.5" />
              {formatPKTTime(client.registeredAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Profile button */}
      <button
        onClick={() => onProfile(client)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest shadow-sm ml-3"
      >
        Profile
        <ArrowUpRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ClientsFlowModal({
  open,
  onClose,
  byDept,
  total,
  todayLabel,
}: Props) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>('breakdown');
  const [activeDept, setActiveDept] = useState<DeptClientCount | null>(null);
  const [clients, setClients] = useState<TodayClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Reset to top level whenever modal opens
  useEffect(() => {
    if (open) {
      setLevel('breakdown');
      setActiveDept(null);
      setClients([]);
    }
  }, [open]);

  const drillIntoDept = useCallback(async (dept: DeptClientCount) => {
    if (dept.count === 0) return;
    setDirection('forward');
    setActiveDept(dept);
    setClientsLoading(true);
    setLevel('clientList');
    try {
      const result = await fetchTodayClientsByDept(dept.dept as ClientDept);
      setClients(result);
    } catch (e) {
      console.error('Failed to fetch clients:', e);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const goBack = useCallback(() => {
    setDirection('back');
    setLevel('breakdown');
    setActiveDept(null);
    setClients([]);
  }, []);

  const openProfile = useCallback(
    (client: TodayClient) => {
      onClose();
      router.push(client.profilePath);
    },
    [onClose, router]
  );

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
        className="relative w-full sm:w-[520px] max-h-[90vh] bg-white dark:bg-black rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {level === 'clientList' && (
              <button
                onClick={goBack}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 text-black dark:text-white" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">
                <Users className="w-3 h-3" />
                {level === 'breakdown' ? "Today's Client Flow" : activeDept?.label}
              </div>
              <p className="text-lg font-black text-black dark:text-white leading-tight">
                {level === 'breakdown' ? (
                  <>
                    <span className="text-primary">{total}</span> new clients
                    <span className="text-sm font-bold text-gray-400 ml-2">{todayLabel}</span>
                  </>
                ) : (
                  <>
                    <span className={cn('mr-2', activeDept?.color)}>{clients.length}</span>
                    registered today
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95"
          >
            <X className="w-4 h-4 text-black dark:text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait" initial={false}>
            {level === 'breakdown' ? (
              <motion.div
                key="breakdown"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="p-7 space-y-3"
              >
                {byDept.map((dept, i) => (
                  <motion.div
                    key={dept.dept}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <DeptRow dept={dept} onClick={() => drillIntoDept(dept)} />
                  </motion.div>
                ))}

                {total === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-3">🌙</p>
                    <p className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      No new clients today
                    </p>
                    <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 mt-1 uppercase tracking-widest">
                      {todayLabel}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`list-${activeDept?.dept}`}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="p-7 space-y-3"
              >
                {clientsLoading ? (
                  <div className="py-16 flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Loading clients…
                    </p>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-3">📭</p>
                    <p className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      No clients registered today
                    </p>
                  </div>
                ) : (
                  clients.map((client, i) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <ClientRow client={client} onProfile={openProfile} />
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer breadcrumb ── */}
        <div className="px-7 py-4 border-t border-gray-100 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-700">
            <span
              className={cn(
                'cursor-pointer transition-colors',
                level === 'breakdown'
                  ? 'text-black dark:text-white'
                  : 'hover:text-gray-500 dark:hover:text-gray-400'
              )}
              onClick={level === 'clientList' ? goBack : undefined}
            >
              All Depts
            </span>
            {level === 'clientList' && activeDept && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className={cn('text-black dark:text-white', activeDept.color)}>
                  {activeDept.label}
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
