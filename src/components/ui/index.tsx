'use client';
// src/components/ui/index.tsx
// ─────────────────────────────────────────────
// All reusable UI building blocks.
// Import from here across the entire app.
// ─────────────────────────────────────────────

import Link from 'next/link';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// SECTION HEADER
// Used at the top of every major section.
// ═══════════════════════════════════════════════════════
interface SectionHeaderProps {
  badge?: string;
  title: string;
  titleGradient?: boolean;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  id?: string;
  className?: string;
}

export function SectionHeader({
  badge,
  title,
  titleGradient,
  subtitle,
  align = 'center',
  id,
  className
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-14', align === 'center' && 'text-center', align === 'right' && 'text-right', className)}>
      {badge && (
        <span className="badge-primary inline-flex mb-4 animate-fade-in">
          {badge}
        </span>
      )}
      <h2
        id={id}
        className={cn(
          'font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-tight',
          titleGradient ? 'text-gradient' : 'text-neutral-900'
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-neutral-500 mt-4 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DEPARTMENT CARD - Export from DepartmentCard.tsx
// This is the image-enabled version with full features
// ═══════════════════════════════════════════════════════
export { default as DepartmentCard } from './DepartmentCard';

// ═══════════════════════════════════════════════════════
// STAT CARD
// Displays a single impact statistic.
// ═══════════════════════════════════════════════════════
interface StatCardProps {
  icon: string;
  value: string;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="card-glass text-center p-6 hover:scale-105 transition-transform duration-300">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-display font-bold text-2xl md:text-3xl text-white">{value}</div>
      <div className="text-neutral-500 text-sm mt-1">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PAGE HERO
// Full-width hero banner for inner pages.
// ═══════════════════════════════════════════════════════
interface PageHeroProps {
  badge?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHero({ badge, title, subtitle, children }: PageHeroProps) {
  return (
    <section className="relative min-h-[320px] md:min-h-[380px] flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500 opacity-[0.04] blur-3xl rounded-full animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {badge && <span className="badge-primary inline-flex mb-4 animate-fade-in">{badge}</span>}
        <h1 className="font-display font-bold text-4xl md:text-5xl text-white leading-tight text-gradient animate-fade-up">
          {title}
        </h1>
        {subtitle && (
          <p className="text-neutral-500 mt-4 text-base md:text-lg leading-relaxed max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {subtitle}
          </p>
        )}
        {children && <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>{children}</div>}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// LOADING SPINNER
// ═══════════════════════════════════════════════════════
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-10 h-10 border-4' : 'w-7 h-7 border-3';
  return (
    <div className={cn('rounded-full border-neutral-700 border-t-primary-500 animate-spin', sizeClass)} />
  );
}

// ═══════════════════════════════════════════════════════
// EXPORTS
// Named exports for clean imports
// ═══════════════════════════════════════════════════════
export type {
  SectionHeaderProps,
  StatCardProps,
  PageHeroProps
};