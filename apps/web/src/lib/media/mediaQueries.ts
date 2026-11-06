// apps/web/src/lib/media/mediaQueries.ts
'use server';

import { unstable_cache } from 'next/cache';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { PublicMediaItem, PublicMediaListResult } from './types';

/**
 * Underlying query to fetch public media items from Firestore Admin SDK.
 * Filtered by visible == true and deletedAt == null.
 */
async function fetchPublicMediaFromDb(departmentSlug?: string): Promise<PublicMediaItem[]> {
  try {
    const adminDb = getAdminDb();
    let query: FirebaseFirestore.Query = adminDb
      .collection('public_media')
      .where('visible', '==', true);

    if (departmentSlug && departmentSlug !== 'all') {
      query = query.where('departmentSlug', '==', departmentSlug);
    }

    let snapshot: FirebaseFirestore.QuerySnapshot;
    try {
      // Attempt indexed ordering
      const indexedQuery = query.orderBy('sortKey', 'desc');
      snapshot = await indexedQuery.get();
    } catch (err: any) {
      // Fallback if composite index is pending or not yet deployed
      console.warn('[fetchPublicMediaFromDb] Falling back to in-memory sorting:', err?.message);
      snapshot = await query.get();
    }

    const items: PublicMediaItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as PublicMediaItem;
      // Strictly exclude soft-deleted items
      if (!data.deletedAt) {
        items.push(data);
      }
    });

    // Ensure descending sort by sortKey
    items.sort((a, b) => (b.sortKey || '').localeCompare(a.sortKey || ''));
    return items;
  } catch (outerErr: any) {
    console.error('[fetchPublicMediaFromDb] Error reading public media:', outerErr?.message);
    return [];
  }
}

/**
 * Cached public media fetcher wrapped in Next.js unstable_cache
 * Cached with tags: 'public-media' and optionally 'public-media:<dept>'
 * Fallback TTL: 3600 seconds (1 hour)
 */
export async function getCachedPublicMedia(
  departmentSlug?: string
): Promise<PublicMediaItem[]> {
  const normalizedSlug = departmentSlug && departmentSlug !== 'all' ? departmentSlug : 'all';
  const tags = ['public-media'];
  if (normalizedSlug !== 'all') {
    tags.push(`public-media:${normalizedSlug}`);
  }

  const cachedFn = unstable_cache(
    async () => fetchPublicMediaFromDb(normalizedSlug === 'all' ? undefined : normalizedSlug),
    ['public-media-list', normalizedSlug],
    {
      revalidate: 3600,
      tags
    }
  );

  return cachedFn();
}

/**
 * Get paginated public media items (optionally filtered by mediaType)
 */
export async function getPublicMediaPaginated(params: {
  departmentSlug?: string;
  mediaType?: 'photo' | 'video' | 'all';
  cursor?: string;
  limit?: number;
}): Promise<PublicMediaListResult> {
  let allItems = await getCachedPublicMedia(params.departmentSlug);

  if (params.mediaType && params.mediaType !== 'all') {
    allItems = allItems.filter((item) => {
      const type = item.mediaType || 'photo';
      return type === params.mediaType;
    });
  }

  const pageSize = params.limit || 24;

  let startIndex = 0;
  if (params.cursor) {
    const foundIdx = allItems.findIndex((item) => item.sortKey === params.cursor);
    if (foundIdx !== -1) {
      startIndex = foundIdx + 1;
    }
  }

  const pageItems = allItems.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < allItems.length;
  const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].sortKey : undefined;

  return {
    items: pageItems,
    nextCursor,
    hasMore,
    totalCount: allItems.length
  };
}

/**
 * Server Action for client-side "Load More" pagination
 */
export async function loadMorePublicMedia(params: {
  departmentSlug?: string;
  mediaType?: 'photo' | 'video' | 'all';
  cursor?: string;
  limit?: number;
}): Promise<PublicMediaListResult> {
  return getPublicMediaPaginated(params);
}

/**
 * Returns the total count of visible public photos across all departments
 */
export async function getTotalPublicPhotoCount(): Promise<number> {
  const allItems = await getCachedPublicMedia();
  return allItems.filter((i) => (i.mediaType || 'photo') === 'photo').length;
}

/**
 * Returns the total count of visible public videos across all departments
 */
export async function getTotalPublicVideoCount(): Promise<number> {
  const allItems = await getCachedPublicMedia();
  return allItems.filter((i) => i.mediaType === 'video').length;
}
