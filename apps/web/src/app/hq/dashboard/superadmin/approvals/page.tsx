// apps/web/src/app/hq/dashboard/superadmin/approvals/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  Info,
  Loader2,
  Minus,
  Search,
  Trash2,
  TrendingUp,
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
import { decideTransaction, bulkDecideTransactions, type Dept } from '@/app/hq/actions/approvals';
import type { UnifiedTx, DeptFilter } from '@/lib/hq/superadmin/types';
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
  return String(tx.patientName || tx.studentName || tx.seekerName || tx.staffName || '—');
}

function entityId(tx: UnifiedTx): string | undefined {
  if (tx.dept === 'rehab') return tx.patientId || undefined;
  if (tx.dept === 'spims') return tx.studentId || tx.patientId || undefined;
  if (tx.dept === 'job-center') return tx.seekerId || undefined;
  return (tx.studentId || tx.patientId || tx.seekerId) ?? undefined;
}



function statusLabel(s: string): string {
  if (s === 'pending_cashier') return 'Pending';
  if (s === 'rejected_cashier') return 'Rejected';
  return s.replace(/_/g, ' ');
}

function profileHref(tx: UnifiedTx): string | null {
  const id = entityId(tx);
  if (!id) return null;
  if (tx.dept === 'rehab') return `/hq/dashboard/superadmin/rehab/patients/${id}`;
  if (tx.dept === 'spims') return `/hq/dashboard/superadmin/spims/students/${id}`;
  if (tx.dept === 'job-center') return `/hq/dashboard/superadmin/job-center/seekers/${id}`;
  return null;
}

// ─── Styles (design tokens) ─────────────────────────────────────────────────

function DesignTokensStyle() {
  return (
    <style>{`
      :root {
        --pending: #94a3b8;
        --approved: #000000;
        --rejected: #64748b;
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
          className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl text-white dark:text-black font-black text-[10px] uppercase tracking-widest shadow-2xl toast-slide ${
            t.color === 'green' ? 'bg-black dark:bg-white' : 'bg-gray-500'
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
          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
            value === opt 
              ? 'bg-black text-white border-black' 
              : 'bg-white text-gray-500 border-gray-100 hover:border-black hover:text-black'
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
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-black rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-md mx-auto p-8 shadow-2xl z-10 max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Reject Capital Flow?</h2>
          <button type="button" onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>
        <div className="mb-6 p-10 rounded-[2.5rem] bg-black dark:bg-white text-white dark:text-black shadow-2xl relative overflow-hidden group">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-4 italic">Authorization Target</div>
          <div className="text-2xl font-black uppercase tracking-tight mb-2">{entityName(tx)}</div>
          <div className="text-4xl font-black tracking-tighter">{fmtPKR(tx.amount)}</div>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <XCircle size={80} />
          </div>
        </div>
        <div className="mb-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-black dark:text-black mb-3 italic">Selection Reason</div>
          <div className="flex flex-wrap gap-2">
            {REJECT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  reason === p ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'bg-white dark:bg-black text-black dark:text-black border-gray-200 dark:border-white/10 hover:border-black dark:hover:border-white'
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
          placeholder="Detailed justification required…"
          className="w-full rounded-2xl border border-gray-100 dark:border-white/10 p-4 text-sm font-bold bg-gray-50 dark:bg-white/5 text-black dark:text-white outline-none focus:border-rose-500/50 transition-colors resize-none placeholder:text-black dark:placeholder:text-black"
        />
        <button
          type="button"
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim() || busy}
          className="mt-6 w-full h-16 rounded-2xl bg-gray-200 dark:bg-white/10 text-black dark:text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-30 inline-flex items-center justify-center gap-3 shadow-xl active:scale-95"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
          DECOMMISSION NODE
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
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-black rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-lg mx-auto p-8 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 border border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Batch Approval</h2>
          <button type="button" onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>
        <ul className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {items.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-white/5 gap-3 group">
              <div className="min-w-0">
                <div className="text-sm font-black text-black dark:text-white truncate group-hover:text-primary-500 transition-colors">{entityName(tx)}</div>
                <div className="text-[10px] font-bold text-black uppercase tracking-widest truncate">{typeLabel(tx)}</div>
              </div>
              <div className="text-sm font-black text-black dark:text-white shrink-0 font-mono">{fmtPKR(tx.amount)}</div>
            </li>
          ))}
        </ul>
        <div className="p-10 rounded-[2.5rem] bg-black dark:bg-white text-white dark:text-black mb-8 flex items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 block mb-2">Aggregate Value</span>
            <span className="text-4xl font-black tracking-tighter">{fmtPKR(total)}</span>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={80} />
          </div>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="w-full h-16 rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-white/10 text-black dark:text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-30 inline-flex items-center justify-center gap-3 shadow-xl active:scale-95"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          AUTHORIZE BATCH COMMAND
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
  onRemove,
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
  onRemove?: (tx: UnifiedTx) => void;
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
      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
      : tx.dept === 'spims'
        ? 'bg-sky-50 text-sky-600 border-sky-100'
        : 'bg-rose-50 text-rose-600 border-rose-100';

  const typeBadge = 'bg-gray-50 text-gray-500 border-gray-100';

  const st = tx.status;
  const statusUi =
    st === 'approved'
      ? 'bg-black text-white border-transparent'
      : st === 'rejected' || st === 'rejected_cashier'
        ? 'bg-rose-50 text-rose-600 border-rose-100'
        : 'bg-white text-gray-900 border-gray-200';

  const runningPaid = enrich?.totalReceived;
  const pkg = enrich?.totalPackage;
  const remAfter =
    enrich?.remaining != null ? Math.max(0, enrich.remaining - (isPending ? Number(tx.amount || 0) : 0)) : undefined;

  const phref = profileHref(tx);

  if (hidden) return null;

  return (
    <div
      className={`relative rounded-[2.5rem] border transition-all duration-500 overflow-hidden max-w-[680px] mx-auto w-full mb-6 ${
        phase === 'success' 
          ? 'border-emerald-500 ring-8 ring-emerald-500/5 bg-emerald-50' 
          : phase === 'fail' 
            ? 'border-rose-500 ring-8 ring-rose-500/5 bg-rose-50' 
            : 'border-gray-100 bg-white shadow-2xl shadow-gray-200/60 hover:shadow-gray-300/80 hover:-translate-y-1'
      } ${phase === 'idle' ? '' : 'tx-card-exit'}`}
    >
      {phase === 'success' ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="tx-approve-overlay w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40">
            <Check className="w-12 h-12" strokeWidth={4} />
          </div>
        </div>
      ) : null}
      {phase === 'fail' ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="tx-approve-overlay w-24 h-24 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-500/40">
            <X className="w-12 h-12" strokeWidth={4} />
          </div>
        </div>
      ) : null}

      {showSelect ? (
        <div className="absolute left-6 top-8 z-10">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="w-6 h-6 accent-black rounded-lg border-2 border-gray-200 cursor-pointer transition-all hover:scale-110"
            aria-label="Select transaction"
          />
        </div>
      ) : null}

      <div className={`p-8 sm:p-10 ${showSelect ? 'pl-16 sm:pl-20' : ''}`}>
        {/* Header: Badges & Amount */}
        <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${deptBadge}`}>
              {tx.dept === 'rehab' ? 'Rehab Center' : tx.dept === 'spims' ? 'SPIMS Academy' : 'Job Center'}
            </span>
            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${typeBadge}`}>{typ}</span>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{fmtPKR(tx.amount)}</div>
            <span className={`inline-flex px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border mt-3 shadow-sm ${statusUi}`}>
              {statusLabel(st)}
            </span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Entity Block */}
          <section className="rounded-[2rem] bg-gray-50/50 border border-gray-100 p-8 group/entity">
            <div className="flex items-start justify-between">
              <div className="flex gap-6 items-center">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl border border-gray-50 transition-transform group-hover/entity:scale-110 group-hover/entity:rotate-2">
                  <span className="text-2xl" aria-hidden>👤</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1 italic">Authorized Entity</p>
                  <p className="text-2xl font-black text-gray-900 uppercase tracking-tight">{name}</p>
                  {tx.dept === 'spims' && (enrich?.course || enrich?.session) && (
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                      {enrich?.course} • {enrich?.session}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {phref ? (
              <Link href={phref} className="inline-flex items-center justify-center w-full mt-8 h-14 rounded-2xl bg-white text-gray-900 border border-gray-100 hover:border-black hover:shadow-xl hover:-translate-y-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95">
                Audit Master Profile →
              </Link>
            ) : null}
          </section>

          {/* Payment Detail Matrix */}
          <section className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-[2rem] bg-white border border-gray-100 p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Submission Node</p>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900 uppercase">{tx.cashierName || tx.cashierId || '—'}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{tx.cashierRole || 'System Agent'}</p>
              </div>
            </div>
            <div className="rounded-[2rem] bg-white border border-gray-100 p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Temporal Stamp</p>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900 uppercase">{fmtDate(tx.createdAt || tx.date || tx.transactionDate)}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{fmtTime(tx.createdAt || tx.date)}</p>
              </div>
            </div>
          </section>

          {/* Progress Ledger if applicable */}
          {pkg != null && (
            <section className="rounded-[2rem] bg-indigo-600 p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group/progress">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/progress:scale-110 transition-transform">
                <TrendingUp size={80} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-4 italic">Ledger Synchronization</p>
                <div className="flex justify-between items-baseline mb-3">
                  <div className="text-3xl font-black tracking-tighter">{fmtPKR(runningPaid || 0)}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60">of {fmtPKR(pkg)}</div>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-4">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((runningPaid || 0) / pkg) * 100)}%` }} />
                </div>
                {remAfter != null && (
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Residual Balance: <span className="text-emerald-300">{fmtPKR(remAfter)}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Note Section */}
          {tx.description && (
            <section className="rounded-2xl border-l-4 border-indigo-600 bg-indigo-50/50 p-6 italic">
              <p className="text-xs font-bold text-indigo-900 leading-relaxed">&quot;{tx.description}&quot;</p>
            </section>
          )}

          {/* Proof / Evidence */}
          <div>
            {tx.proofUrl ? (
              <button
                type="button"
                onClick={() => setShowProof(true)}
                className="w-full rounded-[2.5rem] bg-gray-900 p-10 flex items-center gap-8 hover:scale-[1.02] hover:shadow-2xl transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tx.proofUrl} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-white/10 shadow-2xl group-hover:rotate-3 transition-transform" />
                <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2 italic">Secured Evidence ✓</div>
                  <div className="text-xl font-black text-white uppercase tracking-tight">Expand Credential</div>
                </div>
              </button>
            ) : (
              <div className="rounded-[2.5rem] border border-rose-100 bg-rose-50/30 p-10 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ImageIcon size={80} className="text-rose-600" />
                </div>
                <div className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] italic mb-2">⚠ Evidence Gap Detected</div>
                <p className="text-xs font-bold text-rose-800 uppercase tracking-widest">{tx.proofMissingReason || 'No digital proof attached to this node.'}</p>
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={copyId}
            className="w-full text-center text-[10px] text-gray-400 hover:text-black font-mono transition-colors"
          >
            HASHID: {tx.id} {copied ? <span className="text-emerald-600 font-bold ml-2">COPIED</span> : <Copy className="inline w-3 h-3 ml-2 opacity-30" />}
          </button>
        </div>

        {showActions && isPending && (onApprove || onReject) ? (
          <div className="mt-12 space-y-4">
            <button
              type="button"
              onClick={() => onApprove?.(tx)}
              disabled={isDisabled}
              className="w-full h-20 rounded-[2rem] bg-indigo-600 text-white font-black text-[12px] uppercase tracking-[0.4em] hover:scale-105 hover:shadow-2xl hover:shadow-indigo-600/30 transition-all disabled:opacity-40 inline-flex items-center justify-center gap-4 active:scale-95"
            >
              {isBusy ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" strokeWidth={3} />}
              Authorize Flow
            </button>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => onRemove?.(tx)}
                disabled={isDisabled}
                className="h-14 rounded-2xl bg-rose-50 text-rose-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all disabled:opacity-40 inline-flex items-center justify-center gap-3 active:scale-95 border border-rose-100"
              >
                <Minus size={16} strokeWidth={3} />
                Remove
              </button>
              <button
                type="button"
                onClick={() => onReject?.(tx)}
                disabled={isDisabled}
                className="h-14 rounded-2xl bg-gray-50 text-gray-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all disabled:opacity-40 inline-flex items-center justify-center gap-3 active:scale-95 border border-gray-100"
              >
                <XCircle className="w-5 h-5" strokeWidth={3} />
                Reject
              </button>
            </div>
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
  const [searchHits, setSearchHits] = useState<Array<{ id: string; name: string; dept: 'rehab' | 'spims' | 'job-center' }>>([]);
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
    const need = new Map<string, { dept: DeptFilter; id: string }>();
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
        if (enriched[k]) continue;
        try {
          let coll = '';
          if (v.dept === 'rehab') coll = 'rehab_patients';
          else if (v.dept === 'spims') coll = 'spims_students';
          else if (v.dept === 'job-center') coll = 'job_center_seekers';
          else if (v.dept === 'hospital') coll = 'hospital_patients';
          else if (v.dept === 'sukoon-center') coll = 'sukoon_clients';
          else if (v.dept === 'welfare') coll = 'welfare_donors';
          
          if (!coll) continue;
          
          const ref = doc(db, coll, v.id);
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
    if (selectedEntity) {
      const label = selectedEntity.dept === 'spims' ? 'Student' : selectedEntity.dept === 'rehab' ? 'Patient' : 'Seeker';
      chips.push({ key: 'entity', label: `${label}: ${selectedEntity.name}` });
    }
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

  const handleApprove = async (tx: UnifiedTx) => {
    setBusyId(tx.id);
    const res = await decideTransaction({ dept: tx.dept as Dept, txId: tx.id, decision: 'approved' });
    setBusyId(null);
    if (res.success) {
      setCardPhase({ ...cardPhase, [tx.id]: 'success' });
      addToast(`Node authorized: ${fmtPKR(tx.amount)}`, 'green');
      setTimeout(() => setDismissed((prev) => new Set([...prev, tx.id])), 800);
    } else {
      setCardPhase({ ...cardPhase, [tx.id]: 'fail' });
      addToast(res.error || 'Authorization failed', 'red');
      setTimeout(() => setCardPhase((prev) => {
        const next = { ...prev };
        delete next[tx.id];
        return next;
      }), 2000);
    }
  };

  const handleRemove = async (tx: UnifiedTx) => {
    if (busyId) return;
    setBusyId(tx.id);
    const res = await decideTransaction({ 
      dept: tx.dept as Dept, 
      txId: tx.id, 
      decision: 'rejected', 
      rejectReason: 'Removed by Superadmin (Quick Action)' 
    });
    setBusyId(null);
    if (res.success) {
      setCardPhase({ ...cardPhase, [tx.id]: 'fail' });
      addToast(`Transaction Removed`, 'green');
      setTimeout(() => setDismissed((prev) => new Set([...prev, tx.id])), 800);
    } else {
      addToast(res.error || 'Removal failed', 'red');
    }
  };

  const runReject = async (tx: UnifiedTx, reason: string) => {
    setRejectBusy(true);
    try {
      const dept = tx.dept;
      const res = await decideTransaction({ dept: dept as Dept, txId: tx.id, decision: 'rejected', rejectReason: reason });
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
      const jobcenterIds = ids.filter((id) => txMap.get(id)?.dept === 'job-center');
      const results = await Promise.all([
        rehabIds.length ? bulkDecideTransactions({ dept: 'rehab', txIds: rehabIds, decision: 'approved' }) : Promise.resolve({ success: true, processed: 0, error: undefined }),
        spimsIds.length ? bulkDecideTransactions({ dept: 'spims', txIds: spimsIds, decision: 'approved' }) : Promise.resolve({ success: true, processed: 0, error: undefined }),
        jobcenterIds.length ? bulkDecideTransactions({ dept: 'job-center', txIds: jobcenterIds, decision: 'approved' }) : Promise.resolve({ success: true, processed: 0, error: undefined }),
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
        <Loader2 className="w-8 h-8 animate-spin text-[#6B7280] dark:text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] overflow-x-hidden w-full max-w-full pb-36 text-gray-900 transition-colors duration-300">
      <DesignTokensStyle />

      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-6 space-y-5">
        {/* 1 Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-gray-200 border border-gray-100 group overflow-hidden relative transition-all duration-700 hover:scale-105 hover:rotate-3">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <BadgeCheck className="text-indigo-600 relative z-10" size={36} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight text-gray-900 uppercase leading-none flex items-center gap-4">
                Approvals
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[3rem] h-12 px-4 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-xl shadow-indigo-600/30">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </h1>
              <p className="mt-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">
                Governance Matrix • Authorization Node
              </p>
            </div>
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
                  className={`w-full py-4 px-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border flex flex-col items-center gap-0.5 ${
                    isActive
                      ? 'bg-gray-900 text-white border-gray-900 shadow-xl'
                      : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <span>{t.label}</span>
                  {currentOption && currentOption.value !== 'all' && (
                    <span className={`text-[9px] font-semibold normal-case tracking-normal ${
                      isActive ? 'text-white/80 dark:text-gray-900/70' : 'text-[#6B7280] dark:text-black'
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
                    <div className="absolute top-full left-0 right-0 mt-1 z-[51] bg-white dark:bg-[#1a1a1a] border border-[#D1D5DB] dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
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
                              ? 'bg-[#111827] dark:bg-white text-white dark:text-gray-900'
                              : 'text-[#111827] dark:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-b border-gray-100 last:border-0'
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
            <div className="rounded-3xl border border-[#D1D5DB] dark:border-white/10 bg-white dark:bg-[#111111] shadow-md p-5 max-w-[680px] mx-auto w-full">
              <p className="text-xs font-black uppercase tracking-widest text-[#6B7280] dark:text-black">Entity</p>
              <p className="text-xl font-black text-[#111827] dark:text-white mt-1">{selectedEntity.name}</p>
              {selectedEntity.dept === 'spims' && (entitySummary?.course || entitySummary?.session) ? (
                <p className="text-sm text-[#4B5563] dark:text-black mt-1">
                  {entitySummary?.course} · {entitySummary?.session}
                </p>
              ) : null}
              {entitySummary?.totalPackage != null ? (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold text-[#6B7280] dark:text-black uppercase tracking-wide mb-1">
                    <span>Package progress</span>
                    <span>
                      {fmtPKR(entitySummary.totalReceived || 0)} / {fmtPKR(entitySummary.totalPackage)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#F3F4F6] dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((entitySummary.totalReceived || 0) / Math.max(1, entitySummary.totalPackage)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-gray-100 mt-2">
                    Remaining balance: {fmtPKR(entitySummary.remaining ?? 0)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#6B7280] dark:text-black mt-2">Loading package info…</p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111111] overflow-x-auto shadow-sm">
              {entityLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-black dark:text-black" />
                </div>
              ) : (
                <div className="table-responsive">

                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-[#F3F4F6] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#6B7280] dark:text-black font-black">
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
                                onClick={() => handleApprove(tx)}
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
            <div className="lg:sticky lg:top-0 lg:z-10 mb-8">
              <div className="rounded-[2.5rem] bg-white shadow-2xl shadow-gray-200/60 border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between px-6 py-4 text-[10px] font-black text-gray-900 bg-gray-50 uppercase tracking-widest"
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Department</p>
                      <PillGroup
                        options={['all', 'rehab', 'spims', 'job-center'] as const}
                        value={filters.dept === 'hq' ? 'all' : filters.dept}
                        onChange={(v) => setFilters((f) => ({ ...f, dept: v }))}
                        labelMap={{ all: 'All', rehab: 'Rehab', spims: 'SPIMS', 'job-center': 'Job Center' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Date range</p>
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
                            className="flex-1 min-w-[140px] rounded-xl border border-[#D1D5DB] dark:border-gray-700 px-3 py-2 text-xs bg-white dark:bg-gray-900 dark:text-gray-100"
                          />
                          <input
                            type="date"
                            value={filters.customTo ?? ''}
                            onChange={(e) => setFilters((f) => ({ ...f, customTo: e.target.value }))}
                            className="flex-1 min-w-[140px] rounded-xl border border-[#D1D5DB] dark:border-gray-700 px-3 py-2 text-xs bg-white dark:bg-gray-900 dark:text-gray-100"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Sort by</p>
                      <select
                        value={filters.sort}
                        onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ApprovalsFilters['sort'] }))}
                        className="w-full rounded-xl border border-[#D1D5DB] dark:border-gray-700 px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-[#111827] dark:text-gray-100 font-bold"
                      >
                        <option value="all">All</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Amount range</p>
                      <select
                        value={filters.amountBucket}
                        onChange={(e) => setFilters((f) => ({ ...f, amountBucket: e.target.value as ApprovalsFilters['amountBucket'] }))}
                        className="w-full rounded-xl border border-[#D1D5DB] dark:border-gray-700 px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-[#111827] dark:text-gray-100 font-bold"
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Entity search</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-black" />
                        <input
                          value={searchDraft}
                          onChange={(e) => {
                            setSearchDraft(e.target.value);
                            setSearchOpen(true);
                          }}
                          onFocus={() => setSearchOpen(true)}
                          placeholder="Search patient / student / seeker name..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-gray-700 text-sm outline-none focus:border-purple-400 dark:bg-gray-900 text-[#111827] dark:text-gray-100 font-bold"
                        />
                      </div>
                      {searchOpen && searchHits.length > 0 ? (
                        <ul className="absolute z-50 mt-1 w-full rounded-2xl border border-[#D1D5DB] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl max-h-56 overflow-y-auto">
                          {searchHits.map((h) => (
                            <li key={`${h.dept}_${h.id}`}>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-white dark:hover:bg-gray-700 flex justify-between gap-2"
                                onClick={() => {
                                  setSelectedEntity({ id: h.id, dept: h.dept, name: h.name });
                                  setSearchDraft(h.name);
                                  setSearchOpen(false);
                                }}
                              >
                                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{h.name}</span>
                                <span className="text-[10px] font-black uppercase text-black dark:text-black shrink-0">{h.dept}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Proof</p>
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Cashier name</p>
                        <select
                          value={filters.cashierName}
                          onChange={(e) => setFilters((f) => ({ ...f, cashierName: e.target.value }))}
                          className="w-full rounded-xl border border-[#D1D5DB] dark:border-gray-700 px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-[#111827] dark:text-gray-100 font-bold"
                        >
                          {cashierNames.map((n) => (
                            <option key={n} value={n}>
                              {n === 'all' ? 'All cashiers' : n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] dark:text-black mb-2">Transaction type</p>
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
                                    ? 'bg-[#111827] text-white border-[#111827] dark:bg-gray-100 dark:text-[#111827]'
                                    : 'bg-white dark:bg-[#111111] text-[#4B5563] dark:text-black border-[#D1D5DB] dark:bg-gray-800 dark:text-black dark:border-gray-700 hover:border-gray-400'
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

                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[10px] font-black text-rose-600 hover:text-rose-800 uppercase tracking-widest underline underline-offset-4"
                    >
                      Reset All Filters
                    </button>
                </div>
              </div>
            </div>

            {/* 4 Summary */}
            {!loading && !error ? (
              <div className="rounded-3xl bg-indigo-600 text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex flex-wrap gap-x-6 gap-y-2 items-center shadow-xl shadow-indigo-600/20">
                <span>
                  {filteredRows.length > visibleRows.length
                    ? `Displaying ${visibleRows.length} / ${filteredRows.length} nodes`
                    : `Active Nodes: ${filteredRows.length}`}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/30 hidden sm:block" />
                <span>Aggregated: {fmtPKR(totalAmount)}</span>
                {missingProof > 0 && (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 hidden sm:block" />
                    <span className="text-rose-200">⚠ {missingProof} Evidence Gaps</span>
                  </>
                )}
              </div>
            ) : null}

            {/* Bulk select row */}
            {isSelectableTab && !loading && filteredRows.length > 0 ? (
              <div className="flex items-center justify-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#4B5563] dark:text-gray-200">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-[#111827]" />
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
                      onApprove={canActOnTx ? handleApprove : undefined}
                      onReject={canActOnTx ? (t) => setRejectTx(t) : undefined}
                      onRemove={canActOnTx ? handleRemove : undefined}
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
                  className="h-12 px-8 rounded-2xl border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111111] text-sm font-black text-black dark:text-gray-100 hover:bg-white dark:bg-white/5"
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
              <div className="text-sm font-black text-[#111827] dark:text-white">
                {selected.size} selected · Total: {fmtPKR(selectedTotal)}
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="h-12 px-5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-black text-black dark:text-gray-200 hover:bg-white dark:bg-white/5"
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
        <div key={i} className="rounded-3xl border border-[#D1D5DB] dark:border-white/10 bg-white dark:bg-[#111111] p-5 animate-pulse">
          <div className="flex justify-between mb-4">
            <div className="h-5 w-24 rounded-full bg-[#F3F4F6] dark:bg-white/10" />
            <div className="h-8 w-28 rounded-xl bg-[#F3F4F6] dark:bg-white/10" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-2/3 rounded-lg bg-[#F3F4F6] dark:bg-white/10" />
            <div className="h-4 w-1/2 rounded-lg bg-[#F3F4F6] dark:bg-white/10" />
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
      <div className="text-lg font-black text-[#111827] dark:text-white">{isPending ? 'No pending approvals' : 'No transactions found'}</div>
      <div className="text-sm text-[#6B7280] dark:text-black mt-2 font-medium">
        {isPending ? 'All caught up — nothing is waiting for you.' : 'Try adjusting filters or date range.'}
      </div>
    </div>
  );
}
