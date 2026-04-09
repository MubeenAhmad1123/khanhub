// apps/web/src/components/hq/superadmin/EntitySearch.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export type EntityResult = {
  id: string;
  label: string;
  sublabel?: string;
  kind: 'patient' | 'student' | 'staff';
};

export function EntitySearch({
  placeholder = 'Search patient / student / staff…',
  results,
  onSelect,
  disabled,
}: {
  placeholder?: string;
  results: EntityResult[];
  onSelect: (r: EntityResult) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return results.slice(0, 12);
    return results
      .filter((r) => `${r.label} ${r.sublabel || ''}`.toLowerCase().includes(s))
      .slice(0, 12);
  }, [q, results]);

  return (
    <div className="relative">
      <div className="h-11 rounded-2xl bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 px-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={q}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-sm font-semibold text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
        />
      </div>
      {open && filtered.length ? (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950 shadow-xl overflow-hidden">
          {filtered.map((r) => (
            <button
              key={`${r.kind}_${r.id}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(r);
                setQ('');
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black text-gray-900 dark:text-white truncate">{r.label}</div>
                  {r.sublabel ? (
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-300 truncate">{r.sublabel}</div>
                  ) : null}
                </div>
                <div className="shrink-0 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {r.kind}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

