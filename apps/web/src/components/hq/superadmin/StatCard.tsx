// apps/web/src/components/hq/superadmin/StatCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

export function StatCard({
  title,
  value,
  subtitle,
  href,
  icon: Icon,
  badge,
  trend,
  tone = 'neutral',
  format,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  icon?: LucideIcon;
  badge?: { label: string; tone?: 'danger' | 'warning' | 'info' | 'success' };
  trend?: { value: number; isUp: boolean };
  tone?: 'neutral' | 'rehab' | 'spims' | 'hq' | 'primary' | 'warning' | 'danger';
  format?: 'pkr';
  loading?: boolean;
}) {
  const toneStyles =
    tone === 'rehab'
      ? 'from-green-500/10 to-green-500/0 border-green-200/60 dark:border-green-500/20'
      : tone === 'spims'
        ? 'from-blue-500/10 to-blue-500/0 border-blue-200/60 dark:border-blue-500/20'
        : tone === 'hq'
          ? 'from-purple-500/10 to-purple-500/0 border-purple-200/60 dark:border-purple-500/20'
    : tone === 'primary'
      ? 'from-gray-900/10 to-gray-900/0 border-gray-300/70 dark:border-white/15'
    : tone === 'warning'
      ? 'from-amber-500/10 to-amber-500/0 border-amber-200/70 dark:border-amber-500/20'
    : tone === 'danger'
      ? 'from-red-500/10 to-red-500/0 border-red-200/70 dark:border-red-500/20'
          : 'from-gray-900/5 to-gray-900/0 border-gray-200/70 dark:border-white/10';

  const badgeStyles = (bTone: string | undefined) => {
    switch (bTone) {
      case 'danger':
        return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200';
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200';
    }
  };

  const displayValue =
    loading ? '—'
    : format === 'pkr' ? `PKR ${Number(value || 0).toLocaleString('en-PK')}`
    : String(value ?? '');

  const Card = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-300">{title}</div>
        <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white break-words">{displayValue}</div>
        {trend && (
          <div className={`mt-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
        {subtitle ? <div className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-300">{subtitle}</div> : null}
      </div>
      {Icon ? (
        <div className="shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-white/70 dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-700 dark:text-gray-100" />
          </div>
          {badge ? (
            <div className={`mt-2 inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeStyles(badge.tone)}`}>
              {badge.label}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const className = `block rounded-3xl border bg-gradient-to-br ${toneStyles} bg-white dark:bg-gray-950 p-5 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all`;

  return href ? (
    <Link href={href} className={className}>
      {Card}
    </Link>
  ) : (
    <div className={className}>{Card}</div>
  );
}

