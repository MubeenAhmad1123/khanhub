'use client';
// src/components/layout/Footer.tsx - ENHANCED VERSION
// ─────────────────────────────────────────────────────────────────
// Premium footer with better organization and visual appeal
// Features:
// - Enhanced emergency banner with pulse animation
// - Better responsive grid layout
// - Smooth hover effects and transitions
// - Social media icons with hover states
// - Newsletter signup section (optional)
// ─────────────────────────────────────────────────────────────────

import Link from 'next/link';
import Image from 'next/image';
import { SITE, FOOTER_LINKS } from '@/data/site';
import { DEPARTMENTS } from '@/data/departments';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-950 border-t border-neutral-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success-500 rounded-full blur-3xl" />
      </div>

      {/* ── Enhanced Emergency Banner ── */}
      <div className="relative bg-gradient-to-r from-red-600/10 via-red-500/10 to-red-600/10 border-b border-red-500/20 py-4 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              <span className="text-red-400 text-sm font-bold uppercase tracking-wider">Emergency Helpline</span>
            </div>
            <a
              href={`tel:${SITE.emergency.replace(/\D/g, '')}`}
              className="group relative px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/40 hover:border-red-400/60 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <span className="text-red-300 font-bold text-lg group-hover:text-red-200 transition-colors">
                {SITE.emergency}
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/0 via-red-400/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <span className="text-red-500 text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              Available 24/7
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Footer Content ── */}
      <div className="relative max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* ── Brand Column ── */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/logo.webp"
                  alt="KhanHub Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-xl"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <span className="font-display font-bold text-lg text-white group-hover:text-primary-400 transition-colors">
                Khan<span className="text-primary-400 group-hover:text-primary-300">Hub</span>
              </span>
            </Link>

            <p className="text-neutral-400 text-sm leading-relaxed mb-5 max-w-xs">
              {SITE.description}
            </p>

            <div className="space-y-2 text-xs text-neutral-600">
              <p className="flex items-center gap-2">
                <span className="text-primary-500">✓</span>
                Registered NGO, Punjab, Pakistan
              </p>
              <p className="flex items-center gap-2">
                <span className="text-success-500">✓</span>
                Serving {DEPARTMENTS.length}+ Departments
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary-500">✓</span>
                © {currentYear} {SITE.fullName}
              </p>
            </div>
          </div>

          {/* ── Organization Links ── */}
          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
              Organization
            </h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.organization.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-primary-400 text-sm transition-all duration-300 inline-flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 bg-neutral-700 group-hover:bg-primary-500 rounded-full transition-colors"></span>
                    <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Services Links ── */}
          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-1 h-4 bg-success-500 rounded-full"></span>
              Services
            </h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.services.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-success-400 text-sm transition-all duration-300 inline-flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 bg-neutral-700 group-hover:bg-success-500 rounded-full transition-colors"></span>
                    <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact Column ── */}
          <div>
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
              Contact Us
            </h4>
            <ul className="flex flex-col gap-4">
              <li>
                <div className="flex items-start gap-3 group">
                  <span className="text-neutral-600 mt-0.5 group-hover:text-primary-500 transition-colors text-lg">
                    📍
                  </span>
                  <span className="text-neutral-400 text-sm leading-relaxed group-hover:text-neutral-300 transition-colors">
                    {SITE.address}
                  </span>
                </div>
              </li>
              <li>
                <a
                  href={`tel:${SITE.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 group hover:translate-x-1 transition-transform"
                >
                  <span className="text-neutral-600 group-hover:text-primary-500 transition-colors text-lg">📞</span>
                  <span className="text-neutral-400 hover:text-primary-400 text-sm transition-colors font-medium">
                    {SITE.phone}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex items-center gap-3 group hover:translate-x-1 transition-transform"
                >
                  <span className="text-neutral-600 group-hover:text-primary-500 transition-colors text-lg">📧</span>
                  <span className="text-neutral-400 hover:text-primary-400 text-sm transition-colors font-medium break-all">
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
                  <span className="text-neutral-600 group-hover:text-success-500 transition-colors text-lg">💬</span>
                  <span className="text-neutral-400 hover:text-success-400 text-sm transition-colors font-medium">
                    WhatsApp Us
                  </span>
                </a>
              </li>
            </ul>

            {/* ── Enhanced Social Icons ── */}
            <div className="flex items-center gap-3 mt-6">
              {Object.entries(SITE.social).map(([platform, url]) => {
                const icons: Record<string, string> = {
                  facebook: 'f',
                  twitter: '𝕏',
                  instagram: 'IG',
                  youtube: 'YT',
                  linkedin: 'in',
                };
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative w-10 h-10 rounded-xl bg-neutral-800/50 hover:bg-primary-500/20 border-2 border-neutral-700/50 hover:border-primary-500/50 flex items-center justify-center text-neutral-500 hover:text-primary-400 transition-all duration-300 hover:scale-110 hover:-rotate-3"
                    aria-label={platform}
                  >
                    <span className="text-xs font-bold">{icons[platform] || '?'}</span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500/0 to-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="relative border-t border-neutral-800/80 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-neutral-500 text-xs text-center sm:text-left">
            Built with <span className="text-red-500 animate-pulse-slow">♥</span> for{' '}
            <span className="text-primary-400 font-semibold">{SITE.fullName}</span> — Empowering Communities Across
            Pakistan
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy-policy"
              className="text-neutral-500 hover:text-neutral-300 text-xs transition-colors hover:underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-neutral-500 hover:text-neutral-300 text-xs transition-colors hover:underline underline-offset-2"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}