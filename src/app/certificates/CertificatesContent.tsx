// src/app/certificates/CertificatesContent.tsx

'use client';

import { useMemo, useState } from 'react';

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

const RAW_CERTIFICATES = [
  {
    category: 'Registration' as const,
    items: [
      {
        title: 'Company Registration Certificate',
        issuer: 'Securities & Exchange Commission of Pakistan (SECP)',
        year: 2015,
        icon: '📄',
        type: 'core' as const,
        status: 'Active' as const,
      },
      {
        title: 'NGO Registration Certificate',
        issuer: 'Social Welfare Department, Punjab',
        year: 2015,
        icon: '📄',
        type: 'core' as const,
        status: 'Active' as const,
      },
      {
        title: 'Tax Exemption Certificate',
        issuer: 'Federal Board of Revenue (FBR)',
        year: 2016,
        icon: '📄',
        type: 'core' as const,
        status: 'Renewed' as const,
      },
    ],
  },
  {
    category: 'Approvals & Compliance' as const,
    items: [
      {
        title: 'Annual Audit Report',
        issuer: 'Certified Public Accountants',
        year: 2024,
        icon: '✅',
        type: 'support' as const,
        status: 'Issued' as const,
      },
      {
        title: 'SECP Annual Compliance Certificate',
        issuer: 'Securities & Exchange Commission',
        year: 2024,
        icon: '✅',
        type: 'support' as const,
        status: 'Issued' as const,
      },
      {
        title: 'Charity Commission Approval',
        issuer: 'Attorney General Office, Punjab',
        year: 2017,
        icon: '✅',
        type: 'core' as const,
        status: 'Active' as const,
      },
    ],
  },
  {
    category: 'Healthcare Accreditation' as const,
    items: [
      {
        title: 'Medical Facility License',
        issuer: 'Drug Regulatory Authority of Pakistan (DRAP)',
        year: 2018,
        icon: '🏥',
        type: 'core' as const,
        status: 'Active' as const,
      },
      {
        title: 'Health Department Approval',
        issuer: 'Punjab Health Department',
        year: 2018,
        icon: '🏥',
        type: 'core' as const,
        status: 'Active' as const,
      },
    ],
  },
];

const CERTIFICATES: CertificateItem[] = RAW_CERTIFICATES.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    category: group.category,
  }))
);

const CATEGORY_TABS: CertificateCategory[] = [
  'All',
  'Registration',
  'Approvals & Compliance',
  'Healthcare Accreditation',
];

const YEAR_FILTERS = ['All', 'Latest (2024)', '2018–2020', '2015–2017'] as const;
type YearFilter = (typeof YEAR_FILTERS)[number];

type Props = {
  siteEmail: string;
};

export function CertificatesContent({ siteEmail }: Props) {
  const [activeCategory, setActiveCategory] = useState<CertificateCategory>('All');
  const [activeYearFilter, setActiveYearFilter] = useState<YearFilter>('All');
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null);

  const filteredCertificates = useMemo(() => {
    let list = [...CERTIFICATES];

    if (activeCategory !== 'All') {
      list = list.filter((c) => c.category === activeCategory);
    }

    if (activeYearFilter === 'Latest (2024)') {
      list = list.filter((c) => c.year === 2024);
    } else if (activeYearFilter === '2018–2020') {
      list = list.filter((c) => c.year >= 2018 && c.year <= 2020);
    } else if (activeYearFilter === '2015–2017') {
      list = list.filter((c) => c.year >= 2015 && c.year <= 2017);
    }

    list.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.type === b.type) return a.title.localeCompare(b.title);
      return a.type === 'core' ? -1 : 1;
    });

    return list;
  }, [activeCategory, activeYearFilter]);

  const coreCertificates = filteredCertificates.filter((c) => c.type === 'core');
  const supportCertificates = filteredCertificates.filter((c) => c.type === 'support');

  const toggleExpanded = (title: string) => {
    setExpandedTitle((prev) => (prev === title ? null : title));
  };

  return (
    <>
      {/* Top band – trust + filters */}
      <section className="section bg-gradient-light">
        <div className="section-inner relative">
          <div className="pointer-events-none absolute -top-20 -right-16 h-40 w-40 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-gradient-success opacity-20 blur-3xl" />

          <div className="relative max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white/90 shadow-neutral-sm px-4 py-3 md:px-5 md:py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-success-500 text-white flex items-center justify-center text-lg">
                  🛡️
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-900">
                    Verified welfare & healthcare organization
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    Key registrations and compliance certificates are listed below. Originals are
                    available for view at our head office.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-700">
                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 text-success-700 border border-success-100 px-2 py-1 font-semibold">
                  ● Up to date
                </span>
                <span className="hidden sm:inline text-neutral-500">
                  Last updated: 2024–2025 audit cycle
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TABS.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`inline-flex items-center justify-center rounded-full text-[11px] font-semibold px-3.5 py-1.5 transition-all border ${
                        isActive
                          ? 'bg-primary-500 text-white border-primary-500 shadow-primary-sm'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-600'
                      }`}
                    >
                      {cat === 'All' ? 'All certificates' : cat}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {YEAR_FILTERS.map((filter) => {
                  const isActive = activeYearFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveYearFilter(filter)}
                      className={`rounded-full px-3 py-1 transition-all border ${
                        isActive
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-600'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main certificate wall */}
      <section className="section bg-white">
        <div className="section-inner max-w-6xl mx-auto space-y-10">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display font-semibold text-neutral-900 text-base">
                Core registrations & licenses
              </h2>
              <p className="text-[11px] text-neutral-500">
                These documents establish Khan Hub as a legally registered and licensed entity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coreCertificates.map((cert, index) => {
                const isExpanded = expandedTitle === cert.title;
                return (
                  <div
                    key={cert.title}
                    className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50 opacity-90" />
                    <div className="relative p-4 sm:p-5 flex flex-col h-full">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white/80 border border-neutral-200 flex items-center justify-center text-xl flex-shrink-0">
                          {cert.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold text-neutral-900 text-sm leading-snug">
                            {cert.title}
                          </h3>
                          <p className="text-[11px] text-neutral-600 mt-0.5">
                            {cert.issuer}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="inline-flex items-center rounded-lg bg-neutral-900 text-white text-[10px] font-semibold px-2 py-0.5">
                            {cert.year}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full text-[10px] px-2 py-0.5 ${
                              cert.status === 'Active'
                                ? 'bg-success-50 text-success-700 border border-success-100'
                                : 'bg-primary-50 text-primary-700 border border-primary-100'
                            }`}
                          >
                            {cert.status}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleExpanded(cert.title)}
                        className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800"
                      >
                        {isExpanded ? 'Hide details' : 'View details'}
                        <span>{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 border-t border-neutral-200 pt-2 text-[11px] text-neutral-700 space-y-1.5">
                          <p>
                            📎 <span className="font-semibold">Document type:</span>{' '}
                            {cert.category}
                          </p>
                          <p>
                            🕒 <span className="font-semibold">Valid from:</span> {cert.year}{' '}
                            onwards (subject to renewal)
                          </p>
                          <p>
                            🏛️ <span className="font-semibold">Office copy:</span> Available for
                            inspection at Khan Hub head office during working hours.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {supportCertificates.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-display font-semibold text-neutral-900 text-base">
                  Audits, approvals & compliance
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Ongoing checks and reports that keep us aligned with laws and best practices.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportCertificates.map((cert, index) => {
                  const isExpanded = expandedTitle === cert.title;
                  return (
                    <div
                      key={cert.title}
                      className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="relative p-4 sm:p-5 flex flex-col h-full">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-lg flex-shrink-0">
                            {cert.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-neutral-900 text-sm leading-snug">
                              {cert.title}
                            </h3>
                            <p className="text-[11px] text-neutral-600 mt-0.5">
                              {cert.issuer}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-lg bg-white text-neutral-800 text-[10px] font-semibold px-2 py-0.5 border border-neutral-200 flex-shrink-0">
                            {cert.year}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleExpanded(cert.title)}
                          className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800"
                        >
                          {isExpanded ? 'Hide details' : 'Why this matters'}
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 border-t border-neutral-200 pt-2 text-[11px] text-neutral-700 space-y-1.5">
                            <p>
                              ✅ <span className="font-semibold">Assurance:</span> Confirms that our
                              accounts and processes are being reviewed by external professionals.
                            </p>
                            <p>
                              📊 <span className="font-semibold">Scope:</span> Includes financial
                              records, governance, and core compliance checks.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Verification & contact strip */}
      <section className="section bg-gradient-subtle">
        <div className="section-inner max-w-5xl mx-auto">
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-neutral-sm p-5 md:p-6 lg:p-7 grid grid-cols-1 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] gap-6 items-center">
            <div>
              <h3 className="font-display font-semibold text-neutral-900 text-base mb-2">
                How to verify our certificates
              </h3>
              <p className="text-neutral-700 text-sm leading-relaxed mb-3">
                We encourage donors, partners, and institutions to verify any document they see on
                this page directly with the issuing authority.
              </p>
              <ul className="space-y-1.5 text-[11px] text-neutral-700">
                <li>
                  • Match the certificate title, issuer name, and year with the original scan in
                  our records.
                </li>
                <li>
                  • For SECP, FBR, and health licenses, you can cross‑check using their public
                  portals or helplines.
                </li>
                <li>
                  • For detailed scans or notarized copies, contact our admin office.
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-dashed border-primary-300 bg-primary-50/60 p-4 text-[11px] text-neutral-800 space-y-2">
              <p className="font-semibold text-primary-800 text-xs">
                Need a specific certificate copy?
              </p>
              <p>
                Email our documentation team at{' '}
                <span className="text-primary-700 font-semibold underline decoration-primary-300 underline-offset-2">
                  {siteEmail}
                </span>{' '}
                with the certificate name, purpose, and your organization details.
              </p>
              <p>
                For in‑person verification, please book an appointment so our team can prepare the
                relevant originals before your visit.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
