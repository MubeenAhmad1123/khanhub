// src/app/about/page.tsx

import { PageHero, SectionHeader } from '@/components/ui';
import { generateMetadata } from '@/lib/utils';
import { SITE } from '@/data/site';
import { AnimatedCounter } from '@/components/animated-counter';

export const metadata = generateMetadata({
  title: 'About Us',
  description:
    "Learn about Khan Hub — our mission, vision, values, and the team behind Pakistan's leading welfare organization.",
  slug: 'about',
});

const VALUES = [
  {
    title: 'Compassion in Action',
    emoji: '🤝',
    desc: 'Patients, students, and families are treated with dignity, respect, and real care.',
  },
  {
    title: 'Transparency',
    emoji: '🔍',
    desc: 'Clear reporting on donations, programs, and long‑term outcomes.',
  },
  {
    title: 'Empowerment',
    emoji: '💪',
    desc: 'Education, skills, and jobs instead of one‑time relief only.',
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
];

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
];

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
    title: 'Multi‑department hub',
    body: '16 specialized departments working together to serve thousands every year.',
  },
];

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
];

const TRUST_POINTS = [
  'Registered welfare organization with compliant documentation.',
  'Multi‑disciplinary team across medical, education, and social work.',
  'Clear separation of Zakat, donations, and project‑based funds.',
  'Independent professionals review financials and processes.',
];

const cardClass =
  'relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-neutral-sm hover:shadow-primary-md hover:-translate-y-1 transition-all duration-300';
const cardOverlayClass =
  'pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-success-50 opacity-90';

export default function AboutPage() {
  return (
    <>
      {/* HERO – slightly upgraded but still using your global component */}
      <PageHero
        badge="About Khan Hub"
        title="Built for people, not just patients"
        subtitle="Khan Hub is a connected ecosystem of clinics, institutes, and welfare services designed so that one visit can open many doors of support."
      />

      {/* SECTION 1 – Story + impact stats band */}
      <section className="section relative overflow-hidden bg-gradient-light">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-success opacity-20 blur-3xl" />

        <div className="section-inner relative grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-10 xl:gap-16 items-start">
          {/* Story */}
          <div className="content-spacing animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 mb-2">
              Who we are
            </p>
            <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl text-neutral-900 mb-3">
              A <span className="text-gradient">single hub</span> for health, hope, and opportunity
            </h2>
            <p className="text-neutral-800 text-sm md:text-base leading-relaxed">
              Khan Hub brings together healthcare, education, skills, employment, and social
              welfare under one roof. Each department is designed to solve real problems with
              professional care, not temporary fixes.
            </p>
            <p className="text-neutral-800 text-sm md:text-base leading-relaxed mt-3">
              Instead of sending people from door to door, we connect services around them — so a
              medical visit can connect someone to medicines, food support, skill training, or job
              help in the same ecosystem.
            </p>

            {/* mini bullet strip */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-success-600">✓</span>
                <p>Clinics, institutes, skills, and welfare services under one umbrella.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-success-600">✓</span>
                <p>Respectful, non‑judgmental care for every visitor.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-success-600">✓</span>
                <p>Programs designed for long‑term dignity, not one‑time relief only.</p>
              </div>
            </div>
          </div>

          {/* Impact stats */}
          <div className="animate-fade-up">
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-neutral-200 px-3 py-1 text-[11px] text-neutral-700 shadow-neutral-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                Trusted community welfare hub since 2015
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {IMPACT_STATS.map((item, index) => (
                <div
                  key={item.label}
                  className={cardClass}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className={cardOverlayClass} />
                  <div className="relative p-4 sm:p-5">
                    <div className="text-[11px] uppercase tracking-wide text-neutral-600 mb-1.5">
                      {item.label}
                    </div>
                    <AnimatedCounter
                      to={item.value}
                      suffix={item.suffix}
                      className="font-display font-bold text-2xl md:text-3xl text-primary-600 mb-1 block"
                    />
                    <p className="text-[11px] sm:text-xs text-neutral-700 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* subtle trust note */}
            <p className="mt-4 text-[11px] text-neutral-600">
              Numbers are approximate and grow as new departments, centers, and partnerships open.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 – Mission / Vision / How we work */}
      <section className="section bg-white">
        <div className="section-inner grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] gap-10 lg:gap-14 items-start">
          {/* Mission + Vision */}
          <div className="space-y-4 animate-fade-up">
            <SectionHeader
              badge="Our Direction"
              title="Mission & Vision"
              subtitle="A clear north star keeps every clinic, classroom, and program aligned."
            />

            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-primary-700">
                  <span>🎯</span>
                  <span>Mission</span>
                </div>
                <p className="text-neutral-800 text-sm leading-relaxed">
                  To provide accessible, high‑quality health, education, skills, and welfare services
                  for underprivileged communities across Pakistan.
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-primary-700">
                  <span>🔮</span>
                  <span>Vision</span>
                </div>
                <p className="text-neutral-800 text-sm leading-relaxed">
                  A Pakistan where every person has access to dignity, opportunity, and reliable
                  support regardless of their background or income.
                </p>
              </div>
            </div>
          </div>

          {/* How we work – process steps */}
          <div className="animate-fade-up">
            <h3 className="font-display font-semibold text-neutral-900 text-base mb-3">
              How we turn support into long‑term change
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HOW_WE_WORK.map((item, index) => (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-neutral-200 bg-neutral-50 p-4 overflow-hidden"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="pointer-events-none absolute -top-10 -right-10 h-16 w-16 rounded-full bg-gradient-brand opacity-10 blur-2xl" />
                  <div className="relative">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700 mb-1">
                      Step {item.step}
                    </div>
                    <h4 className="font-display font-semibold text-neutral-900 text-sm mb-1.5">
                      {item.title}
                    </h4>
                    <p className="text-neutral-700 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 – Values grid */}
      <section className="section bg-gradient-subtle">
        <div className="section-inner">
          <SectionHeader
            badge="Our Foundation"
            title="Values we live by"
            subtitle="These principles guide how we design programs, treat people, and measure our success."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUES.map((v, index) => (
              <div
                key={v.title}
                className={`${cardClass} animate-fade-up`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className={cardOverlayClass} />
                <div className="relative p-5">
                  <div className="mb-3 text-2xl">{v.emoji}</div>
                  <h4 className="font-display font-semibold text-neutral-900 text-sm mb-1.5">
                    {v.title}
                  </h4>
                  <p className="text-neutral-800 text-xs leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 – Journey timeline */}
      <section className="section bg-white">
        <div className="section-inner">
          <SectionHeader
            badge="Our Journey"
            title="From one clinic to a complete hub"
            subtitle="Khan Hub has grown step by step, guided by real community needs."
          />

          <div className="max-w-4xl mx-auto">
            <div className="relative pl-6 md:pl-0">
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 h-full w-px bg-gradient-to-b from-primary-300 via-neutral-200 to-success-300" />

              <div className="space-y-6">
                {TIMELINE.map((step, index) => (
                  <div
                    key={step.year}
                    className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6 animate-fade-up"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="md:w-1/2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center text-xs font-bold text-primary-700">
                        {step.year}
                      </div>
                      <div>
                        <div className="font-display font-semibold text-sm text-neutral-900">
                          {step.title}
                        </div>
                      </div>
                    </div>
                    <div className="md:w-1/2">
                      <p className="text-neutral-800 text-xs md:text-sm leading-relaxed">
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

      {/* SECTION 5 – Founder + Trust band */}
      <section className="section bg-gradient-light">
        <div className="section-inner grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] gap-10 lg:gap-12 items-start">
          {/* Founder message */}
          <div className={`${cardClass} animate-fade-up`}>
            <div className={cardOverlayClass} />
            <div className="relative p-6 lg:p-7">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-20 h-20 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-3xl mb-3">
                  🧑‍⚕️
                </div>
                <h3 className="font-display font-bold text-neutral-900 text-lg">
                  Founder&apos;s message
                </h3>
                <p className="text-neutral-600 text-xs mt-1">
                  Khan Muhammad — Founder, Khan Hub
                </p>
              </div>
              <p className="text-neutral-800 text-sm leading-relaxed">
                &quot;When we started Khan Hub, we had one clinic and a simple promise: nobody should
                be turned away because they cannot afford care. Today, with multiple departments and
                thousands of lives impacted, our responsibility is even bigger. Every rupee, every
                volunteer hour, and every partnership helps us build the kind of Pakistan we all
                want to live in.&quot;
              </p>
            </div>
          </div>

          {/* Trust / governance */}
          <div
            className={`${cardClass} animate-fade-up`}
            style={{ animationDelay: '120ms' }}
          >
            <div className={cardOverlayClass} />
            <div className="relative p-6 lg:p-7">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📜</span>
                <h4 className="font-display font-semibold text-neutral-900 text-sm">
                  Legal, registration & trust
                </h4>
              </div>
              <p className="text-neutral-800 text-xs leading-relaxed mb-4">
                Khan Hub operates as a properly registered welfare organization, with documentation
                and compliance to give donors, partners, and families complete confidence.
              </p>
              <ul className="space-y-2.5">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="text-neutral-800 text-xs flex items-start gap-2">
                    <span className="mt-0.5 text-success-600">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-[11px] text-neutral-700">
                For detailed registration numbers or documents, please contact our admin office at{' '}
                <span className="text-primary-600 font-medium">{SITE.email}</span>.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
