// src/app/departments/[slug]/page.tsx - OPTIMIZED DEPARTMENT PAGE
// ─────────────────────────────────────────────────────────────────
// ✅ Fixed: Removed styled-jsx (Server Component compatible)
// ✅ Dynamic theming with inline styles
// ✅ SEO optimized with metadata
// ✅ Performance optimized
// ✅ Mobile-first responsive
// ✅ Next.js 14/15 compatible
// ─────────────────────────────────────────────────────────────────

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getDepartmentBySlug, getDepartmentTheme, DEPARTMENTS } from '@/data/departments';
import { ArrowLeft, Phone, Mail, MapPin, Check, Calendar, Users, Award } from 'lucide-react';
import InquiryForm from '@/components/forms/InquiryForm';

// ── TYPE DEFINITIONS ──
type Params = Promise<{ slug: string }>;

// ── METADATA GENERATION FOR SEO ──
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const department = getDepartmentBySlug(slug);

  if (!department) {
    return {
      title: 'Department Not Found - Khan Hub',
      description: 'The requested department could not be found.'
    };
  }

  return {
    title: `${department.name} - Khan Hub | ${department.tagline}`,
    description: department.description,
    keywords: [
      department.name,
      department.shortName,
      department.category,
      ...department.services.map(s => typeof s === 'string' ? s : s.title),
      'Pakistan',
      'Khan Hub',
      'Government Services'
    ].join(', '),
    openGraph: {
      title: department.name,
      description: department.tagline,
      images: department.image ? [{ url: department.image, width: 1200, height: 630 }] : [],
      type: 'website',
      siteName: 'Khan Hub'
    },
    twitter: {
      card: 'summary_large_image',
      title: department.name,
      description: department.tagline,
      images: department.image ? [department.image] : []
    },
    alternates: {
      canonical: `/departments/${slug}`
    }
  };
}

// ── STATIC PARAMS FOR ISR ──
export async function generateStaticParams() {
  return DEPARTMENTS.map((dept) => ({
    slug: dept.slug
  }));
}

// ── REVALIDATION (ISR) ──
export const revalidate = 3600;

// ── MAIN PAGE COMPONENT ──
export default async function DepartmentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const department = getDepartmentBySlug(slug);

  if (!department) {
    notFound();
  }

  const theme = getDepartmentTheme(department.slug);

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* ── HERO SECTION WITH THEME ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Back Button */}
          <Link
            href="/departments"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium mb-6 sm:mb-8 transition-colors group focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg px-3 py-2 -ml-3"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to All Departments
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="text-white">
              {/* Category Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-semibold mb-4 sm:mb-6">
                <span className="text-lg">{department.icon}</span>
                <span className="capitalize">{department.category}</span>
              </div>

              {/* Title */}
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight">
                {department.name}
              </h1>

              {/* Tagline */}
              <p className="text-lg sm:text-xl text-white/90 mb-6 sm:mb-8 leading-relaxed">
                {department.tagline}
              </p>

              {/* Stats */}
              {department.stats && department.stats.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {department.stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-5 hover:bg-white/15 transition-colors"
                    >
                      <div className="text-2xl sm:text-3xl font-bold font-display mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm sm:text-base text-white/90">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a
                  href="tel:+923006395220"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-neutral-900 rounded-xl font-semibold hover:bg-white/95 transition-all shadow-lg hover:shadow-xl min-h-[48px] focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2"
                  style={{
                    ['--tw-ring-offset-color' as string]: theme.primary
                  }}
                >
                  <Phone className="w-5 h-5" />
                  Contact Now
                </a>
                <a
                  href="#inquiry-form"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all min-h-[48px] focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <Mail className="w-5 h-5" />
                  Send Inquiry
                </a>
              </div>
            </div>

            {/* Right: Image */}
            {department.image && (
              <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={department.image}
                  alt={department.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Main Content - 2 columns */}
            <div className="lg:col-span-2 space-y-8 sm:space-y-12">
              {/* About Section */}
              <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-4 font-display flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md"
                    style={{ backgroundColor: theme.light }}
                  >
                    <span style={{ color: theme.primary }}>{department.icon}</span>
                  </div>
                  About {department.shortName}
                </h2>
                <p className="text-neutral-700 leading-relaxed text-base sm:text-lg">
                  {department.description}
                </p>
              </div>

              {/* Programs Section */}
              {department.programs && department.programs.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-6 font-display flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: theme.light }}
                    >
                      <Calendar className="w-6 h-6" style={{ color: theme.primary }} />
                    </div>
                    Programs &amp; Services
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                    {department.programs.map((program, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 rounded-xl border-2 border-neutral-100 hover:border-[var(--hover-border)] hover:bg-[var(--hover-bg)] hover:shadow-md transition-all group cursor-pointer"
                        style={{
                          ['--hover-border' as string]: theme.accent,
                          ['--hover-bg' as string]: theme.light
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: theme.light }}
                        >
                          <Check className="w-4 h-4" style={{ color: theme.primary }} />
                        </div>
                        <span className="text-neutral-800 font-medium text-sm sm:text-base leading-snug">
                          {program}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facilities Section */}
              {department.facilities && department.facilities.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-6 font-display flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: theme.light }}
                    >
                      <MapPin className="w-6 h-6" style={{ color: theme.primary }} />
                    </div>
                    Our Facilities
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                    {department.facilities.map((facility, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 rounded-xl border-2 border-neutral-100 hover:border-[var(--hover-border)] hover:bg-[var(--hover-bg)] hover:shadow-md transition-all cursor-pointer"
                        style={{
                          ['--hover-border' as string]: theme.accent,
                          ['--hover-bg' as string]: theme.light
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: theme.light }}
                        >
                          <Award className="w-4 h-4" style={{ color: theme.primary }} />
                        </div>
                        <span className="text-neutral-800 font-medium text-sm sm:text-base leading-snug">
                          {facility}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Contact Card - Sticky */}
              <div className="lg:sticky lg:top-24 space-y-6">
                <div
                  className="rounded-2xl p-6 shadow-lg text-white"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                  }}
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-6 font-display">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <a
                      href="tel:+923006395220"
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all group min-h-[56px] focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/80 mb-0.5">Phone</div>
                        <div className="font-semibold text-sm sm:text-base break-all">
                          +92-300-6395220
                        </div>
                      </div>
                    </a>

                    <a
                      href={`mailto:${department.contactEmail}`}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all group min-h-[56px] focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/80 mb-0.5">Email</div>
                        <div className="font-semibold text-sm break-all">
                          {department.contactEmail}
                        </div>
                      </div>
                    </a>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-white/80 mb-0.5">Status</div>
                        <div className="font-semibold flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          Active
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-neutral-900 mb-4 font-display">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <a
                      href="#inquiry-form"
                      className="block w-full px-4 py-3 rounded-xl border-2 text-center font-semibold transition-all hover:bg-[var(--hover-bg)] hover:shadow-md min-h-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        borderColor: theme.primary,
                        color: theme.primary,
                        ['--tw-ring-color' as string]: theme.primary,
                        ['--hover-bg' as string]: theme.light
                      }}
                    >
                      Send Inquiry
                    </a>
                    <Link
                      href="/emergency"
                      className="block w-full px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-center font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all min-h-[48px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      🚨 Emergency Help
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INQUIRY FORM SECTION ── */}
      <section id="inquiry-form" className="py-12 sm:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 sm:p-8 shadow-lg">
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-md"
                style={{ backgroundColor: theme.light }}
              >
                <Mail className="w-8 h-8" style={{ color: theme.primary }} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3 font-display">
                Have a Question?
              </h2>
              <p className="text-neutral-600 text-base sm:text-lg">
                Send us an inquiry and our {department.shortName} team will get back to you within 24 hours.
              </p>
            </div>
            <InquiryForm department={department.slug} />
          </div>
        </div>
      </section>

      {/* ── BACK TO DEPARTMENTS LINK ── */}
      <section className="py-8 sm:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/departments"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-neutral-200 text-neutral-700 font-semibold hover:border-neutral-300 hover:bg-neutral-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              ['--tw-ring-color' as string]: theme.primary
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Departments
          </Link>
        </div>
      </section>

      {/* ── SEO STRUCTURED DATA ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'GovernmentService',
            name: department.name,
            description: department.description,
            url: `https://khanhub.com.pk/departments/${department.slug}`,
            image: department.image,
            provider: {
              '@type': 'GovernmentOrganization',
              name: 'Khan Hub',
              url: 'https://khanhub.com.pk',
              telephone: department.contactPhone,
              email: department.contactEmail
            },
            areaServed: {
              '@type': 'Country',
              name: 'Pakistan'
            },
            availableChannel: {
              '@type': 'ServiceChannel',
              servicePhone: {
                '@type': 'ContactPoint',
                telephone: department.contactPhone,
                contactType: 'customer service'
              },
              serviceUrl: `https://khanhub.com.pk/departments/${department.slug}`
            }
          })
        }}
      />
    </main>
  );
}