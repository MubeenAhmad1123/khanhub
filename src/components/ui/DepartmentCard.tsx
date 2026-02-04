// src/components/ui/DepartmentCard.tsx - OPTIMIZED & SEO ENHANCED
// ─────────────────────────────────────────────────────────────────
// ✅ Dynamic color theming per department
// ✅ Performance optimized with React.memo
// ✅ SEO optimized with structured data
// ✅ Mobile-first responsive design
// ✅ Accessibility improvements (WCAG 2.1 AA)
// ✅ Reduced animations for better performance
// ─────────────────────────────────────────────────────────────────

'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Department } from '@/types/department';
import { getDepartmentTheme } from '@/data/departments';

interface DepartmentCardProps {
    department: Department;
    index?: number;
    priority?: boolean; // For LCP optimization
}

const DepartmentCard = memo(function DepartmentCard({
    department,
    index = 0,
    priority = false
}: DepartmentCardProps) {
    // Memoize theme to avoid recalculation
    const theme = useMemo(() => getDepartmentTheme(department.slug), [department.slug]);

    // Inline styles for dynamic colors (better than Tailwind arbitrary values)
    const styles = useMemo(() => ({
        primaryBg: { backgroundColor: theme.primary },
        primaryText: { color: theme.primary },
        primaryBorder: { borderColor: theme.primary },
        lightBg: { backgroundColor: theme.light },
        accentBg: { backgroundColor: theme.accent }
    }), [theme]);

    return (
        <article
            className="group h-full"
            itemScope
            itemType="https://schema.org/GovernmentService"
        >
            <Link
                href={`/departments/${department.slug}`}
                className="block h-full focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-2xl transition-all"
                style={{ '--focus-ring-color': theme.primary } as React.CSSProperties}
                aria-label={`Learn more about ${department.name}`}
            >
                <div className="relative h-full bg-white border-2 border-neutral-200 rounded-2xl overflow-hidden transition-all duration-300 hover:border-opacity-0 hover:shadow-xl hover:-translate-y-1 will-change-transform">

                    {/* Dynamic border glow on hover */}
                    <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
                        style={{
                            boxShadow: `0 0 0 2px ${theme.primary}, 0 20px 40px -10px ${theme.primary}40`
                        }}
                    />

                    {/* Image Header with Optimized Loading */}
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-50">
                        {department.image ? (
                            <>
                                <Image
                                    src={department.image}
                                    alt={`${department.name} services`}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    loading={priority ? 'eager' : 'lazy'}
                                    priority={priority}
                                />
                                {/* Gradient overlay with theme color */}
                                <div
                                    className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300"
                                    style={{
                                        background: `linear-gradient(180deg, transparent 0%, ${theme.primary} 100%)`
                                    }}
                                />
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-6xl sm:text-7xl grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-70 transition-all duration-300">
                                {department.icon}
                            </div>
                        )}

                        {/* Category Badge with Theme */}
                        <div className="absolute top-3 right-3">
                            <span
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm border shadow-sm capitalize"
                                style={styles.primaryBorder}
                            >
                                <span style={styles.primaryText}>{department.category}</span>
                            </span>
                        </div>

                        {/* Shimmer effect on hover */}
                        <div
                            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${theme.light}80, transparent)`
                            }}
                        />
                    </div>

                    {/* Content Section */}
                    <div className="relative p-5 sm:p-6 flex flex-col h-[calc(100%-12rem)] sm:h-[calc(100%-13rem)]">

                        {/* Floating Icon Badge with Theme */}
                        <div
                            className="absolute -top-6 left-5 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border-2 shadow-lg flex items-center justify-center text-2xl transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1"
                            style={styles.primaryBorder}
                        >
                            <span className="transition-transform duration-300 group-hover:scale-110">
                                {department.icon}
                            </span>
                            {/* Icon glow effect */}
                            <div
                                className="absolute inset-0 rounded-xl blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10"
                                style={styles.primaryBg}
                            />
                        </div>

                        {/* Title with Theme */}
                        <h3
                            className="text-lg sm:text-xl font-bold text-neutral-900 mb-2 mt-8 sm:mt-10 line-clamp-2 font-display transition-colors duration-300"
                            style={{ '--hover-color': theme.primary } as React.CSSProperties}
                            itemProp="name"
                        >
                            <span className="group-hover:text-[var(--hover-color)] transition-colors">
                                {department.name}
                            </span>
                        </h3>

                        {/* Tagline */}
                        <p className="text-sm text-neutral-600 mb-3 line-clamp-2 leading-relaxed" itemProp="description">
                            {department.tagline}
                        </p>

                        {/* Stats Section with Theme */}
                        {department.stats && department.stats.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-neutral-200">
                                {department.stats.slice(0, 2).map((stat, idx) => (
                                    <div
                                        key={idx}
                                        className="text-center p-2.5 rounded-lg transition-all duration-300 hover:shadow-sm"
                                        style={{
                                            '--stat-bg': theme.light,
                                            backgroundColor: 'var(--stat-bg-hover, transparent)'
                                        } as React.CSSProperties}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.setProperty('--stat-bg-hover', theme.light);
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.removeProperty('--stat-bg-hover');
                                        }}
                                    >
                                        <div
                                            className="text-lg sm:text-xl font-bold font-display mb-0.5 transition-colors"
                                            style={styles.primaryText}
                                        >
                                            {stat.value}
                                        </div>
                                        <div className="text-xs text-neutral-600 font-medium leading-tight">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Service Tags with Theme */}
                        {department.services && department.services.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4 flex-grow">
                                {department.services.slice(0, 3).map((service, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 hover:shadow-sm"
                                        style={{
                                            backgroundColor: theme.light,
                                            borderColor: theme.accent,
                                            color: theme.primary
                                        }}
                                    >
                                        <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {typeof service === 'string' ? service : service.title}
                                    </span>
                                ))}
                                {department.services.length > 3 && (
                                    <span
                                        className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border"
                                        style={{
                                            backgroundColor: theme.light,
                                            borderColor: theme.accent,
                                            color: theme.primary
                                        }}
                                    >
                                        +{department.services.length - 3} more
                                    </span>
                                )}
                            </div>
                        )}

                        {/* CTA Footer with Theme */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-200 group-hover:border-opacity-50 transition-all">
                            <span
                                className="text-sm font-semibold flex items-center gap-2 transition-all duration-300"
                                style={styles.primaryText}
                            >
                                Learn More
                                <svg
                                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </span>

                            {/* Active Status with Theme */}
                            {department.isActive !== false && (
                                <div
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                                    style={{
                                        backgroundColor: `${theme.light}`,
                                        borderColor: theme.accent
                                    }}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            backgroundColor: theme.primary,
                                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                        }}
                                    />
                                    <span className="text-xs font-medium" style={styles.primaryText}>
                                        Active
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Corner Accent with Theme */}
                    <div
                        className="absolute bottom-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-tl-full blur-2xl"
                        style={{
                            background: `linear-gradient(135deg, ${theme.primary}15, transparent)`
                        }}
                    />
                </div>
            </Link>

            {/* Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'GovernmentService',
                        name: department.name,
                        description: department.description,
                        url: `https://khanhub.com.pk/departments/${department.slug}`,
                        provider: {
                            '@type': 'GovernmentOrganization',
                            name: 'Khan Hub',
                            url: 'https://khanhub.com.pk'
                        },
                        areaServed: {
                            '@type': 'Country',
                            name: 'Pakistan'
                        }
                    })
                }}
            />
        </article>
    );
});

DepartmentCard.displayName = 'DepartmentCard';

export default DepartmentCard;