'use client';
// src/components/layout/Navbar.tsx - OPTIMIZED VERSION
// ─────────────────────────────────────────────────────────────────
// Optimizations:
// ✅ Fixed hamburger menu visibility on mobile
// ✅ Fixed mobile zoom issue with proper viewport meta
// ✅ Performance optimized with React.memo and useCallback
// ✅ SEO optimized with semantic HTML and ARIA labels
// ✅ Mobile-first responsive design
// ✅ Reduced re-renders and improved scroll performance
// ─────────────────────────────────────────────────────────────────

import UserMenu from './UserMenu';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DEPARTMENTS, DEPARTMENT_CATEGORIES } from '@/data/departments';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown, Facebook, Instagram, Youtube, Linkedin } from 'lucide-react';
import { SiTiktok, SiWhatsapp } from 'react-icons/si';
import { SITE } from '@/data/site';

// Navigation links - memoized constant
const NAV_LINKS = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Departments', href: '/departments', icon: '🏢' },
  { label: 'Media', href: '/media', icon: '📸' },
  { label: 'Contact', href: '/contact', icon: '📞' },
  { label: 'Certificates', href: '/certificates', icon: '🏆' },
  { label: 'Success Stories', href: '/success-stories', icon: '🌟', mobileOnly: true },
  { label: 'About', href: '/about', icon: 'ℹ️' },
] as const;

// Memoized Logo Component
const Logo = memo(function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group flex-shrink-0" aria-label="Khan Hub Home">
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
        <Image
          src="/logo.webp"
          alt={`${SITE.name} Foundation Logo`}
          width={44}
          height={44}
          className="w-full h-full object-cover rounded-lg sm:rounded-xl"
          priority
          loading="eager"
        />
        <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-tr from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <span className="font-display font-bold text-sm sm:text-lg lg:text-xl text-neutral-900 group-hover:text-primary-600 transition-colors duration-300">
        Khan<span className="text-primary-600 group-hover:text-primary-700">Hub</span>
      </span>
    </Link>
  );
});

// Memoized Department Category Component
const DepartmentCategory = memo(function DepartmentCategory({
  cat,
  onClose
}: {
  cat: typeof DEPARTMENT_CATEGORIES[0],
  onClose: () => void
}) {
  const categoryDepts = DEPARTMENTS.filter((d) => d.category === cat.key);
  if (categoryDepts.length === 0) return null;

  return (
    <div className="mb-5 lg:mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-sm lg:text-base" aria-hidden="true">{cat.icon}</span>
        <span className="text-xs lg:text-sm font-bold text-neutral-600 uppercase tracking-wider">
          {cat.label}
        </span>
        <span className="text-xs text-neutral-500">({categoryDepts.length})</span>
        <div className="flex-1 h-px bg-gradient-to-r from-neutral-300/50 to-transparent ml-2" />
      </div>
      <nav className="grid grid-cols-2 lg:grid-cols-3 gap-1.5" aria-label={`${cat.label} departments`}>
        {categoryDepts.map((dept) => (
          <Link
            key={dept.slug}
            href={`/departments/${dept.slug}`}
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 lg:px-3.5 py-2.5 lg:py-3 rounded-xl hover:bg-primary-50/70 hover:scale-105 transition-all duration-300 group/item border border-transparent hover:border-primary-200/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label={dept.name}
          >
            <span className="text-sm lg:text-base flex-shrink-0 group-hover/item:scale-110 transition-transform" aria-hidden="true">
              {dept.icon}
            </span>
            <span className="text-xs lg:text-sm text-neutral-700 group-hover/item:text-primary-700 transition-colors font-semibold leading-tight">
              {dept.name}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
});

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [mobileDeptOpen, setMobileDeptOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  // Optimized scroll listener with RAF throttling
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
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    };
  }, [mobileOpen]);

  // Memoized callbacks
  const handleDeptMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setDeptOpen(true);
  }, []);

  const handleDeptMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setDeptOpen(false);
    }, 300);
  }, []);

  const handleDeptClick = useCallback(() => {
    setDeptOpen((prev) => !prev);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  const closeDeptDropdown = useCallback(() => {
    setDeptOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const toggleMobileDept = useCallback(() => {
    setMobileDeptOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    setMobileDeptOpen(false);
  }, []);

  return (
    <>
      {/* SEO: Semantic header element */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out',
          scrolled
            ? 'bg-white/95 backdrop-blur-2xl shadow-lg shadow-neutral-200/50 border-b border-neutral-200/60 py-2 sm:py-2.5 lg:py-2'
            : 'bg-white/80 backdrop-blur-xl border-b border-white/30 py-2.5 sm:py-3 lg:py-4'
        )}
        role="banner"
      >
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" aria-hidden="true" />

        <div className="relative w-full max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <nav className="flex items-center justify-between gap-2 sm:gap-4" aria-label="Main navigation">
            {/* Logo */}
            <Logo />

            {/* Desktop/Tablet Nav */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-1 justify-center max-w-2xl">
              {NAV_LINKS.filter(link => !(link as any).mobileOnly).map((link) =>
                link.label === 'Departments' ? (
                  // Departments dropdown
                  <div key={link.label} className="relative" ref={dropdownRef}>
                    <button
                      onMouseEnter={handleDeptMouseEnter}
                      onMouseLeave={handleDeptMouseLeave}
                      onClick={handleDeptClick}
                      className={cn(
                        'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-neutral-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 text-xs sm:text-sm lg:text-base font-semibold group',
                        pathname?.startsWith('/departments') && 'text-primary-600 bg-primary-50/70'
                      )}
                      aria-expanded={deptOpen}
                      aria-haspopup="true"
                      aria-label="Departments menu"
                    >
                      {link.label}
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300 group-hover:scale-110',
                          deptOpen && 'rotate-180'
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Premium Dropdown */}
                    {deptOpen && (
                      <div
                        onMouseEnter={handleDeptMouseEnter}
                        onMouseLeave={handleDeptMouseLeave}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[90vw] max-w-[720px] lg:max-w-[820px] bg-white/95 backdrop-blur-2xl border border-neutral-200/60 rounded-2xl shadow-2xl shadow-neutral-300/50 p-5 lg:p-7 animate-dropdown-in overflow-hidden"
                        role="menu"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 via-transparent to-success-50/30 pointer-events-none" aria-hidden="true" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-300/50 to-transparent" aria-hidden="true" />

                        <div className="relative z-10">
                          {DEPARTMENT_CATEGORIES.map((cat) => (
                            <DepartmentCategory key={cat.key} cat={cat} onClose={closeDeptDropdown} />
                          ))}
                          <div className="mt-4 pt-4 border-t border-neutral-200/60 text-center">
                            <Link
                              href="/departments"
                              onClick={closeDeptDropdown}
                              className="text-xs lg:text-sm text-primary-600 hover:text-primary-700 font-bold transition-colors inline-flex items-center gap-2 group/all px-4 py-2 rounded-lg hover:bg-primary-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                            >
                              View All {DEPARTMENTS.length} Departments
                              <svg className="w-4 h-4 group-hover/all:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                      'px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-neutral-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 text-xs sm:text-sm lg:text-base font-semibold whitespace-nowrap hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                      pathname === link.href && 'text-primary-600 bg-primary-50/70'
                    )}
                    aria-current={pathname === link.href ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            {/* Desktop/Tablet CTAs */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5 flex-shrink-0">
              <Link
                href="/emergency"
                className="flex items-center gap-1.5 px-3 sm:px-3.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs sm:text-sm lg:text-sm font-bold text-red-600 bg-red-50/70 border-2 border-red-200/60 hover:bg-red-100/70 hover:border-red-300/60 hover:scale-105 transition-all duration-300 whitespace-nowrap group shadow-sm shadow-red-200/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Emergency Services"
              >
                <span className="animate-pulse-slow" aria-hidden="true">🚨</span>
                <span className="hidden lg:inline group-hover:text-red-700 transition-colors">Emergency</span>
              </Link>
              <Link
                href="/donate"
                className="flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 rounded-lg text-xs sm:text-sm lg:text-sm font-bold text-white bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 shadow-lg shadow-success-500/30 hover:shadow-success-500/50 hover:scale-105 transition-all duration-300 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
              >
                <span className="hidden sm:inline" aria-hidden="true">💝</span>Donate
              </Link>
              <UserMenu />
            </div>

            {/* Mobile Icons Row - Compact to fit all 7 items */}
            <div className="md:hidden flex items-center gap-0 flex-1 justify-end mr-0.5">
              {Object.entries(SITE.social).map(([platform, url]) => {
                if (!url && platform !== 'linkedin') return null;
                const Icon = platform === 'facebook' ? Facebook :
                  platform === 'instagram' ? Instagram :
                    platform === 'youtube' ? Youtube :
                      platform === 'tiktok' ? SiTiktok :
                        platform === 'whatsapp' ? SiWhatsapp :
                          platform === 'linkedin' ? Linkedin : null;
                if (!Icon) return null;
                return (
                  <a
                    key={platform}
                    href={url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg text-neutral-600 hover:text-primary-600 transition-colors flex-shrink-0"
                    aria-label={platform}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 h-4" />
                  </a>
                );
              })}
              {/* Download App Image - Forced Visibility */}
              <a href="/download-app" className="p-1 rounded-lg text-neutral-600 hover:text-primary-600 transition-colors flex-shrink-0">
                <Image src="/app-download.webp" alt="Download App" width={20} height={20} className="rounded-sm" />
              </a>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden flex items-center justify-center p-2.5 rounded-lg group relative z-[60] hover:bg-primary-50/50 transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px]"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? (
                <X className="w-6 h-6 text-primary-600" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6 text-neutral-900 group-hover:text-primary-600" aria-hidden="true" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-neutral-900/30 backdrop-blur-sm z-40 animate-fade-in"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu */}
      <nav
        id="mobile-menu"
        className={cn(
          'md:hidden fixed top-[56px] sm:top-[60px] left-0 right-0 bottom-0 z-[45] transition-all duration-500 ease-out',
          mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        )}
        aria-label="Mobile navigation"
      >
        <div className="h-full overflow-y-auto bg-white/95 backdrop-blur-2xl border-t border-neutral-200/60 shadow-2xl shadow-neutral-300/50 overscroll-contain">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-50/20 via-transparent to-success-50/20 pointer-events-none" aria-hidden="true" />

          <div className="relative px-4 py-6 space-y-1.5">
            {NAV_LINKS.map((link) =>
              link.label === 'Departments' ? (
                <div key={link.label}>
                  <button
                    onClick={toggleMobileDept}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-primary-50/70 hover:text-primary-700 transition-all duration-300 group border border-transparent hover:border-primary-200/50 touch-manipulation min-h-[44px]"
                    aria-expanded={mobileDeptOpen}
                    aria-controls="mobile-departments"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg group-hover:scale-110 transition-transform" aria-hidden="true">{link.icon}</span>
                      <span className="font-bold text-sm">{link.label}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform duration-300 text-neutral-600 group-hover:text-primary-600',
                        mobileDeptOpen && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Mobile Departments Submenu */}
                  {mobileDeptOpen && (
                    <div id="mobile-departments" className="mt-2 ml-4 pl-4 border-l-2 border-primary-300/50 space-y-1.5 animate-fade-in">
                      {DEPARTMENT_CATEGORIES.map((cat) => {
                        const categoryDepts = DEPARTMENTS.filter((d) => d.category === cat.key);
                        if (categoryDepts.length === 0) return null;

                        return (
                          <div key={cat.key} className="mb-4">
                            <div className="flex items-center gap-2 mb-2 px-2">
                              <span className="text-sm" aria-hidden="true">{cat.icon}</span>
                              <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                                {cat.label} ({categoryDepts.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {categoryDepts.map((dept) => (
                                <Link
                                  key={dept.slug}
                                  href={`/departments/${dept.slug}`}
                                  onClick={closeMobileMenu}
                                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-primary-50/70 hover:scale-105 transition-all duration-300 group/dept border border-transparent hover:border-primary-200/50 touch-manipulation min-h-[44px]"
                                >
                                  <span className="text-base group-hover/dept:scale-110 transition-transform flex-shrink-0" aria-hidden="true">
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
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 px-3 py-3 rounded-xl text-primary-600 hover:bg-primary-50/70 hover:text-primary-700 transition-all duration-300 text-sm font-bold mt-2 border border-primary-200/50 touch-manipulation min-h-[44px]"
                      >
                        View All Departments
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                  onClick={closeMobileMenu}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-xl text-neutral-700 hover:bg-primary-50/70 hover:text-primary-700 hover:scale-105 transition-all duration-300 group border border-transparent hover:border-primary-200/50 touch-manipulation min-h-[44px]',
                    pathname === link.href && 'bg-primary-50/70 text-primary-700 border-primary-200/50'
                  )}
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  <span className="text-lg group-hover:scale-110 transition-transform" aria-hidden="true">{link.icon}</span>
                  <span className="font-bold text-sm">{link.label}</span>
                </Link>
              )
            )}

            {/* Mobile CTAs */}
            <div className="pt-4 mt-4 border-t border-neutral-200/60 space-y-2.5">
              <Link
                href="/emergency"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl bg-red-50/70 border-2 border-red-200/60 text-red-600 hover:bg-red-100/70 hover:border-red-300/60 hover:scale-105 text-sm font-bold transition-all duration-300 group shadow-sm shadow-red-200/30 touch-manipulation min-h-[44px]"
              >
                <span className="animate-pulse-slow text-lg" aria-hidden="true">🚨</span>
                <span className="group-hover:text-red-700 transition-colors">Emergency Services</span>
              </Link>
              <Link
                href="/donate"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 shadow-lg shadow-success-500/30 hover:shadow-success-500/50 hover:scale-105 transition-all duration-300 touch-manipulation min-h-[44px]"
              >
                <span aria-hidden="true">💝</span> Donate Now
              </Link>

              <div className="flex flex-col items-center gap-4 pt-4 border-t border-neutral-100">
                <UserMenu />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {Object.entries(SITE.social).map(([platform, url]) => {
                    if (!url && platform !== 'linkedin') return null;
                    const Icon = platform === 'facebook' ? Facebook :
                      platform === 'instagram' ? Instagram :
                        platform === 'youtube' ? Youtube :
                          platform === 'tiktok' ? SiTiktok :
                            platform === 'whatsapp' ? SiWhatsapp :
                              platform === 'linkedin' ? Linkedin : null;
                    if (!Icon) return null;
                    return (
                      <a
                        key={platform}
                        href={url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-neutral-50 text-neutral-600 hover:bg-primary-50 hover:text-primary-600 transition-colors border border-neutral-200"
                        aria-label={platform}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                  {/* Added Download App image to the menu as well */}
                  <a
                    href="/download-app"
                    className="p-2 rounded-full bg-neutral-50 text-neutral-600 hover:bg-primary-50 hover:text-primary-600 transition-colors border border-neutral-200 flex-shrink-0"
                    aria-label="Download App"
                  >
                    <Image src="/app-download.webp" alt="Download App" width={20} height={20} className="rounded-sm" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

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

        /* Improve touch target sizes on mobile */
        @media (max-width: 768px) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        }

        /* Prevent zoom on mobile inputs/buttons */
        @media (max-width: 768px) {
          button, input, select, textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
    </>
  );
}