// apps/web/src/components/hq/superadmin/TxCard.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';

export type TxDepartment = 'rehab' | 'spims' | 'hq';
export type TxStatus = 'pending' | 'approved' | 'rejected' | 'pending_cashier' | 'rejected_cashier';

export type SuperadminTxCard = {
  id: string;
  dept: TxDepartment;
  entityName: string;
  entityHref?: string;
  amount: number;
  typeLabel: string;
  submittedAtLabel: string;
  submittedByLabel: string;
  note?: string;
  status: TxStatus;
  proofUrl?: string | null;
  hasProof: boolean;
};

function deptBadge(dept: TxDepartment) {
  if (dept === 'rehab') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20';
  if (dept === 'spims') return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20';
  return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-100 dark:border-purple-500/20';
}

function statusBadge(status: TxStatus) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20';
  if (status === 'rejected' || status === 'rejected_cashier') return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20';
}

export function TxCard({
  tx,
  checked,
  onCheckedChange,
  onApprove,
  onReject,
  disableActions,
}: {
  tx: SuperadminTxCard;
  checked?: boolean;
  onCheckedChange?: (next: boolean) => void;
  onApprove?: () => void;
  onReject?: () => void;
  disableActions?: boolean;
}) {
  const [showProof, setShowProof] = useState(false);

  return (
    <div className="rounded-[2.5rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {onCheckedChange ? (
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="mt-1.5 w-5 h-5 accent-black dark:accent-white"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${deptBadge(tx.dept)}`}>
              {tx.dept}
            </div>
            <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusBadge(tx.status)}`}>
              {tx.status.replace(/_/g, ' ')}
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {tx.entityHref ? (
                <Link href={tx.entityHref} className="text-xl font-black text-black dark:text-white hover:underline block truncate tracking-tight">
                  {tx.entityName}
                </Link>
              ) : (
                <div className="text-xl font-black text-black dark:text-white truncate tracking-tight">{tx.entityName}</div>
              )}
              <div className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">{tx.typeLabel}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl font-black text-black dark:text-white tracking-tighter">
                PKR {Number(tx.amount || 0).toLocaleString('en-PK')}
              </div>
              <div className="mt-1 text-[11px] font-bold text-gray-400">{tx.submittedAtLabel}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Submitted by</div>
              <div className="mt-1 text-sm font-black text-gray-800 dark:text-gray-100 break-words">{tx.submittedByLabel}</div>
            </div>
            <button
              type="button"
              onClick={() => tx.hasProof && tx.proofUrl ? setShowProof(true) : undefined}
              className={`rounded-2xl border p-3 text-left transition ${
                tx.hasProof && tx.proofUrl
                  ? 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
                  : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 opacity-70 cursor-not-allowed'
              }`}
              disabled={!tx.hasProof || !tx.proofUrl}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Proof</div>
                  <div className="mt-1 text-sm font-black text-gray-800 dark:text-gray-100">
                    {tx.hasProof ? 'Tap to view' : 'Missing'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-200" />
                </div>
              </div>
            </button>
          </div>

          {tx.note ? (
            <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Note from cashier</div>
              <div className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200 break-words">{tx.note}</div>
            </div>
          ) : null}

          {(onApprove || onReject) ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onReject}
                disabled={disableActions}
                className="h-12 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={disableActions}
                className="h-12 rounded-2xl bg-green-600 text-white font-black text-xs uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Approve
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showProof && tx.proofUrl ? (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowProof(false)} />
          <div className="absolute inset-4 sm:inset-10 bg-white dark:bg-black rounded-3xl overflow-hidden border border-gray-100 dark:border-white/10">
            <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div className="text-sm font-black text-black dark:text-white">Proof</div>
              <button
                type="button"
                onClick={() => setShowProof(false)}
                className="h-10 px-4 rounded-2xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest"
              >
                Close
              </button>
            </div>
            <div className="p-4 h-[calc(100%-72px)] overflow-auto flex items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tx.proofUrl} alt="Proof" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

