'use client';

// src/components/sections/LeadershipSection.tsx
// ─────────────────────────────────────────────────────────────────
// Executive Leadership Messages Section — CEO, Executive Director & Managing Director
// Hierarchy: Top is CEO -> Executive Director -> Managing Director
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
  accent: 'primary' | 'indigo' | 'success';
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
    imageSrc: '/images/leadership/ceo.webp',
    imageAlt: 'Muhammad Khan — Chief Executive Officer, Khan Hub Private Limited',
    imageFit: 'cover',
    accent: 'primary',
    paragraphs: [
      'At Khan Hub, we believe that success is not just about building an organization; it is about creating opportunities, transforming lives, and making a positive difference in society. Our journey is driven by vision, dedication, teamwork, and a commitment to excellence.',
      'Our goal is to provide quality services across multiple sectors, empower individuals, and build a platform where dreams turn into reality. I believe that with honesty, hard work, innovation, and strong leadership, we can achieve remarkable milestones together.',
    ],
    closingStatement: 'Together, we grow. Together, we serve. Together, we succeed.',
  },
  {
    id: 'executive-director-message',
    sectionTitle: "Executive Director's Message",
    badgeLabel: 'Executive Director',
    name: 'Executive Director',
    role: 'Executive Director',
    organization: 'Khan Hub Group of Companies',
    motto: 'Dreams into Reality.',
    imageSrc: '/images/leadership/ED.webp',
    imageAlt: 'Executive Director — Khan Hub Group of Companies',
    imageFit: 'cover',
    accent: 'indigo',
    paragraphs: [
      "At Khan Hub, we believe that true success is not merely measured by achievements, but by the positive impact we create in people's lives.",
      'Our vision is to build an organization that stands for excellence, professionalism, innovation, integrity, and service to humanity. We are committed to providing quality education, healthcare, rehabilitation, and professional opportunities while continuously raising our standards.',
      'As Executive Director, my commitment is to ensure effective leadership, organizational development, operational excellence, and a culture of accountability and teamwork across all our projects.',
      'I believe that every milestone is the result of collective efforts, dedication, and a shared vision. Together, we will continue to overcome challenges, embrace opportunities, and transform dreams into reality.',
    ],
    closingStatement:
      'Our journey is not just about building an organization; it is about building a legacy of trust, service, and excellence.',
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

function getAccentStyles(accent: 'primary' | 'indigo' | 'success') {
  switch (accent) {
    case 'primary':
      return {
        borderClass:
          'border-primary-100 hover:border-primary-300 shadow-primary-sm hover:shadow-primary-lg',
        badgeClass: 'bg-primary-50 text-primary-700 border-primary-200',
        portraitBorder: 'border-primary-200 ring-4 ring-primary-50',
        accentBarClass: 'bg-gradient-brand',
        quoteBgClass: 'bg-primary-50 text-primary-600 border-primary-100',
        closingClass: 'border-l-4 border-primary-500 bg-primary-50/60 text-primary-900',
        mottoPillClass: 'bg-primary-50 text-primary-700 border-primary-200',
      };
    case 'indigo':
      return {
        borderClass:
          'border-indigo-100 hover:border-indigo-300 shadow-sm hover:shadow-lg',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        portraitBorder: 'border-indigo-200 ring-4 ring-indigo-50',
        accentBarClass: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800',
        quoteBgClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        closingClass: 'border-l-4 border-indigo-500 bg-indigo-50/60 text-indigo-900',
        mottoPillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'success':
      return {
        borderClass:
          'border-success-100 hover:border-success-300 shadow-success-sm hover:shadow-success-lg',
        badgeClass: 'bg-success-50 text-success-700 border-success-200',
        portraitBorder: 'border-success-200 ring-4 ring-success-50',
        accentBarClass: 'bg-gradient-success',
        quoteBgClass: 'bg-success-50 text-success-600 border-success-100',
        closingClass: 'border-l-4 border-success-500 bg-success-50/60 text-success-900',
        mottoPillClass: 'bg-success-50 text-success-700 border-success-200',
      };
  }
}

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
        className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-indigo-100/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-success-100/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto relative z-10">
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
            Stewardship rooted in integrity, teamwork, and an unwavering commitment to serving communities
            across Pakistan.
          </p>
        </motion.div>

        {/* 3-Leader Grid: CEO -> ED -> MD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {LEADERS.map((leader, idx) => {
            const styles = getAccentStyles(leader.accent);

            return (
              <motion.article
                key={leader.id}
                id={leader.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, delay: idx * 0.1 }}
                className={`relative flex flex-col justify-between bg-white rounded-3xl border transition-all duration-300 p-4 sm:p-6 lg:p-7 overflow-hidden ${styles.borderClass}`}
              >
                {/* Top Accent Strip */}
                <div
                  className={`absolute top-0 inset-x-0 h-1.5 ${styles.accentBarClass}`}
                  aria-hidden="true"
                />

                <div>
                  {/* Leader Profile Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-slate-100">
                    <div
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-white border-2 shadow-sm ${styles.portraitBorder}`}
                    >
                      <Image
                        src={leader.imageSrc}
                        alt={leader.imageAlt}
                        fill
                        sizes="(max-width: 640px) 80px, 96px"
                        className={
                          leader.imageFit === 'contain'
                            ? 'object-contain p-1.5'
                            : 'object-cover object-top'
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border font-display ${styles.badgeClass}`}
                      >
                        <ShieldCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{leader.sectionTitle}</span>
                      </span>
                      <h3 className="font-display font-bold text-base sm:text-xl text-neutral-900 leading-snug">
                        {leader.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-slate-600">
                        {leader.role}
                      </p>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500">
                        {leader.organization}
                      </p>
                    </div>
                  </div>

                  {/* Editorial Message Body */}
                  <blockquote className="mt-5 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${styles.quoteBgClass}`}
                        aria-hidden="true"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed sm:leading-6">
                        {leader.paragraphs.map((paragraph, pIdx) => (
                          <p key={pIdx}>{paragraph}</p>
                        ))}
                      </div>
                    </div>

                    <p
                      className={`mt-4 rounded-r-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold italic leading-relaxed ${styles.closingClass}`}
                    >
                      &ldquo;{leader.closingStatement}&rdquo;
                    </p>
                  </blockquote>
                </div>

                {/* Sign-Off Footer */}
                <footer className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <div>
                    <div className="font-display font-bold text-xs sm:text-sm text-neutral-900">
                      {leader.name}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-600">
                      {leader.role}, {leader.organization}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs font-bold font-display ${styles.mottoPillClass}`}
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
                image: 'https://www.khanhub.com.pk/images/leadership/ceo.webp',
                worksFor: {
                  '@type': 'Organization',
                  name: 'Khan Hub Private Limited',
                },
              },
              {
                '@type': 'Person',
                name: 'Executive Director',
                jobTitle: 'Executive Director',
                image: 'https://www.khanhub.com.pk/images/leadership/ED.webp',
                worksFor: {
                  '@type': 'Organization',
                  name: 'Khan Hub Group of Companies',
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
