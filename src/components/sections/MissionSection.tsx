'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function MissionSection() {
  const keyPoints = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: '50,000+ lives impacted across Pakistan since 2015'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: '16 specialized departments for healthcare, education & welfare'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: '100% transparent operations with verified certifications'
    }
  ];

  const trustBadges = [
    { label: 'Registered', icon: '✓' },
    { label: 'Verified', icon: '✓' },
    { label: 'Licensed', icon: '✓' },
  ];

  return (
    <section className="section bg-white">
      <div className="section-inner">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* LEFT: Video Showcase */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative space-y-6"
          >
            {/* Main Video */}
            <div className="relative h-[800px] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900">
              <video
                className="w-full h-full object-cover"
                controls
                poster="/images/medical-center.webp"
                preload="metadata"
              >
                <source src="/testimonial.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Stats Card - Below Video */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="bg-white rounded-xl p-6 shadow-xl border-2 border-neutral-200"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-primary-600 font-display">50,000+</div>
                  <div className="text-sm text-neutral-600 mt-1 font-medium">Lives Impacted</div>
                </div>
                <div className="h-16 w-px bg-neutral-200" />
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-success-600 font-display">16+</div>
                  <div className="text-sm text-neutral-600 mt-1 font-medium">Departments</div>
                </div>
                <div className="h-16 w-px bg-neutral-200" />
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-primary-600 font-display">24/7</div>
                  <div className="text-sm text-neutral-600 mt-1 font-medium">Emergency</div>
                </div>
              </div>
            </motion.div>

            {/* Decorative Element */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-success-500/10 rounded-full blur-3xl -z-10" />
          </motion.div>

          {/* RIGHT: Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-primary-700">Our Mission</span>
            </div>

            {/* Headline */}
            <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-neutral-900 leading-tight">
              Building a Pakistan where <span className="text-gradient">no one is left behind</span>
            </h2>

            {/* Bullet Points - Simple & Clean */}
            <div className="space-y-4">
              {keyPoints.map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                    {point.icon}
                  </div>
                  <p className="text-lg text-neutral-700 leading-relaxed pt-1.5">
                    {point.text}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4 pb-4 border-t border-b border-neutral-200">
              {trustBadges.map((badge, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-success-100 text-success-600 flex items-center justify-center text-sm font-bold">
                    {badge.icon}
                  </div>
                  <span className="text-sm font-medium text-neutral-700">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/departments"
                className="group px-8 py-4 bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-primary-md hover:shadow-primary-lg inline-flex items-center gap-2"
              >
                Explore Our Services
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <Link
                href="/about"
                className="px-8 py-4 bg-white border-2 border-neutral-200 hover:border-primary-300 rounded-xl font-semibold text-neutral-700 hover:text-primary-600 transition-all duration-300 inline-flex items-center gap-2"
              >
                Our Story
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}