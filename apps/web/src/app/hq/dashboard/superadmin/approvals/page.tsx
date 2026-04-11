// apps/web/src/app/hq/dashboard/superadmin/approvals/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Filter,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useHqSession } from '@/hooks/hq/useHqSession';
import {
  searchEntitiesCombined,
  subscribeApprovalsFeed,
  subscribeEntityTransactions,
  type ApprovalsFilters,
  type ApprovalsTab,
  type EntityPick,
  type TabTimeFilters,
  DEFAULT_TAB_TIME_FILTERS,
} from '@/lib/hq/superadmin/approvals';
import { ErrorState } from '@/components/hq/superadmin/DataState';
import { debounce, toDate } from '@/lib/utils';
import { decideTransaction, bulkDecideTransactions } from '@/app/hq/actions/approvals';
import type { UnifiedTx } from '@/lib/hq/superadmin/types';
import { db } from '@/lib/firebase';
import { typeLabel, mapTxToTypeOption } from '@/lib/hq/superadmin/approvals';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: ApprovalsFilters = {
  dept: 'all',
  datePreset: 'all',
  amountBucket: 'all',
  sort: 'all',
  proof: 'all',
  entityQuery: '',
  txTypes: [] as string[],
  cashierName: 'all',
};

const PAGE_SIZE = 12;

const REJECT_PRESETS = ['Insufficient proof', 'Wrong amount', 'Duplicate', 'Other'] as const;

const TRANSACTION_TYPE_OPTIONS = [
  'All',
  'Monthly Fee',
  'Admission',
  'Registration',
  'Examination',
  'Other',
] as const;

type CardPhase = 'idle' | 'success' | 'fail';

type EntityEnrich = {
  name?: string;
  course?: string;
  session?: string;
  rollNo?: string;
  totalPackage?: number;
  totalPackageAmount?: number; // Normalized field for Rehab
  totalReceived?: number;
  remaining?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(val: unknown): string {
  const d = toDate(val);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function fmtDate(val: unknown): string {
  const d = toDate(val);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function fmtPKR(n: number): string {
  return 'PKR ' + Number(n || 0).toLocaleString('en-PK');
}

function entityName(tx: UnifiedTx): string {
  return String(tx.patientName || tx.studentName || tx.staffName || '—');
}

function entityId(tx: UnifiedTx): string | undefined {
  if (tx.dept === 'rehab') return tx.patientId || undefined;
  return (tx.studentId || tx.patientId) ?? undefined;
}



function statusLabel(s: string): string {
  if (s === 'pending_cashier') return 'Pending';
  if (s === 'rejected_cashier') return 'Rejected';
  return s.replace(/_/g, ' ');
}

function profileHref(tx: UnifiedTx): string | null {
  const id = entityId(tx);
  if (!id) return null;
  return tx.dept === 'rehab'
    ? `/hq/dashboard/superadmin/rehab/patients/${id}`
    : `/hq/dashboard/superadmin/spims/students/${id}`;
}

// ─── Styles (design tokens) ─────────────────────────────────────────────────

function DesignTokensStyle() {
  return (
    <style>{`
      :root {
        --rehab: #22c55e;
        --spims: #3b82f6;
        --pending: #eab308;
        --approved: #22c55e;
        --rejected: #ef4444;
      }
      @keyframes tx-approve-pop {
        0% { transform: scale(0); opacity: 0; }
        40% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.1); opacity: 0; }
      }
      @keyframes tx-slide-out {
        to { max-height: 0; opacity: 0; margin: 0; padding-top: 0; padding-bottom: 0; }
      }
      @keyframes toast-slide-up {
        from { transform: translate(-50%, 24px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      .tx-approve-overlay { animation: tx-approve-pop 800ms ease-out forwards; }
      .tx-card-exit { animation: tx-slide-out 320ms ease forwards; }
      .toast-slide { animation: toast-slide-up 0.28s ease-out; }
    `}</style>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type Toast = { id: number; msg: string; color: 'green' | 'red' };
let _toastId = 0;

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none max-w-[min(100vw-1.5rem,28rem)] w-full px-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl toast-slide ${
            t.color === 'green' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {t.color === 'green' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1 text-left">{t.msg}</span>
          <button type="button" onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 pointer-events-auto shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  labelMap,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
            value === opt 
              ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900' 
              : 'bg-white dark:bg-[#111111] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
          }`}
        >
          {labelMap?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function RejectModal({
  tx,
  onClose,
  onConfirm,
  busy,
}: {
  tx: UnifiedTx;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#111111] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md mx-auto p-6 shadow-2xl z-10 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Reject this transaction?</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:bg-white/10">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
          </button>
        </div>
        <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-100">
          <div className="text-sm font-bold text-red-800 dark:text-red-400">{entityName(tx)}</div>
          <div className="text-2xl font-extrabold text-red-900 mt-1">{fmtPKR(tx.amount)}</div>
        </div>
        <div className="mb-3">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Preset reason</div>
          <div className="flex flex-wrap gap-2">
            {REJECT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  reason === p ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:border-red-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)…"
          className="w-full rounded-2xl border border-gray-200 dark:border-white/10 p-3 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-red-400 resize-none"
        />
        <button
          type="button"
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim() || busy}
          className="mt-4 w-full min-h-[48px] rounded-2xl bg-red-600 text-white font-black text-sm uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          Confirm Reject
        </button>
      </div>
    </div>
  );
}

function BulkConfirmModal({
  selected,
  txMap,
  onClose,
  onConfirm,
  busy,
}: {
  selected: string[];
  txMap: Map<string, UnifiedTx>;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const items = selected.map((id) => txMap.get(id)).filter(Boolean) as UnifiedTx[];
  const total = items.reduce((s, t) => s + (t.amount || 0), 0);
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#111111] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg mx-auto p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Approve {selected.length} transactions?</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
        <ul className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
          {items.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/10 gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{entityName(tx)}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{typeLabel(tx)}</div>
              </div>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white shrink-0">{fmtPKR(tx.amount)}</div>
            </li>
          ))}
        </ul>
        <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-900/30 border border-green-100 mb-5 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-green-700">Total</span>
          <span className="text-lg font-extrabold text-green-900">{fmtPKR(total)}</span>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="w-full min-h-[48px] rounded-2xl bg-green-600 text-white font-black text-sm uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Approve Selected
        </button>
      </div>
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[180]">
      <button type="button" className="absolute inset-0 bg-black/90 w-full h-full cursor-default" onClick={onClose} aria-label="Close" />
      <div className="absolute inset-4 sm:inset-10 flex flex-col pointer-events-none">
        <div className="flex justify-end mb-2 pointer-events-auto">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-2xl bg-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Proof" className="flex-1 object-contain min-h-0 rounded-2xl pointer-events-auto" />
      </div>
    </div>
  );
}

function useEntityHistory(
  open: boolean,
  dept: 'rehab' | 'spims',
  pid: string | undefined,
  excludeId: string
) {
  const [rows, setRows] = useState<UnifiedTx[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !pid) return;
    let cancelled = false;
    setLoading(true);
    const col = dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
    const field = dept === 'rehab' ? 'patientId' : 'patientId';
    const q = query(collection(db, col), where(field, '==', pid), orderBy('createdAt', 'desc'), limit(8));
    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              dept,
              status: String(data.status || ''),
              createdAt: data.createdAt,
              amount: Number(data.amount) || 0,
              categoryName: data.categoryName as string | undefined,
              category: data.category as string | undefined,
              type: data.type as string | undefined,
              proofUrl: data.proofUrl as string | null | undefined,
            } as unknown as UnifiedTx;
          })
          .filter((t) => t.id !== excludeId)
          .slice(0, 5);
        setRows(list);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dept, pid, excludeId]);

  return { rows, loading };
}

function TxCard({
  tx,
  enrich,
  checked,
  onCheckedChange,
  onApprove,
  onReject,
  busyId,
  hidden,
  phase,
  showSelect,
  showActions,
}: {
  tx: UnifiedTx;
  enrich?: EntityEnrich;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  onApprove?: (tx: UnifiedTx) => void;
  onReject?: (tx: UnifiedTx) => void;
  busyId: string | null;
  hidden: boolean;
  phase: CardPhase;
  showSelect: boolean;
  showActions: boolean;
}) {
  const [showProof, setShowProof] = useState(false);
  const [copied, setCopied] = useState(false);
  const name = entityName(tx);
  const typ = typeLabel(tx);
  const eid = entityId(tx);
  const isBusy = busyId === tx.id;
  const isDisabled = !!busyId;
  const isPending = tx.status === 'pending' || tx.status === 'pending_cashier';

  const copyId = () => {
    void navigator.clipboard.writeText(tx.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const deptBadge =
    tx.dept === 'rehab'
      ? 'bg-[color:var(--rehab)]/15 text-[color:var(--rehab)] border-[color:var(--rehab)]/30'
      : 'bg-[color:var(--spims)]/15 text-[color:var(--spims)] border-[color:var(--spims)]/30';

  const typeColors =
    typ.toLowerCase().includes('month') || typ.toLowerCase().includes('fee')
      ? 'bg-teal-100 text-teal-800'
      : typ.toLowerCase().includes('admission')
        ? 'bg-orange-100 text-orange-800'
        : typ.toLowerCase().includes('registration')
          ? 'bg-indigo-100 text-indigo-800'
          : typ.toLowerCase().includes('exam')
            ? 'bg-rose-100 text-rose-800'
            : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100';

  const st = tx.status;
  const statusUi =
    st === 'approved'
      ? 'bg-green-100 text-green-800 dark:text-green-400 border-green-200'
      : st === 'rejected' || st === 'rejected_cashier'
        ? 'bg-red-100 text-red-800 dark:text-red-400 border-red-200'
        : 'bg-amber-100 text-amber-900 border-amber-200';

  const runningPaid = enrich?.totalReceived;
  const pkg = enrich?.totalPackage;
  const remAfter =
    enrich?.remaining != null ? Math.max(0, enrich.remaining - (isPending ? Number(tx.amount || 0) : 0)) : undefined;

  const phref = profileHref(tx);

  if (hidden) return null;

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden max-w-[680px] mx-auto w-full mb-4 ${
        phase === 'success' 
          ? 'border-green-500 ring-2 ring-green-400/40 bg-white dark:bg-gray-900' 
          : phase === 'fail' 
            ? 'border-red-500 ring-2 ring-red-400/40 bg-white dark:bg-gray-900' 
            : 'border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900'
      } ${phase === 'idle' ? '' : 'tx-card-exit'}`}
    >
      {phase === 'success' ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/40">
          <div className="tx-approve-overlay w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center shadow-xl">
            <Check className="w-8 h-8" strokeWidth={3} />
          </div>
        </div>
      ) : null}
      {phase === 'fail' ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/40">
          <div className="tx-approve-overlay w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center shadow-xl">
            <X className="w-8 h-8" strokeWidth={3} />
          </div>
        </div>
      ) : null}

      {showSelect ? (
        <div className="absolute left-3 top-3 z-10">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="w-5 h-5 accent-gray-900"
            aria-label="Select transaction"
          />
        </div>
      ) : null}

      <div className={`p-4 sm:p-6 ${showSelect ? 'pl-10 sm:pl-12' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${deptBadge}`}>
              {tx.dept === 'rehab' ? 'Rehab' : 'SPIMS'}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${typeColors}`}>{typ}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{fmtPKR(tx.amount)}</div>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border mt-1 ${statusUi}`}>
              {statusLabel(st)}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <section className="rounded-2xl bg-[color:var(--filter-bg,#f8fafc)] border border-gray-100 dark:border-white/10 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Entity info</p>
            <div className="flex gap-2 text-sm">
              <span aria-hidden>👤</span>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Student / Patient</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{name}</p>
              </div>
            </div>
            {tx.dept === 'spims' && (enrich?.course || enrich?.session) ? (
              <div className="flex gap-2 text-sm text-gray-800 dark:text-gray-100">
                <span aria-hidden>🎓</span>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Course · Session</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {enrich?.course || '—'} · {enrich?.session || '—'}
                  </p>
                </div>
              </div>
            ) : null}
            {tx.dept === 'rehab' ? (
              <div className="flex gap-2 text-sm text-gray-800 dark:text-gray-100">
                <span aria-hidden>🏥</span>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Department</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rehab Center</p>
                </div>
              </div>
            ) : null}
            {tx.dept === 'spims' && enrich?.rollNo ? (
              <div className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span aria-hidden>📋</span>
                <span>
                  Roll No: <span className="font-semibold">{enrich.rollNo}</span>
                </span>
              </div>
            ) : null}
            {phref ? (
              <Link href={phref} className="inline-flex items-center justify-center w-full mt-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-black uppercase tracking-widest transition-colors shadow-sm">
                View Profile & Payment History →
              </Link>
            ) : null}
          </section>

          <section className="rounded-2xl border border-gray-100 dark:border-white/10 p-4 space-y-2 bg-white dark:bg-[#111111]">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Payment details</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Amount</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{fmtPKR(tx.amount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Payment date</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{fmtDate(tx.createdAt || tx.date || tx.transactionDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Type</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{typ}</p>
              </div>
              {tx.description ? (
                <div className="sm:col-span-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Note</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words">&quot;{tx.description}&quot;</p>
                </div>
              ) : null}
              {runningPaid != null && pkg != null ? (
                <div className="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>
                    💳 Running total paid: <span className="font-semibold">{fmtPKR(runningPaid)}</span> / {fmtPKR(pkg)}
                  </span>
                </div>
              ) : null}
              {remAfter != null ? (
                <div className="sm:col-span-2 text-sm">
                  📊 Remaining after this: <span className="font-semibold">{fmtPKR(remAfter)}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Submitted by</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Cashier</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{tx.cashierName || tx.cashierId || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Cashier role</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{tx.cashierRole || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Submitted at</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{fmtTime(tx.createdAt || tx.date)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Forwarded from</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{tx.forwardedFromLabel || tx.departmentName || 'SPIMS Portal'}</p>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={copyId}
                  className="text-left text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 font-mono break-all w-full"
                >
                  🆔 {tx.id} {copied ? <span className="text-green-600 font-bold">Copied</span> : <Copy className="inline w-3 h-3 opacity-50" />}
                </button>
              </div>
            </div>
          </section>

          <div>
            {tx.proofUrl ? (
              <button
                type="button"
                onClick={() => setShowProof(true)}
                className="w-full rounded-2xl border border-green-200 bg-green-50 dark:bg-green-900/30 p-3 flex items-start gap-3 hover:bg-green-100 transition text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tx.proofUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-green-100" />
                <div>
                  <div className="text-xs font-black text-green-700">Proof attached ✓</div>
                  <div className="text-[10px] text-green-600">Tap for full screen</div>
                </div>
              </button>
            ) : (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
                <div className="text-xs font-black text-orange-700">⚠ No proof attached</div>
                {tx.proofMissingReason ? (
                  <p className="text-xs text-orange-800 mt-1">{tx.proofMissingReason}</p>
                ) : tx.description ? (
                  <p className="text-xs text-orange-700 mt-1">{tx.description}</p>
                ) : null}
              </div>
            )}
          </div>


        </div>

        {showActions && isPending && (onApprove || onReject) ? (
          <div className="mt-5 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => onApprove?.(tx)}
              disabled={isDisabled}
              className="w-full min-h-[48px] rounded-2xl bg-green-600 text-white font-black text-sm uppercase tracking-widest hover:bg-green-700 disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject?.(tx)}
              disabled={isDisabled}
              className="w-full min-h-[48px] rounded-2xl bg-red-600 text-white font-black text-sm uppercase tracking-widest hover:bg-red-700 disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Reject
            </button>
          </div>
        ) : null}
      </div>

      {showProof && tx.proofUrl ? <Lightbox url={tx.proofUrl} onClose={() => setShowProof(false)} /> : null}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function HqApprovalsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [tab, setTab] = useState<ApprovalsTab>('pending');
  const [tabTimeFilters, setTabTimeFilters] = useState<TabTimeFilters>(DEFAULT_TAB_TIME_FILTERS);
  const [tabDropdownOpen, setTabDropdownOpen] = useState<ApprovalsTab | null>(null);
  const [filters, setFilters] = useState<ApprovalsFilters>(DEFAULT_FILTERS);
  const [rows, setRows] = useState<UnifiedTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEntity, setSelectedEntity] = useState<EntityPick | null>(null);
  const [entityRows, setEntityRows] = useState<UnifiedTx[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [cardPhase, setCardPhase] = useState<Record<string, CardPhase>>({});

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [rejectTx, setRejectTx] = useState<UnifiedTx | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const [searchDraft, setSearchDraft] = useState('');
  const [entityQueryDebounced, setEntityQueryDebounced] = useState('');
  const [searchHits, setSearchHits] = useState<Array<{ id: string; name: string; dept: 'rehab' | 'spims' }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const [filtersPanelOpen, setFiltersPanelOpen] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [enriched, setEnriched] = useState<Record<string, EntityEnrich>>({});

  const addToast = useCallback((msg: string, color: 'green' | 'red') => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, msg, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    setFiltersPanelOpen(mq.matches);
    const fn = () => setFiltersPanelOpen(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  const debouncedSearch = useMemo(
    () =>
      debounce((q: string) => {
        void searchEntitiesCombined(q, filters.dept === 'hq' ? 'all' : filters.dept).then(setSearchHits);
      }, 280),
    [filters.dept]
  );

  const debouncedEntityFilter = useMemo(
    () =>
      debounce((q: string) => {
        setEntityQueryDebounced(q);
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchDraft);
  }, [searchDraft, debouncedSearch]);

  useEffect(() => {
    debouncedEntityFilter(searchDraft);
  }, [searchDraft, debouncedEntityFilter]);

  const filtersForFeed = useMemo(
    () => ({ ...filters, entityQuery: entityQueryDebounced }),
    [filters, entityQueryDebounced]
  );

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    if (selectedEntity) return;
    setLoading(true);
    setError(null);
    const unsub = subscribeApprovalsFeed(
      filtersForFeed,
      tab,
      (r) => {
        setRows(r);
        setLoading(false);
      },
      (err: unknown) => {
        setError(String((err as { message?: string })?.message ?? 'Failed to load'));
        setLoading(false);
      },
      tabTimeFilters[tab]
    );
    return () => unsub();
  }, [session, tab, filtersForFeed, selectedEntity, tabTimeFilters]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    if (!selectedEntity) {
      setEntityRows([]);
      return;
    }
    setEntityLoading(true);
    const unsub = subscribeEntityTransactions({
      entity: selectedEntity,
      onData: (r) => {
        setEntityRows(r);
        setEntityLoading(false);
      },
      onError: () => setEntityLoading(false),
    });
    return () => unsub();
  }, [session, selectedEntity]);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
    setSelected(new Set());
    setDismissed(new Set());
    setCardPhase({});
  }, [tab, filters, selectedEntity]);

  useEffect(() => {
    let cancelled = false;
    const need = new Map<string, { dept: 'rehab' | 'spims'; id: string }>();
    const source = selectedEntity ? entityRows : rows;
    source.forEach((tx) => {
      const id = entityId(tx);
      if (!id) return;
      const k = `${tx.dept}_${id}`;
      need.set(k, { dept: tx.dept, id });
    });
    void (async () => {
      for (const [, v] of need) {
        const k = `${v.dept}_${v.id}`;
        try {
          const ref = doc(db, v.dept === 'rehab' ? 'rehab_patients' : 'spims_students', v.id);
          const snap = await getDoc(ref);
          if (!snap.exists() || cancelled) continue;
          const d = snap.data() as Record<string, unknown>;
          const next: EntityEnrich = {
            name: String(d.name || ''),
            totalPackageAmount: Number(d.totalPackageAmount || d.totalPackage) || undefined,
            totalPackage: Number(d.totalPackage || d.totalPackageAmount) || undefined,
            totalReceived: Number(d.totalReceived) || undefined,
            remaining: Number(d.remaining) || undefined,
          };
          if (v.dept === 'spims') {
            next.course = String(d.course || '');
            next.session = String(d.session || '');
            next.rollNo =
              (d.year2_rollNo as string) || (d.year1_rollNo as string) || (d.rollNo as string) || undefined;
          }
          setEnriched((prev) => ({ ...prev, [k]: { ...prev[k], ...next } }));
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, entityRows, selectedEntity]);

  const txMap = useMemo(() => {
    const m = new Map<string, UnifiedTx>();
    (selectedEntity ? entityRows : rows).forEach((tx) => m.set(tx.id, tx));
    return m;
  }, [rows, entityRows, selectedEntity]);

  const filteredRows = useMemo(() => {
    const base = selectedEntity ? entityRows : rows;
    let r = base.filter((tx) => !dismissed.has(tx.id));

    if (selectedEntity) {
      return r.sort((a, b) => {
        if (filters.sort === 'highest') return (b.amount || 0) - (a.amount || 0);
        if (filters.sort === 'lowest') return (a.amount || 0) - (b.amount || 0);
        const ta = toDate(a.createdAt || a.date).getTime();
        const tb = toDate(b.createdAt || b.date).getTime();
        return filters.sort === 'oldest' ? ta - tb : tb - ta;
      });
    }

    return r;
  }, [selectedEntity, entityRows, rows, dismissed, filters.sort]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleLimit), [filteredRows, visibleLimit]);

  const totalAmount = useMemo(() => filteredRows.reduce((s, t) => s + (t.amount || 0), 0), [filteredRows]);
  const missingProof = useMemo(() => filteredRows.filter((t) => !t.proofUrl).length, [filteredRows]);

  const pendingCount = useMemo(() => {
    return rows.filter((t) => t.status === 'pending' || t.status === 'pending_cashier').length;
  }, [rows]);

  const isPendingTab = tab === 'pending' && !selectedEntity;
  // Cards can be selected on pending + history tabs
  const isSelectableTab = (tab === 'pending' || tab === 'history') && !selectedEntity;
  // Approve/reject action buttons show whenever the tx itself is pending (any tab)
  const canActOnTx = !selectedEntity && (tab === 'pending' || tab === 'history');

  const cashierNames = useMemo(() => {
    const src = selectedEntity ? entityRows : rows;
    const names = new Set<string>();
    src.forEach((tx) => {
      if (tx.cashierName) names.add(tx.cashierName);
    });
    return ['all', ...Array.from(names).sort()];
  }, [rows, entityRows, selectedEntity]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.dept !== 'all') chips.push({ key: 'dept', label: `Department: ${filters.dept.toUpperCase()}` });
    if (filters.datePreset !== 'all') {
      const labels: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', this_week: 'This Week', custom: 'Custom' };
      chips.push({ key: 'datePreset', label: `Date: ${labels[filters.datePreset] ?? filters.datePreset}` });
    }
    if (filters.amountBucket !== 'all') {
      const labels: Record<string, string> = {
        under_1000: 'Under 1,000',
        '1000_5000': '1,000–5,000',
        '5000_20000': '5,000–20,000',
        over_20000: 'Above 20,000',
      };
      chips.push({ key: 'amountBucket', label: `Amount: ${labels[filters.amountBucket]}` });
    }
    if (filters.proof !== 'all') {
      chips.push({ key: 'proof', label: filters.proof === 'has_proof' ? 'Has Proof' : 'Missing Proof' });
    }
    if (entityQueryDebounced.trim()) chips.push({ key: 'entityQuery', label: `Search: ${entityQueryDebounced.trim()}` });
    if (filters.txTypes && filters.txTypes.length > 0 && !filters.txTypes.includes('All')) {
      filters.txTypes.forEach(t => {
        chips.push({ key: `txType_${t}`, label: `Type: ${t}` });
      });
    }
    if (filters.cashierName !== 'all') chips.push({ key: 'cashierName', label: `Cashier: ${filters.cashierName}` });
    if (selectedEntity) chips.push({ key: 'entity', label: `${selectedEntity.dept === 'spims' ? 'Student' : 'Patient'}: ${selectedEntity.name}` });
    return chips;
  }, [filters, selectedEntity, entityQueryDebounced]);

  const hasAnyFilter = activeFilterChips.length > 0;

  const removeChip = (key: string) => {
    if (key === 'dept') setFilters((f) => ({ ...f, dept: 'all' }));
    else if (key === 'datePreset') setFilters((f) => ({ ...f, datePreset: 'all' }));
    else if (key === 'amountBucket') setFilters((f) => ({ ...f, amountBucket: 'all' }));
    else if (key === 'proof') setFilters((f) => ({ ...f, proof: 'all' }));
    else if (key === 'entityQuery') {
      setSearchDraft('');
      setEntityQueryDebounced('');
    }
    else if (key.startsWith('txType_')) {
      const typeToRemove = key.replace('txType_', '');
      setFilters((f) => ({ ...f, txTypes: (f.txTypes || []).filter(t => t !== typeToRemove) }));
    }
    else if (key === 'cashierName') setFilters((f) => ({ ...f, cashierName: 'all' }));
    else if (key === 'entity') setSelectedEntity(null);
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedEntity(null);
    setSearchDraft('');
    setEntityQueryDebounced('');
  };

  const runApprove = async (tx: UnifiedTx) => {
    setBusyId(tx.id);
    try {
      const dept = tx.dept === 'rehab' ? 'rehab' : 'spims';
      const [res] = await Promise.all([
        decideTransaction({ dept, txId: tx.id, decision: 'approved' }),
        new Promise<void>((r) => setTimeout(r, 500)),
      ]);
      if (!res.success) throw new Error(res.error ?? 'Failed');
      setCardPhase((p) => ({ ...p, [tx.id]: 'success' }));
      addToast(`✓ Approved — ${fmtPKR(tx.amount)} for ${entityName(tx)}`, 'green');
      setTimeout(() => {
        setDismissed((prev) => new Set([...prev, tx.id]));
        setCardPhase((p) => {
          const n = { ...p };
          delete n[tx.id];
          return n;
        });
      }, 700);
    } catch (e: unknown) {
      addToast(`Error: ${(e as Error)?.message ?? 'Failed to approve'}`, 'red');
    } finally {
      setBusyId(null);
    }
  };

  const runReject = async (tx: UnifiedTx, reason: string) => {
    setRejectBusy(true);
    try {
      const dept = tx.dept === 'rehab' ? 'rehab' : 'spims';
      const res = await decideTransaction({ dept, txId: tx.id, decision: 'rejected', rejectReason: reason });
      if (!res.success) throw new Error(res.error ?? 'Failed');
      setRejectTx(null);
      setCardPhase((p) => ({ ...p, [tx.id]: 'fail' }));
      addToast(`✗ Rejected — ${fmtPKR(tx.amount)} for ${entityName(tx)}`, 'red');
      setTimeout(() => {
        setDismissed((prev) => new Set([...prev, tx.id]));
        setCardPhase((p) => {
          const n = { ...p };
          delete n[tx.id];
          return n;
        });
      }, 700);
    } catch (e: unknown) {
      addToast(`Error: ${(e as Error)?.message ?? 'Failed to reject'}`, 'red');
    } finally {
      setRejectBusy(false);
    }
  };

  const handleBulkApprove = async () => {
    setBulkBusy(true);
    try {
      const ids = [...selected];
      const rehabIds = ids.filter((id) => txMap.get(id)?.dept === 'rehab');
      const spimsIds = ids.filter((id) => txMap.get(id)?.dept === 'spims');
      const results = await Promise.all([
        rehabIds.length ? bulkDecideTransactions({ dept: 'rehab', txIds: rehabIds, decision: 'approved' }) : Promise.resolve({ success: true, processed: 0, error: undefined }),
        spimsIds.length ? bulkDecideTransactions({ dept: 'spims', txIds: spimsIds, decision: 'approved' }) : Promise.resolve({ success: true, processed: 0, error: undefined }),
      ]);
      const ok = results.every((r) => r.success !== false);
      if (!ok) {
        const failed = results.find((r) => !r.success);
        throw new Error(failed?.error || 'Bulk failed');
      }
      setDismissed((prev) => new Set([...prev, ...selected]));
      setSelected(new Set());
      setShowBulkConfirm(false);
      const totalProc = results.reduce((s, r) => s + (r?.processed ?? 0), 0);
      addToast(`✓ Approved ${totalProc} transactions`, 'green');
    } catch (e: unknown) {
      addToast(`Error: ${(e as Error)?.message ?? 'Bulk approve failed'}`, 'red');
    } finally {
      setBulkBusy(false);
    }
  };

  const visibleIds = visibleRows.map((t) => t.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        visibleIds.forEach((id) => n.delete(id));
        return n;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...visibleIds]));
    }
  };

  const selectedTxs = [...selected].map((id) => txMap.get(id)).filter(Boolean) as UnifiedTx[];
  const selectedTotal = selectedTxs.reduce((s, t) => s + (t.amount || 0), 0);

  const entitySummary = selectedEntity ? enriched[`${selectedEntity.dept}_${selectedEntity.id}`] : undefined;

  if (sessionLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-white/5 overflow-x-hidden w-full max-w-full pb-36 text-gray-900 dark:text-white">
      <DesignTokensStyle />

      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-6 space-y-5">
        {/* 1 Title */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              Approvals
              {pendingCount > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-amber-400 text-gray-900 text-xs font-black">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              ) : null}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Review incoming payments with confidence.</p>
          </div>
        </div>

        {/* 2 Tabs — each has a time-filter dropdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              {
                id: 'pending' as const,
                label: 'Pending',
                options: [
                  { value: 'all', label: 'All Pending' },
                  { value: 'today', label: 'Today' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                ],
              },
              {
                id: 'approved_today' as const,
                label: 'Approved',
                options: [
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'this_year', label: 'This Year' },
                ],
              },
              {
                id: 'rejected_today' as const,
                label: 'Rejected',
                options: [
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'this_year', label: 'This Year' },
                ],
              },
              {
                id: 'history' as const,
                label: 'All History',
                options: [
                  { value: 'all', label: 'All Time' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'this_year', label: 'This Year' },
                ],
              },
            ] as const
          ).map((t) => {
            const currentPreset = tabTimeFilters[t.id];
            const currentOption = t.options.find((o) => o.value === currentPreset);
            const isActive = tab === t.id;
            const isOpen = tabDropdownOpen === t.id;
            return (
              <div key={t.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setTabDropdownOpen(isOpen ? null : t.id);
                  }}
                  className={`w-full py-2.5 px-2 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition border flex flex-col items-center gap-0.5 ${
                    isActive
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md dark:bg-white dark:text-gray-900 dark:border-white'
                      : 'bg-white dark:bg-[#111111] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-300'
                  }`}
                >
                  <span>{t.label}</span>
                  {currentOption && currentOption.value !== 'all' && (
                    <span className={`text-[9px] font-semibold normal-case tracking-normal ${
                      isActive ? 'text-white/70 dark:text-gray-900/70' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {currentOption.label}
                    </span>
                  )}
                </button>
                {isOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[50]"
                      onClick={() => setTabDropdownOpen(null)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 z-[51] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                      {t.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setTabTimeFilters((prev) => ({ ...prev, [t.id]: opt.value }));
                            setTabDropdownOpen(null);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs font-bold transition ${
                            currentPreset === opt.value
                              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {selectedEntity ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedEntity(null)}
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Transactions
            </button>
            <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111111] shadow-md p-5 max-w-[680px] mx-auto w-full">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Entity</p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{selectedEntity.name}</p>
              {selectedEntity.dept === 'spims' && (entitySummary?.course || entitySummary?.session) ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {entitySummary?.course} · {entitySummary?.session}
                </p>
              ) : null}
              {entitySummary?.totalPackage != null ? (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                    <span>Package progress</span>
                    <span>
                      {fmtPKR(entitySummary.totalReceived || 0)} / {fmtPKR(entitySummary.totalPackage)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((entitySummary.totalReceived || 0) / Math.max(1, entitySummary.totalPackage)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-2">
                    Remaining balance: {fmtPKR(entitySummary.remaining ?? 0)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">Loading package info…</p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111111] overflow-x-auto shadow-sm">
              {entityLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              ) : (
                <div className="table-responsive">

                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Cashier</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entityRows.map((tx) => (
                      <tr key={tx.id} className="border-t border-gray-100 dark:border-white/10">
                        <td className="px-4 py-3 whitespace-nowrap">{fmtDate(tx.createdAt || tx.date)}</td>
                        <td className="px-4 py-3">{typeLabel(tx)}</td>
                        <td className="px-4 py-3 font-semibold">{fmtPKR(tx.amount)}</td>
                        <td className="px-4 py-3">{tx.cashierName || '—'}</td>
                        <td className="px-4 py-3">{statusLabel(tx.status)}</td>
                        <td className="px-4 py-3">
                          {tx.status === 'pending' || tx.status === 'pending_cashier' ? (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                className="text-xs font-black text-green-600"
                                onClick={() => runApprove(tx)}
                              >
                                Approve
                              </button>
                              <button type="button" className="text-xs font-black text-red-600" onClick={() => setRejectTx(tx)}>
                                Reject
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* 3 Filters */}
            <div className="lg:sticky lg:top-0 lg:z-10 mb-6">
              <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-sm font-black text-gray-800 dark:text-gray-100 bg-[color:var(--filter-bg,#f8fafc)] dark:bg-gray-900"
                  onClick={() => setFiltersPanelOpen((v) => !v)}
                >
                  <span className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </span>
                  {filtersPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <div className={`${filtersPanelOpen ? 'block' : 'hidden'} lg:block p-4 sm:p-5 space-y-4`}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Department</p>
                      <PillGroup
                        options={['all', 'rehab', 'spims'] as const}
                        value={filters.dept === 'hq' ? 'all' : filters.dept}
                        onChange={(v) => setFilters((f) => ({ ...f, dept: v }))}
                        labelMap={{ all: 'All', rehab: 'Rehab', spims: 'SPIMS' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Date range</p>
                      <PillGroup
                        options={['all', 'today', 'yesterday', 'this_week', 'custom'] as const}
                        value={filters.datePreset}
                        onChange={(v) => setFilters((f) => ({ ...f, datePreset: v }))}
                        labelMap={{ all: 'All', today: 'Today', yesterday: 'Yesterday', this_week: 'This Week', custom: 'Custom' }}
                      />
                      {filters.datePreset === 'custom' ? (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <input
                            type="date"
                            value={filters.customFrom ?? ''}
                            onChange={(e) => setFilters((f) => ({ ...f, customFrom: e.target.value }))}
                            className="flex-1 min-w-[140px] rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs bg-white dark:bg-gray-900 dark:text-gray-100"
                          />
                          <input
                            type="date"
                            value={filters.customTo ?? ''}
                            onChange={(e) => setFilters((f) => ({ ...f, customTo: e.target.value }))}
                            className="flex-1 min-w-[140px] rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs bg-white dark:bg-gray-900 dark:text-gray-100"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Sort by</p>
                      <select
                        value={filters.sort}
                        onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ApprovalsFilters['sort'] }))}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm bg-white dark:bg-gray-900 dark:text-gray-100"
                      >
                        <option value="all">All</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Amount range</p>
                      <select
                        value={filters.amountBucket}
                        onChange={(e) => setFilters((f) => ({ ...f, amountBucket: e.target.value as ApprovalsFilters['amountBucket'] }))}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm bg-white dark:bg-gray-900 dark:text-gray-100"
                      >
                        <option value="all">All</option>
                        <option value="under_1000">Under 1,000</option>
                        <option value="1000_5000">1,000–5,000</option>
                        <option value="5000_20000">5,000–20,000</option>
                        <option value="over_20000">Above 20,000</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div ref={searchWrapRef} className="relative">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Entity search</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input
                          value={searchDraft}
                          onChange={(e) => {
                            setSearchDraft(e.target.value);
                            setSearchOpen(true);
                          }}
                          onFocus={() => setSearchOpen(true)}
                          placeholder="Search patient / student name..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-purple-400 dark:bg-gray-900 dark:text-gray-100"
                        />
                      </div>
                      {searchOpen && searchHits.length > 0 ? (
                        <ul className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl max-h-56 overflow-y-auto">
                          {searchHits.map((h) => (
                            <li key={`${h.dept}_${h.id}`}>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between gap-2"
                                onClick={() => {
                                  setSelectedEntity({ id: h.id, dept: h.dept, name: h.name });
                                  setSearchDraft(h.name);
                                  setSearchOpen(false);
                                }}
                              >
                                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{h.name}</span>
                                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 shrink-0">{h.dept}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Proof</p>
                      <PillGroup
                        options={['all', 'has_proof', 'missing_proof'] as const}
                        value={filters.proof}
                        onChange={(v) => setFilters((f) => ({ ...f, proof: v }))}
                        labelMap={{ all: 'All', has_proof: 'Has Proof', missing_proof: 'Missing Proof' }}
                      />
                    </div>
                  </div>

                  <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">
                    <button
                      type="button"
                      className="lg:hidden flex items-center gap-2 text-xs font-black text-purple-700"
                      onClick={() => setMoreFiltersOpen((v) => !v)}
                    >
                      More Filters
                      {moreFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className={`${moreFiltersOpen ? 'block' : 'hidden'} lg:grid lg:grid-cols-2 lg:col-span-2 lg:gap-4 lg:!block space-y-4`}>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Cashier name</p>
                        <select
                          value={filters.cashierName}
                          onChange={(e) => setFilters((f) => ({ ...f, cashierName: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm bg-white dark:bg-gray-900 dark:text-gray-100"
                        >
                          {cashierNames.map((n) => (
                            <option key={n} value={n}>
                              {n === 'all' ? 'All cashiers' : n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Transaction type</p>
                        <div className="flex flex-wrap gap-2">
                          {TRANSACTION_TYPE_OPTIONS.map((t) => {
                            const isSelected = (filters.txTypes || []).includes(t) || (t === 'All' && (filters.txTypes || []).length === 0);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setFilters((f) => {
                                    const current = f.txTypes || [];
                                    if (t === 'All') return { ...f, txTypes: [] };
                                    const next = current.includes(t) 
                                      ? current.filter(x => x !== t) 
                                      : [...current.filter(x => x !== 'All'), t];
                                    return { ...f, txTypes: next };
                                  });
                                }}
                                className={`px-2.5 py-1.5 rounded-full text-[10px] font-black border transition ${
                                  isSelected
                                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900'
                                    : 'bg-white dark:bg-[#111111] text-gray-600 dark:text-gray-300 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:border-gray-400'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeFilterChips.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      {activeFilterChips.map((c) => (
                        <span
                          key={c.key}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200"
                        >
                          {c.label}
                          <button type="button" onClick={() => removeChip(c.key)} className="text-purple-700 hover:text-purple-950" aria-label={`Remove ${c.label}`}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {hasAnyFilter ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-sm font-black text-red-600 hover:text-red-800 dark:text-red-400 underline underline-offset-2"
                    >
                      Clear All Filters
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 4 Summary */}
            {!loading && !error ? (
              <div className="rounded-2xl bg-purple-600 text-white px-4 py-3 text-sm font-bold flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                <span>
                  {filteredRows.length > visibleRows.length
                    ? `Showing ${visibleRows.length} of ${filteredRows.length} transactions`
                    : `Showing ${filteredRows.length} transaction${filteredRows.length === 1 ? '' : 's'}`}
                </span>
                <span className="text-purple-200 hidden sm:inline">·</span>
                <span>Total Amount: {fmtPKR(totalAmount)}</span>
                {missingProof > 0 ? (
                  <>
                    <span className="text-purple-200 hidden sm:inline">·</span>
                    <span className="text-amber-200">{missingProof} missing proof</span>
                  </>
                ) : null}
              </div>
            ) : null}

            {/* Bulk select row */}
            {isSelectableTab && !loading && filteredRows.length > 0 ? (
              <div className="flex items-center justify-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-gray-900" />
                  Select All
                </label>
              </div>
            ) : null}

            {/* 5 Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
              {loading ? (
                <SkeletonCards />
              ) : error ? (
                <div className="col-span-full">
                  <ErrorState
                    title="Failed to load"
                    message={error}
                    onRetry={() => {
                      setError(null);
                      setLoading(true);
                      setFilters((f) => ({ ...f }));
                    }}
                  />
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="col-span-full">
                  <EmptyApprovals tab={tab} />
                </div>
              ) : (
                visibleRows.map((tx) => {
                  const eid = entityId(tx);
                  const ek = eid ? `${tx.dept}_${eid}` : '';
                  return (
                    <TxCard
                      key={tx.id}
                      tx={tx}
                      enrich={ek ? enriched[ek] : undefined}
                      checked={selected.has(tx.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) => {
                          const n = new Set(prev);
                          if (v) n.add(tx.id);
                          else n.delete(tx.id);
                          return n;
                        })
                      }
                      onApprove={canActOnTx ? runApprove : undefined}
                      onReject={canActOnTx ? (t) => setRejectTx(t) : undefined}
                      busyId={busyId}
                      hidden={dismissed.has(tx.id)}
                      phase={cardPhase[tx.id] ?? 'idle'}
                      showSelect={isSelectableTab}
                      showActions={canActOnTx}
                    />
                  );
                })
              )}
            </div>

            {/* 6 Load more */}
            {!loading && !error && filteredRows.length > visibleRows.length ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((v) => v + PAGE_SIZE)}
                  className="h-12 px-8 rounded-2xl border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111111] text-sm font-black text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:bg-white/5"
                >
                  Load More
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {selected.size > 0 && isSelectableTab ? (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 py-4 pb-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 text-center sm:text-left">
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {selected.size} selected · Total: {fmtPKR(selectedTotal)}
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="h-12 px-5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-black text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-white/5"
              >
                Clear Selection
              </button>
              {isPendingTab && (
                <button
                  type="button"
                  onClick={() => setShowBulkConfirm(true)}
                  className="h-12 px-6 rounded-2xl bg-green-600 text-white text-sm font-black hover:bg-green-700 inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Selected
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {rejectTx ? (
        <RejectModal
          tx={rejectTx}
          onClose={() => setRejectTx(null)}
          onConfirm={(reason) => runReject(rejectTx, reason)}
          busy={rejectBusy}
        />
      ) : null}

      {showBulkConfirm ? (
        <BulkConfirmModal
          selected={[...selected]}
          txMap={txMap}
          onClose={() => setShowBulkConfirm(false)}
          onConfirm={handleBulkApprove}
          busy={bulkBusy}
        />
      ) : null}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="col-span-full space-y-4 max-w-[680px] mx-auto w-full">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111111] p-5 animate-pulse">
          <div className="flex justify-between mb-4">
            <div className="h-5 w-24 rounded-full bg-gray-100 dark:bg-white/10" />
            <div className="h-8 w-28 rounded-xl bg-gray-100 dark:bg-white/10" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-2/3 rounded-lg bg-gray-100 dark:bg-white/10" />
            <div className="h-4 w-1/2 rounded-lg bg-gray-100 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyApprovals({ tab }: { tab: ApprovalsTab }) {
  const isPending = tab === 'pending';
  return (
    <div className="rounded-3xl border border-green-100 bg-white dark:bg-[#111111] p-10 text-center shadow-sm max-w-[680px] mx-auto">
      <div className="text-5xl mb-4" aria-hidden>
        {isPending ? '✅' : '📋'}
      </div>
      <div className="text-lg font-black text-gray-900 dark:text-white">{isPending ? 'No pending approvals' : 'No transactions found'}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2 font-medium">
        {isPending ? 'All caught up — nothing is waiting for you.' : 'Try adjusting filters or date range.'}
      </div>
    </div>
  );
}
