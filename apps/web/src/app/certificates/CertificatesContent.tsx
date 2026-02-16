// src/app/certificates/CertificatesContent.tsx
// ============================================================================
// CERTIFICATES CONTENT COMPONENT - Interactive certificate gallery
// Client component with filtering, categorization, and expansion features
// Optimized for SEO, mobile responsiveness, and code maintainability
// ============================================================================

'use client';

import { useMemo, useState, useCallback } from 'react';
import Image from 'next/image';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
type CertificateCategory =
  | 'All'
  | 'Registration'
  | 'Approvals & Compliance'
  | 'Healthcare Accreditation';

type CertificateItem = {
  title: string;
  issuer: string;
  year: number;
  icon: string;
  category: Exclude<CertificateCategory, 'All'>;
  type: 'core' | 'support';
  status: 'Active' | 'Renewed' | 'Issued';
};

type YearFilter = 'All' | 'Latest (2024)' | '2018–2020' | '2015–2017';

type Props = {
  siteEmail: string;
};

// ============================================================================
// DATA CONSTANTS
// ============================================================================
// Certificate with image path
type CertificateItemWithImage = CertificateItem & { imagePath?: string };

const RAW_CERTIFICATES = [
  {
    category: 'Registration' as const,
    items: [
      {
        title: 'Certificate of Incorporation',
        issuer: 'Securities & Exchange Commission of Pakistan (SECP)',
        year: 2015,
        icon: '📄',
        type: 'core' as const,
        status: 'Active' as const,
        imagePath: '/images/certificats/CERTIFICATE OF INCORPORATION.webp',
      },
      {
        title: 'PHC Registration Certificate',
        issuer: 'Pakistan Humanitarian Council',
        year: 2018,
        icon: '📄',
        type: 'core' as const,
        status: 'Active' as const,
        imagePath: '/images/certificats/PHC_RegistrationCertificate.webp',
      },
      {
        title: 'PHC Provisional License',
        issuer: 'Pakistan Humanitarian Council',
        year: 2018,
        icon: '📄',
        type: 'core' as const,
        status: 'Active' as const,
        imagePath: '/images/certificats/PHC_ProvisionalLicense.webp',
      },
    ],
  },
  {
    category: 'Approvals & Compliance' as const,
    items: [
      {
        title: 'MOU with DPO Vehari - Khan Hub Medical Center',
        issuer: 'District Police Officer, Vehari',
        year: 2024,
        icon: '✅',
        type: 'support' as const,
        status: 'Active' as const,
        imagePath: '/images/certificats/MOU_DPO_Vehari_KhanHubMedicalCenter.webp',
      },
      {
        title: 'MOU with DPO Vehari - Khan Hub Rehab Center',
        issuer: 'District Police Officer, Vehari',
        year: 2024,
        icon: '✅',
        type: 'support' as const,
        status: 'Active' as const,
        imagePath: '/images/certificats/MOU_DPO_Vehari_KhanHubRehabCenter.webp',
      },
      {
        title: 'MOU with South Punjab Institute of Medical Sciences',
        issuer: 'SPIMS Vehari',
        year: 2024,
        icon: '✅',
        type: 'support' as const,
        status: 'Active' as const,
        imagePath: '/images/certificats/mou-dpo-vehari-south-punjab-institute-of-medical-sciences-vehari.webp',
      },
    ],
  },
  {
    category: 'Healthcare Accreditation' as const,
    items: [
      {
        title: 'Memorandum of Understanding - Mumtaz Surgimed',
        issuer: 'Mumtaz Surgimed Hospital',
        year: 2024,
        icon: '🏥',
        type: 'core' as const,
        status: 'Active' as const,
        imagePath: '/images/certificats/Memorandum of Understanding mumtaz surgimed.webp',
      },
    ],
  },
] as const;

const CERTIFICATES: CertificateItem[] = RAW_CERTIFICATES.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    category: group.category,
  }))
);

const CATEGORY_TABS: readonly CertificateCategory[] = [
  'All',
  'Registration',
  'Approvals & Compliance',
  'Healthcare Accreditation',
] as const;

const YEAR_FILTERS: readonly YearFilter[] = [
  'All',
  'Latest (2024)',
  '2018–2020',
  '2015–2017',
] as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function CertificatesContent({ siteEmail }: Props) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [activeCategory, setActiveCategory] = useState<CertificateCategory>('All');
  const [activeYearFilter, setActiveYearFilter] = useState<YearFilter>('All');
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ============================================================================
  // MEMOIZED FILTERED DATA
  // ============================================================================
  const filteredCertificates = useMemo(() => {
    let list = [...CERTIFICATES];

    // Category filter
    if (activeCategory !== 'All') {
      list = list.filter((c) => c.category === activeCategory);
    }

    // Year filter
    if (activeYearFilter === 'Latest (2024)') {
      list = list.filter((c) => c.year === 2024);
    } else if (activeYearFilter === '2018–2020') {
      list = list.filter((c) => c.year >= 2018 && c.year <= 2020);
    } else if (activeYearFilter === '2015–2017') {
      list = list.filter((c) => c.year >= 2015 && c.year <= 2017);
    }

    // Sort: newest first, then core before support, then alphabetically
    list.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.type === b.type) return a.title.localeCompare(b.title);
      return a.type === 'core' ? -1 : 1;
    });

    return list;
  }, [activeCategory, activeYearFilter]);

  const coreCertificates = useMemo(
    () => filteredCertificates.filter((c) => c.type === 'core'),
    [filteredCertificates]
  );

  const supportCertificates = useMemo(
    () => filteredCertificates.filter((c) => c.type === 'support'),
    [filteredCertificates]
  );

  // ============================================================================
  // EVENT HANDLERS - Memoized with useCallback
  // ============================================================================
  const toggleExpanded = useCallback((title: string) => {
    setExpandedTitle((prev) => (prev === title ? null : title));
  }, []);

  const handleCategoryChange = useCallback((category: CertificateCategory) => {
    setActiveCategory(category);
  }, []);

  const handleYearFilterChange = useCallback((filter: YearFilter) => {
    setActiveYearFilter(filter);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      {/* ============================================================================ */}
      {/* SECTION 1: Trust Banner & Filter Controls */}
      {/* ============================================================================ */}
      <section className="section bg-gradient-light" aria-labelledby="certificates-heading">
        <div className="section-inner relative">
          {/* Decorative background elements */}
          <div className="pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full bg-gradient-brand opacity-20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-gradient-success opacity-20 blur-3xl" aria-hidden="true" />

          <div className="relative max-w-5xl mx-auto space-y-5 sm:space-y-6">
            {/* Trust & Verification Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-neutral-200 bg-white/90 shadow-neutral-sm px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary-500 to-success-500 text-white flex items-center justify-center text-lg sm:text-xl flex-shrink-0" aria-hidden="true">
                  🛡️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-neutral-900">
                    Verified welfare & healthcare organization
                  </p>
                  <p className="text-[11px] sm:text-xs text-neutral-600 mt-0.5 leading-relaxed">
                    Key registrations and compliance certificates are listed below. Originals are
                    available for view at our head office.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-neutral-700">
                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 text-success-700 border border-success-100 px-2.5 py-1 font-semibold">
                  ● Up to date
                </span>
                <span className="hidden sm:inline text-neutral-500 text-[10px] sm:text-[11px]">
                  Last updated: 2024–2025 audit cycle
                </span>
              </div>
            </div>

            {/* Filter Controls - Mobile Optimized */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Category Tabs */}
              <nav aria-label="Certificate categories">
                <h2 id="certificates-heading" className="sr-only">Certificate Categories</h2>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_TABS.map((cat) => {
                    const isActive = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`inline-flex items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transition-all border min-h-[36px] sm:min-h-[40px] ${isActive
                          ? 'bg-primary-500 text-white border-primary-500 shadow-primary-sm'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-600'
                          }`}
                        aria-pressed={isActive}
                        aria-label={cat === 'All' ? 'Show all certificates' : `Filter by ${cat}`}
                      >
                        {cat === 'All' ? 'All certificates' : cat}
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* Year Filters */}
              <nav aria-label="Year filters">
                <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
                  {YEAR_FILTERS.map((filter) => {
                    const isActive = activeYearFilter === filter;
                    return (
                      <button
                        key={filter}
                        onClick={() => handleYearFilterChange(filter)}
                        className={`rounded-full px-3 sm:px-3.5 py-1.5 transition-all border min-h-[36px] sm:min-h-[40px] flex items-center ${isActive
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-600'
                          }`}
                        aria-pressed={isActive}
                        aria-label={`Filter certificates by ${filter}`}
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================================ */}
      {/* SECTION 2: Certificate Gallery */}
      {/* ============================================================================ */}
      <section className="section bg-white" aria-labelledby="core-certificates-heading">
        <div className="section-inner max-w-6xl mx-auto space-y-8 sm:space-y-10 md:space-y-12">
          {/* Core Certificates */}
          {coreCertificates.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div>
                  <h2 id="core-certificates-heading" className="font-display font-semibold text-neutral-900 text-base sm:text-lg">
                    Core registrations & licenses
                  </h2>
                  <p className="text-[11px] sm:text-xs text-neutral-600 mt-1">
                    These documents establish Khan Hub as a legally registered and licensed entity.
                  </p>
                </div>
                <span className="text-[10px] sm:text-[11px] text-neutral-500 font-medium">
                  {coreCertificates.length} certificate{coreCertificates.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {coreCertificates.map((cert, index) => {
                  const isExpanded = expandedTitle === cert.title;
                  return (
                    <article
                      key={cert.title}
                      className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300 animate-fade-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                      itemScope
                      itemType="https://schema.org/Certification"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50 opacity-90" />
                      <div className="relative p-4 sm:p-5 flex flex-col h-full">
                        {/* Certificate Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/80 border border-neutral-200 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0" aria-hidden="true">
                            {cert.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-neutral-900 text-sm sm:text-base leading-snug" itemProp="name">
                              {cert.title}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-neutral-600 mt-0.5" itemProp="issuedBy">
                              {cert.issuer}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="inline-flex items-center rounded-lg bg-neutral-900 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5" itemProp="dateIssued">
                              {cert.year}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full text-[10px] px-2 py-0.5 ${cert.status === 'Active'
                                ? 'bg-success-50 text-success-700 border border-success-100'
                                : 'bg-primary-50 text-primary-700 border border-primary-100'
                                }`}
                            >
                              {cert.status}
                            </span>
                          </div>
                        </div>

                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleExpanded(cert.title)}
                          className="mt-auto inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors min-h-[32px]"
                          aria-expanded={isExpanded}
                          aria-controls={`details-${cert.title.replace(/\s+/g, '-')}`}
                        >
                          {isExpanded ? 'Hide details' : 'View details'}
                          <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div
                            id={`details-${cert.title.replace(/\s+/g, '-')}`}
                            className="mt-3 border-t border-neutral-200 pt-3 text-[11px] sm:text-xs text-neutral-700 space-y-2 animate-fade-in"
                          >
                            <p>
                              <span className="font-semibold">📎 Document type:</span>{' '}
                              {cert.category}
                            </p>
                            <p>
                              <span className="font-semibold">🕒 Valid from:</span> {cert.year}{' '}
                              onwards (subject to renewal)
                            </p>
                            <p>
                              <span className="font-semibold">🏛️ Office copy:</span> Available for
                              inspection at Khan Hub head office during working hours.
                            </p>
                            {(cert as any).imagePath && (
                              <button
                                onClick={() => setSelectedImage((cert as any).imagePath)}
                                className="mt-2 w-full px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                📄 View Certificate Image
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Support Certificates (Audits & Compliance) */}
          {supportCertificates.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div>
                  <h2 className="font-display font-semibold text-neutral-900 text-base sm:text-lg">
                    Audits, approvals & compliance
                  </h2>
                  <p className="text-[11px] sm:text-xs text-neutral-600 mt-1">
                    Ongoing checks and reports that keep us aligned with laws and best practices.
                  </p>
                </div>
                <span className="text-[10px] sm:text-[11px] text-neutral-500 font-medium">
                  {supportCertificates.length} certificate{supportCertificates.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {supportCertificates.map((cert, index) => {
                  const isExpanded = expandedTitle === cert.title;
                  return (
                    <article
                      key={cert.title}
                      className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300 animate-fade-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                      itemScope
                      itemType="https://schema.org/Certification"
                    >
                      <div className="relative p-4 sm:p-5 flex flex-col h-full">
                        {/* Certificate Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-lg sm:text-xl flex-shrink-0" aria-hidden="true">
                            {cert.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-neutral-900 text-sm sm:text-base leading-snug" itemProp="name">
                              {cert.title}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-neutral-600 mt-0.5" itemProp="issuedBy">
                              {cert.issuer}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-lg bg-white text-neutral-800 text-[10px] sm:text-xs font-semibold px-2 py-0.5 border border-neutral-200 flex-shrink-0" itemProp="dateIssued">
                            {cert.year}
                          </span>
                        </div>

                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleExpanded(cert.title)}
                          className="mt-auto inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors min-h-[32px]"
                          aria-expanded={isExpanded}
                          aria-controls={`details-${cert.title.replace(/\s+/g, '-')}`}
                        >
                          {isExpanded ? 'Hide details' : 'Why this matters'}
                          <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div
                            id={`details-${cert.title.replace(/\s+/g, '-')}`}
                            className="mt-3 border-t border-neutral-200 pt-3 text-[11px] sm:text-xs text-neutral-700 space-y-2 animate-fade-in"
                          >
                            <p>
                              <span className="font-semibold">✅ Assurance:</span> Confirms that our
                              accounts and processes are being reviewed by external professionals.
                            </p>
                            <p>
                              <span className="font-semibold">📊 Scope:</span> Includes financial
                              records, governance, and core compliance checks.
                            </p>
                            {(cert as any).imagePath && (
                              <button
                                onClick={() => setSelectedImage((cert as any).imagePath)}
                                className="mt-2 w-full px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                📄 View Certificate Image
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {coreCertificates.length === 0 && supportCertificates.length === 0 && (
            <div className="text-center py-16 sm:py-20">
              <div className="text-4xl sm:text-5xl mb-4" aria-hidden="true">📄</div>
              <h3 className="font-display font-semibold text-neutral-900 text-base sm:text-lg mb-2">
                No certificates found
              </h3>
              <p className="text-neutral-600 text-sm">
                Try adjusting your filters to see more results
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================================ */}
      {/* SECTION 3: Verification & Contact Information */}
      {/* ============================================================================ */}
      <section className="section bg-gradient-subtle" aria-labelledby="verification-heading">
        <div className="section-inner max-w-5xl mx-auto">
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-neutral-sm p-5 sm:p-6 md:p-7 lg:p-8 grid grid-cols-1 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] gap-6 sm:gap-8 items-start">
            {/* Verification Instructions */}
            <div>
              <h3 id="verification-heading" className="font-display font-semibold text-neutral-900 text-base sm:text-lg mb-3">
                How to verify our certificates
              </h3>
              <p className="text-neutral-700 text-sm sm:text-base leading-relaxed mb-4">
                We encourage donors, partners, and institutions to verify any document they see on
                this page directly with the issuing authority.
              </p>
              <ul className="space-y-2 sm:space-y-2.5 text-[11px] sm:text-xs text-neutral-700" role="list">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary-600 flex-shrink-0" aria-hidden="true">•</span>
                  <span>Match the certificate title, issuer name, and year with the original scan in
                    our records.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary-600 flex-shrink-0" aria-hidden="true">•</span>
                  <span>For SECP, FBR, and health licenses, you can cross-check using their public
                    portals or helplines.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary-600 flex-shrink-0" aria-hidden="true">•</span>
                  <span>For detailed scans or notarized copies, contact our admin office.</span>
                </li>
              </ul>
            </div>

            {/* Contact CTA Box */}
            <div className="rounded-xl border border-dashed border-primary-300 bg-primary-50/60 p-4 sm:p-5 text-[11px] sm:text-xs text-neutral-800 space-y-2.5 sm:space-y-3">
              <p className="font-semibold text-primary-800 text-xs sm:text-sm">
                Need a specific certificate copy?
              </p>
              <p className="leading-relaxed">
                Email our documentation team at{' '}
                <a
                  href={`mailto:${siteEmail}`}
                  className="text-primary-700 font-semibold underline decoration-primary-300 underline-offset-2 hover:text-primary-800 transition-colors"
                >
                  {siteEmail}
                </a>{' '}
                with the certificate name, purpose, and your organization details.
              </p>
              <p className="leading-relaxed">
                For in-person verification, please book an appointment so our team can prepare the
                relevant originals before your visit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Image Modal - Full Screen Certificate Viewer */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="fixed top-4 right-4 z-10 w-12 h-12 flex items-center justify-center bg-white hover:bg-neutral-100 rounded-full shadow-2xl transition-all hover:scale-110"
              aria-label="Close image"
            >
              <span className="text-3xl text-neutral-800 font-light">×</span>
            </button>

            {/* Image Container with Scroll */}
            <div
              className="relative max-w-6xl w-full max-h-full overflow-auto bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6">
                <Image
                  src={selectedImage}
                  alt="Certificate - Click to close"
                  width={1200}
                  height={1600}
                  className="w-full h-auto"
                  quality={100}
                  priority
                />
              </div>
            </div>

            {/* Hint Text */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <p className="text-xs text-neutral-700 font-semibold">Click outside or press × to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
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
          animation: fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </>
  );
}