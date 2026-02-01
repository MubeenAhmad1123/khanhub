// src/app/departments/[slug]/page.tsx
// ─────────────────────────────────────────────
// DYNAMIC DEPARTMENT PAGE
// One file handles ALL 16 department pages.
// Next.js reads the [slug] from the URL and we
// look up the matching department from our data.
// ─────────────────────────────────────────────

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDepartmentBySlug, DEPARTMENTS } from '@/data/departments';
import { generateMetadata as generateSiteMetadata } from '@/lib/utils';
import InquiryForm from '@/components/forms/InquiryForm';

// ── Generate metadata dynamically for SEO ──
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const dept = getDepartmentBySlug(params.slug);
  if (!dept) return {};
  return generateSiteMetadata({
    title: dept.name,
    description: dept.description,
    slug: `departments/${dept.slug}`,
  });
}

// ── Generate all static routes at build time ──
// This tells Next.js to pre-render all 16 department pages.
export async function generateStaticParams() {
  return DEPARTMENTS.map((dept) => ({ slug: dept.slug }));
}

// ── The Page ──
export default function DepartmentPage({ params }: { params: { slug: string } }) {
  const dept = getDepartmentBySlug(params.slug);
  if (!dept) notFound();

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[340px] md:min-h-[400px] flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.05] blur-3xl rounded-full" style={{ background: dept.colorHex }} />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="badge-primary inline-flex mb-4">
            {dept.icon} {dept.category.charAt(0).toUpperCase() + dept.category.slice(1)}
          </span>
          <h1 className="font-display font-bold text-4xl md:text-5xl text-white leading-tight">
            {dept.name}
          </h1>
          <p className="text-neutral-500 mt-4 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {dept.tagline}
          </p>
        </div>
      </section>

      {/* ── DESCRIPTION ── */}
      <section className="section">
        <div className="section-inner max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main text */}
            <div className="lg:col-span-2">
              <p className="text-neutral-400 text-base leading-relaxed">{dept.description}</p>

              {/* Programs */}
              {dept.programs.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-display font-semibold text-white text-lg mb-3">📋 Programs</h3>
                  <div className="flex flex-wrap gap-2">
                    {dept.programs.map((p) => (
                      <span key={p} className="badge-primary text-xs">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Facilities + Contact */}
            <div className="space-y-4">
              {/* Facilities */}
              <div className="card p-5">
                <h4 className="font-display font-semibold text-white text-sm mb-3">🏢 Facilities</h4>
                <ul className="space-y-2">
                  {dept.facilities.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-neutral-500 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Contact */}
              <div className="card p-5">
                <h4 className="font-display font-semibold text-white text-sm mb-3">📞 Quick Contact</h4>
                <p className="text-neutral-500 text-xs mb-1">Phone</p>
                <a href={`tel:${dept.contactPhone.replace(/\D/g, '')}`} className="text-primary-400 text-sm font-medium hover:text-primary-300 transition-colors">
                  {dept.contactPhone}
                </a>
                <p className="text-neutral-500 text-xs mt-3 mb-1">Email</p>
                <a href={`mailto:${dept.contactEmail}`} className="text-primary-400 text-sm font-medium hover:text-primary-300 transition-colors">
                  {dept.contactEmail}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="section pt-0">
        <div className="section-inner">
          <h2 className="font-display font-bold text-white text-2xl mb-6 text-center">Services We Offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {dept.services.map((svc, i) => (
              <div key={svc.title} className="card p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold">
                    {i + 1}
                  </span>
                  <h4 className="font-display font-semibold text-white text-sm">{svc.title}</h4>
                </div>
                <p className="text-neutral-500 text-xs leading-relaxed">{svc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INQUIRY FORM ── */}
      <section className="section pt-0">
        <div className="section-inner max-w-2xl mx-auto">
          <div className="card p-8">
            <h2 className="font-display font-bold text-white text-xl text-center mb-1">Have a Question?</h2>
            <p className="text-neutral-500 text-sm text-center mb-6">Send us an inquiry and our {dept.shortName} team will get back to you.</p>
            <InquiryForm department={dept.slug} />
          </div>
        </div>
      </section>

      {/* ── Back to all departments ── */}
      <section className="pb-16 text-center">
        <Link href="/departments" className="btn-ghost text-sm">
          ← Back to All Departments
        </Link>
      </section>
    </>
  );
}
