// apps/web/src/components/hq/superadmin/FilterDrawer.tsx
'use client';

import React from 'react';
import { Filter, X } from 'lucide-react';

export function FilterDrawer({
  title = 'Filters',
  open,
  onOpenChange,
  children,
  right,
}: {
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-300">{title}</div>
            {right}
          </div>
          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </div>

      {/* Mobile trigger */}
      <div className="lg:hidden flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="h-11 px-4 rounded-2xl bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 text-gray-800 dark:text-gray-100 font-black text-xs uppercase tracking-widest inline-flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
        {right}
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-[2rem] bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-white/10 p-5 overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-gray-900 dark:text-white">{title}</div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-200" />
              </button>
            </div>
            <div className="mt-4 space-y-4">{children}</div>
            <div className="h-3" />
          </div>
        </div>
      ) : null}
    </>
  );
}

