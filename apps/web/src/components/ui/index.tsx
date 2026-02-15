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

import Image from 'next/image';

// ═══════════════════════════════════════════════════════
// PAGE HERO
// Full-width hero banner with support for split layouts,
// background images, and rich animations.
// ═══════════════════════════════════════════════════════
interface PageHeroProps {
  badge?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  type?: 'centered' | 'split';
  backgroundImage?: string;
  image?: string | React.ReactNode;
  cta?: React.ReactNode;
  className?: string;
}

export function PageHero({
  badge,
  title,
  subtitle,
  children,
  type = 'centered',
  backgroundImage,
  image,
  cta,
  className
}: PageHeroProps) {
  const isSplit = type === 'split';

  return (
    <section
      className={cn(
        "relative min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center overflow-hidden pt-24 pb-16",
        backgroundImage && "text-white",
        className
      )}
    >
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        {backgroundImage ? (
          <>
            <Image
              src={backgroundImage}
              alt=""
              fill
              className="object-cover"
              priority
              quality={90}
            />
            <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-[1px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-white">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.5]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
          </div>
        )}
      </div>

      <div className="container-custom relative z-10 w-full">
        <div className={cn(
          "grid gap-12 items-center",
          isSplit ? "lg:grid-cols-2 text-left" : "text-center max-w-4xl mx-auto"
        )}>
          {/* Content Column */}
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4">
              {badge && (
                <span className={cn(
                  "badge inline-flex animate-fade-in",
                  backgroundImage ? "bg-white/10 backdrop-blur-md border-white/20 text-white" : "badge-primary"
                )}>
                  {badge}
                </span>
              )}
              <h1 className={cn(
                "font-display font-bold text-3xl sm:text-5xl lg:text-7xl leading-[1.1] animate-fade-up",
                backgroundImage ? "text-white" : "text-neutral-900"
              )}>
                {backgroundImage ? title : <span className="text-gradient-brand leading-relaxed inline-block pb-1">{title}</span>}
              </h1>
              {subtitle && (
                <p className={cn(
                  "text-base sm:text-xl lg:text-2xl leading-relaxed max-w-2xl animate-fade-in opacity-0",
                  backgroundImage ? "text-neutral-200" : "text-neutral-600",
                  !isSplit && "mx-auto"
                )} style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                  {subtitle}
                </p>
              )}
            </div>

            {(cta || children) && (
              <div
                className={cn(
                  "flex flex-wrap gap-4 animate-fade-in opacity-0",
                  !isSplit && "justify-center"
                )}
                style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
              >
                {cta}
                {children}
              </div>
            )}
          </div>

          {/* Image/Graphic Column for Split Layout */}
          {isSplit && (
            <div className="relative hidden lg:block animate-slide-left opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              {typeof image === 'string' ? (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 group">
                  <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="50vw"
                    priority
                  />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
                </div>
              ) : (
                image
              )}
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary-500/10 blur-3xl rounded-full" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-success-500/10 blur-3xl rounded-full" />
            </div>
          )}
        </div>
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