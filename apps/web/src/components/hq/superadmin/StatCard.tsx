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
      ? 'from-emerald-500/10 dark:from-emerald-500/20 to-transparent border-emerald-500/20 dark:border-emerald-500/30'
      : tone === 'spims'
        ? 'from-blue-500/10 dark:from-blue-500/20 to-transparent border-blue-500/20 dark:border-blue-500/30'
        : tone === 'hq'
          ? 'from-purple-500/10 dark:from-purple-500/20 to-transparent border-purple-500/20 dark:border-purple-500/30'
    : tone === 'primary'
      ? 'from-gray-500/5 dark:from-white/5 to-transparent border-gray-200 dark:border-white/10'
    : tone === 'warning'
      ? 'from-amber-500/10 dark:from-amber-500/20 to-transparent border-amber-500/20 dark:border-amber-500/30'
    : tone === 'danger'
      ? 'from-red-500/10 dark:from-red-500/20 to-transparent border-red-500/20 dark:border-red-500/30'
          : 'from-gray-100 dark:from-white/5 to-transparent border-gray-200 dark:border-white/10';

  const badgeStyles = (bTone: string | undefined) => {
    switch (bTone) {
      case 'danger':
        return 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300';
    }
  };

  const displayValue =
    loading ? '—'
    : format === 'pkr' ? `PKR ${Number(value || 0).toLocaleString('en-PK')}`
    : String(value ?? '');

  const Card = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{title}</div>
        <div className="mt-2 text-3xl font-black text-black dark:text-white break-words tracking-tight">{displayValue}</div>
        {trend && (
          <div className={`mt-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend.isUp ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
        {subtitle ? <div className="mt-1 text-sm font-bold text-gray-600 dark:text-gray-400">{subtitle}</div> : null}
      </div>
      {Icon ? (
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="w-11 h-11 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
          {badge ? (
            <div className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-transparent ${badgeStyles(badge.tone)}`}>
              {badge.label}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const className = `block rounded-[2rem] border bg-gradient-to-br ${toneStyles} bg-white dark:bg-black p-6 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300`;

  return href ? (
    <Link href={href} className={className}>
      {Card}
    </Link>
  ) : (
    <div className={className}>{Card}</div>
  );
}

