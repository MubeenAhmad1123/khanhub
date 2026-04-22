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
  const toneGradients = {
    rehab: 'from-emerald-400 to-teal-600',
    spims: 'from-sky-400 to-blue-600',
    hq: 'from-purple-400 to-indigo-600',
    primary: 'from-gray-700 to-black',
    warning: 'from-amber-400 to-orange-600',
    danger: 'from-rose-400 to-red-600',
    neutral: 'from-gray-400 to-gray-600',
  };

  const badgeStyles = (bTone: string | undefined) => {
    switch (bTone) {
      case 'danger':
        return 'bg-red-500 text-white border-red-600';
      case 'warning':
        return 'bg-amber-500 text-black border-amber-600';
      case 'success':
        return 'bg-emerald-500 text-white border-emerald-600';
      default:
        return 'bg-blue-500 text-white border-blue-600';
    }
  };

  const displayValue =
    loading ? '—'
    : format === 'pkr' ? `₨${Number(value || 0).toLocaleString('en-PK')}`
    : String(value ?? '');

  const Card = (
    <div className="flex flex-col h-full justify-between gap-4">
      <div className="flex items-start justify-between">
        <div className="w-14 h-14 rounded-2xl bg-black border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          {Icon && <Icon className={`w-7 h-7 text-white`} />}
        </div>
        {badge ? (
          <div className={`inline-flex px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border-2 ${badgeStyles(badge.tone)} shadow-sm`}>
            {badge.label}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 mb-1">{title}</div>
        <div className="text-3xl font-[1000] text-black tracking-tighter leading-none">{displayValue}</div>
        
        {trend && (
          <div className={`mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${trend.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            <div className={`px-2 py-0.5 rounded-md border-2 border-current flex items-center gap-1`}>
              {trend.isUp ? <TrendingUp size={10} strokeWidth={4} /> : <TrendingDown size={10} strokeWidth={4} />}
              {Math.abs(trend.value).toFixed(1)}%
            </div>
            <span className="opacity-40 tracking-normal font-bold lowercase italic">vs last period</span>
          </div>
        )}
        
        {subtitle && (
          <div className="mt-3 text-[10px] font-bold text-black/60 uppercase tracking-widest border-l-2 border-black/10 pl-3">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );

  const className = `block rounded-[2.5rem] border-4 border-black bg-white p-8 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-300 w-full text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group`;

  const Accent = (
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${toneGradients[tone]} opacity-[0.03] group-hover:opacity-10 transition-opacity rounded-bl-full -mr-12 -mt-12`} />
  );

  if (onClick && !href) {
    return (
      <button onClick={onClick} className={className}>
        {Accent}
        {Card}
      </button>
    );
  }

  return href ? (
    <Link href={href} className={className}>
      {Accent}
      {Card}
    </Link>
  ) : (
    <div className={className}>
      {Accent}
      {Card}
    </div>
  );
}

