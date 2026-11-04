// apps/web/src/lib/media/mediaActions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyUploadCaller, CallerInfo } from '@/lib/upload/uploadActions';
import { DEPARTMENTS } from '@/data/departments';
import {
  PublicMediaItem,
  PublicMediaLog,
  PublishPhotoInput,
  UpdateMediaItemInput,
  DashboardMediaListResult,
  DashboardMediaStats
} from './types';
import { getTodayInKarachi } from './dateUtils';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dhshtdrjp';

/**
 * Sanitizes and validates a one-line title (3-140 chars)
 */
function sanitizeTitle(title: string): string {
  const sanitized = title
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length < 3 || sanitized.length > 140) {
    throw new Error(`Title must be between 3 and 140 characters. Got ${sanitized.length}.`);
  }
  return sanitized;
}

/**
 * Validates department slug and returns canonical name
 */
function resolveDepartment(slug: string): { slug: string; name: string } {
  if (slug === 'general') {
    return { slug: 'general', name: 'Khan Hub (General)' };
  }
  const found = DEPARTMENTS.find((d) => d.slug === slug);
  if (!found) {
    throw new Error(`Invalid department slug: "${slug}". Must be a valid department or "general".`);
  }
  return { slug: found.slug, name: found.name };
}

/**
 * Validates published date format and ensures it is not in the future (Asia/Karachi)
 */
function validatePublishedDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const today = getTodayInKarachi();
  if (dateStr > today) {
    throw new Error(`Published date cannot be in the future. Today in Karachi is ${today}.`);
  }
  return dateStr;
}

/**
 * Strictly validates Cloudinary WebP URL
 */
function validateCloudinaryUrl(url: string): void {
  if (!url || typeof url !== 'string' || !url.startsWith('https://res.cloudinary.com/')) {
    throw new Error('Image URL must start with https://res.cloudinary.com/');
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') {
      throw new Error('Image URL hostname must be res.cloudinary.com');
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts[0] !== CLOUD_NAME) {
      throw new Error(`Image URL does not belong to cloud "${CLOUD_NAME}".`);
    }

    const decoded = decodeURIComponent(parsed.pathname);
    if (!decoded.includes('/Khan Hub/media/')) {
      throw new Error('Image URL must reside in the "Khan Hub/media/" folder.');
    }
    if (!decoded.endsWith('.webp')) {
      throw new Error('Image URL must end in .webp');
    }
  } catch (err: any) {
    throw new Error(`Invalid Cloudinary URL: ${err.message}`);
  }
}

/**
 * Validates caller role for administrative changes (edit, hide, remove)
 */
function requireAdminRole(caller: CallerInfo): void {
  const role = caller.role.toLowerCase();
  const isAdminOrHigher =
    role === 'superadmin' ||
    role === 'manager' ||
    role === 'admin' ||
    caller.deptId === 'hq';

  if (!isAdminOrHigher) {
    throw new Error('Unauthorized: Only Admin, Manager, or Superadmin can perform this action.');
  }
}

/**
 * Trigger ISR revalidations for media
 */
function revalidateMediaCaches(departmentSlug?: string) {
  try {
    revalidateTag('public-media');
    revalidatePath('/media');
    if (departmentSlug) {
      revalidateTag(`public-media:${departmentSlug}`);
      revalidatePath(`/media/${departmentSlug}`);
    }
  } catch (err) {
    console.warn('[revalidateMediaCaches] Warning during revalidation:', err);
  }
}

/**
 * Server Action: Publish batch of photos (up to 10 photos)
 */
export async function publishPhotos(
  input: { photos: PublishPhotoInput[] },
  idToken?: string
): Promise<{ success: boolean; createdIds: string[]; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);

    if (!input.photos || !Array.isArray(input.photos) || input.photos.length === 0) {
      throw new Error('No photos provided for publishing.');
    }
    if (input.photos.length > 10) {
      throw new Error('Maximum 10 photos can be published in a single batch.');
    }

    const adminDb = getAdminDb();
    const batch = adminDb.batch();
    const createdIds: string[] = [];
    const affectedDepts = new Set<string>();
    const nowIso = new Date().toISOString();

    for (const photo of input.photos) {
      if (!photo.clientToken || typeof photo.clientToken !== 'string') {
        throw new Error('Each photo must include a valid clientToken.');
      }

      const cleanTitle = sanitizeTitle(photo.title);
      const { slug: deptSlug, name: deptName } = resolveDepartment(photo.departmentSlug);
      const cleanDate = validatePublishedDate(photo.publishedDate);
      validateCloudinaryUrl(photo.imageUrl);

      if (!photo.cloudinaryPublicId) {
        throw new Error('Missing Cloudinary public ID.');
      }
      if (!photo.width || !photo.height) {
        throw new Error('Photo dimensions (width and height) are required.');
      }

      const docId = `${caller.uid}_${photo.clientToken}`;
      const sortKey = `${nowIso}_${docId}`;

      const mediaDoc: PublicMediaItem = {
        id: docId,
        mediaType: 'photo',
        title: cleanTitle,
        departmentSlug: deptSlug,
        departmentName: deptName,
        imageUrl: photo.imageUrl,
        cloudinaryPublicId: photo.cloudinaryPublicId,
        width: Math.round(photo.width),
        height: Math.round(photo.height),
        bytes: Math.round(photo.bytes || 0),
        publishedDate: cleanDate,
        publishedAt: nowIso,
        sortKey,
        visible: true,
        deletedAt: null,
        uploadedBy: caller.uid,
        uploadedByName: caller.name,
        campusId: 'vehari',
        clientToken: photo.clientToken,
        youtubeVideoId: null,
        externalUrl: null
      };

      const docRef = adminDb.collection('public_media').doc(docId);
      batch.set(docRef, mediaDoc);

      const logId = `${docId}_pub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const logRef = adminDb.collection('public_media_logs').doc(logId);
      const logDoc: PublicMediaLog = {
        id: logId,
        mediaId: docId,
        action: 'published',
        performedBy: caller.uid,
        name: caller.name,
        role: caller.role,
        timestamp: nowIso,
        details: {
          title: cleanTitle,
          departmentSlug: deptSlug,
          publishedDate: cleanDate
        }
      };
      batch.set(logRef, logDoc);

      createdIds.push(docId);
      affectedDepts.add(deptSlug);
    }

    await batch.commit();

    // Revalidate caches for all affected departments
    affectedDepts.forEach((slug) => revalidateMediaCaches(slug));

    return { success: true, createdIds };
  } catch (err: any) {
    console.error('[publishPhotos] Error:', err);
    return { success: false, createdIds: [], error: err.message || 'Failed to publish photos' };
  }
}

/**
 * Server Action: Update media item title, department, or publishedDate
 */
export async function updateMediaItem(
  input: UpdateMediaItemInput,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    requireAdminRole(caller);

    if (!input.id) {
      throw new Error('Media item ID is required.');
    }

    const adminDb = getAdminDb();
    const docRef = adminDb.collection('public_media').doc(input.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error('Media item not found.');
    }

    const currentData = snap.data() as PublicMediaItem;
    if (currentData.deletedAt) {
      throw new Error('Cannot update a removed media item.');
    }

    const updates: Partial<PublicMediaItem> = {};
    const logDetails: Record<string, any> = {};
    let primaryAction: PublicMediaLog['action'] = 'title_edited';

    if (input.title !== undefined) {
      updates.title = sanitizeTitle(input.title);
      logDetails.oldTitle = currentData.title;
      logDetails.newTitle = updates.title;
      primaryAction = 'title_edited';
    }

    if (input.departmentSlug !== undefined && input.departmentSlug !== currentData.departmentSlug) {
      const { slug, name } = resolveDepartment(input.departmentSlug);
      updates.departmentSlug = slug;
      updates.departmentName = name;
      logDetails.oldDept = currentData.departmentSlug;
      logDetails.newDept = slug;
      primaryAction = 'department_edited';
    }

    if (input.publishedDate !== undefined) {
      updates.publishedDate = validatePublishedDate(input.publishedDate);
      logDetails.oldDate = currentData.publishedDate;
      logDetails.newDate = updates.publishedDate;
      primaryAction = 'date_edited';
    }

    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    const nowIso = new Date().toISOString();
    const batch = adminDb.batch();
    batch.update(docRef, updates);

    const logId = `${input.id}_upd_${Date.now()}`;
    const logRef = adminDb.collection('public_media_logs').doc(logId);
    const logDoc: PublicMediaLog = {
      id: logId,
      mediaId: input.id,
      action: primaryAction,
      performedBy: caller.uid,
      name: caller.name,
      role: caller.role,
      timestamp: nowIso,
      details: logDetails
    };
    batch.set(logRef, logDoc);

    await batch.commit();

    revalidateMediaCaches(currentData.departmentSlug);
    if (updates.departmentSlug && updates.departmentSlug !== currentData.departmentSlug) {
      revalidateMediaCaches(updates.departmentSlug);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateMediaItem] Error:', err);
    return { success: false, error: err.message || 'Failed to update media item' };
  }
}

/**
 * Server Action: Set visibility (hide or unhide)
 */
export async function setMediaVisibility(
  input: { id: string; visible: boolean },
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    requireAdminRole(caller);

    if (!input.id) {
      throw new Error('Media item ID is required.');
    }

    const adminDb = getAdminDb();
    const docRef = adminDb.collection('public_media').doc(input.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error('Media item not found.');
    }

    const currentData = snap.data() as PublicMediaItem;
    if (currentData.deletedAt) {
      throw new Error('Cannot toggle visibility of a removed media item.');
    }

    const nowIso = new Date().toISOString();
    const batch = adminDb.batch();
    batch.update(docRef, { visible: Boolean(input.visible) });

    const logId = `${input.id}_vis_${Date.now()}`;
    const logRef = adminDb.collection('public_media_logs').doc(logId);
    const logDoc: PublicMediaLog = {
      id: logId,
      mediaId: input.id,
      action: input.visible ? 'unhidden' : 'hidden',
      performedBy: caller.uid,
      name: caller.name,
      role: caller.role,
      timestamp: nowIso
    };
    batch.set(logRef, logDoc);

    await batch.commit();

    revalidateMediaCaches(currentData.departmentSlug);

    return { success: true };
  } catch (err: any) {
    console.error('[setMediaVisibility] Error:', err);
    return { success: false, error: err.message || 'Failed to change visibility' };
  }
}

/**
 * Server Action: Soft remove media item (deletedAt timestamp + mandatory reason)
 */
export async function removeMediaItem(
  input: { id: string; reason: string },
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    requireAdminRole(caller);

    if (!input.id) {
      throw new Error('Media item ID is required.');
    }
    const cleanReason = (input.reason || '').trim();
    if (cleanReason.length < 3) {
      throw new Error('A valid reason (minimum 3 characters) is required to remove a media item.');
    }

    const adminDb = getAdminDb();
    const docRef = adminDb.collection('public_media').doc(input.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error('Media item not found.');
    }

    const currentData = snap.data() as PublicMediaItem;
    const nowIso = new Date().toISOString();

    const batch = adminDb.batch();
    batch.update(docRef, {
      deletedAt: nowIso,
      visible: false
    });

    const logId = `${input.id}_del_${Date.now()}`;
    const logRef = adminDb.collection('public_media_logs').doc(logId);
    const logDoc: PublicMediaLog = {
      id: logId,
      mediaId: input.id,
      action: 'removed',
      performedBy: caller.uid,
      name: caller.name,
      role: caller.role,
      reason: cleanReason,
      timestamp: nowIso
    };
    batch.set(logRef, logDoc);

    await batch.commit();

    revalidateMediaCaches(currentData.departmentSlug);

    return { success: true };
  } catch (err: any) {
    console.error('[removeMediaItem] Error:', err);
    return { success: false, error: err.message || 'Failed to remove media item' };
  }
}

/**
 * Server Action: List media items for Social Media Dashboard (Pagination, Filters, Stats)
 * Strictly zero client-side Firestore reads!
 */
export async function listMediaForDashboard(
  input: {
    departmentSlug?: string;
    month?: string; // YYYY-MM
    visible?: 'all' | 'visible' | 'hidden';
    cursor?: string; // sortKey
    limit?: number;
  },
  idToken?: string
): Promise<DashboardMediaListResult> {
  try {
    await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    // Fetch all active items to compute accurate dashboard counts and provide resilient filtering
    // Items are bounded within the media library and filtered in memory to prevent missing index errors
    const snapshot = await adminDb.collection('public_media').get();

    let allDocs: PublicMediaItem[] = [];
    const todayKarachi = getTodayInKarachi();

    let total = 0;
    let visibleCount = 0;
    let hiddenCount = 0;
    let uploadedToday = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as PublicMediaItem;
      // Skip soft deleted items from active dashboard view
      if (data.deletedAt) return;

      total++;
      if (data.visible) {
        visibleCount++;
      } else {
        hiddenCount++;
      }

      if (data.publishedDate === todayKarachi) {
        uploadedToday++;
      }

      allDocs.push(data);
    });

    // Apply dashboard filters
    if (input.departmentSlug && input.departmentSlug !== 'all') {
      allDocs = allDocs.filter((item) => item.departmentSlug === input.departmentSlug);
    }

    if (input.month) {
      allDocs = allDocs.filter((item) => item.publishedDate.startsWith(input.month!));
    }

    if (input.visible === 'visible') {
      allDocs = allDocs.filter((item) => item.visible === true);
    } else if (input.visible === 'hidden') {
      allDocs = allDocs.filter((item) => item.visible === false);
    }

    // Sort descending by sortKey
    allDocs.sort((a, b) => (b.sortKey || '').localeCompare(a.sortKey || ''));

    // Pagination
    const pageSize = input.limit || 48;
    let startIndex = 0;
    if (input.cursor) {
      const foundIdx = allDocs.findIndex((item) => item.sortKey === input.cursor);
      if (foundIdx !== -1) {
        startIndex = foundIdx + 1;
      }
    }

    const pageItems = allDocs.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < allDocs.length;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].sortKey : undefined;

    return {
      items: pageItems,
      nextCursor,
      hasMore,
      stats: {
        total,
        visible: visibleCount,
        hidden: hiddenCount,
        uploadedToday
      }
    };
  } catch (err: any) {
    console.error('[listMediaForDashboard] Error:', err);
    return {
      items: [],
      hasMore: false,
      stats: { total: 0, visible: 0, hidden: 0, uploadedToday: 0 }
    };
  }
}
