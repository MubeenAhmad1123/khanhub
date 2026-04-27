// src/lib/utils.ts
// ─────────────────────────────────────────────
// Shared utility functions used across the project.
// ─────────────────────────────────────────────

import { SITE } from '@/data/site';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Safely converts a Firestore Timestamp or unknown date value to a Date object.
 */
export function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

/**
 * Format a date-like value as "DD MM YYYY" (e.g. "25 12 2026").
 * Accepts Firestore Timestamp, Date, ISO string, or epoch-like values.
 */
export function formatDateDMY(val: any): string {
  if (!val) return '—';
  const d = toDate(val);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Parses a "DD MM YYYY" string back into a Date object.
 * Useful for "collecting" dates from text inputs.
 */
export function parseDateDMY(str: string): Date | null {
  if (!str) return null;
  const parts = str.split(/[\s-/]/); // handles spaces, dashes, or slashes
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Metadata Generator ─────────────────────────────────
// Used in every page's generateMetadata() export.

export function generateMetadata(overrides: {
  title?: string;
  description?: string;
  slug?: string;
} = {}) {
  const fullTitle = overrides.title ? `${overrides.title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
  const description = overrides.description || SITE.description;
  const url = overrides.slug ? `${SITE.url}/${overrides.slug}` : SITE.url;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE.url),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE.name,
      type: 'website',
      locale: 'en_PK',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: SITE.fullName,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: ['/twitter-image.jpg'],
    },
    alternates: {
      canonical: url,
    },
  };
}

// ─── Slugify ────────────────────────────────────────────

// ─── Slugify ────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─── Phone Formatter ────────────────────────────────────

export function formatPhone(phone: string): string {
  // +923111112222 → +92-311-111-2222
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13 && cleaned.startsWith('92')) {
    return `+92-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
}

// ─── Truncate Text ──────────────────────────────────────

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '…';
}

// ─── Scroll to top ──────────────────────────────────────
// Call this on page navigation to reset scroll position.

export function scrollToTop(): void {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ─── Debounce ───────────────────────────────────────────

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

// ─── PKT Date Helpers ─────────────────────────────────────
// Handles Pakistan Standard Time (UTC+5)

export function pktStartOfToday(): Date {
  const now = new Date();
  // Get time in PKT (UTC+5)
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  pktTime.setUTCHours(0, 0, 0, 0);
  // Convert back to local/UTC for Firestore comparison (subtract the 5h shift)
  return new Date(pktTime.getTime() - (5 * 60 * 60 * 1000));
}

export function pktEndOfToday(): Date {
  const now = new Date();
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  pktTime.setUTCHours(23, 59, 59, 999);
  return new Date(pktTime.getTime() - (5 * 60 * 60 * 1000));
}
