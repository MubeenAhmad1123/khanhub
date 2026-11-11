'use client';

// src/components/sections/LeadershipSection.tsx
// ─────────────────────────────────────────────────────────────────
// Leadership Messages Section — CEO's Message & Managing Director's Message
// ─────────────────────────────────────────────────────────────────

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Quote, Award, ShieldCheck } from 'lucide-react';

interface LeaderMessage {
  id: string;
  sectionTitle: string;
  badgeLabel: string;
  name: string;
  role: string;
  organization: string;
  motto: string;
  imageSrc: string;
  imageAlt: string;
  imageFit: 'contain' | 'cover';
  accent: 'primary' | 'success';
  paragraphs: string[];
  closingStatement: string;
}

const LEADERS: LeaderMessage[] = [
  {
    id: 'ceo-message',
    sectionTitle: "CEO's Message",
    badgeLabel: 'Chief Executive Officer',
    name: 'Muhammad Khan',
    role: 'Chief Executive Officer',
    organization: 'Khan Hub Private Limited',
    motto: 'Dreams into Reality.',
    imageSrc: '/logo-circle.webp',
    imageAlt: 'Muhammad Khan — Chief Executive Officer, Khan Hub Private Limited',
    imageFit: 'contain',
    accent: 'primary',
    paragraphs: [
      'At Khan Hub, we believe that success is not just about building an organization; it is about creating opportunities, transforming lives, and making a positive difference in society. Our journey is driven by vision, dedication, teamwork, and a commitment to excellence.',
      'Our goal is to provide quality services across multiple sectors, empower individuals, and build a platform where dreams turn into reality. I believe that with honesty, hard work, innovation, and strong leadership, we can achieve remarkable milestones together.',
    ],
    closingStatement: 'Together, we grow. Together, we serve. Together, we succeed.',
  },
  {
    id: 'managing-director-message',
    sectionTitle: "Managing Director's Message",
    badgeLabel: 'Managing Director',
    name: 'Shazma Malik',
    role: 'Managing Director',
    organization: 'Khan Hub Private Limited',
    motto: 'Dreams into Reality.',
    imageSrc: '/images/leadership/shazma-malik.jpg',
    imageAlt: 'Shazma Malik — Managing Director, Khan Hub Private Limited',
    imageFit: 'cover',
    accent: 'success',
    paragraphs: [
      "At Khan Hub, my vision is to turn ideas into action, challenges into opportunities, and dreams into achievements. I strongly believe that an organization's true strength lies in its people, teamwork, discipline, and commitment to excellence.",
      'As Managing Director, I am dedicated to maintaining professional standards, encouraging innovation, strengthening every department, and ensuring that all our projects move towards sustainable growth and success.',
    ],
    closingStatement:
      'Together, we are not just building an organization; we are building a legacy of trust, service, and excellence.',
  },
];

export function LeadershipSection() {
  return (
    <section
      id="leadership"
      aria-labelledby="leadership-heading"
      className="relative overflow-hidden bg-gradient-to-b from-[#F4F8FC] via-white to-[#F4FBF6] border-b border-neutral-200 px-4 py-14 sm:py-20 lg:py-24"
    >
      {/* Ambient Background Accents */}
      <div
        className="pointer-events-none absolute top-0 left-1/4 w-80 h-80 rounded-full bg-primary-100/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-success-100/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="section-inner relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 mb-4">
            <Award className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary-700 font-display">
              Executive Leadership
            </span>
          </div>

          <h2
            id="leadership-heading"
            className="font-display font-bold text-xl sm:text-3xl lg:text-4xl text-neutral-900 leading-tight mb-3"
          >
            Messages from Our <span className="text-gradient">Leadership</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Stewardship rooted in integrity, teamwork, and a shared commitment to serving communities
            across Pakistan.
          </p>
        </motion.div>

        {/* CEO & Managing Director Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {LEADERS.map((leader, idx) => {
            const isPrimary = leader.accent === 'primary';
            const borderClass = isPrimary
              ? 'border-primary-100 hover:border-primary-300 shadow-primary-sm hover:shadow-primary-lg'
              : 'border-success-100 hover:border-success-300 shadow-success-sm hover:shadow-success-lg';
            const badgeClass = isPrimary
              ? 'bg-primary-50 text-primary-700 border-primary-200'
              : 'bg-success-50 text-success-700 border-success-200';
            const portraitBorder = isPrimary
              ? 'border-primary-200 ring-4 ring-primary-50'
              : 'border-success-200 ring-4 ring-success-50';
            const accentBarClass = isPrimary ? 'bg-gradient-brand' : 'bg-gradient-success';
            const quoteBgClass = isPrimary
              ? 'bg-primary-50 text-primary-600 border-primary-100'
              : 'bg-success-50 text-success-600 border-success-100';
            const closingClass = isPrimary
              ? 'border-l-4 border-primary-500 bg-primary-50/60 text-primary-900'
              : 'border-l-4 border-success-500 bg-success-50/60 text-success-900';
            const mottoPillClass = isPrimary
              ? 'bg-primary-50 text-primary-700 border-primary-200'
              : 'bg-success-50 text-success-700 border-success-200';

            return (
              <motion.article
                key={leader.id}
                id={leader.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, delay: idx * 0.1 }}
                className={`relative flex flex-col justify-between bg-white rounded-3xl border transition-all duration-300 p-4 sm:p-6 lg:p-8 overflow-hidden ${borderClass}`}
              >
                {/* Top Accent Strip */}
                <div className={`absolute top-0 inset-x-0 h-1.5 ${accentBarClass}`} aria-hidden="true" />

                <div>
                  {/* Leader Profile Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pb-5 border-b border-slate-100">
                    <div
                      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-white border-2 ${portraitBorder}`}
                    >
                      <Image
                        src={leader.imageSrc}
                        alt={leader.imageAlt}
                        fill
                        sizes="(max-width: 640px) 96px, 112px"
                        className={
                          leader.imageFit === 'contain'
                            ? 'object-contain p-1.5'
                            : 'object-cover object-top'
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border font-display ${badgeClass}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        {leader.sectionTitle}
                      </span>
                      <h3 className="font-display font-bold text-lg sm:text-2xl text-neutral-900 leading-snug">
                        {leader.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-slate-600">
                        {leader.role}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        {leader.organization}
                      </p>
                    </div>
                  </div>

                  {/* Editorial Message Body */}
                  <blockquote className="mt-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${quoteBgClass}`}
                        aria-hidden="true"
                      >
                        <Quote className="w-4 h-4" />
                      </div>
                      <div className="space-y-3.5 text-sm sm:text-base text-slate-700 leading-relaxed sm:leading-7">
                        {leader.paragraphs.map((paragraph, pIdx) => (
                          <p key={pIdx}>{paragraph}</p>
                        ))}
                      </div>
                    </div>

                    <p
                      className={`mt-4 rounded-r-xl px-4 py-3 text-sm sm:text-base font-semibold italic leading-relaxed ${closingClass}`}
                    >
                      &ldquo;{leader.closingStatement}&rdquo;
                    </p>
                  </blockquote>
                </div>

                {/* Sign-Off Footer */}
                <footer className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-display font-bold text-sm sm:text-base text-neutral-900">
                      {leader.name}
                    </div>
                    <div className="text-xs text-slate-600">
                      {leader.role}, {leader.organization}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-xs font-bold font-display ${mottoPillClass}`}
                  >
                    {leader.motto}
                  </span>
                </footer>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* SEO Structured Data for Executive Leadership */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Khan Hub Private Limited',
            url: 'https://www.khanhub.com.pk',
            slogan: 'Dreams into Reality.',
            member: [
              {
                '@type': 'Person',
                name: 'Muhammad Khan',
                jobTitle: 'Chief Executive Officer',
                worksFor: {
                  '@type': 'Organization',
                  name: 'Khan Hub Private Limited',
                },
              },
              {
                '@type': 'Person',
                name: 'Shazma Malik',
                jobTitle: 'Managing Director',
                image: 'https://www.khanhub.com.pk/images/leadership/shazma-malik.jpg',
                worksFor: {
                  '@type': 'Organization',
                  name: 'Khan Hub Private Limited',
                },
              },
            ],
          }),
        }}
      />
    </section>
  );
}

