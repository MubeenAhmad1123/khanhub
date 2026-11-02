// apps/web/src/lib/upload/urlValidation.ts

import { UploadPlatformKey } from './types';

export const ALLOWED_MEDIA_HOSTS: Record<UploadPlatformKey, string[]> = {
  youtube: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.watch', 'web.facebook.com', 'm.facebook.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
  whatsapp: ['whatsapp.com', 'chat.whatsapp.com', 'wa.me'],
  website: ['khanhub.com.pk', 'www.khanhub.com.pk', 'localhost']
};

/**
 * Validates that a URL is HTTPS and belongs to an authorized hostname for the platform.
 * Returns { valid: boolean; error?: string }
 */
export function validatePlatformPostUrl(
  platform: UploadPlatformKey,
  rawUrl?: string | null
): { valid: boolean; error?: string } {
  // WhatsApp postUrl is completely optional
  if (platform === 'whatsapp') {
    if (!rawUrl || !rawUrl.trim()) {
      return { valid: true };
    }
  }

  // Website can be a relative route or full URL
  if (platform === 'website') {
    if (!rawUrl || !rawUrl.trim()) {
      return { valid: true };
    }
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('/')) {
      return { valid: true };
    }
  }

  if (!rawUrl || !rawUrl.trim()) {
    return { valid: false, error: `Post URL is required for ${platform}.` };
  }

  const trimmed = rawUrl.trim();

  // Enforce HTTPS
  if (!trimmed.startsWith('https://')) {
    return { valid: false, error: `URL must begin with secure protocol https://` };
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    const allowed = ALLOWED_MEDIA_HOSTS[platform] || [];

    const isMatch = allowed.some((h) => hostname === h || hostname.endsWith('.' + h));
    if (!isMatch) {
      return {
        valid: false,
        error: `Host '${hostname}' is not authorized for ${platform}. Allowed domains: ${allowed.join(', ')}`
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}
