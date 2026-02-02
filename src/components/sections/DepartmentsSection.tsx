'use client';
// src/components/sections/DepartmentsSection.tsx - PREMIUM DESIGN - Force Reload

import { useState } from 'react';
import Link from 'next/link';
import { SectionHeader, DepartmentCard } from '@/components/ui';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES } from '@/data/departments';

export default function DepartmentsSection() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? DEPARTMENTS
    : DEPARTMENTS.filter((d) => d.category === activeCategory);

  const stats = {
    all: DEPARTMENTS.length,
    ...DEPARTMENT_CATEGORIES.reduce((acc, cat) => ({
      ...acc,
      [cat.key]: DEPARTMENTS.filter(d => d.category === cat.key).length
    }), {} as Record<string, number>)
  };

  return (
    <section className="section bg-gradient-to-b from-white via-neutral-50/50 to-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-success-500 rounded-full blur-3xl" />
      </div>

      <div className="section-inner relative z-10">
        <SectionHeader
          badge="Our Departments"
          title="16 departments, one mission"
          titleGradient
          subtitle="From healthcare and education to employment and welfare — each department is purpose-built to serve communities across Pakistan."
        />

        {/* Category Filter - Premium Design */}
        <div className="mt-12 mb-10">
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 border-2 ${activeCategory === 'all'
                ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-400 hover:shadow-md'
                }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                All Departments
                <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold transition-colors ${activeCategory === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-100 text-neutral-600 group-hover:bg-primary-100 group-hover:text-primary-700'
                  }`}>
                  {stats.all}
                </span>
              </span>
              {activeCategory !== 'all' && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-success-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </button>

            {DEPARTMENT_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 border-2 ${activeCategory === cat.key
                  ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-400 hover:shadow-md'
                  }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold transition-colors ${activeCategory === cat.key
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-100 text-neutral-600 group-hover:bg-primary-100 group-hover:text-primary-700'
                    }`}>
                    {stats[cat.key]}
                  </span>
                </span>
                {activeCategory !== cat.key && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-success-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Category Indicator */}
        {activeCategory !== 'all' && (
          <div className="text-center mb-8 animate-fade-in">
            <p className="text-sm text-neutral-600">
              Showing <span className="font-bold text-primary-600">{filtered.length}</span> department{filtered.length !== 1 ? 's' : ''} in{' '}
              <span className="font-bold text-primary-600">
                {DEPARTMENT_CATEGORIES.find(c => c.key === activeCategory)?.label}
              </span>
            </p>
          </div>
        )}

        {/* Department Grid - Premium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((dept, index) => (
            <div
              key={dept.slug}
              style={{
                animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                animationDelay: `${index * 0.05}s`,
                opacity: 0
              }}
            >
              <DepartmentCard department={dept} />
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {filtered.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-neutral-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">No departments found</h3>
            <p className="text-neutral-600 mb-6">
              No departments are available in this category.
            </p>
            <button
              onClick={() => setActiveCategory('all')}
              className="btn-secondary text-sm"
            >
              View All Departments
            </button>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/departments"
              className="btn-primary text-sm group inline-flex items-center gap-2"
            >
              Explore All Departments
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
            <Link
              href="/contact"
              className="btn-ghost text-sm group inline-flex items-center gap-2"
            >
              Need Help? Contact Us
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 pt-12 border-t border-neutral-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-1">16+</div>
              <div className="text-sm text-neutral-600">Active Departments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success-600 mb-1">50M+</div>
              <div className="text-sm text-neutral-600">Citizens Served</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-1">24/7</div>
              <div className="text-sm text-neutral-600">Service Availability</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success-600 mb-1">100%</div>
              <div className="text-sm text-neutral-600">Digital Access</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}