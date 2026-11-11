'use client';

// src/components/sections/VisionMissionSection.tsx
// ─────────────────────────────────────────────────────────────────
// Purpose & Direction Section — Khan Hub Vision and Khan Hub Mission
// ─────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Eye, Compass, Sparkles } from 'lucide-react';

const VISION_PILLARS = [
  'Education',
  'Healthcare',
  'Employment',
  'Technology',
  'Social Welfare',
];

const MISSION_PILLARS = [
  'Quality Services',
  'Innovative Solutions',
  'Community Growth',
  'Integrity',
];

export function VisionMissionSection() {
  return (
    <section
      id="vision-mission"
      aria-labelledby="vision-mission-heading"
      className="relative overflow-hidden bg-[#FCFBF4] border-y border-neutral-200 px-4 py-14 sm:py-20 lg:py-24"
    >
      {/* Subtle Ambient Background Accents */}
      <div
        className="pointer-events-none absolute -top-28 -left-28 w-72 h-72 rounded-full bg-primary-100/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-28 -right-28 w-72 h-72 rounded-full bg-success-100/40 blur-3xl"
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
            <Sparkles className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary-700 font-display">
              Purpose &amp; Direction
            </span>
          </div>

          <h2
            id="vision-mission-heading"
            className="font-display font-bold text-xl sm:text-3xl lg:text-4xl text-neutral-900 leading-tight mb-3"
          >
            Our <span className="text-gradient">Vision &amp; Mission</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            The guiding principles behind every healthcare clinic, educational institute, technology
            initiative, and welfare program across Khan Hub.
          </p>
        </motion.div>

        {/* Two-Column Editorial Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Card 1: Khan Hub Vision */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55 }}
            className="relative flex flex-col justify-between bg-white rounded-3xl border border-primary-100 shadow-primary-sm hover:shadow-primary-lg hover:border-primary-300 transition-all duration-300 p-4 sm:p-6 lg:p-8 overflow-hidden group"
          >
            {/* Top Accent Line */}
            <div
              className="absolute top-0 inset-x-0 h-1.5 bg-gradient-brand"
              aria-hidden="true"
            />

            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary-50 border border-primary-200 text-primary-600 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                    <Eye className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-primary-600 font-display">
                      Looking Ahead
                    </span>
                    <h3 className="font-display font-bold text-lg sm:text-2xl text-neutral-900">
                      Khan Hub Vision
                    </h3>
                  </div>
                </div>
              </div>

              {/* Body Copy */}
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed sm:leading-7">
                Our vision is to become a leading multi-sector organization dedicated to excellence in
                education, healthcare, employment, technology, and social welfare. We aim to empower
                people, create opportunities, transform lives, and build a better future through
                innovation, integrity, and quality services.
              </p>

              {/* Focus Sector Tags */}
              <div className="flex flex-wrap gap-2 mt-5">
                {VISION_PILLARS.map((pillar) => (
                  <span
                    key={pillar}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            {/* Signature Tagline Footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary-50 border border-primary-100">
                <span className="w-2 h-2 rounded-full bg-primary-500" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-bold text-primary-700 font-display">
                  Khan Hub – Dreams into Reality.
                </span>
              </div>
            </div>
          </motion.article>

          {/* Card 2: Khan Hub Mission */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative flex flex-col justify-between bg-white rounded-3xl border border-success-100 shadow-success-sm hover:shadow-success-lg hover:border-success-300 transition-all duration-300 p-4 sm:p-6 lg:p-8 overflow-hidden group"
          >
            {/* Top Accent Line */}
            <div
              className="absolute top-0 inset-x-0 h-1.5 bg-gradient-success"
              aria-hidden="true"
            />

            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-success-50 border border-success-200 text-success-600 flex items-center justify-center flex-shrink-0 group-hover:bg-success-500 group-hover:text-white transition-colors duration-300">
                    <Compass className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-success-600 font-display">
                      Our Commitment
                    </span>
                    <h3 className="font-display font-bold text-lg sm:text-2xl text-neutral-900">
                      Khan Hub Mission
                    </h3>
                  </div>
                </div>
              </div>

              {/* Body Copy */}
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed sm:leading-7">
                Our mission is to provide quality services, innovative solutions, and meaningful
                opportunities across multiple sectors. We are committed to empowering individuals,
                developing communities, promoting excellence, and making a positive difference in
                people&apos;s lives through dedication, professionalism, and integrity.
              </p>

              {/* Commitment Tags */}
              <div className="flex flex-wrap gap-2 mt-5">
                {MISSION_PILLARS.map((pillar) => (
                  <span
                    key={pillar}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            {/* Signature Tagline Footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-success-50 border border-success-100">
                <span className="w-2 h-2 rounded-full bg-success-500" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-bold text-success-700 font-display">
                  Khan Hub – One Hub. Multiple Solutions.
                </span>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

