'use client';
// src/components/layout/Footer.tsx - PREMIUM GLASSMORPHISM VERSION
// ─────────────────────────────────────────────────────────────────
// Modern glassmorphism footer matching the navbar aesthetic
// Features:
// - Light, elegant design with frosted glass effect
// - Subtle gradient backgrounds
// - Smooth hover effects
// - Better visual hierarchy
// - Mobile-optimized layout
// ─────────────────────────────────────────────────────────────────

import Link from 'next/link';
import Image from 'next/image';
import { SITE, FOOTER_LINKS } from '@/data/site';
import { DEPARTMENTS } from '@/data/departments';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-neutral-50 via-white to-neutral-50 border-t border-neutral-200 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-success-400 rounded-full blur-3xl" />
      </div>

      {/* ── Premium Emergency Banner ── */}
      <div className="relative bg-gradient-to-r from-red-50 via-red-50/50 to-red-50 border-b border-red-200/60 py-5 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-40"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 shadow-lg shadow-red-500/50"></span>
              </span>
              <span className="text-red-700 text-sm font-bold uppercase tracking-wider">Emergency Helpline</span>
            </div>
            <a
              href={`tel:${SITE.emergency.replace(/\D/g, '')}`}
              className="group relative px-8 py-3 bg-white/80 backdrop-blur-sm hover:bg-white border-2 border-red-300/60 hover:border-red-400 rounded-xl transition-all duration-300 hover:scale-105 shadow-sm shadow-red-200/30 hover:shadow-md hover:shadow-red-300/40"
            >
              <span className="text-red-600 font-bold text-xl group-hover:text-red-700 transition-colors">
                {SITE.emergency}
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-50/0 via-red-100/30 to-red-50/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <span className="text-red-600 text-xs font-bold uppercase tracking-wide flex items-center gap-2 bg-red-100/50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              24/7 Available
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Footer Content ── */}
      <div className="relative max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* ── Brand Column ── */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-6 group">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/logo.webp"
                  alt="KhanHub Logo"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover rounded-xl"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <span className="font-display font-bold text-lg text-neutral-900 group-hover:text-primary-600 transition-colors">
                Khan<span className="text-primary-600 group-hover:text-primary-700">Hub</span>
              </span>
            </Link>

            <p className="text-neutral-600 text-sm leading-relaxed mb-6 max-w-xs">
              {SITE.description}
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-neutral-700 bg-primary-50/50 px-3 py-2 rounded-lg border border-primary-100">
                <span className="text-primary-600 text-sm">✓</span>
                <span className="font-semibold">Registered NGO, Punjab</span>
              </div>
              <div className="flex items-center gap-2.5 text-neutral-700 bg-success-50/50 px-3 py-2 rounded-lg border border-success-100">
                <span className="text-success-600 text-sm">✓</span>
                <span className="font-semibold">{DEPARTMENTS.length}+ Active Departments</span>
              </div>
              <div className="text-neutral-500 text-xs mt-4">
                © {currentYear} {SITE.fullName}. All rights reserved.
              </div>
            </div>
          </div>

          {/* ── Organization Links ── */}
          <div>
            <h4 className="font-display font-bold text-neutral-900 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
              Organization
            </h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.organization.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group text-neutral-600 hover:text-primary-600 text-sm transition-all duration-300 inline-flex items-center gap-2.5"
                  >
                    <span className="w-1.5 h-1.5 bg-neutral-300 group-hover:bg-primary-500 rounded-full transition-all duration-300 group-hover:scale-125"></span>
                    <span className="group-hover:translate-x-1 transition-transform font-medium">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Services Links ── */}
          <div>
            <h4 className="font-display font-bold text-neutral-900 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-success-500 to-success-600 rounded-full"></span>
              Services
            </h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.services.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group text-neutral-600 hover:text-success-600 text-sm transition-all duration-300 inline-flex items-center gap-2.5"
                  >
                    <span className="w-1.5 h-1.5 bg-neutral-300 group-hover:bg-success-500 rounded-full transition-all duration-300 group-hover:scale-125"></span>
                    <span className="group-hover:translate-x-1 transition-transform font-medium">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact Column ── */}
          <div>
            <h4 className="font-display font-bold text-neutral-900 text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
              Contact Us
            </h4>
            <ul className="flex flex-col gap-4">
              <li>
                <div className="flex items-start gap-3 group">
                  <span className="text-neutral-400 mt-0.5 group-hover:text-primary-600 transition-colors text-lg">
                    📍
                  </span>
                  <span className="text-neutral-600 text-sm leading-relaxed group-hover:text-neutral-900 transition-colors font-medium">
                    {SITE.address}
                  </span>
                </div>
              </li>
              <li>
                <a
                  href={`tel:${SITE.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 group hover:translate-x-1 transition-transform"
                >
                  <span className="text-neutral-400 group-hover:text-primary-600 transition-colors text-lg">📞</span>
                  <span className="text-neutral-600 hover:text-primary-600 text-sm transition-colors font-semibold">
                    {SITE.phone}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex items-center gap-3 group hover:translate-x-1 transition-transform"
                >
                  <span className="text-neutral-400 group-hover:text-primary-600 transition-colors text-lg">📧</span>
                  <span className="text-neutral-600 hover:text-primary-600 text-sm transition-colors font-semibold break-all">
                    {SITE.email}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group hover:translate-x-1 transition-transform"
                >
                  <span className="text-neutral-400 group-hover:text-success-600 transition-colors text-lg">💬</span>
                  <span className="text-neutral-600 hover:text-success-600 text-sm transition-colors font-semibold">
                    WhatsApp Us
                  </span>
                </a>
              </li>
            </ul>

            {/* ── Premium Social Icons ── */}
            <div className="flex items-center gap-3 mt-6">
              {Object.entries(SITE.social).map(([platform, url]) => {
                const icons: Record<string, string> = {
                  facebook: 'f',
                  twitter: '𝕏',
                  instagram: 'IG',
                  youtube: 'YT',
                  linkedin: 'in',
                };
                const colors: Record<string, string> = {
                  facebook: 'hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600',
                  twitter: 'hover:bg-neutral-100 hover:border-neutral-500 hover:text-neutral-900',
                  instagram: 'hover:bg-pink-50 hover:border-pink-400 hover:text-pink-600',
                  youtube: 'hover:bg-red-50 hover:border-red-400 hover:text-red-600',
                  linkedin: 'hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700',
                };
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'group relative w-10 h-10 rounded-xl bg-white border-2 border-neutral-200 flex items-center justify-center text-neutral-500 transition-all duration-300 hover:scale-110 hover:-rotate-3 shadow-sm hover:shadow-md',
                      colors[platform]
                    )}
                    aria-label={platform}
                  >
                    <span className="text-xs font-bold relative z-10">{icons[platform] || '?'}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="relative border-t border-neutral-200 bg-white/50 backdrop-blur-sm py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-neutral-600 text-xs text-center sm:text-left font-medium">
            Built with <span className="text-red-500 animate-pulse-slow">♥</span> for{' '}
            <span className="text-primary-600 font-bold">{SITE.fullName}</span>
            <span className="hidden sm:inline"> — Empowering Communities Across Pakistan</span>
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy-policy"
              className="text-neutral-500 hover:text-neutral-900 text-xs font-semibold transition-colors hover:underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-neutral-500 hover:text-neutral-900 text-xs font-semibold transition-colors hover:underline underline-offset-2"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Helper function (same as in navbar)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}