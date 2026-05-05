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
      bg: 'bg-white',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
      gradient: 'from-emerald-500/5 to-transparent',
      text: 'text-emerald-600'
    },
    spims: {
      bg: 'bg-white',
      border: 'border-sky-100',
      iconBg: 'bg-sky-500 text-white shadow-lg shadow-sky-500/30',
      gradient: 'from-sky-500/5 to-transparent',
      text: 'text-sky-600'
    },
    hq: {
      bg: 'bg-white',
      border: 'border-purple-100',
      iconBg: 'bg-purple-500 text-white shadow-lg shadow-purple-500/30',
      gradient: 'from-purple-500/5 to-transparent',
      text: 'text-purple-600'
    },
    primary: {
      bg: 'bg-white',
      border: 'border-gray-200',
      iconBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
      gradient: 'from-indigo-500/5 to-transparent',
      text: 'text-indigo-600'
    },
    warning: {
      bg: 'bg-white',
      border: 'border-amber-100',
      iconBg: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
      gradient: 'from-amber-500/5 to-transparent',
      text: 'text-amber-600'
    },
    danger: {
      bg: 'bg-white',
      border: 'border-rose-100',
      iconBg: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30',
      gradient: 'from-rose-500/5 to-transparent',
      text: 'text-rose-600'
    },
    neutral: {
      bg: 'bg-white',
      border: 'border-gray-100',
      iconBg: 'bg-slate-600 text-white shadow-lg shadow-slate-600/30',
      gradient: 'from-slate-500/5 to-transparent',
      text: 'text-slate-600'
    },
  };

  const style = toneStyles[tone];

  const badgeStyles = (bTone: string | undefined) => {
    switch (bTone) {
      case 'danger':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      case 'warning':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'success':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      default:
        return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
  };

  const displayValue =
    loading ? '—'
    : format === 'pkr' ? `₨${Number(value || 0).toLocaleString('en-PK')}`
    : String(value ?? '');

  const CardContent = (
    <div className="relative z-10 flex flex-col h-full justify-between gap-4 sm:gap-8">
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", style.iconBg)}>
          {Icon && <Icon className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={2.5} />}
        </div>
        {badge ? (
          <div className={cn("inline-flex px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[7px] sm:text-[9px] font-black uppercase tracking-widest transition-all", badgeStyles(badge.tone))}>
            {badge.label}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest sm:tracking-[0.3em] text-gray-400 mb-1 sm:mb-2 group-hover:text-current transition-colors truncate" title={title}>{title}</div>
        <div className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter leading-none sm:leading-tight truncate" title={displayValue}>{displayValue}</div>
        
        {trend && (
          <div className={cn("mt-2 sm:mt-4 flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest", trend.isUp ? 'text-emerald-600' : 'text-rose-600')}>
            <div className="flex items-center gap-1 bg-current/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl whitespace-nowrap">
              {trend.isUp ? <TrendingUp size={10} strokeWidth={3} className="sm:w-3 sm:h-3" /> : <TrendingDown size={10} strokeWidth={3} className="sm:w-3 sm:h-3" />}
              {Math.abs(trend.value).toFixed(1)}%
            </div>
            <span className="opacity-40 tracking-normal font-bold hidden sm:inline">Growth</span>
          </div>
        )}
        
        {subtitle && (
          <div className="mt-2 sm:mt-5 text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 truncate" title={subtitle}>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current opacity-20 shrink-0" />
            <span className="truncate">{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );

  const containerClasses = cn(
    "block relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 transition-all duration-700 w-full text-left",
    "border bg-white shadow-xl sm:shadow-2xl shadow-gray-200/50 hover:shadow-gray-300/60 hover:-translate-y-2 group flex flex-col",
    style.border
  );

  const BackgroundGradient = (
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", style.gradient)} />
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
