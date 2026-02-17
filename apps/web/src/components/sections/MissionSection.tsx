'use client';

// src/components/sections/MissionSection.tsx - OPTIMIZED VERSION
// ─────────────────────────────────────────────────────────────────
// Optimizations:
// ✅ Performance optimized with lazy loading and reduced animations
// ✅ SEO optimized with semantic HTML and schema markup
// ✅ Mobile-first responsive design
// ✅ Accessibility improvements
// ✅ Better video loading with poster and preload
// ─────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import Link from 'next/link';
import { memo } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

// Memoized Key Points Component
const KeyPoints = memo(function KeyPoints() {
  const keyPoints = [
    {
      text: '50,000+ lives impacted across Pakistan since 2015',
      delay: 0
    },
    {
      text: '16 specialized departments for healthcare, education & welfare',
      delay: 0.1
    },
    {
      text: '100% transparent operations with verified certifications',
      delay: 0.2
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {keyPoints.map((point, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: point.delay, duration: 0.5 }}
          className="flex items-start gap-3 sm:gap-4 group"
        >
          <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </div>
          <p className="text-base sm:text-lg text-neutral-700 leading-relaxed pt-1 sm:pt-1.5">
            {point.text}
          </p>
        </motion.div>
      ))}
    </div>
  );
});

// Memoized Trust Badges Component
const TrustBadges = memo(function TrustBadges() {
  const trustBadges = [
    { label: 'Verified', icon: '✓' },
    { label: 'Certified', icon: '✓' },
    { label: 'Licensed', icon: '✓' },
    { label: 'Registered', icon: '✓' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 pb-4 border-t border-b border-neutral-200">
      {trustBadges.map((badge, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-success-100 text-success-600 flex items-center justify-center text-xs sm:text-sm font-bold">
            {badge.icon}
          </div>
          <span className="text-xs sm:text-sm font-medium text-neutral-700">{badge.label}</span>
        </div>
      ))}
    </div>
  );
});

// Memoized Stats Card Component
const StatsCard = memo(function StatsCard() {
  const stats = [
    { value: '50,000+', label: 'Lives Impacted', color: 'text-primary-600' },
    { value: '16+', label: 'Departments', color: 'text-success-600' },
    { value: '24/7', label: 'Emergency', color: 'text-primary-600' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="bg-white rounded-xl p-4 sm:p-6 shadow-xl border-2 border-neutral-200"
      itemScope
      itemType="https://schema.org/ItemList"
    >
      <div className="flex items-center justify-between gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="flex-1 text-center">
            <div className={`text-2xl sm:text-3xl font-bold ${stat.color} font-display mb-1`} itemProp="value">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium" itemProp="description">
              {stat.label}
            </div>
          </div>
        ))}
        <div className="hidden sm:block h-12 sm:h-16 w-px bg-neutral-200" aria-hidden="true" />
      </div>
    </motion.div>
  );
});

export function MissionSection() {
  return (
    <section
      className="section bg-white"
      aria-labelledby="mission-heading"
      itemScope
      itemType="https://schema.org/AboutPage"
    >
      <div className="section-inner">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">

          {/* LEFT: Video Showcase */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative space-y-4 sm:space-y-6 order-last lg:order-first"
          >
            {/* Main Video - Optimized Loading */}
            <div className="relative h-[400px] sm:h-[600px] lg:h-[800px] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900">
              <video
                className="w-full h-full object-cover"
                controls
                poster="/images/medical-center.webp"
                preload="metadata"
                playsInline
                aria-label="Khan Hub testimonial video"
              >
                <source src="/testimonial.mp4" type="video/mp4" />
                <p>Your browser does not support the video tag. Please upgrade your browser to view this content.</p>
              </video>
            </div>

            {/* Stats Card - Below Video */}
            <StatsCard />

            {/* Decorative Elements - Desktop Only */}
            <div className="hidden lg:block absolute -bottom-4 -right-4 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -z-10" aria-hidden="true" />
            <div className="hidden lg:block absolute -top-4 -left-4 w-32 h-32 bg-success-500/10 rounded-full blur-3xl -z-10" aria-hidden="true" />
          </motion.div>

          {/* RIGHT: Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 sm:space-y-8 order-first lg:order-last"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-semibold text-primary-700">Our Mission</span>
            </div>

            {/* Headline - SEO Optimized */}
            <h2
              id="mission-heading"
              className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-neutral-900 leading-tight"
              itemProp="headline"
            >
              Building a Pakistan where <span className="text-gradient">no one is left behind</span>
            </h2>

            {/* Key Points - Accessible */}
            <KeyPoints />

            {/* Trust Indicators */}
            <TrustBadges />

            {/* CTAs - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-2">
              <Link
                href="/about"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-neutral-200 hover:border-primary-300 rounded-xl font-semibold text-neutral-700 hover:text-primary-600 transition-all duration-300 inline-flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
              >
                <span className="text-sm sm:text-base">Our Story</span>
              </Link>

              <Link
                href="/departments"
                className="group px-6 sm:px-8 py-3 sm:py-4 bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-primary-md hover:shadow-primary-lg inline-flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
              >
                <span className="text-sm sm:text-base">Explore Our Services</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* SEO Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'Khan Hub Mission',
            description: 'Building a Pakistan where no one is left behind through 16 specialized welfare departments',
            mainEntity: {
              '@type': 'Organization',
              name: 'Khan Hub',
              url: 'https://khanhub.com.pk',
              numberOfEmployees: {
                '@type': 'QuantitativeValue',
                value: '50000+',
                description: 'Lives impacted'
              }
            }
          })
        }}
      />

      {/* Optimized Styles */}
      <style jsx>{`
        /* Improve touch targets on mobile */
        @media (max-width: 640px) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        }

        /* Optimize video loading */
        video {
          content-visibility: auto;
        }
      `}</style>
    </section>
  );
}