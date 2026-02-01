'use client';
// src/components/ui/index.tsx
// ─────────────────────────────────────────────
// All reusable UI building blocks.
// Import from here across the entire app.
// ─────────────────────────────────────────────

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Department } from '@/data/departments';

// ═══════════════════════════════════════════════════════
// SECTION HEADER
// Used at the top of every major section.
// ═══════════════════════════════════════════════════════
interface SectionHeaderProps {
  badge?:       string;
  title:        string;
  titleGradient?: boolean;
  subtitle?:    string;
  align?:       'left' | 'center';
}

export function SectionHeader({ badge, title, titleGradient, subtitle, align = 'center' }: SectionHeaderProps) {
  return (
    <div className={cn('mb-14', align === 'center' && 'text-center')}>
      {badge && (
        <span className="badge-primary inline-flex mb-4">
          {badge}
        </span>
      )}
      <h2 className={cn(
        'font-display font-bold text-3xl md:text-4xl lg:text-5xl text-white leading-tight',
        titleGradient && 'text-gradient'
      )}>
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
// DEPARTMENT CARD
// Used on /departments listing and home page.
// ═══════════════════════════════════════════════════════
interface DepartmentCardProps {
  department: Department;
  compact?:   boolean;
}

export function DepartmentCard({ department, compact }: DepartmentCardProps) {
  return (
    <Link
      href={`/departments/${department.slug}`}
      className="card group block"
    >
      {/* Icon + Category badge row */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
          {department.icon}
        </div>
        <span className="text-xs text-neutral-600 uppercase tracking-wider font-semibold">
          {department.category}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-display font-semibold text-white text-base group-hover:text-primary-400 transition-colors">
        {department.name}
      </h3>

      {/* Tagline */}
      {!compact && (
        <p className="text-neutral-500 text-sm mt-1.5 leading-relaxed">
          {department.tagline}
        </p>
      )}

      {/* Arrow */}
      <div className="mt-4 flex items-center gap-1.5 text-primary-500 text-xs font-semibold group-hover:gap-2.5 transition-all">
        Learn More
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════
// STAT CARD
// Displays a single impact statistic.
// ═══════════════════════════════════════════════════════
interface StatCardProps {
  icon:  string;
  value: string;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="card-glass text-center p-6">
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
  badge?:       string;
  title:        string;
  subtitle?:    string;
  children?:    React.ReactNode;
}

export function PageHero({ badge, title, subtitle, children }: PageHeroProps) {
  return (
    <section className="relative min-h-[320px] md:min-h-[380px] flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500 opacity-[0.04] blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {badge && <span className="badge-primary inline-flex mb-4">{badge}</span>}
        <h1 className="font-display font-bold text-4xl md:text-5xl text-white leading-tight text-gradient">
          {title}
        </h1>
        {subtitle && (
          <p className="text-neutral-500 mt-4 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
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
