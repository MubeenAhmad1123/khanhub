'use client';
// src/components/layout/Navbar.tsx - ENHANCED VERSION
// ─────────────────────────────────────────────────────────────────
// Premium responsive navbar with smooth animations and better UX
// Features:
// - Smooth scroll effects with backdrop blur
// - Enhanced mobile menu with better animations
// - Improved dropdown design with categories
// - Better touch targets for mobile
// - Optimized performance with RAF throttling
// ─────────────────────────────────────────────────────────────────

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
  const [mobileDeptOpen, setMobileDeptOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out',
          scrolled
            ? 'bg-neutral-950/95 backdrop-blur-2xl shadow-2xl shadow-black/50 py-2 sm:py-2.5 lg:py-2'
            : 'bg-transparent py-3 sm:py-4 lg:py-5'
        )}
      >
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group flex-shrink-0">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/60 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/logo.webp"
                  alt="KhanHub Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-lg sm:rounded-xl"
                  priority
                />
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-tr from-white/0 via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <span className="font-display font-bold text-base sm:text-lg lg:text-xl text-white group-hover:text-primary-400 transition-colors duration-300">
                Khan<span className="text-primary-400 group-hover:text-primary-300">Hub</span>
              </span>
            </Link>

            {/* ── Desktop/Tablet Nav ── */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-1 justify-center max-w-2xl">
              {NAV_LINKS.map((link) =>
                link.label === 'Departments' ? (
                  // Enhanced Departments dropdown
                  <div key={link.label} className="relative" ref={dropdownRef}>
                    <button
                      onMouseEnter={() => setDeptOpen(true)}
                      onMouseLeave={() => setDeptOpen(false)}
                      onClick={() => setDeptOpen(!deptOpen)}
                      className={cn(
                        'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-all duration-300 text-xs sm:text-sm lg:text-base font-medium group',
                        pathname?.startsWith('/departments') && 'text-primary-400 bg-neutral-800/40'
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

                    {/* Premium Desktop Dropdown */}
                    {deptOpen && (
                      <div
                        onMouseEnter={() => setDeptOpen(true)}
                        onMouseLeave={() => setDeptOpen(false)}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[90vw] max-w-[680px] lg:max-w-[760px] bg-neutral-900/98 backdrop-blur-2xl border border-neutral-800/80 rounded-2xl shadow-2xl shadow-black/60 p-5 lg:p-7 animate-dropdown-in overflow-hidden"
                      >
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-success-500/5 pointer-events-none" />

                        <div className="relative z-10">
                          {DEPARTMENT_CATEGORIES.map((cat, idx) => (
                            <div
                              key={cat.key}
                              className="mb-5 lg:mb-6 last:mb-0 animate-fade-in"
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <div className="flex items-center gap-2 mb-3 px-1">
                                <span className="text-sm lg:text-base">{cat.icon}</span>
                                <span className="text-xs lg:text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                  {cat.label}
                                </span>
                                <div className="flex-1 h-px bg-gradient-to-r from-neutral-800 to-transparent ml-2" />
                              </div>
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                                {DEPARTMENTS.filter((d) => d.category === cat.key).map((dept) => (
                                  <Link
                                    key={dept.slug}
                                    href={`/departments/${dept.slug}`}
                                    onClick={() => setDeptOpen(false)}
                                    className="flex items-center gap-2.5 px-3 lg:px-3.5 py-2.5 lg:py-3 rounded-xl hover:bg-neutral-800/70 hover:scale-105 transition-all duration-300 group/item"
                                  >
                                    <span className="text-sm lg:text-base flex-shrink-0 group-hover/item:scale-110 transition-transform">
                                      {dept.icon}
                                    </span>
                                    <span className="text-xs lg:text-sm text-neutral-400 group-hover/item:text-white transition-colors truncate font-medium">
                                      {dept.shortName}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="mt-4 pt-4 border-t border-neutral-800/80 text-center">
                            <Link
                              href="/departments"
                              onClick={() => setDeptOpen(false)}
                              className="text-xs lg:text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors inline-flex items-center gap-2 group/all"
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
                      'px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-all duration-300 text-xs sm:text-sm lg:text-base font-medium whitespace-nowrap hover:scale-105',
                      pathname === link.href && 'text-primary-400 bg-neutral-800/40'
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
                className="flex items-center gap-1.5 px-3 sm:px-3.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs sm:text-sm lg:text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:scale-105 transition-all duration-300 whitespace-nowrap group"
              >
                <span className="animate-pulse-slow">🚨</span>
                <span className="hidden lg:inline group-hover:text-red-300 transition-colors">Emergency</span>
              </Link>
              <Link
                href="/donate"
                className="btn-primary text-xs sm:text-sm lg:text-sm px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 whitespace-nowrap hover:scale-105"
              >
                <span className="hidden sm:inline">💝 </span>Donate
              </Link>
            </div>

            {/* ── Mobile Hamburger ── */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2.5 group relative z-50 hover:bg-neutral-800/50 rounded-lg transition-all duration-300"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span
                className={cn(
                  'block h-0.5 w-6 bg-white rounded transition-all duration-300 group-hover:bg-primary-400',
                  mobileOpen && 'rotate-45 translate-y-2'
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-6 bg-white rounded transition-all duration-300 group-hover:bg-primary-400',
                  mobileOpen && 'opacity-0 scale-0'
                )}
              />
              <span
                className={cn(
                  'block h-0.5 w-6 bg-white rounded transition-all duration-300 group-hover:bg-primary-400',
                  mobileOpen && '-rotate-45 -translate-y-2'
                )}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-md z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Enhanced Mobile Menu ── */}
      <div
        className={cn(
          'md:hidden fixed top-[60px] sm:top-[68px] left-0 right-0 bottom-0 z-40 transition-all duration-500 ease-out',
          mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        )}
      >
        <div className="h-full overflow-y-auto bg-neutral-950/98 backdrop-blur-2xl border-t border-neutral-800 shadow-2xl">
          <div className="px-4 py-6 space-y-1.5">
            {NAV_LINKS.map((link) =>
              link.label === 'Departments' ? (
                <div key={link.label}>
                  <button
                    onClick={() => setMobileDeptOpen(!mobileDeptOpen)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-neutral-300 hover:bg-neutral-800/70 hover:text-white transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg group-hover:scale-110 transition-transform">{link.icon}</span>
                      <span className="font-semibold text-sm">{link.label}</span>
                    </div>
                    <svg
                      className={cn(
                        'w-4 h-4 transition-transform duration-300',
                        mobileDeptOpen && 'rotate-180'
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Mobile Departments Submenu */}
                  {mobileDeptOpen && (
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-primary-500/30 space-y-1.5 animate-fade-in">
                      {DEPARTMENT_CATEGORIES.map((cat) => (
                        <div key={cat.key} className="mb-4">
                          <div className="flex items-center gap-2 mb-2 px-2">
                            <span className="text-sm">{cat.icon}</span>
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                              {cat.label}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {DEPARTMENTS.filter((d) => d.category === cat.key).map((dept) => (
                              <Link
                                key={dept.slug}
                                href={`/departments/${dept.slug}`}
                                onClick={() => {
                                  setMobileOpen(false);
                                  setMobileDeptOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-neutral-800/70 hover:scale-105 transition-all duration-300 group/dept"
                              >
                                <span className="text-base group-hover/dept:scale-110 transition-transform">
                                  {dept.icon}
                                </span>
                                <span className="text-sm text-neutral-400 group-hover/dept:text-white transition-colors font-medium">
                                  {dept.shortName}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Link
                        href="/departments"
                        onClick={() => {
                          setMobileOpen(false);
                          setMobileDeptOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-3 rounded-xl text-primary-400 hover:bg-neutral-800/70 hover:text-primary-300 transition-all duration-300 text-sm font-semibold mt-2"
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
                    'flex items-center gap-3 px-4 py-3.5 rounded-xl text-neutral-300 hover:bg-neutral-800/70 hover:text-white hover:scale-105 transition-all duration-300 group',
                    pathname === link.href && 'bg-neutral-800/70 text-primary-400'
                  )}
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">{link.icon}</span>
                  <span className="font-semibold text-sm">{link.label}</span>
                </Link>
              )
            )}

            {/* Mobile CTAs */}
            <div className="pt-4 mt-4 border-t border-neutral-800/50 space-y-2.5">
              <Link
                href="/emergency"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:scale-105 text-sm font-bold transition-all duration-300 group"
              >
                <span className="animate-pulse-slow text-lg">🚨</span>
                <span className="group-hover:text-red-300 transition-colors">Emergency Services</span>
              </Link>
              <Link
                href="/donate"
                onClick={() => setMobileOpen(false)}
                className="btn-primary text-sm justify-center w-full py-4 hover:scale-105"
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