'use client';
// src/app/departments/page.tsx

import { useState }  from 'react';
import { PageHero, SectionHeader, DepartmentCard } from '@/components/ui';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES }      from '@/data/departments';

// Metadata is set in a separate layout or via generateMetadata.
// For client components we handle it via a wrapper or static export.

export default function DepartmentsPage() {
  const [active, setActive] = useState<string>('all');

  const filtered = active === 'all' ? DEPARTMENTS : DEPARTMENTS.filter((d) => d.category === active);

  return (
    <>
      <PageHero
        badge="Explore"
        title="Our Departments"
        subtitle="16 specialized departments — each one built to serve a unique need within our communities."
      />

      <section className="section">
        <div className="section-inner">
          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            <button onClick={() => setActive('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                active === 'all' ? 'bg-primary-500 border-primary-500 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
              }`}>
              All ({DEPARTMENTS.length})
            </button>
            {DEPARTMENT_CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => setActive(cat.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  active === cat.key ? 'bg-primary-500 border-primary-500 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}>
                <span>{cat.icon}</span> {cat.label} ({DEPARTMENTS.filter(d => d.category === cat.key).length})
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((dept) => (
              <DepartmentCard key={dept.slug} department={dept} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
