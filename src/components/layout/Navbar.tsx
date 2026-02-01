'use client';
// src/components/layout/Navbar.tsx
// ─────────────────────────────────────────────
// Sticky top navbar.
// - Desktop: horizontal links + department dropdown on hover + CTAs
// - Mobile: hamburger menu with full-screen slide-down
// - Shrinks & becomes opaque on scroll
// ─────────────────────────────────────────────
import logo from 'src/public/logo.webp';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_LINKS, NAV_CTA, SITE } from '@/data/site';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES } from '@/data/departments';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
      scrolled ? 'bg-neutral-950/95 backdrop-blur-md shadow-lg shadow-black/20 py-2' : 'bg-transparent py-4'
    )}>
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow">
            <span className="text-white font-display font-bold text-sm"><Image src="/logo.webp" alt="Logo" width={36} height={36} className="w-full h-full object-cover" /></span>
          </div>
          <span className="font-display font-bold text-lg text-white group-hover:text-primary-400 transition-colors">
            Khan<span className="text-primary-400">Hub</span>
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            link.label === 'Departments' ? (
              // Departments dropdown
              <div key={link.label} className="relative" ref={dropdownRef}>
                <button
                  onMouseEnter={() => setDeptOpen(true)}
                  onMouseLeave={() => setDeptOpen(false)}
                  onClick={() => setDeptOpen(!deptOpen)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all text-sm font-medium"
                >
                  {link.label}
                  <svg className={cn('w-3.5 h-3.5 transition-transform duration-200', deptOpen && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {deptOpen && (
                  <div
                    onMouseEnter={() => setDeptOpen(true)}
                    onMouseLeave={() => setDeptOpen(false)}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[680px] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/40 p-5 animate-fade-in"
                  >
                    {DEPARTMENT_CATEGORIES.map((cat) => (
                      <div key={cat.key} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className="text-xs">{cat.icon}</span>
                          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{cat.label}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {DEPARTMENTS.filter(d => d.category === cat.key).map((dept) => (
                            <Link
                              key={dept.slug}
                              href={`/departments/${dept.slug}`}
                              onClick={() => setDeptOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors group"
                            >
                              <span className="text-base">{dept.icon}</span>
                              <span className="text-xs text-neutral-400 group-hover:text-white transition-colors">{dept.shortName}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-neutral-800 text-center">
                      <Link href="/departments" onClick={() => setDeptOpen(false)} className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors">
                        View All Departments →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="px-4 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all text-sm font-medium"
              >
                {link.label}
              </Link>
            )
          ))}
        </div>

        {/* ── Desktop CTAs ── */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/emergency" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all">
            <span className="animate-pulse-slow">🚨</span> Emergency
          </Link>
          <Link href="/donate" className="btn-primary text-sm px-5 py-2">
            💝 Donate
          </Link>
        </div>

        {/* ── Mobile Hamburger ── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 group"
          aria-label="Toggle menu"
        >
          <span className={cn('block h-0.5 w-6 bg-white rounded transition-all duration-300', mobileOpen && 'rotate-45 translate-y-2')} />
          <span className={cn('block h-0.5 w-6 bg-white rounded transition-all duration-300', mobileOpen && 'opacity-0')} />
          <span className={cn('block h-0.5 w-6 bg-white rounded transition-all duration-300', mobileOpen && '-rotate-45 -translate-y-2')} />
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="md:hidden mt-2 mx-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl shadow-black/50">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all"
            >
              <span>{link.icon}</span>
              <span className="font-medium text-sm">{link.label}</span>
            </Link>
          ))}
          <div className="border-t border-neutral-800 mt-2 pt-3 flex flex-col gap-2">
            <Link href="/emergency" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold">
              🚨 Emergency
            </Link>
            <Link href="/donate" onClick={() => setMobileOpen(false)} className="btn-primary text-sm justify-center">
              💝 Donate Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
