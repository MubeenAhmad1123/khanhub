// apps/web/src/components/hq/superadmin/CsvExportButton.tsx
'use client';

import React from 'react';
import { Download } from 'lucide-react';

function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Quote if needed
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const lines = [
    headers.map(toCsvValue).join(','),
    ...rows.map((r) => headers.map((h) => toCsvValue(r[h])).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CsvExportButton({
  filename,
  rows,
  disabled,
}: {
  filename: string;
  rows: Record<string, unknown>[];
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
      className="h-11 px-4 rounded-2xl bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 text-gray-800 dark:text-gray-100 font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  );
}

