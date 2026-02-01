'use client';
// src/components/sections/DepartmentsSection.tsx - LIGHT THEME VERSION

import { useState } from 'react';
import Link from 'next/link';
import { SectionHeader, DepartmentCard } from '@/components/ui';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES } from '@/data/departments';

export default function DepartmentsSection() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? DEPARTMENTS
    : DEPARTMENTS.filter((d) => d.category === activeCategory);

  return (
    <section className="section bg-gradient-to-b from-white via-neutral-50 to-white">
      <div className="section-inner">
        <SectionHeader
          badge="Our Departments"
          title="16 departments, one mission"
          titleGradient
          subtitle="From healthcare and education to employment and welfare — each department is purpose-built to serve communities across Pakistan."
        />

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 mt-10">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${activeCategory === 'all'
                ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white border-neutral-300 text-neutral-700 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50'
              }`}
          >
            All Departments
          </button>
          {DEPARTMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${activeCategory === cat.key
                  ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white border-neutral-300 text-neutral-700 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50'
                }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-neutral-600 text-lg">
              No departments found in this category.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href="/departments"
            className="btn-secondary text-sm group inline-flex items-center gap-2"
          >
            View All Departments
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
        </div>
      </div>
    </section>
  );
}