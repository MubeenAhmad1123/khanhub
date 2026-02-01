'use client';
// src/components/sections/HeroSection.tsx - LIGHT THEME VERSION

import Link from 'next/link';
import { SITE } from '@/data/site';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 overflow-hidden bg-gradient-to-b from-primary-50/30 via-white to-white">
      {/* ─── Background Atmosphere ─── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large glow top-center - Primary teal */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary-300 opacity-[0.15] blur-[120px] rounded-full" />

        {/* Accent glow bottom-right - Orange */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-accent-300 opacity-[0.12] blur-[100px] rounded-full" />

        {/* Secondary glow left - Success green */}
        <div className="absolute top-1/3 -left-20 w-[400px] h-[400px] bg-success-300 opacity-[0.1] blur-[100px] rounded-full" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,153,176,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,153,176,.2) 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <span className="badge-primary inline-flex mb-6 animate-fade-in">
          🏥 Healthcare • 📚 Education • ❤️ Welfare
        </span>

        {/* Headline */}
        <h1
          className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-neutral-900 leading-[1.1] mb-6"
          style={{
            animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            animationDelay: '0.1s',
            opacity: 0
          }}
        >
          Transforming lives<br />
          <span className="text-gradient">through compassion</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-neutral-600 text-base md:text-lg mt-6 max-w-2xl mx-auto leading-relaxed"
          style={{
            animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            animationDelay: '0.25s',
            opacity: 0
          }}
        >
          Khan Hub is Pakistan's multi-department welfare organization providing free healthcare,
          quality education, employment support, and social services to communities that need it most.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
          style={{
            animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            animationDelay: '0.4s',
            opacity: 0
          }}
        >
          <Link href="/departments" className="btn-primary text-base px-8 py-3.5 group">
            Explore Departments
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </Link>
          <Link href="/donate" className="btn-accent text-base px-8 py-3.5">
            💝 Donate Now
          </Link>
        </div>

        {/* Emergency notice */}
        <div
          className="mt-12"
          style={{
            animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            animationDelay: '0.55s',
            opacity: 0
          }}
        >
          <a
            href={`tel:${SITE.emergency.replace(/\D/g, '')}`}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all duration-300"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            24/7 Emergency Helpline: {SITE.emergency}
          </a>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto mt-24 px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SITE.stats.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-white border border-neutral-200 rounded-2xl p-6 text-center hover:border-primary-300 hover:shadow-lg transition-all duration-300 group"
              style={{
                animation: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                animationDelay: `${0.65 + i * 0.1}s`,
                opacity: 0
              }}
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                {stat.icon}
              </div>
              <div className="font-display font-bold text-2xl md:text-3xl text-neutral-900">
                {stat.value}
              </div>
              <div className="text-neutral-600 text-xs mt-1 font-medium uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{
          animation: 'fadeIn 1s ease forwards, bounceSubtle 2s ease-in-out infinite',
          animationDelay: '1.5s',
          opacity: 0
        }}
      >
        <svg
          className="w-6 h-6 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}