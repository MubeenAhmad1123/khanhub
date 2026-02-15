// src/app/about/page.tsx
// ============================================================================
// ABOUT PAGE - Organization mission, vision, values, and journey
// Optimized for SEO, mobile responsiveness, and code maintainability
// ============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero, SectionHeader } from '@/components/ui';
import { SITE } from '@/data/site';
import { AnimatedCounter } from '@/components/animated-counter';

// ============================================================================
// SEO METADATA - Optimized for search engines and social sharing
// ============================================================================
export const metadata: Metadata = {
  title: 'About Khan Hub - Pakistan\'s Leading Welfare Organization | Our Mission & Values',
  description:
    'Discover Khan Hub\'s mission to provide accessible healthcare, education, and welfare services across Pakistan. Learn about our 16 departments, 10+ years of community service, and 50,000+ lives impacted since 2015.',

  keywords: [
    'Khan Hub about',
    'welfare organization Pakistan',
    'NGO mission Pakistan',
    'healthcare education Pakistan',
    'community development',
    'social services Punjab',
    'nonprofit organization Lahore',
    'charitable organization Pakistan',
    'Khan Hub history',
    'welfare programs Pakistan',
    'community health services',
    'education support Pakistan'
  ],

  openGraph: {
    title: 'About Khan Hub - Mission, Vision & Impact',
    description:
      'Leading Pakistan\'s welfare transformation with 16 specialized departments. 10+ years of service, 50,000+ lives impacted through healthcare, education, and community development.',
    url: `${SITE.url || 'https://khanhub.com.pk'}/about`,
    type: 'website',
    images: [
      {
        url: '/og-about.jpg',
        width: 1200,
        height: 630,
        alt: 'Khan Hub - About Our Mission and Impact',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'About Khan Hub - Mission, Vision & Impact',
    description:
      '10+ years of community service, 16 departments, 50,000+ lives impacted across Pakistan.',
    images: ['/twitter-about.jpg'],
  },

  alternates: {
    canonical: `${SITE.url || 'https://khanhub.com.pk'}/about`,
  },

  robots: {
    index: true,
    follow: true,
  },
};

// ============================================================================
// DATA CONSTANTS - Centralized for maintainability
// ============================================================================
const VALUES = [
  {
    title: 'Compassion in Action',
    emoji: '🤝',
    desc: 'Patients, students, and families are treated with dignity, respect, and real care.',
  },
  {
    title: 'Transparency',
    emoji: '🔍',
    desc: 'Clear reporting on donations, programs, and long-term outcomes.',
  },
  {
    title: 'Empowerment',
    emoji: '💪',
    desc: 'Education, skills, and jobs instead of one-time relief only.',
  },
  {
    title: 'Sustainability',
    emoji: '🌱',
    desc: 'Programs designed to run consistently, not just during emergencies.',
  },
  {
    title: 'Inclusivity',
    emoji: '⚖️',
    desc: 'Open to all, regardless of income, gender, age, or background.',
  },
  {
    title: 'Excellence',
    emoji: '🎯',
    desc: 'Clinical, educational, and operational quality as a standard.',
  },
] as const;

const IMPACT_STATS = [
  {
    label: 'Years of service',
    value: 10,
    suffix: '+',
    desc: 'Serving communities since 2015 with a growing footprint.',
  },
  {
    label: 'Departments',
    value: 16,
    suffix: '',
    desc: 'Healthcare, education, skills, welfare and more under one hub.',
  },
  {
    label: 'Lives impacted',
    value: 50000,
    suffix: '+',
    desc: 'Patients treated, students supported, families assisted.',
  },
  {
    label: 'Cities reached',
    value: 5,
    suffix: '+',
    desc: 'Expanding operations across Punjab and beyond.',
  },
] as const;

const TIMELINE = [
  {
    year: '2015',
    title: 'First community clinic',
    body: 'Khan Hub begins as a small clinic focused on accessible, respectful healthcare.',
  },
  {
    year: '2018',
    title: 'Education & skills programs',
    body: 'Scholarships, tuition support, and skill development initiatives start.',
  },
  {
    year: '2021',
    title: 'Integrated welfare services',
    body: 'Food support, rehabilitation, and social programs are added under one umbrella.',
  },
  {
    year: 'Today',
    title: 'Multi-department hub',
    body: '16 specialized departments working together to serve thousands every year.',
  },
] as const;

const HOW_WE_WORK = [
  {
    step: '01',
    title: 'Listen first',
    desc: 'We start by understanding what patients, families, and youth are actually facing on the ground.',
  },
  {
    step: '02',
    title: 'Design programs',
    desc: 'Clinics, institutes, skills centers, and welfare programs are shaped around real community needs.',
  },
  {
    step: '03',
    title: 'Deliver with quality',
    desc: 'Teams follow clear protocols, ethical standards, and continuous training.',
  },
  {
    step: '04',
    title: 'Measure impact',
    desc: 'We track outcomes so every rupee, volunteer hour, and partnership creates visible change.',
  },
] as const;

const TRUST_POINTS = [
  'Registered welfare organization with compliant documentation.',
  'Multi-disciplinary team across medical, education, and social work.',
  'Clear separation of Zakat, donations, and project-based funds.',
  'Independent professionals review financials and processes.',
] as const;

// ============================================================================
// REUSABLE STYLES - DRY principle
// ============================================================================
const cardClass =
  'relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-300 transition-all duration-500 hover:-translate-y-1.5 group';
const cardOverlayClass =
  'pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50/30 via-transparent to-success-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500';

// ============================================================================
// PAGE COMPONENT
// ============================================================================
export default function AboutPage() {
  return (
    <>
      {/* Semantic HTML: article element for main content */}
      <article itemScope itemType="https://schema.org/NGO">
        {/* Hero Section - Uses enhanced PageHero component with Split layout */}
        <PageHero
          type="split"
          badge="About Khan Hub"
          title="Built for people, not just patients"
          subtitle="Khan Hub is a connected ecosystem of clinics, institutes, and welfare services designed so that one visit can open many doors of support."
          image="/images/about-hero.webp"
          cta={
            <Link href="/contact" className="btn-primary">
              Contact Our Team
            </Link>
          }
        >
          <Link href="/donate" className="btn-secondary">
            Support Our Mission
          </Link>
        </PageHero>

        {/* ============================================================================ */}
        {/* SECTION 1: Organization Story & Impact Statistics */}
        {/* ============================================================================ */}
        <section className="section relative overflow-hidden bg-gradient-light" aria-labelledby="story-heading">
          {/* Decorative background elements */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-brand opacity-20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-success opacity-20 blur-3xl" aria-hidden="true" />

          <div className="section-inner relative grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-8 md:gap-10 xl:gap-16 items-start">
            {/* Organization Story */}
            <div className="content-spacing animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 mb-2">
                Who we are
              </p>
              <h2 id="story-heading" className="font-display font-bold text-2xl sm:text-3xl md:text-3xl lg:text-4xl text-neutral-900 mb-4 leading-tight">
                A <span className="text-gradient">single hub</span> for health, hope, and opportunity
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <p className="text-neutral-800 text-sm sm:text-base leading-relaxed">
                  Khan Hub brings together healthcare, education, skills, employment, and social
                  welfare under one roof. Each department is designed to solve real problems with
                  professional care, not temporary fixes.
                </p>
                <p className="text-neutral-800 text-sm sm:text-base leading-relaxed">
                  Instead of sending people from door to door, we connect services around them — so a
                  medical visit can connect someone to medicines, food support, skill training, or job
                  help in the same ecosystem.
                </p>
              </div>

              {/* Key features grid - mobile optimized */}
              <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs sm:text-sm text-neutral-700">
                <div className="flex items-start gap-2 sm:gap-2.5">
                  <span className="mt-0.5 text-success-600 flex-shrink-0" aria-hidden="true">✓</span>
                  <p>Clinics, institutes, skills, and welfare services under one umbrella.</p>
                </div>
                <div className="flex items-start gap-2 sm:gap-2.5">
                  <span className="mt-0.5 text-success-600 flex-shrink-0" aria-hidden="true">✓</span>
                  <p>Respectful, non-judgmental care for every visitor.</p>
                </div>
                <div className="flex items-start gap-2 sm:gap-2.5">
                  <span className="mt-0.5 text-success-600 flex-shrink-0" aria-hidden="true">✓</span>
                  <p>Programs designed for long-term dignity, not one-time relief only.</p>
                </div>
              </div>
            </div>

            {/* Impact Statistics - mobile responsive grid */}
            <div className="animate-fade-up">
              <div className="mb-4 sm:mb-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-neutral-200 px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs text-neutral-700 shadow-neutral-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" aria-hidden="true" />
                  Trusted community welfare hub since 2015
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {IMPACT_STATS.map((item, index) => (
                  <div
                    key={item.label}
                    className={cardClass}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className={cardOverlayClass} />
                    <div className="relative p-4 sm:p-5">
                      <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-neutral-600 mb-1.5">
                        {item.label}
                      </div>
                      <AnimatedCounter
                        to={item.value}
                        suffix={item.suffix}
                        className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-primary-600 mb-1 block"
                      />
                      <p className="text-[11px] sm:text-xs text-neutral-700 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statistical disclaimer */}
              <p className="mt-4 text-[10px] sm:text-[11px] text-neutral-600 leading-relaxed">
                Numbers are approximate and grow as new departments, centers, and partnerships open.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================================ */}
        {/* SECTION 2: Mission, Vision & Methodology */}
        {/* ============================================================================ */}
        <section className="section bg-white" aria-labelledby="mission-heading">
          <div className="section-inner grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] gap-8 md:gap-10 lg:gap-14 items-start">
            {/* Mission & Vision Cards */}
            <div className="space-y-4 sm:space-y-5 animate-fade-up">
              <SectionHeader
                badge="Our Direction"
                title="Mission & Vision"
                subtitle="A clear north star keeps every clinic, classroom, and program aligned."
              />

              <div className="space-y-3 sm:space-y-4">
                {/* Mission Card */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm font-semibold text-primary-700">
                    <span aria-hidden="true">🎯</span>
                    <span>Mission</span>
                  </div>
                  <p className="text-neutral-800 text-sm sm:text-base leading-relaxed">
                    To provide accessible, high-quality health, education, skills, and welfare services
                    for underprivileged communities across Pakistan.
                  </p>
                </div>

                {/* Vision Card */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm font-semibold text-primary-700">
                    <span aria-hidden="true">🔮</span>
                    <span>Vision</span>
                  </div>
                  <p className="text-neutral-800 text-sm sm:text-base leading-relaxed">
                    A Pakistan where every person has access to dignity, opportunity, and reliable
                    support regardless of their background or income.
                  </p>
                </div>
              </div>
            </div>

            {/* How We Work Process Steps */}
            <div className="animate-fade-up">
              <h3 id="mission-heading" className="font-display font-semibold text-neutral-900 text-base sm:text-lg mb-4 sm:mb-5">
                How we turn support into long-term change
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {HOW_WE_WORK.map((item, index) => (
                  <div
                    key={item.step}
                    className="relative rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5 overflow-hidden"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="pointer-events-none absolute -top-10 -right-10 h-16 w-16 rounded-full bg-gradient-brand opacity-10 blur-2xl" aria-hidden="true" />
                    <div className="relative">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700 mb-1.5 sm:mb-2">
                        Step {item.step}
                      </div>
                      <h4 className="font-display font-semibold text-neutral-900 text-sm sm:text-base mb-1.5 sm:mb-2">
                        {item.title}
                      </h4>
                      <p className="text-neutral-700 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================ */}
        {/* SECTION 3: Core Values */}
        {/* ============================================================================ */}
        <section className="section bg-gradient-subtle" aria-labelledby="values-heading">
          <div className="section-inner">
            <SectionHeader
              badge="Our Foundation"
              title="Values we live by"
              subtitle="These principles guide how we design programs, treat people, and measure our success."
            />

            <h3 id="values-heading" className="sr-only">Khan Hub Core Values</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              {VALUES.map((v, index) => (
                <div
                  key={v.title}
                  className={`${cardClass} animate-fade-up`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className={cardOverlayClass} />
                  <div className="relative p-4 sm:p-5">
                    <div className="mb-3 text-2xl sm:text-3xl" aria-hidden="true">{v.emoji}</div>
                    <h4 className="font-display font-semibold text-neutral-900 text-sm sm:text-base mb-1.5 sm:mb-2">
                      {v.title}
                    </h4>
                    <p className="text-neutral-800 text-xs sm:text-sm leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================================ */}
        {/* SECTION 4: Organization Timeline */}
        {/* ============================================================================ */}
        <section className="section bg-white" aria-labelledby="timeline-heading">
          <div className="section-inner">
            <SectionHeader
              badge="Our Journey"
              title="From one clinic to a complete hub"
              subtitle="Khan Hub has grown step by step, guided by real community needs."
            />

            <h3 id="timeline-heading" className="sr-only">Khan Hub Timeline and Milestones</h3>
            <div className="max-w-4xl mx-auto">
              <div className="relative pl-6 sm:pl-8 md:pl-0">
                {/* Timeline vertical line - hidden on mobile, centered on desktop */}
                <div className="hidden md:block absolute left-1/2 -translate-x-1/2 h-full w-px bg-gradient-to-b from-primary-300 via-neutral-200 to-success-300" aria-hidden="true" />

                <div className="space-y-6 sm:space-y-8">
                  {TIMELINE.map((step, index) => (
                    <div
                      key={step.year}
                      className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6 animate-fade-up"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="md:w-1/2 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-primary-500/10 border border-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300">
                          {step.year}
                          {/* Inner dot */}
                          <div className="absolute -right-1 -top-1 w-3 h-3 bg-success-500 rounded-full border-2 border-white" />
                        </div>
                        <div className="md:text-right flex-1">
                          <h4 className="font-display font-semibold text-sm sm:text-base text-neutral-900">
                            {step.title}
                          </h4>
                        </div>
                      </div>
                      <div className="md:w-1/2 pl-13 sm:pl-15 md:pl-0">
                        <p className="text-neutral-800 text-xs sm:text-sm md:text-base leading-relaxed">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================ */}
        {/* SECTION 5: Founder Message & Trust Information */}
        {/* ============================================================================ */}
        <section className="section bg-gradient-light" aria-labelledby="founder-heading">
          <div className="section-inner grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-start">
            {/* Founder Message Card */}
            <div className={`${cardClass} animate-fade-up`}>
              <div className={cardOverlayClass} />
              <div className="relative p-5 sm:p-6 lg:p-7">
                <div className="flex flex-col items-center text-center mb-4 sm:mb-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-2xl sm:text-3xl mb-3" aria-hidden="true">
                    🧑‍⚕️
                  </div>
                  <h3 id="founder-heading" className="font-display font-bold text-neutral-900 text-base sm:text-lg md:text-xl">
                    Founder&apos;s message
                  </h3>
                  <p className="text-neutral-600 text-xs sm:text-sm mt-1">
                    Khan Muhammad — Founder, Khan Hub
                  </p>
                </div>
                <blockquote className="text-neutral-800 text-sm sm:text-base leading-relaxed">
                  <p>
                    &quot;When we started Khan Hub, we had one clinic and a simple promise: nobody should
                    be turned away because they cannot afford care. Today, with multiple departments and
                    thousands of lives impacted, our responsibility is even bigger. Every rupee, every
                    volunteer hour, and every partnership helps us build the kind of Pakistan we all
                    want to live in.&quot;
                  </p>
                </blockquote>
              </div>
            </div>

            {/* Trust & Governance Card */}
            <div
              className={`${cardClass} animate-fade-up`}
              style={{ animationDelay: '120ms' }}
            >
              <div className={cardOverlayClass} />
              <div className="relative p-5 sm:p-6 lg:p-7">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl" aria-hidden="true">📜</span>
                  <h4 className="font-display font-semibold text-neutral-900 text-sm sm:text-base">
                    Legal, registration & trust
                  </h4>
                </div>
                <p className="text-neutral-800 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-5">
                  Khan Hub operates as a properly registered welfare organization, with documentation
                  and compliance to give donors, partners, and families complete confidence.
                </p>
                <ul className="space-y-2.5 sm:space-y-3" role="list">
                  {TRUST_POINTS.map((point) => (
                    <li key={point} className="text-neutral-800 text-xs sm:text-sm flex items-start gap-2">
                      <span className="mt-0.5 text-success-600 flex-shrink-0" aria-hidden="true">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-neutral-200">
                  <p className="text-[11px] sm:text-xs text-neutral-700 leading-relaxed">
                    For detailed registration numbers or documents, please contact our admin office at{' '}
                    <a
                      href={`mailto:${SITE.email}`}
                      className="text-primary-600 font-medium hover:text-primary-700 transition-colors underline decoration-primary-300 underline-offset-2"
                    >
                      {SITE.email}
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Schema.org structured data for NGO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'NGO',
              name: 'Khan Hub',
              alternateName: 'Khan Hub Pakistan',
              url: SITE.url || 'https://khanhub.com.pk',
              logo: `${SITE.url || 'https://khanhub.com.pk'}/logo.png`,
              description:
                'Leading welfare organization in Pakistan providing integrated healthcare, education, skills development, and social services through 16 specialized departments.',
              foundingDate: '2015',
              founder: {
                '@type': 'Person',
                name: 'Khan Muhammad',
              },
              address: {
                '@type': 'PostalAddress',
                streetAddress: SITE.address,
                addressCountry: 'PK',
                addressRegion: 'Punjab',
              },
              telephone: SITE.phone,
              email: SITE.email,
              areaServed: {
                '@type': 'Country',
                name: 'Pakistan',
              },
              knowsAbout: [
                'Healthcare Services',
                'Education Support',
                'Skills Development',
                'Community Welfare',
                'Emergency Services',
                'Social Services',
              ],
              numberOfEmployees: {
                '@type': 'QuantitativeValue',
                value: 50,
              },
              slogan: 'Built for people, not just patients',
            }),
          }}
        />
      </article>
    </>
  );
}