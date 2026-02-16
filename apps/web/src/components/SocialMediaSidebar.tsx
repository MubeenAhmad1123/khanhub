'use client';
// src/components/SocialMediaSidebar.tsx - PREMIUM EXPANDABLE DESIGN
// ─────────────────────────────────────────────────────────────────
// Features:
// - Pill-shaped expandable buttons (stadium shape)
// - Platform-specific brand colors
// - Hover to expand on desktop
// - Click to expand on mobile
// - Smooth animations
// - Fixed position on right side
// ─────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Facebook, Instagram, Youtube, Linkedin } from 'lucide-react';
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleMouseEnter = (index: number) => {
    // Only auto-expand on desktop (hover)
    if (window.innerWidth >= 1024) {
      setExpandedIndex(index);
    }
  };

  const handleMouseLeave = () => {
    // Only auto-collapse on desktop
    if (window.innerWidth >= 1024) {
      setExpandedIndex(null);
    }
  };

  const handleClick = (index: number, url: string) => {
    // On mobile, toggle expansion on first click, navigate on second click
    if (window.innerWidth < 1024) {
      if (expandedIndex === index) {
        // Already expanded, navigate
        window.open(url, '_blank', 'noopener,noreferrer');
        setExpandedIndex(null);
      } else {
        // Expand this item
        setExpandedIndex(index);
      }
    } else {
      // On desktop, always navigate
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed left-0 top-[80px] lg:top-1/2 lg:-translate-y-1/2 z-40">
      <div className="flex flex-col gap-2 pl-0">
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
                onClick={() => handleClick(index, platform.url)}
                className={`
                  group relative flex items-center justify-start
                  ${platform.bgColor} ${platform.hoverBgColor} ${platform.textColor}
                  rounded-full shadow-lg hover:shadow-xl
                  transition-all duration-300 ease-out
                  ${isExpanded ? 'w-36 pl-2.5' : 'w-9 pl-0'}
                  h-9
                  overflow-hidden
                `}
                aria-label={platform.name}
              >
                {/* Icon Circle - Always visible on the left */}
                <div className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Platform Name - Slides in from right */}
                <div
                  className={`
                    absolute right-3 font-bold text-xs whitespace-nowrap
                    transition-all duration-300 ease-out
                    ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
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
  );
}