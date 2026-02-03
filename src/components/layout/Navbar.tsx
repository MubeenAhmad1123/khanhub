'use client';
// src/components/layout/Navbar.tsx - FIXED VERSION
// ─────────────────────────────────────────────────────────────────
// Fixes:
// 1. Mobile hamburger menu now visible and functional
// 2. Department dropdown stays open longer (improved UX)
// 3. All 16 departments with full names
// 4. Better hover timing and click-to-stay behavior
// ─────────────────────────────────────────────────────────────────

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES } from '@/data/departments';
import { cn } from '@/lib/utils';

// Navigation links
const NAV_LINKS = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Departments', href: '/departments', icon: '🏢' },
  { label: 'About', href: '/about', icon: 'ℹ️' },
  { label: 'Media', href: '/media', icon: '📸' },
  { label: 'Contact', href: '/contact', icon: '📞' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [mobileDeptOpen, setMobileDeptOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  // Optimized scroll listener
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobileDeptOpen(false);
  }, [pathname]);

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

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  // Enhanced hover handlers with delay
  const handleDeptMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setDeptOpen(true);
  };

  const handleDeptMouseLeave = () => {
    // Add 300ms delay before closing
    hoverTimeoutRef.current = setTimeout(() => {
      setDeptOpen(false);
    }, 300);
  };

  // Click handler to keep dropdown open
  const handleDeptClick = () => {
    setDeptOpen(!deptOpen);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out',
          scrolled
            ? 'bg-white/80 backdrop-blur-2xl shadow-lg shadow-neutral-200/50 border-b border-neutral-200/60 py-2 sm:py-2.5 lg:py-2'
            : 'bg-white/60 backdrop-blur-xl border-b border-white/30 py-3 sm:py-4 lg:py-5'
        )}
      >
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />

        <div className="relative w-full max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group flex-shrink-0">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/logo.webp"
                  alt="KhanHub Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-lg sm:rounded-xl"
                  priority
                />
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-tr from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <span className="font-display font-bold text-base sm:text-lg lg:text-xl text-neutral-900 group-hover:text-primary-600 transition-colors duration-300">
                Khan<span className="text-primary-600 group-hover:text-primary-700">Hub</span>
              </span>
            </Link>

            {/* ── Desktop/Tablet Nav ── */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-1 justify-center max-w-2xl">
              {NAV_LINKS.map((link) =>
                link.label === 'Departments' ? (
                  // Enhanced Departments dropdown with better UX
                  <div key={link.label} className="relative" ref={dropdownRef}>
                    <button
                      onMouseEnter={handleDeptMouseEnter}
                      onMouseLeave={handleDeptMouseLeave}
                      onClick={handleDeptClick}
                      className={cn(
                        'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-neutral-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 text-xs sm:text-sm lg:text-base font-semibold group',
                        pathname?.startsWith('/departments') && 'text-primary-600 bg-primary-50/70'
                      )}
                    >
                      {link.label}
                      <svg
                        className={cn(
                          'w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300 group-hover:scale-110',
                          deptOpen && 'rotate-180'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Premium Glassmorphism Dropdown - Fixed UX */}
                    {deptOpen && (
                      <div
                        onMouseEnter={handleDeptMouseEnter}
                        onMouseLeave={handleDeptMouseLeave}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[90vw] max-w-[720px] lg:max-w-[820px] bg-white/95 backdrop-blur-2xl border border-neutral-200/60 rounded-2xl shadow-2xl shadow-neutral-300/50 p-5 lg:p-7 animate-dropdown-in overflow-hidden"
                      >
                        {/* Gradient overlays for depth */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-transparent to-success-50/30 pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-300/50 to-transparent" />

                        <div className="relative z-10">
                          {DEPARTMENT_CATEGORIES.map((cat, idx) => {
                            const categoryDepts = DEPARTMENTS.filter((d) => d.category === cat.key);
                            if (categoryDepts.length === 0) return null;

                            return (
                              <div
                                key={cat.key}
                                className="mb-5 lg:mb-6 last:mb-0 animate-fade-in"
                                style={{ animationDelay: `${idx * 50}ms` }}
                              >
                                <div className="flex items-center gap-2 mb-3 px-1">
                                  <span className="text-sm lg:text-base">{cat.icon}</span>
                                  <span className="text-xs lg:text-sm font-bold text-neutral-600 uppercase tracking-wider">
                                    {cat.label}
                                  </span>
                                  <span className="text-xs text-neutral-500">({categoryDepts.length})</span>
                                  <div className="flex-1 h-px bg-gradient-to-r from-neutral-300/50 to-transparent ml-2" />
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                                  {categoryDepts.map((dept) => (
                                    <Link
                                      key={dept.slug}
                                      href={`/departments/${dept.slug}`}
                                      onClick={() => setDeptOpen(false)}
                                      className="flex items-center gap-2.5 px-3 lg:px-3.5 py-2.5 lg:py-3 rounded-xl hover:bg-primary-50/70 hover:scale-105 transition-all duration-300 group/item border border-transparent hover:border-primary-200/50"
                                    >
                                      <span className="text-sm lg:text-base flex-shrink-0 group-hover/item:scale-110 transition-transform">
                                        {dept.icon}
                                      </span>
                                      <span className="text-xs lg:text-sm text-neutral-700 group-hover/item:text-primary-700 transition-colors font-semibold leading-tight">
                                        {dept.name}
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-4 pt-4 border-t border-neutral-200/60 text-center">
                            <Link
                              href="/departments"
                              onClick={() => setDeptOpen(false)}
                              className="text-xs lg:text-sm text-primary-600 hover:text-primary-700 font-bold transition-colors inline-flex items-center gap-2 group/all px-4 py-2 rounded-lg hover:bg-primary-50/50"
                            >
                              View All {DEPARTMENTS.length} Departments
                              <svg className="w-4 h-4 group-hover/all:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={cn(
                      'px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-neutral-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 text-xs sm:text-sm lg:text-base font-semibold whitespace-nowrap hover:scale-105',
                      pathname === link.href && 'text-primary-600 bg-primary-50/70'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            {/* ── Desktop/Tablet CTAs ── */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5 flex-shrink-0">
              <Link
                href="/emergency"
                className="flex items-center gap-1.5 px-3 sm:px-3.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs sm:text-sm lg:text-sm font-bold text-red-600 bg-red-50/70 border-2 border-red-200/60 hover:bg-red-100/70 hover:border-red-300/60 hover:scale-105 transition-all duration-300 whitespace-nowrap group shadow-sm shadow-red-200/30"
              >
                <span className="animate-pulse-slow">🚨</span>
                <span className="hidden lg:inline group-hover:text-red-700 transition-colors">Emergency</span>
              </Link>
              <Link
                href="/donate"
                className="flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 rounded-lg text-xs sm:text-sm lg:text-sm font-bold text-white bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 shadow-lg shadow-success-500/30 hover:shadow-success-500/50 hover:scale-105 transition-all duration-300 whitespace-nowrap"
              >
                <span className="hidden sm:inline">💝</span>Donate
              </Link>
            </div>

            {/* ── Mobile Hamburger - FIXED ── */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2.5 group relative z-[60] hover:bg-primary-50/50 rounded-lg transition-all duration-300"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span
                className={cn(
                  'block h-0.5 w-6 bg-neutral-900 rounded transition-all duration-300 group-hover:bg-primary-600',
                  mobileOpen && 'rotate-45 translate-y-2 bg-primary-600'
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-6 bg-neutral-900 rounded transition-all duration-300 group-hover:bg-primary-600',
                  mobileOpen && 'opacity-0 scale-0'
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-6 bg-neutral-900 rounded transition-all duration-300 group-hover:bg-primary-600',
                  mobileOpen && '-rotate-45 -translate-y-2 bg-primary-600'
                )}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-neutral-900/30 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Glassmorphism Mobile Menu ── */}
      <div
        className={cn(
          'md:hidden fixed top-[60px] sm:top-[68px] left-0 right-0 bottom-0 z-[45] transition-all duration-500 ease-out',
          mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <div className="h-full overflow-y-auto bg-white/95 backdrop-blur-2xl border-t border-neutral-200/60 shadow-2xl shadow-neutral-300/50">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary-50/20 via-transparent to-success-50/20 pointer-events-none" />

          <div className="relative px-4 py-6 space-y-1.5">
            {NAV_LINKS.map((link) =>
              link.label === 'Departments' ? (
                <div key={link.label}>
                  <button
                    onClick={() => setMobileDeptOpen(!mobileDeptOpen)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-primary-50/70 hover:text-primary-700 transition-all duration-300 group border border-transparent hover:border-primary-200/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg group-hover:scale-110 transition-transform">{link.icon}</span>
                      <span className="font-bold text-sm">{link.label}</span>
                    </div>
                    <svg
                      className={cn(
                        'w-4 h-4 transition-transform duration-300 text-neutral-600 group-hover:text-primary-600',
                        mobileDeptOpen && 'rotate-180'
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Mobile Departments Submenu - ALL DEPARTMENTS */}
                  {mobileDeptOpen && (
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-primary-300/50 space-y-1.5 animate-fade-in">
                      {DEPARTMENT_CATEGORIES.map((cat) => {
                        const categoryDepts = DEPARTMENTS.filter((d) => d.category === cat.key);
                        if (categoryDepts.length === 0) return null;

                        return (
                          <div key={cat.key} className="mb-4">
                            <div className="flex items-center gap-2 mb-2 px-2">
                              <span className="text-sm">{cat.icon}</span>
                              <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                                {cat.label} ({categoryDepts.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {categoryDepts.map((dept) => (
                                <Link
                                  key={dept.slug}
                                  href={`/departments/${dept.slug}`}
                                  onClick={() => {
                                    setMobileOpen(false);
                                    setMobileDeptOpen(false);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-primary-50/70 hover:scale-105 transition-all duration-300 group/dept border border-transparent hover:border-primary-200/50"
                                >
                                  <span className="text-base group-hover/dept:scale-110 transition-transform flex-shrink-0">
                                    {dept.icon}
                                  </span>
                                  <span className="text-sm text-neutral-700 group-hover/dept:text-primary-700 transition-colors font-semibold leading-tight">
                                    {dept.name}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <Link
                        href="/departments"
                        onClick={() => {
                          setMobileOpen(false);
                          setMobileDeptOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-3 rounded-xl text-primary-600 hover:bg-primary-50/70 hover:text-primary-700 transition-all duration-300 text-sm font-bold mt-2 border border-primary-200/50"
                      >
                        View All Departments
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-primary-50/70 hover:text-primary-700 hover:scale-105 transition-all duration-300 group border border-transparent hover:border-primary-200/50',
                    pathname === link.href && 'bg-primary-50/70 text-primary-700 border-primary-200/50'
                  )}
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">{link.icon}</span>
                  <span className="font-bold text-sm">{link.label}</span>
                </Link>
              )
            )}

            {/* Mobile CTAs */}
            <div className="pt-4 mt-4 border-t border-neutral-200/60 space-y-2.5">
              <Link
                href="/emergency"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl bg-red-50/70 border-2 border-red-200/60 text-red-600 hover:bg-red-100/70 hover:border-red-300/60 hover:scale-105 text-sm font-bold transition-all duration-300 group shadow-sm shadow-red-200/30"
              >
                <span className="animate-pulse-slow text-lg">🚨</span>
                <span className="group-hover:text-red-700 transition-colors">Emergency Services</span>
              </Link>
              <Link
                href="/donate"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 shadow-lg shadow-success-500/30 hover:shadow-success-500/50 hover:scale-105 transition-all duration-300"
              >
                💝 Donate Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-dropdown-in {
          animation: dropdown-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
}