// src/app/departments/[slug]/page.tsx
// ─────────────────────────────────────────────
// DYNAMIC DEPARTMENT PAGE - WORKS FOR ALL 16 DEPARTMENTS
// One file handles ALL department pages automatically
// ─────────────────────────────────────────────

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getDepartmentBySlug, DEPARTMENTS } from '@/data/departments';
import { Metadata } from 'next';
import InquiryForm from '@/components/forms/InquiryForm';

// ── Generate metadata dynamically for SEO ──
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const dept = getDepartmentBySlug(params.slug);
  if (!dept) {
    return {
      title: 'Department Not Found | Khan Hub',
      description: 'The requested department could not be found.',
    };
  }

  return {
    title: `${dept.name} | Khan Hub`,
    description: dept.description,
    keywords: [dept.name, dept.category, 'Pakistan', 'public service', ...dept.services.map(s => typeof s === 'string' ? s : s.title)],
  };
}

// ── Generate all static routes at build time ──
export async function generateStaticParams() {
  return DEPARTMENTS.map((dept) => ({ slug: dept.slug }));
}

// ── The Dynamic Department Page ──
export default function DepartmentPage({ params }: { params: { slug: string } }) {
  const dept = getDepartmentBySlug(params.slug);

  if (!dept) {
    notFound();
  }

  // Convert services to proper format if needed
  const services = dept.services.map(service =>
    typeof service === 'string'
      ? { title: service, description: `Comprehensive ${service.toLowerCase()} services` }
      : service
  );

  return (
    <div className="min-h-screen">
      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[500px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-white to-success-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${dept.colorHex?.replace('#', '') || '3B82F6'}' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 border border-primary-200 text-primary-700 font-semibold text-sm mb-6 animate-fade-in">
            <span className="text-lg">{dept.icon}</span>
            <span className="capitalize">{dept.category} Services</span>
          </div>

          {/* Title */}
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-neutral-900 mb-6 leading-tight animate-fade-in-up">
            {dept.name}
          </h1>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl text-neutral-600 mb-8 max-w-3xl mx-auto animate-fade-in-up animation-delay-100">
            {dept.tagline}
          </p>

          {/* Quick Stats */}
          {dept.stats && dept.stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-10">
              {dept.stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-3xl font-bold text-primary-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-neutral-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in-up animation-delay-200">
            <a
              href="#inquiry"
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              📋 Send Inquiry
            </a>
            <a
              href={`tel:${dept.contactPhone.replace(/\D/g, '')}`}
              className="px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold border-2 border-primary-200 hover:border-primary-300 hover:bg-primary-50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              📞 Call Now
            </a>
          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Image */}
            {dept.image && (
              <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={dept.image}
                  alt={dept.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className={dept.image ? '' : 'md:col-span-2'}>
              <h2 className="font-display font-bold text-3xl md:text-4xl text-neutral-900 mb-6">
                About {dept.shortName}
              </h2>
              <p className="text-neutral-600 text-lg mb-8 leading-relaxed">
                {dept.description}
              </p>

              {/* Key Features */}
              {dept.programs && dept.programs.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-xl text-neutral-900 mb-4">Key Programs</h3>
                  <div className="flex flex-wrap gap-2">
                    {dept.programs.slice(0, 5).map((program) => (
                      <span
                        key={program}
                        className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium border border-primary-200"
                      >
                        {program}
                      </span>
                    ))}
                    {dept.programs.length > 5 && (
                      <span className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-lg text-sm font-medium">
                        +{dept.programs.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES SECTION ── */}
      {services && services.length > 0 && (
        <section className="py-16 md:py-24 bg-gradient-to-b from-neutral-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-neutral-900 mb-4">
                Our Services
              </h2>
              <p className="text-neutral-600 text-lg max-w-3xl mx-auto">
                Comprehensive services tailored to your needs
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <div
                  key={typeof service === 'string' ? service : service.title}
                  className="bg-white rounded-2xl p-6 border-2 border-neutral-200 hover:border-primary-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                      {index + 1}
                    </div>
                    <h3 className="font-display font-bold text-lg text-neutral-900">
                      {typeof service === 'string' ? service : service.title}
                    </h3>
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    {typeof service === 'string'
                      ? `Comprehensive ${(service as string).toLowerCase()} services tailored to your needs.`
                      : service.description
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FACILITIES SECTION ── */}
      {dept.facilities && dept.facilities.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-neutral-900 mb-4">
                Our Facilities
              </h2>
              <p className="text-neutral-600 text-lg max-w-3xl mx-auto">
                Modern infrastructure designed for excellence
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {dept.facilities.map((facility, index) => (
                <div
                  key={facility}
                  className="flex items-start gap-4 p-6 rounded-xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200 hover:border-primary-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-neutral-900 mb-1">
                      {facility}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT & INQUIRY SECTION ── */}
      <section id="inquiry" className="py-16 md:py-24 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="font-display font-bold text-3xl text-neutral-900 mb-6">
                Get in Touch
              </h2>
              <p className="text-neutral-600 text-lg mb-8">
                Have questions? Contact our {dept.shortName} team for assistance.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Phone</h4>
                    <a href={`tel:${dept.contactPhone.replace(/\D/g, '')}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {dept.contactPhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Email</h4>
                    <a href={`mailto:${dept.contactEmail}`} className="text-blue-600 hover:text-blue-700 font-medium break-all">
                      {dept.contactEmail}
                    </a>
                  </div>
                </div>

                {dept.isActive !== false && (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Status</h4>
                      <p className="text-green-600 font-medium">Active & Operational</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inquiry Form */}
            <div className="bg-white rounded-2xl p-8 border-2 border-neutral-200 shadow-xl">
              <h3 className="font-display font-bold text-2xl text-neutral-900 mb-6">
                Send an Inquiry
              </h3>
              <InquiryForm department={dept.slug} />
            </div>
          </div>
        </div>
      </section>

      {/* ── BACK TO DEPARTMENTS ── */}
      <section className="py-8 bg-white border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/departments"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-primary-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Departments
          </Link>
        </div>
      </section>
    </div>
  );
}