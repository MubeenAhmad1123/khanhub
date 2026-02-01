// src/lib/utils.ts
// ─────────────────────────────────────────────
// Shared utility functions used across the project.
// ─────────────────────────────────────────────

import { SITE } from '@/data/site';

// ─── Metadata Generator ─────────────────────────────────
// Used in every page's generateMetadata() export.

export function generateMetadata(overrides: {
  title?: string;
  description?: string;
  slug?: string;
} = {}) {
  const title       = overrides.title       ? `${overrides.title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
  const description = overrides.description || SITE.description;
  const url         = overrides.slug        ? `${SITE.url}/${overrides.slug}` : SITE.url;

  return {
    title,
    description,
    metadataBase: new URL(SITE.url),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: 'website',
      locale: 'en_PK',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

// ─── Class Name Merger ──────────────────────────────────
// Simple cn() utility (no dependency needed)

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

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
