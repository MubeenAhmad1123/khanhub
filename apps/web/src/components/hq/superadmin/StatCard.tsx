// apps/web/src/components/hq/superadmin/StatCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onClick,
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
  onClick?: () => void;
}) {
  const toneStyles = {
    rehab: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/5',
      border: 'border-emerald-100 dark:border-emerald-500/10',
      iconBg: 'bg-emerald-500 text-white shadow-emerald-500/20',
      gradient: 'from-emerald-500/10 to-transparent',
      text: 'text-emerald-700 dark:text-emerald-400'
    },
    spims: {
      bg: 'bg-sky-50 dark:bg-sky-500/5',
      border: 'border-sky-100 dark:border-sky-500/10',
      iconBg: 'bg-sky-500 text-white shadow-sky-500/20',
      gradient: 'from-sky-500/10 to-transparent',
      text: 'text-sky-700 dark:text-sky-400'
    },
    hq: {
      bg: 'bg-purple-50 dark:bg-purple-500/5',
      border: 'border-purple-100 dark:border-purple-500/10',
      iconBg: 'bg-purple-500 text-white shadow-purple-500/20',
      gradient: 'from-purple-500/10 to-transparent',
      text: 'text-purple-700 dark:text-purple-400'
    },
    primary: {
      bg: 'bg-gray-50 dark:bg-white/5',
      border: 'border-gray-200 dark:border-white/10',
      iconBg: 'bg-black dark:bg-white dark:text-black text-white shadow-black/20',
      gradient: 'from-gray-500/10 to-transparent',
      text: 'text-gray-900 dark:text-white'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/5',
      border: 'border-amber-100 dark:border-amber-500/10',
      iconBg: 'bg-amber-500 text-white shadow-amber-500/20',
      gradient: 'from-amber-500/10 to-transparent',
      text: 'text-amber-700 dark:text-amber-400'
    },
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-500/5',
      border: 'border-rose-100 dark:border-rose-500/10',
      iconBg: 'bg-rose-500 text-white shadow-rose-500/20',
      gradient: 'from-rose-500/10 to-transparent',
      text: 'text-rose-700 dark:text-rose-400'
    },
    neutral: {
      bg: 'bg-gray-50 dark:bg-white/5',
      border: 'border-gray-100 dark:border-white/5',
      iconBg: 'bg-gray-500 text-white shadow-gray-500/20',
      gradient: 'from-gray-500/5 to-transparent',
      text: 'text-gray-600 dark:text-gray-400'
    },
  };

  const style = toneStyles[tone];

  const badgeStyles = (bTone: string | undefined) => {
    switch (bTone) {
      case 'danger':
        return 'bg-red-500 text-white shadow-red-500/20';
      case 'warning':
        return 'bg-amber-500 text-black shadow-amber-500/20';
      case 'success':
        return 'bg-emerald-500 text-white shadow-emerald-500/20';
      default:
        return 'bg-blue-500 text-white shadow-blue-500/20';
    }
  };

  const displayValue =
    loading ? '—'
    : format === 'pkr' ? `₨${Number(value || 0).toLocaleString('en-PK')}`
    : String(value ?? '');

  const CardContent = (
    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
      <div className="flex items-start justify-between">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", style.iconBg)}>
          {Icon && <Icon className="w-7 h-7" />}
        </div>
        {badge ? (
          <div className={cn("inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md", badgeStyles(badge.tone))}>
            {badge.label}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400 mb-2">{title}</div>
        <div className="text-4xl font-black text-black dark:text-white tracking-tighter leading-tight">{displayValue}</div>
        
        {trend && (
          <div className={cn("mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest", trend.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            <div className="flex items-center gap-1 bg-current/10 px-2 py-1 rounded-full">
              {trend.isUp ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
              {Math.abs(trend.value).toFixed(1)}%
            </div>
            <span className="opacity-40 tracking-normal font-bold">vs last period</span>
          </div>
        )}
        
        {subtitle && (
          <div className="mt-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-l-2 border-current/20 pl-3">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );

  const containerClasses = cn(
    "block relative overflow-hidden rounded-[2.5rem] p-8 transition-all duration-500 w-full text-left",
    "border border-white/50 dark:border-white/5 shadow-xl shadow-black/5 hover:shadow-2xl hover:-translate-y-1 group",
    style.bg
  );

  const BackgroundGradient = (
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity", style.gradient)} />
  );

  if (onClick && !href) {
    return (
      <button onClick={onClick} className={containerClasses}>
        {BackgroundGradient}
        {CardContent}
      </button>
    );
  }

  return href ? (
    <Link href={href} className={containerClasses}>
      {BackgroundGradient}
      {CardContent}
    </Link>
  ) : (
    <div className={containerClasses}>
      {BackgroundGradient}
      {CardContent}
    </div>
  );
}
