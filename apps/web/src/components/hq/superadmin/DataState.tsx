// apps/web/src/components/hq/superadmin/DataState.tsx
'use client';

import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/10 animate-pulse"
        />
      ))}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-red-100 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-red-800 dark:text-red-200">{title}</div>
          {message ? <div className="mt-1 text-sm font-semibold text-red-700/80 dark:text-red-200/80 break-words">{message}</div> : null}
          {onRetry ? (
            <button
              onClick={onRetry}
              className="mt-4 h-11 px-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 active:scale-[0.99] transition"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here',
  message = 'No results match your filters.',
  actionLabel,
  onAction,
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/10 flex items-center justify-center">
        <Inbox className="w-6 h-6 text-gray-400" />
      </div>
      <div className="mt-4 text-base font-black text-gray-900 dark:text-white">{title}</div>
      <div className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-300">{message}</div>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-6 h-11 px-5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.99] transition"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function InlineLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-sm font-semibold">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

