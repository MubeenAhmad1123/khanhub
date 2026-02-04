// src/app/departments/DepartmentsListingClient.tsx
// ─────────────────────────────────────────────────────────────────
// Client component with state management for filtering
// ─────────────────────────────────────────────────────────────────

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES } from '@/data/departments';
import DepartmentCard from '@/components/ui/DepartmentCard';
import { ArrowRight, Search, HelpCircle, Filter, X } from 'lucide-react';

export default function DepartmentsListingClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [activeCategory, setActiveCategory] = useState<string>(searchParams.get('category') || 'all');
    const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (activeCategory !== 'all') params.set('category', activeCategory);
        if (searchQuery) params.set('q', searchQuery);

        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [activeCategory, searchQuery, pathname, router]);

    // Filtered departments (performance optimized)
    const filtered = useMemo(() => {
        let results = DEPARTMENTS;

        if (activeCategory !== 'all') {
            results = results.filter((d) => d.category === activeCategory);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            results = results.filter(
                (d) =>
                    d.name.toLowerCase().includes(q) ||
                    d.tagline.toLowerCase().includes(q) ||
                    d.description.toLowerCase().includes(q) ||
                    d.services.some((s) =>
                        (typeof s === 'string' ? s : s.title).toLowerCase().includes(q)
                    )
            );
        }

        return results;
    }, [activeCategory, searchQuery]);

    // Category stats (memoized)
    const stats = useMemo(
        () => ({
            all: DEPARTMENTS.length,
            ...DEPARTMENT_CATEGORIES.reduce(
                (acc, cat) => ({
                    ...acc,
                    [cat.key]: DEPARTMENTS.filter((d) => d.category === cat.key).length
                }),
                {} as Record<string, number>
            )
        }),
        []
    );

    // Handlers (memoized)
    const handleCategoryChange = useCallback((category: string) => {
        setActiveCategory(category);
        setShowMobileFilters(false);
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    const clearFilters = useCallback(() => {
        setActiveCategory('all');
        setSearchQuery('');
    }, []);

    const activeCategoryLabel = useMemo(
        () => DEPARTMENT_CATEGORIES.find((c) => c.key === activeCategory)?.label,
        [activeCategory]
    );

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* ── HERO SECTION ── */}
            <section className="relative py-16 sm:py-20 lg:py-28 bg-gradient-to-br from-primary-50 via-white to-success-50 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" aria-hidden="true">
                    <div
                        className="absolute top-0 left-0 w-full h-full"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233B82F6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}
                    />
                </div>

                {/* Ambient blurs */}
                <div className="absolute top-10 left-10 w-64 sm:w-72 h-64 sm:h-72 bg-primary-500 rounded-full blur-3xl opacity-[0.06] pointer-events-none" aria-hidden="true" />
                <div className="absolute bottom-10 right-10 w-80 sm:w-96 h-80 sm:h-96 bg-success-500 rounded-full blur-3xl opacity-[0.06] pointer-events-none" aria-hidden="true" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 border border-primary-200 text-primary-700 font-semibold text-sm mb-6">
                        <span>🏛️</span>
                        <span>All Departments</span>
                    </div>

                    {/* Title */}
                    <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-neutral-900 mb-4 leading-tight">
                        Our{' '}
                        <span className="bg-gradient-to-r from-primary-600 to-success-600 bg-clip-text text-transparent">
                            Departments
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-base sm:text-lg lg:text-xl text-neutral-600 max-w-3xl mx-auto px-4">
                        16 purpose-built departments working together to serve communities
                        across Pakistan — from healthcare and education to employment and
                        welfare.
                    </p>
                </div>
            </section>

            {/* ── FILTERS & GRID ── */}
            <section className="py-8 sm:py-12 lg:py-16 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" aria-hidden="true" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search departments, services…"
                                className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-xl border-2 border-neutral-200 focus:border-primary-400 focus:outline-none bg-neutral-50 focus:bg-white text-neutral-800 placeholder-neutral-400 transition-all duration-200 text-sm sm:text-base"
                                aria-label="Search departments"
                            />
                        </div>
                    </div>

                    {/* Mobile Filter Toggle */}
                    <div className="lg:hidden mb-6">
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-neutral-200 rounded-xl font-semibold text-neutral-900 hover:border-primary-400 transition-colors min-h-[48px]"
                            aria-expanded={showMobileFilters}
                            aria-controls="mobile-filters"
                        >
                            <span className="flex items-center gap-2">
                                <Filter className="w-5 h-5" />
                                Filter by Category
                            </span>
                            <span className="text-primary-600">{filtered.length} results</span>
                        </button>
                    </div>

                    {/* Category Filters */}
                    <nav
                        id="mobile-filters"
                        aria-label="Department categories filter"
                        className={`mb-6 sm:mb-8 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}
                    >
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-5xl mx-auto">
                            {/* All */}
                            <button
                                onClick={() => handleCategoryChange('all')}
                                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 border-2 min-h-[44px] flex items-center gap-1.5 sm:gap-2 touch-manipulation ${activeCategory === 'all'
                                        ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30'
                                        : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-400 hover:shadow-md'
                                    }`}
                                aria-pressed={activeCategory === 'all'}
                            >
                                <span className="text-xs sm:text-sm">All Departments</span>
                                <span
                                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${activeCategory === 'all'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-neutral-100 text-neutral-600'
                                        }`}
                                >
                                    {stats.all}
                                </span>
                            </button>

                            {/* Categories */}
                            {DEPARTMENT_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.key}
                                    onClick={() => handleCategoryChange(cat.key)}
                                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 border-2 min-h-[44px] flex items-center gap-1.5 sm:gap-2 touch-manipulation ${activeCategory === cat.key
                                            ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30'
                                            : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-400 hover:shadow-md'
                                        }`}
                                    aria-pressed={activeCategory === cat.key}
                                    aria-label={`Filter by ${cat.label}`}
                                >
                                    <span className="text-base sm:text-lg" aria-hidden="true">
                                        {cat.icon}
                                    </span>
                                    <span className="hidden sm:inline">{cat.label}</span>
                                    <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                                    <span
                                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${activeCategory === cat.key
                                                ? 'bg-white/20 text-white'
                                                : 'bg-neutral-100 text-neutral-600'
                                            }`}
                                    >
                                        {stats[cat.key as keyof typeof stats]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Active Filter Status */}
                    <div className="text-center mb-6 sm:mb-8 min-h-[24px]" role="status" aria-live="polite">
                        {(activeCategory !== 'all' || searchQuery.trim()) && (
                            <p className="text-xs sm:text-sm text-neutral-600 animate-fade-in">
                                Showing{' '}
                                <span className="font-bold text-primary-600">{filtered.length}</span>{' '}
                                department{filtered.length !== 1 ? 's' : ''}
                                {activeCategory !== 'all' && (
                                    <>
                                        {' '}in{' '}
                                        <span className="font-bold text-primary-600">
                                            {activeCategoryLabel}
                                        </span>
                                    </>
                                )}
                                {searchQuery.trim() && (
                                    <>
                                        {' '}matching{' '}
                                        <span className="font-bold text-primary-600">
                                            "{searchQuery}"
                                        </span>
                                    </>
                                )}
                                {' · '}
                                <button
                                    onClick={clearFilters}
                                    className="text-primary-600 hover:text-primary-700 underline underline-offset-2 font-medium inline-flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" />
                                    Clear filters
                                </button>
                            </p>
                        )}
                    </div>

                    {/* Department Grid */}
                    {filtered.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {filtered.map((dept, index) => (
                                <div
                                    key={dept.slug}
                                    className="opacity-0 animate-fade-up"
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animationFillMode: 'forwards'
                                    }}
                                >
                                    <DepartmentCard department={dept} index={index} priority={index < 3} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Empty State
                        <div className="text-center py-16 sm:py-20 lg:py-28">
                            <div className="inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 bg-neutral-100 rounded-full mb-6">
                                <Search className="w-8 sm:w-10 h-8 sm:h-10 text-neutral-400" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
                                No departments found
                            </h3>
                            <p className="text-neutral-600 mb-6 max-w-md mx-auto px-4">
                                No departments match your current filters. Try adjusting the
                                category or clearing your search.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="btn-secondary text-sm min-h-[44px] px-6"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}

                    {/* Bottom CTAs */}
                    <div className="mt-12 sm:mt-16 lg:mt-20 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                            <Link
                                href="/contact"
                                className="btn-primary text-sm group inline-flex items-center gap-2 w-full sm:w-auto justify-center min-h-[48px] touch-manipulation"
                            >
                                Need Help? Contact Us
                                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                            </Link>
                            <Link
                                href="/emergency"
                                className="inline-flex items-center gap-2 w-full sm:w-auto justify-center min-h-[48px] px-6 py-3 rounded-xl border-2 border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50 font-semibold text-sm transition-all duration-200 touch-manipulation"
                            >
                                🚨 Emergency Services
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'ItemList',
                        name: 'Khan Hub Departments',
                        description: 'Comprehensive welfare departments serving communities across Pakistan',
                        numberOfItems: DEPARTMENTS.length,
                        itemListElement: DEPARTMENTS.map((dept, index) => ({
                            '@type': 'ListItem',
                            position: index + 1,
                            item: {
                                '@type': 'GovernmentService',
                                name: dept.name,
                                description: dept.description,
                                url: `https://khanhub.com.pk/departments/${dept.slug}`
                            }
                        }))
                    })
                }}
            />

            {/* Animation Styles */}
            <style jsx>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-up {
          animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @media (max-width: 640px) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
        </div>
    );
}