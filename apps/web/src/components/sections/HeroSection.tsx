'use client';
// src/components/sections/HeroSection.tsx - FINAL OPTIMIZED VERSION WITH CAROUSEL
// ─────────────────────────────────────────────────────────────────
// Optimizations:
// ✅ Performance optimized with reduced animations
// ✅ SEO optimized with semantic HTML and schema markup
// ✅ Mobile-first responsive design
// ✅ Rotating department images (logo 4s, others 2.5s)
// ✅ Better Core Web Vitals (LCP, CLS, FID)
// ✅ Accessibility improvements
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

// Department images configuration
const DEPARTMENT_IMAGES = [
  { src: '/logo-circle.webp', alt: 'Khan Hub', duration: 4000 }, // Logo stays for 4 seconds
  { src: '/images/education-circle.webp', alt: 'Education Department', duration: 2500 },
  { src: '/images/enterprises-circle.webp', alt: 'Enterprises', duration: 2500 },
  { src: '/images/institute-health-sciences-circle.webp', alt: 'Institute of Health Sciences', duration: 2500 },
  { src: '/images/job-circle.webp', alt: 'Job Department', duration: 2500 },
  { src: '/images/marketing-circle.webp', alt: 'Marketing', duration: 2500 },
  { src: '/images/medical-center-circle.webp', alt: 'Medical Center', duration: 2500 },
  { src: '/images/prosthetic-circle.webp', alt: 'Prosthetic Department', duration: 2500 },
  { src: '/images/rehab-circle.webp', alt: 'Rehabilitation', duration: 2500 },
  { src: '/images/residential-circle.webp', alt: 'Residential', duration: 2500 },
  { src: '/images/skill-circle.webp', alt: 'Skill Development', duration: 2500 },
  { src: '/images/sukoon-circle.webp', alt: 'Sukoon', duration: 2500 },
  { src: '/images/surgical-repair-circle.webp', alt: 'Surgical Repair', duration: 2500 },
  { src: '/images/surgical-services-circle.webp', alt: 'Surgical Services', duration: 2500 },
  { src: '/images/transport-circle.webp', alt: 'Transport', duration: 2500 },
  { src: '/images/travel-and-tour-circle.webp', alt: 'Travel and Tour', duration: 2500 },
  { src: '/images/welfare-organization-circle.webp', alt: 'Welfare Organization', duration: 2500 },
];

// Memoized Stats Component
const HeroStats = memo(function HeroStats() {
  const stats = [
    { value: '50K+', label: 'Lives Impacted' },
    { value: '16+', label: 'Departments' },
    { value: '24/7', label: 'Emergency Care' }
  ];

  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-6 sm:pt-8 border-t border-neutral-200">
      {stats.map((stat, index) => (
        <div key={index} className="space-y-1" itemScope itemType="https://schema.org/QuantitativeValue">
          <div className="text-2xl sm:text-3xl font-bold text-gradient font-display" itemProp="value">
            {stat.value}
          </div>
          <div className="text-xs sm:text-sm text-neutral-600" itemProp="description">{stat.label}</div>
        </div>
      ))}
    </div>
  );
});

// Memoized CTA Buttons Component
const HeroCTAs = memo(function HeroCTAs() {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
      <Link
        href="/donate"
        className="px-6 sm:px-8 py-3 sm:py-4 bg-success-500 hover:bg-success-600 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-success-md hover:shadow-success-lg inline-flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span className="text-sm sm:text-base">Make a Difference</span>
      </Link>

      <Link
        href="/departments"
        className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-primary-md hover:shadow-primary-lg inline-flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
      >
        <span className="text-sm sm:text-base">Explore Our Services</span>
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>

      <Link
        href="/contact"
        className="px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-neutral-200 hover:border-primary-300 rounded-xl font-semibold text-neutral-700 hover:text-primary-600 transition-all duration-300 hover:scale-105 inline-flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
      >
        <span className="text-sm sm:text-base">Contact Us</span>
      </Link>
    </div>
  );
});

// Image Carousel Component with Optimized Loading
const ImageCarousel = memo(function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % DEPARTMENT_IMAGES.length);
    }, DEPARTMENT_IMAGES[currentIndex].duration);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Preload next 2 images for smooth transitions
  useEffect(() => {
    const preloadImages = [
      (currentIndex + 1) % DEPARTMENT_IMAGES.length,
      (currentIndex + 2) % DEPARTMENT_IMAGES.length
    ];

    preloadImages.forEach(idx => {
      const img = new window.Image();
      img.src = DEPARTMENT_IMAGES[idx].src;
    });
  }, [currentIndex]);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
    console.error(`Failed to load image: ${DEPARTMENT_IMAGES[index].src}`);
  };

  return (
    <div className="relative w-72 h-72 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] mt-8 mb-24 sm:my-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {!imageErrors.has(currentIndex) ? (
            <Image
              src={DEPARTMENT_IMAGES[currentIndex].src}
              alt={`${DEPARTMENT_IMAGES[currentIndex].alt} - Khan Hub Department`}
              fill
              className="object-contain drop-shadow-2xl"
              priority={currentIndex === 0} // Only prioritize the first image (logo)
              loading={currentIndex === 0 ? "eager" : "lazy"}
              sizes="(max-width: 640px) 288px, (max-width: 1024px) 384px, 448px"
              onError={() => handleImageError(currentIndex)}
              quality={95}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
              <span className="text-slate-400 text-sm">Image unavailable</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicators - FIXED STATIC SIZE */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
        {DEPARTMENT_IMAGES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${idx === currentIndex
              ? 'bg-primary-500'
              : 'bg-neutral-300 hover:bg-primary-300'
              }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
});

export default function HeroSection() {
  const logoRef = useRef<HTMLDivElement>(null);

  // Optimized smooth mouse tracking
  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(useMotionValue(0), springConfig);
  const y = useSpring(useMotionValue(0), springConfig);

  useEffect(() => {
    // Only enable mouse tracking on desktop
    if (window.innerWidth < 1024) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!logoRef.current) return;

      const rect = logoRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const offsetX = (e.clientX - centerX) / 25;
      const offsetY = (e.clientY - centerY) / 25;

      x.set(offsetX);
      y.set(offsetY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y]);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-white"
      itemScope
      itemType="https://schema.org/Organization"
    >
      {/* Optimized Background Elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Gradient Orbs - Reduced complexity for performance */}
        <motion.div
          className="absolute -top-40 -right-40 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-primary-100/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-success-100/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />

        {/* Simplified Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0, 94, 184) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="container-custom relative z-10 py-16 sm:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">

          {/* Left Content - Swapped order for mobile (order-2) */}
          <div className="space-y-8 sm:space-y-10 max-w-2xl mx-auto lg:mx-0 text-center lg:text-left order-2 lg:order-1">
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-semibold text-primary-700 font-display">
                  Trusted by 50,000+ Lives
                </span>
              </div>
            </motion.div>


            {/* Main Heading - SEO Optimized */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="space-y-3 sm:space-y-4"
            >
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight font-display text-neutral-900"
                itemProp="name"
              >
                Empowering Lives
                <br />
                <span className="text-gradient">Through Care</span>
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-neutral-600 leading-relaxed max-w-xl mx-auto lg:mx-0" itemProp="description">
                Leading Pakistan&apos;s social welfare transformation with 16+ specialized departments dedicated to healthcare, education, and community development.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <HeroCTAs />
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            >
              <HeroStats />
            </motion.div>
          </div>

          {/* Right Content - Animated Logo Carousel - Swapped order for mobile (order-1) */}
          <motion.div
            ref={logoRef}
            initial={{ opacity: 1, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex items-center justify-center order-1 lg:order-2 z-10"
          >
            {/* Floating Logo Container */}
            <motion.div
              style={{ x, y }}
              className="relative"
            >
              {/* Animated Rings Behind Logo - Desktop Only */}
              <div className="hidden lg:block">
                <motion.div
                  className="absolute inset-0 -m-20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-primary-200/30" />
                  <div className="absolute inset-8 rounded-full border-2 border-success-200/30" />
                  <div className="absolute inset-16 rounded-full border-2 border-primary-100/30" />
                </motion.div>
              </div>

              {/* Optimized Pulsing Glow */}
              <motion.div
                className="absolute inset-0 -m-8 sm:-m-12 bg-gradient-to-br from-primary-200/40 via-success-200/40 to-primary-200/40 rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Main Logo Carousel with Float Animation */}
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative z-10"
              >
                {/* Logo Backdrop */}
                <div className="absolute inset-0 -m-6 sm:-m-12 bg-white/40 backdrop-blur-[2px] rounded-full border border-white/20 shadow-xl" />

                {/* Image Carousel */}
                <ImageCarousel />

                {/* Reduced Sparkle Effects for Performance - Desktop Only */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-primary-400 rounded-full hidden lg:block"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
              className="absolute top-10 right-10 text-primary-500 hidden lg:block"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <svg className="w-12 h-12 sm:w-16 sm:h-16 opacity-20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </motion.div>

            <motion.div
              className="absolute bottom-10 left-10 text-success-500 hidden lg:block"
              animate={{
                y: [0, -10, 0],
                rotate: [0, -10, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg className="w-10 h-10 sm:w-12 sm:h-12 opacity-20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </motion.div>
          </motion.div>
        </div>

        {/* Emergency Helpline - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="fixed right-4 sm:right-8 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-20"
        >
          <Link
            href="tel:067-3364220"
            className="group flex flex-row sm:flex-col items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-br from-error-500 to-error-600 rounded-xl sm:rounded-2xl shadow-error-lg hover:shadow-error-md transition-all duration-300 hover:scale-105 touch-manipulation"
            aria-label="Call emergency helpline: 067-3364220"
          >
            <motion.svg
              className="w-5 h-5 sm:w-8 sm:h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </motion.svg>
            <div className="text-left sm:text-center">
              <div className="text-xs text-white/80 font-medium">24/7 Emergency</div>
              <div className="text-sm font-bold text-white">067-3364220</div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Scroll Indicator - Desktop Only */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden lg:block"
        aria-hidden="true"
      >
        <motion.div
          className="flex flex-col items-center gap-2 text-neutral-400"
          animate={{ y: [0, 10, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <span className="text-xs font-medium">Scroll to explore</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>

      {/* SEO Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Khan Hub',
            description: 'Leading Pakistan\'s social welfare transformation with 16+ specialized departments',
            url: 'https://khanhub.com.pk',
            logo: 'https://khanhub.com.pk/logo-circle.webp',
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '+92-67-3364220',
              contactType: 'Emergency',
              availableLanguage: ['en', 'ur']
            },
            areaServed: 'PK',
            sameAs: [
              'https://www.facebook.com/khanhub.com.pk/',
              'https://www.instagram.com/khanhub.com.pk/'
            ]
          })
        }}
      />
    </section>
  );
}