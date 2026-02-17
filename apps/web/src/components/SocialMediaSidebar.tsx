'use client';
// src/components/SocialMediaSidebar.tsx - PREMIUM ANIMATED SIDEBAR
// ─────────────────────────────────────────────────────────────────
// Features:
// - Main toggle with "social-media.webp"
// - Sequential auto-expand animation on open (3s per icon)
// - Click-outside to close (Mobile)
// - Hover/Click logic preserved
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Facebook, Instagram, Youtube, Linkedin, X } from 'lucide-react';
import { SiTiktok, SiWhatsapp } from 'react-icons/si';
import { SITE } from '@/data/site';

type SocialPlatform = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
};

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    name: 'WhatsApp',
    icon: SiWhatsapp,
    url: `https://wa.me/${SITE.whatsapp?.replace(/\D/g, '')}`,
    bgColor: 'bg-[#25D366]',
    hoverBgColor: 'hover:bg-[#20BA5A]',
    textColor: 'text-white',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    url: SITE.social.facebook,
    bgColor: 'bg-[#1877F2]',
    hoverBgColor: 'hover:bg-[#1877F2]',
    textColor: 'text-white',
  },
  {
    name: 'Instagram',
    icon: Instagram,
    url: SITE.social.instagram,
    bgColor: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    hoverBgColor: 'hover:opacity-90',
    textColor: 'text-white',
  },
  {
    name: 'YouTube',
    icon: Youtube,
    url: SITE.social.youtube,
    bgColor: 'bg-[#FF0000]',
    hoverBgColor: 'hover:bg-[#CC0000]',
    textColor: 'text-white',
  },
  {
    name: 'TikTok',
    icon: SiTiktok,
    url: SITE.social.tiktok,
    bgColor: 'bg-black',
    hoverBgColor: 'hover:bg-neutral-800',
    textColor: 'text-white',
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    url: SITE.social.linkedin,
    bgColor: 'bg-[#0A66C2]',
    hoverBgColor: 'hover:bg-[#004182]',
    textColor: 'text-white',
  },
];

export default function SocialMediaSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isAutoAnimating, setIsAutoAnimating] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const animationTimers = useRef<NodeJS.Timeout[]>([]);

  // ─── Auto-Animation Logic ───
  // Cycles through each icon, expanding it for 3 seconds
  const startAutoAnimation = useCallback(() => {
    setIsAutoAnimating(true);
    // Clear any existing timers
    animationTimers.current.forEach(clearTimeout);
    animationTimers.current = [];

    SOCIAL_PLATFORMS.forEach((_, index) => {
      // Expand delay: index * 3000ms
      const startTimer = setTimeout(() => {
        if (!isOpen) return; // Stop if closed mid-sequence
        setExpandedIndex(index);
      }, index * 2000);

      // Collapse delay: (index + 1) * 3000ms
      // We explicitly set to null just before the next one starts (or at end)
      // actually, just let the next setExpandedIndex override it, 
      // but for the LAST item, we need to close it.

      animationTimers.current.push(startTimer);
    });

    // Cleanup timer to end the sequence state
    const endTimer = setTimeout(() => {
      setExpandedIndex(null);
      setIsAutoAnimating(false);
    }, SOCIAL_PLATFORMS.length * 2000);

    animationTimers.current.push(endTimer);
  }, [isOpen]);

  const stopAutoAnimation = () => {
    setIsAutoAnimating(false);
    animationTimers.current.forEach(clearTimeout);
    animationTimers.current = [];
    setExpandedIndex(null);
  };

  // ─── Effects ───

  // Trigger animation when opened
  useEffect(() => {
    if (isOpen) {
      startAutoAnimation();
    } else {
      stopAutoAnimation();
    }
    return () => stopAutoAnimation();
  }, [isOpen, startAutoAnimation]);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // ─── Handlers ───

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMouseEnter = (index: number) => {
    // User interaction overrides auto-animation
    if (isAutoAnimating) {
      stopAutoAnimation();
    }
    // Only expand on hover for desktop
    if (window.innerWidth >= 1024) {
      setExpandedIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 1024) {
      setExpandedIndex(null);
    }
  };

  const handleIconClick = (index: number, url: string) => {
    // Mobile logic: 1st click expands, 2nd click navigates
    if (window.innerWidth < 1024) {
      if (expandedIndex === index) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // If user manually clicks, stop the auto show
        if (isAutoAnimating) stopAutoAnimation();
        setExpandedIndex(index);
      }
    } else {
      // Desktop: always navigate
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={sidebarRef}
      className={`fixed z-50 transition-all duration-300 ${
        // Position: 
        // Mobile: Bottom Right key toggle? Or sticking to side?
        // User request: "open in the side bar". Let's keep it left or right fixed.
        // Previously it was "fixed left-0 top...". 
        // Let's stick to Left side for consistency, but maybe toggle moves it?
        // Let's keep strict position: Fixed Left, vertically centered.
        'left-0 top-[20%] sm:top-1/2 -translate-y-1/2'
        }`}
    >
      <div className="flex flex-col gap-4 pl-2">

        {/* Main Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl hover:scale-110 transition-transform duration-300 z-50 bg-white p-1 border-2 border-primary-100"
          aria-label="Toggle Social Media"
        >
          <Image
            src="/social-media.webp"
            alt="Connect"
            fill
            className="object-contain p-1 transition-transform duration-500"
            priority
          />
          {/* Close 'X' overlay when open ?? Or just rely on separate X? */}
          {isOpen && (
            <div className="absolute -top-1 -right-1 bg-neutral-900/80 text-white rounded-full p-0.5 scale-75 animate-in fade-in zoom-in">
              <X className="w-3 h-3" />
            </div>
          )}
        </button>

        {/* Expandable List */}
        <div
          className={`
            flex flex-col gap-3 transition-all duration-500 ease-out origin-top-left
            ${isOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-full scale-0 pointer-events-none absolute'}
          `}
        >
          {SOCIAL_PLATFORMS.map((platform, index) => {
            const Icon = platform.icon;
            const isExpanded = expandedIndex === index;

            return (
              <div
                key={platform.name}
                className="relative"
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => handleIconClick(index, platform.url)}
                  className={`
                    group relative flex items-center justify-start
                    ${platform.bgColor} ${platform.hoverBgColor} ${platform.textColor}
                    rounded-full shadow-lg hover:shadow-xl
                    transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isExpanded ? 'w-40 pl-3' : 'w-10 pl-0'}
                    h-10
                    overflow-hidden
                  `}
                  aria-label={platform.name}
                >
                  {/* Icon Circle */}
                  <div className="absolute left-0 w-10 h-10 rounded-full flex items-center justify-center z-10">
                    <Icon className="w-5 h-5 drop-shadow-sm" />
                  </div>

                  {/* Label */}
                  <div
                    className={`
                      absolute left-10 font-bold text-sm whitespace-nowrap pr-4
                      transition-all duration-300
                      ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                    `}
                  >
                    {platform.name}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}