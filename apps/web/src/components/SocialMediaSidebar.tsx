'use client';
// src/components/SocialMediaSidebar.tsx - DRAGGABLE PREMIUM ANIMATED SIDEBAR
// ─────────────────────────────────────────────────────────────────
// Features:
// - Fully draggable to all 4 edges of the screen (snaps to nearest edge on release)
// - Green online dot on the toggle button image
// - Main toggle with "social-media.webp"
// - Sequential auto-expand animation on open (2s per icon)
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

// Which edge the sidebar is docked to
type Edge = 'left' | 'right' | 'top' | 'bottom';

interface Position {
  x: number;
  y: number;
}

export default function SocialMediaSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isAutoAnimating, setIsAutoAnimating] = useState(false);

  // ─── Drag / Position State ───
  const [pos, setPos] = useState<Position>({ x: 8, y: 200 }); // default: left edge
  const [dockedEdge, setDockedEdge] = useState<Edge>('left');
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const hasDragged = useRef(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const animationTimers = useRef<NodeJS.Timeout[]>([]);

  // ─── Auto-Animation Logic ───
  const startAutoAnimation = useCallback(() => {
    setIsAutoAnimating(true);
    animationTimers.current.forEach(clearTimeout);
    animationTimers.current = [];

    SOCIAL_PLATFORMS.forEach((_, index) => {
      const t = setTimeout(() => setExpandedIndex(index), index * 2000);
      animationTimers.current.push(t);
    });

    const endTimer = setTimeout(() => {
      setExpandedIndex(null);
      setIsAutoAnimating(false);
    }, SOCIAL_PLATFORMS.length * 2000);
    animationTimers.current.push(endTimer);
  }, []);

  const stopAutoAnimation = useCallback(() => {
    setIsAutoAnimating(false);
    animationTimers.current.forEach(clearTimeout);
    animationTimers.current = [];
    setExpandedIndex(null);
  }, []);

  useEffect(() => {
    if (isOpen) startAutoAnimation();
    else stopAutoAnimation();
    return () => stopAutoAnimation();
  }, [isOpen, startAutoAnimation, stopAutoAnimation]);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Snap to nearest edge on drag end ───
  const snapToEdge = useCallback((x: number, y: number) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const TOGGLE_SIZE = 56; // ~w-14

    const distLeft = x;
    const distRight = W - x - TOGGLE_SIZE;
    const distTop = y;
    const distBottom = H - y - TOGGLE_SIZE;

    const min = Math.min(distLeft, distRight, distTop, distBottom);

    if (min === distLeft) {
      setDockedEdge('left');
      setPos({ x: 8, y: Math.max(80, Math.min(H - TOGGLE_SIZE - 20, y)) });
    } else if (min === distRight) {
      setDockedEdge('right');
      setPos({ x: W - TOGGLE_SIZE - 8, y: Math.max(80, Math.min(H - TOGGLE_SIZE - 20, y)) });
    } else if (min === distTop) {
      setDockedEdge('top');
      setPos({ x: Math.max(8, Math.min(W - TOGGLE_SIZE - 8, x)), y: 80 });
    } else {
      setDockedEdge('bottom');
      setPos({ x: Math.max(8, Math.min(W - TOGGLE_SIZE - 8, x)), y: H - TOGGLE_SIZE - 20 });
    }
  }, []);

  // ─── Mouse Drag ───
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    hasDragged.current = false;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y };
    setIsDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
      const newX = Math.max(0, Math.min(window.innerWidth - 60, dragStart.current.posX + dx));
      const newY = Math.max(80, Math.min(window.innerHeight - 80, dragStart.current.posY + dy));
      setPos({ x: newX, y: newY });
    };
    const onUp = (e: MouseEvent) => {
      setIsDragging(false);
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      const newX = Math.max(0, Math.min(window.innerWidth - 60, dragStart.current.posX + dx));
      const newY = Math.max(80, Math.min(window.innerHeight - 80, dragStart.current.posY + dy));
      snapToEdge(newX, newY);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, snapToEdge]);

  // ─── Touch Drag ───
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    hasDragged.current = false;
    dragStart.current = { mouseX: e.touches[0].clientX, mouseY: e.touches[0].clientY, posX: pos.x, posY: pos.y };
    setIsDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - dragStart.current.mouseX;
      const dy = e.touches[0].clientY - dragStart.current.mouseY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
      const newX = Math.max(0, Math.min(window.innerWidth - 60, dragStart.current.posX + dx));
      const newY = Math.max(80, Math.min(window.innerHeight - 80, dragStart.current.posY + dy));
      setPos({ x: newX, y: newY });
    };
    const onEnd = (e: TouchEvent) => {
      setIsDragging(false);
      const touch = e.changedTouches[0];
      const dx = touch.clientX - dragStart.current.mouseX;
      const dy = touch.clientY - dragStart.current.mouseY;
      const newX = Math.max(0, Math.min(window.innerWidth - 60, dragStart.current.posX + dx));
      const newY = Math.max(80, Math.min(window.innerHeight - 80, dragStart.current.posY + dy));
      snapToEdge(newX, newY);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, snapToEdge]);

  // ─── Handlers ───
  const toggleSidebar = () => {
    if (hasDragged.current) return;
    setIsOpen((prev) => !prev);
  };

  const handleMouseEnter = (index: number) => {
    if (isAutoAnimating) stopAutoAnimation();
    if (window.innerWidth >= 1024) setExpandedIndex(index);
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 1024) setExpandedIndex(null);
  };

  const handleIconClick = (index: number, url: string) => {
    if (window.innerWidth < 1024) {
      if (expandedIndex === index) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        if (isAutoAnimating) stopAutoAnimation();
        setExpandedIndex(index);
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Determine expand direction based on docked edge
  const isRight = dockedEdge === 'right';
  const isBottom = dockedEdge === 'bottom';
  const isTop = dockedEdge === 'top';

  return (
    <div
      ref={sidebarRef}
      className={`fixed z-50 transition-[box-shadow] duration-300 ${isDragging ? 'cursor-grabbing select-none' : ''}`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className={`flex ${isBottom || isTop ? 'flex-row' : 'flex-col'} gap-3`}>

        {/* Main Toggle Button */}
        <button
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={toggleSidebar}
          className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl transition-all duration-300 z-50 bg-white p-1 border-2 border-primary-100 ${isDragging ? 'cursor-grabbing scale-110 shadow-2xl' : 'cursor-grab hover:scale-110'
            }`}
          aria-label="Toggle Social Media"
        >
          <Image
            src="/social-media.webp"
            alt="Connect"
            fill
            className="object-contain p-1 rounded-full"
            priority
          />

          {/* 🟢 Green online dot */}
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#25D366] border-2 border-white rounded-full shadow-sm z-20" />

          {/* Close X when open */}
          {isOpen && (
            <div className="absolute -top-1 -right-1 bg-neutral-900/80 text-white rounded-full p-0.5 scale-75 animate-in fade-in zoom-in z-30">
              <X className="w-3 h-3" />
            </div>
          )}
        </button>

        {/* Expandable List */}
        <div
          className={`
            flex ${isBottom || isTop ? 'flex-row' : 'flex-col'} gap-3
            transition-all duration-500 ease-out origin-top-left
            ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none absolute'}
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
                    ${isExpanded
                      ? isRight ? 'w-40 pr-3 flex-row-reverse' : 'w-40 pl-3'
                      : 'w-10 pl-0'
                    }
                    h-10
                    overflow-hidden
                  `}
                  aria-label={platform.name}
                >
                  {/* Icon Circle */}
                  <div className={`absolute ${isRight && isExpanded ? 'right-0' : 'left-0'} w-10 h-10 rounded-full flex items-center justify-center z-10`}>
                    <Icon className="w-5 h-5 drop-shadow-sm" />
                  </div>

                  {/* Label */}
                  <div
                    className={`
                      absolute ${isRight ? 'right-10' : 'left-10'} font-bold text-sm whitespace-nowrap ${isRight ? 'pl-4' : 'pr-4'}
                      transition-all duration-300
                      ${isExpanded ? 'opacity-100 translate-x-0' : isRight ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4'}
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