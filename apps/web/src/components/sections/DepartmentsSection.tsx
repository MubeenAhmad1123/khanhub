'use client';
// src/components/sections/DepartmentsSection.tsx - OPTIMIZED VERSION
// ─────────────────────────────────────────────────────────────────
// Optimizations:
// ✅ SEO optimized with semantic HTML and schema markup
// ✅ Performance optimized with useMemo and useCallback
// ✅ Mobile-first responsive design
// ✅ Accessibility improvements (ARIA labels, keyboard navigation)
// ✅ Reduced re-renders with React.memo
// ✅ Optimized animations for better performance
// ─────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { SectionHeader, DepartmentCard } from '@/components/ui';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES } from '@/data/departments';
import { ArrowRight, HelpCircle } from 'lucide-react';

// Memoized Category Button Component
const CategoryButton = memo(function CategoryButton({
  categoryKey,
  label,
  icon,
  count,
  isActive,
  onClick
}: {
  categoryKey: string;
  label: string;
  icon: string;
  count: number;
  isActive: boolean;
  onClick: (key: string) => void;
}) {
  const handleClick = useCallback(() => {
    onClick(categoryKey);
  }, [categoryKey, onClick]);

  return (
    <button
      onClick={handleClick}
      className={`group relative px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-300 border-2 touch-manipulation min-h-[44px] ${isActive
        ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30'
        : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-400 hover:shadow-md'
        }`}
      aria-pressed={isActive}
      aria-label={`Filter by ${label}, ${count} departments`}
    >
      <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
        {categoryKey !== 'all' && <span className="text-base sm:text-lg" aria-hidden="true">{icon}</span>}
        <span className="text-xs sm:text-sm">{label}</span>
        <span
          className={`inline-flex items-center justify-center min-w-[20px] sm:min-w-[24px] h-5 sm:h-6 px-1.5 sm:px-2 rounded-full text-xs font-bold transition-colors ${isActive
            ? 'bg-white/20 text-white'
            : 'bg-neutral-100 text-neutral-600 group-hover:bg-primary-100 group-hover:text-primary-700'
            }`}
        >
          {count}
        </span>
      </span>
      {!isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-success-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
      )}
    </button>
  );
});

// Memoized Stats Component
const TrustStats = memo(function TrustStats() {
  const stats = [
    { value: '16+', label: 'Active Departments', color: 'text-primary-600' },
    { value: '50M+', label: 'Citizens Served', color: 'text-success-600' },
    { value: '24/7', label: 'Service Availability', color: 'text-primary-600' },
    { value: '100%', label: 'Digital Access', color: 'text-success-600' }
  ];

  return (
    <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-neutral-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
        {stats.map((stat, index) => (
          <div key={index} className="text-center" itemScope itemType="https://schema.org/QuantitativeValue">
            <div className={`text-2xl sm:text-3xl font-bold ${stat.color} mb-1 font-display`} itemProp="value">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm text-neutral-600" itemProp="description">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function DepartmentsSection() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Memoized filtered departments
  const filtered = useMemo(
    () => (activeCategory === 'all' ? DEPARTMENTS : DEPARTMENTS.filter((d) => d.category === activeCategory)),
    [activeCategory]
  );

  // Memoized stats calculation
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

  // Memoized category change handler
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  // Get active category label
  const activeCategoryLabel = useMemo(
    () => DEPARTMENT_CATEGORIES.find((c) => c.key === activeCategory)?.label,
    [activeCategory]
  );

  return (
    <section
      className="section bg-gradient-to-b from-white via-neutral-50/50 to-white relative overflow-hidden"
      aria-labelledby="departments-heading"
      itemScope
      itemType="https://schema.org/ItemList"
    >
      {/* Background Pattern - Optimized */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500 rounded-full blur-3xl will-change-transform" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-success-500 rounded-full blur-3xl will-change-transform" />
      </div>

      <div className="section-inner relative z-10">
        <SectionHeader
          badge="Our Departments"
          title="16 departments, one mission"
          titleGradient
          subtitle="From healthcare and education to employment and welfare — each department is purpose-built to serve communities across Pakistan."
          id="departments-heading"
        />

        {/* Category Filter - Mobile Optimized */}
        <nav
          className="mt-8 sm:mt-12 mb-8 sm:mb-10"
          aria-label="Department categories filter"
        >
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto px-2">
            <CategoryButton
              categoryKey="all"
              label="All Departments"
              icon=""
              count={stats.all}
              isActive={activeCategory === 'all'}
              onClick={handleCategoryChange}
            />

            {DEPARTMENT_CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat.key}
                categoryKey={cat.key}
                label={cat.label}
                icon={cat.icon}
                count={stats[cat.key as keyof typeof stats]}
                isActive={activeCategory === cat.key}
                onClick={handleCategoryChange}
              />
            ))}
          </div>
        </nav>

        {/* Active Category Indicator */}
        {activeCategory !== 'all' && (
          <div className="text-center mb-6 sm:mb-8 animate-fade-in" role="status" aria-live="polite">
            <p className="text-xs sm:text-sm text-neutral-600">
              Showing <span className="font-bold text-primary-600">{filtered.length}</span> department
              {filtered.length !== 1 ? 's' : ''} in{' '}
              <span className="font-bold text-primary-600">{activeCategoryLabel}</span>
            </p>
          </div>
        )}

        {/* Department Grid - Performance Optimized */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          itemProp="itemListElement"
        >
          {filtered.map((dept, index) => (
            <div
              key={dept.slug}
              className="opacity-0 animate-fade-up"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'forwards'
              }}
              itemScope
              itemType="https://schema.org/GovernmentService"
            >
              <DepartmentCard department={dept} index={index} />
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {filtered.length === 0 && (
          <div className="text-center py-16 sm:py-20 animate-fade-in" role="status">
            <div className="inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 bg-neutral-100 rounded-full mb-4 sm:mb-6">
              <svg className="w-8 sm:w-10 h-8 sm:h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 mb-2">No departments found</h3>
            <p className="text-sm sm:text-base text-neutral-600 mb-4 sm:mb-6">
              No departments are available in this category.
            </p>
            <button
              onClick={() => handleCategoryChange('all')}
              className="btn-secondary text-sm touch-manipulation min-h-[44px]"
            >
              View All Departments
            </button>
          </div>
        )}

        {/* CTA Section - Mobile Optimized */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/departments"
              className="btn-primary text-sm group inline-flex items-center gap-2 w-full sm:w-auto justify-center touch-manipulation min-h-[44px]"
            >
              Explore All Departments
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="btn-ghost text-sm group inline-flex items-center gap-2 w-full sm:w-auto justify-center touch-manipulation min-h-[44px]"
            >
              Need Help? Contact Us
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Trust Indicators */}
        <TrustStats />
      </div>

      {/* SEO Schema Markup */}
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

      {/* Optimized Animation Styles */}
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

        /* Improve touch targets on mobile */
        @media (max-width: 640px) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </section>
  );
}