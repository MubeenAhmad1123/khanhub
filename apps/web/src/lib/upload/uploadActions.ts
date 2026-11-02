// apps/web/src/lib/upload/uploadActions.ts
'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { readHqSessionCookie } from '@/app/hq/actions/auth';
import {
  UploadItemDoc,
  UploadPlatformKey,
  UploadPlatformStatus,
  UploadAuditLogDoc,
  UploadSettingsDoc,
  DEFAULT_PLATFORM_KEYS,
  ALL_PLATFORM_KEYS,
  PlatformPublishState
} from './types';
import { CanonicalDeptId, resolveCanonicalDept } from './departmentRegistry';
import { validatePlatformPostUrl } from './urlValidation';

export interface CallerInfo {
  uid: string;
  name: string;
  role: string;
  deptId: string;
}

/**
 * Server-side session verification.
 * Derives role and deptId strictly on the server from Firebase Admin Auth ID Token or HQ Session Cookie.
 */
export async function verifyUploadCaller(idToken?: string): Promise<CallerInfo> {
  const adminAuth = getAdminAuth();

  // 1. Check ID Token from client Authorization / parameter
  if (idToken) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const uid = decoded.uid;
      const deptId = (decoded.deptId as string) || (decoded.department as string) || '';
      const role = (decoded.role as string) || '';
      const name = (decoded.name as string) || (decoded.displayName as string) || decoded.email || 'Staff';

      // HQ superadmin or manager override
      if (role === 'superadmin' || (deptId === 'hq' && ['superadmin', 'manager'].includes(role))) {
        return { uid, name, role: role || 'superadmin', deptId: deptId || 'hq' };
      }

      // Social Media authorized roles
      if (
        (deptId === 'social-media' || deptId === 'media') &&
        ['admin', 'manager', 'staff', 'uploader', 'superadmin'].includes(role)
      ) {
        return { uid, name, role, deptId: 'social-media' };
      }

      // Check media_users doc directly as server-side fallback
      const adminDb = getAdminDb();
      const mediaUserSnap = await adminDb.collection('media_users').doc(uid).get();
      if (mediaUserSnap.exists) {
        const udata = mediaUserSnap.data() || {};
        const urole = udata.role || 'staff';
        const uname = udata.name || udata.displayName || name;
        if (['admin', 'manager', 'staff', 'uploader', 'superadmin'].includes(urole)) {
          return { uid, name: uname, role: urole, deptId: 'social-media' };
        }
      }
    } catch (err: any) {
      console.warn('[verifyUploadCaller] Token verify failed:', err?.message);
    }
  }

  // 2. Fallback to HQ Session Cookie
  const hqSession = await readHqSessionCookie();
  if (hqSession && (hqSession.role === 'superadmin' || hqSession.role === 'manager')) {
    return {
      uid: hqSession.uid,
      name: hqSession.name || 'HQ Manager',
      role: hqSession.role,
      deptId: 'hq'
    };
  }

  throw new Error('Unauthorized: Valid Social Media or HQ Management session is required.');
}

/**
 * Loads current Category-to-Department mapping from upload_settings
 */
export async function getCategoryDepartmentMap(): Promise<Record<string, CanonicalDeptId>> {
  const adminDb = getAdminDb();
  const settingsDoc = await adminDb.collection('upload_settings').doc('config_vehari').get();
  if (!settingsDoc.exists) {
    return {};
  }
  const data = settingsDoc.data() as UploadSettingsDoc;
  return data.categoryDepartmentMap || {};
}

/**
 * Saves or updates the Category-to-Department mapping.
 */
export async function saveCategoryDepartmentMap(
  mapping: Record<string, CanonicalDeptId>,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    await adminDb.collection('upload_settings').doc('config_vehari').set(
      {
        id: 'config_vehari',
        campusId: 'vehari',
        categoryDepartmentMap: mapping,
        updatedAt: new Date().toISOString(),
        updatedBy: caller.name
      },
      { merge: true }
    );

    return { success: true };
  } catch (err: any) {
    console.error('[saveCategoryDepartmentMap] Error:', err);
    return { success: false, error: err.message || 'Failed to save mapping.' };
  }
}

/**
 * Idempotently generates upload_items documents for all planned tasks in media_calendar_tasks for the given month.
 * Deterministic doc ID: {YYYY-MM}_{creationTaskId}. Never duplicates records.
 */
export async function generateUploadSheet(
  month: string, // 'YYYY-MM'
  idToken?: string
): Promise<{ success: boolean; countCreated: number; countExisting: number; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
      return { success: false, countCreated: 0, countExisting: 0, error: 'Invalid month format (expected YYYY-MM).' };
    }

    const [yearStr, mStr] = month.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(mStr, 10);

    // 1. Fetch creation tasks for this month
    const tasksSnap = await adminDb.collection('media_calendar_tasks').get();
    const monthTasks = tasksSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((t) => typeof t.date === 'string' && t.date.startsWith(month));

    if (monthTasks.length === 0) {
      return {
        success: false,
        countCreated: 0,
        countExisting: 0,
        error: `No tasks found in Creation Calendar for ${month}. Please create planned tasks first.`
      };
    }

    // 2. Fetch existing upload items for this month to guarantee idempotency
    const existingSnap = await adminDb.collection('upload_items').where('month', '==', month).get();
    const existingMap = new Map<string, UploadItemDoc>();
    existingSnap.docs.forEach((d) => existingMap.set(d.id, { id: d.id, ...d.data() } as UploadItemDoc));

    // 3. Load Category Department Map
    const categoryMap = await getCategoryDepartmentMap();

    const batch = adminDb.batch();
    let countCreated = 0;
    let countExisting = 0;
    const nowIso = new Date().toISOString();

    for (const task of monthTasks) {
      const docId = `${month}_${task.id}`;

      if (existingMap.has(docId)) {
        countExisting++;
        continue;
      }

      // Resolve department from category mapping or direct name
      const categoryKey = task.categoryId || task.categoryName || '';
      let resolvedDept: CanonicalDeptId | null = null;

      if (categoryMap[categoryKey]) {
        resolvedDept = categoryMap[categoryKey];
      } else if (task.categoryName && categoryMap[task.categoryName]) {
        resolvedDept = categoryMap[task.categoryName];
      } else {
        resolvedDept = resolveCanonicalDept(task.categoryName) || resolveCanonicalDept(task.title);
      }

      // Determine content type: video vs image
      const isVideoType =
        task.type === 'video_create' ||
        task.type === 'video_upload' ||
        String(task.title || '').toLowerCase().includes('video') ||
        String(task.categoryName || '').toLowerCase().includes('video');

      const contentType: 'image' | 'video' = isVideoType ? 'video' : 'image';

      // Default platform map
      const initialPlatforms: Record<UploadPlatformKey, PlatformPublishState> = {
        facebook: { status: 'todo', method: 'manual' },
        instagram: { status: 'todo', method: 'manual' },
        youtube: { status: 'todo', method: 'manual' },
        tiktok: { status: 'todo', method: 'manual' },
        whatsapp: { status: 'todo', method: 'manual' },
        website: { status: 'todo', method: 'manual' },
        linkedin: { status: 'todo', method: 'manual' }
      };

      const newItem: UploadItemDoc = {
        id: docId,
        month,
        date: task.date,
        creationTaskId: task.id,
        creationCategoryId: task.categoryId || '',
        creationCategoryName: task.categoryName || '',
        campusId: 'vehari',
        departmentId: resolvedDept,
        title: task.title || task.categoryName || 'Content Post',
        caption: task.note ? `${task.title}\n\n${task.note}` : `${task.title} — KhanHub`,
        hashtags: ['#KhanHub', '#Vehari'],
        contentType,
        assets: {
          primaryUrl: '',
          sourceType: 'none'
        },
        platforms: initialPlatforms,
        assigneeIds: [],
        syncStatus: resolvedDept ? 'in_sync' : 'needs_department',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdYear: yearNum,
        createdMonth: monthNum
      };

      const docRef = adminDb.collection('upload_items').doc(docId);
      batch.set(docRef, newItem);

      // Audit log entry
      const auditRef = adminDb.collection('upload_audit_logs').doc();
      const auditLog: UploadAuditLogDoc = {
        id: auditRef.id,
        uploadItemId: docId,
        action: 'sheet_generated',
        reason: `Generated from creation task #${task.id}`,
        performedBy: caller.uid,
        performedByName: caller.name,
        performedByRole: caller.role,
        createdAt: nowIso
      };
      batch.set(auditRef, auditLog);

      countCreated++;
    }

    if (countCreated > 0) {
      await batch.commit();
    }

    return {
      success: true,
      countCreated,
      countExisting
    };
  } catch (err: any) {
    console.error('[generateUploadSheet] Error:', err);
    return { success: false, countCreated: 0, countExisting: 0, error: err.message || 'Failed to generate sheet.' };
  }
}

/**
 * Synchronizes changes from Creation Calendar without mutating or deleting existing upload progress.
 */
export async function syncFromCreation(
  month: string,
  idToken?: string
): Promise<{ success: boolean; updatedCount: number; orphanedCount: number; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    // 1. Fetch creation tasks
    const tasksSnap = await adminDb.collection('media_calendar_tasks').get();
    const creationTaskMap = new Map<string, any>();
    tasksSnap.docs.forEach((d) => {
      creationTaskMap.set(d.id, { id: d.id, ...d.data() });
    });

    // 2. Fetch existing upload items for this month
    const existingSnap = await adminDb.collection('upload_items').where('month', '==', month).get();
    if (existingSnap.empty) {
      return { success: true, updatedCount: 0, orphanedCount: 0 };
    }

    const categoryMap = await getCategoryDepartmentMap();
    const batch = adminDb.batch();
    const nowIso = new Date().toISOString();
    let updatedCount = 0;
    let orphanedCount = 0;

    for (const docSnap of existingSnap.docs) {
      const item = docSnap.data() as UploadItemDoc;
      const creationTask = creationTaskMap.get(item.creationTaskId);

      // Check if original task was moved to a different month or deleted
      if (!creationTask || (creationTask.date && !creationTask.date.startsWith(month))) {
        batch.update(docSnap.ref, {
          syncStatus: 'orphaned',
          updatedAt: nowIso
        });
        orphanedCount++;
        continue;
      }

      // Check if title or category changed
      const titleChanged = creationTask.title && creationTask.title !== item.title;
      const catChanged = creationTask.categoryName && creationTask.categoryName !== item.creationCategoryName;

      if (titleChanged || catChanged || item.syncStatus === 'needs_department') {
        const updates: Record<string, any> = {
          updatedAt: nowIso
        };

        if (titleChanged) updates.title = creationTask.title;
        if (catChanged) {
          updates.creationCategoryName = creationTask.categoryName;
          updates.creationCategoryId = creationTask.categoryId || item.creationCategoryId;

          // Re-resolve department
          const newDept =
            categoryMap[creationTask.categoryId] ||
            categoryMap[creationTask.categoryName] ||
            resolveCanonicalDept(creationTask.categoryName);

          if (newDept) {
            updates.departmentId = newDept;
            updates.syncStatus = 'in_sync';
          }
        }

        batch.update(docSnap.ref, updates);

        const auditRef = adminDb.collection('upload_audit_logs').doc();
        batch.set(auditRef, {
          id: auditRef.id,
          uploadItemId: item.id,
          action: 'sync_updated',
          reason: 'Synced metadata updates from Creation Calendar',
          performedBy: caller.uid,
          performedByName: caller.name,
          performedByRole: caller.role,
          createdAt: nowIso
        });

        updatedCount++;
      }
    }

    if (updatedCount > 0 || orphanedCount > 0) {
      await batch.commit();
    }

    return { success: true, updatedCount, orphanedCount };
  } catch (err: any) {
    console.error('[syncFromCreation] Error:', err);
    return { success: false, updatedCount: 0, orphanedCount: 0, error: err.message || 'Failed to sync calendar.' };
  }
}

/**
 * Updates the publish status and URL of a single platform target for an upload item.
 * Strictly enforces all workflow locks, URL validation, and audit requirements on the server.
 */
export async function setPlatformStatus(
  itemId: string,
  platform: UploadPlatformKey,
  payload: {
    status: UploadPlatformStatus;
    postUrl?: string;
    skipReason?: string;
    correctionReason?: string;
  },
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    if (!itemId || !platform || !payload.status) {
      return { success: false, error: 'Item ID, platform, and target status are required.' };
    }

    const itemRef = adminDb.collection('upload_items').doc(itemId);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      return { success: false, error: 'Upload item not found.' };
    }

    const item = itemSnap.data() as UploadItemDoc;
    const currentPlatform = item.platforms[platform] || { status: 'todo', method: 'manual' };
    const nowIso = new Date().toISOString();

    // ── WORKFLOW LOCK 1: Validate Skipping ─────────────────────────────────
    if (payload.status === 'skipped') {
      if (!payload.skipReason || !payload.skipReason.trim()) {
        return { success: false, error: 'A mandatory reason is required to skip this platform.' };
      }
    }

    // ── WORKFLOW LOCK 2: Validate URL when Marking as Posted ────────────────
    if (payload.status === 'posted') {
      const urlCheck = validatePlatformPostUrl(platform, payload.postUrl);
      if (!urlCheck.valid) {
        return { success: false, error: urlCheck.error };
      }
    }

    // ── WORKFLOW LOCK 3: Website LAST Rule ───────────────────────────────────
    if (platform === 'website' && payload.status === 'posted') {
      const otherPlatforms: UploadPlatformKey[] = ['facebook', 'instagram', 'youtube', 'tiktok', 'whatsapp'];
      const incomplete = otherPlatforms.filter((p) => {
        const s = item.platforms[p]?.status;
        return s !== 'posted' && s !== 'skipped';
      });

      if (incomplete.length > 0) {
        return {
          success: false,
          error: `Website must be published LAST. The following targets are still pending: ${incomplete.join(', ')}.`
        };
      }

      // For video content: YouTube link must exist
      if (item.contentType === 'video') {
        const ytUrl = item.platforms.youtube?.postUrl || item.assets?.primaryUrl;
        if (!ytUrl || !ytUrl.includes('youtu')) {
          return {
            success: false,
            error: 'For video content, a valid YouTube link must be posted before publishing to the Website.'
          };
        }
      }
    }

    // ── WORKFLOW LOCK 4: Editing after Posted requires correctionReason ─────
    const isAlreadyPosted = currentPlatform.status === 'posted';
    if (isAlreadyPosted && payload.status === 'posted') {
      const urlChanged = payload.postUrl && payload.postUrl !== currentPlatform.postUrl;
      if (urlChanged && (!payload.correctionReason || !payload.correctionReason.trim())) {
        return {
          success: false,
          error: 'A mandatory correction reason is required when editing an already posted platform.'
        };
      }
    }

    // Prepare updated platform state
    const nextPlatformState: PlatformPublishState = {
      ...currentPlatform,
      status: payload.status,
      postUrl: payload.postUrl !== undefined ? payload.postUrl.trim() : currentPlatform.postUrl,
      lastUpdated: nowIso
    };

    if (payload.status === 'posted') {
      nextPlatformState.postedAt = currentPlatform.postedAt || nowIso;
      nextPlatformState.postedBy = currentPlatform.postedBy || caller.name;
    }

    if (payload.status === 'skipped') {
      nextPlatformState.skipReason = payload.skipReason?.trim();
    }

    if (payload.correctionReason?.trim()) {
      nextPlatformState.correctionReason = payload.correctionReason.trim();
    }

    const batch = adminDb.batch();

    // Update field path platforms.{platform}
    batch.update(itemRef, {
      [`platforms.${platform}`]: nextPlatformState,
      updatedAt: nowIso
    });

    // Write audit log in the same atomic batch
    const auditRef = adminDb.collection('upload_audit_logs').doc();
    const auditDoc: UploadAuditLogDoc = {
      id: auditRef.id,
      uploadItemId: itemId,
      platform,
      action: isAlreadyPosted ? 'post_corrected' : payload.status === 'posted' ? 'post_url_updated' : 'status_changed',
      previousStatus: currentPlatform.status,
      newStatus: payload.status,
      previousUrl: currentPlatform.postUrl || '',
      newUrl: payload.postUrl || '',
      reason: payload.correctionReason?.trim() || payload.skipReason?.trim() || `Marked ${payload.status} on ${platform}`,
      performedBy: caller.uid,
      performedByName: caller.name,
      performedByRole: caller.role,
      createdAt: nowIso
    };
    batch.set(auditRef, auditDoc);

    await batch.commit();

    return { success: true };
  } catch (err: any) {
    console.error('[setPlatformStatus] Error:', err);
    return { success: false, error: err.message || 'Failed to update platform status.' };
  }
}

/**
 * Updates item metadata (caption, hashtags, contentType, assets, departmentId)
 */
export async function updateItemDetails(
  itemId: string,
  updates: {
    caption?: string;
    hashtags?: string[];
    contentType?: 'image' | 'video';
    assets?: any;
    departmentId?: CanonicalDeptId | null;
  },
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    const itemRef = adminDb.collection('upload_items').doc(itemId);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      return { success: false, error: 'Upload item not found.' };
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updatedAt: nowIso
    };

    if (updates.caption !== undefined) updatePayload.caption = updates.caption;
    if (updates.hashtags !== undefined) updatePayload.hashtags = updates.hashtags;
    if (updates.contentType !== undefined) updatePayload.contentType = updates.contentType;
    if (updates.assets !== undefined) updatePayload.assets = updates.assets;
    if (updates.departmentId !== undefined) {
      updatePayload.departmentId = updates.departmentId;
      if (updates.departmentId) {
        updatePayload.syncStatus = 'in_sync';
      }
    }

    const batch = adminDb.batch();
    batch.update(itemRef, updatePayload);

    const auditRef = adminDb.collection('upload_audit_logs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      uploadItemId: itemId,
      action: 'details_updated',
      reason: 'Content details and caption updated',
      performedBy: caller.uid,
      performedByName: caller.name,
      performedByRole: caller.role,
      createdAt: nowIso
    });

    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.error('[updateItemDetails] Error:', err);
    return { success: false, error: err.message || 'Failed to update item details.' };
  }
}

/**
 * Fetches audit logs for a specific upload item.
 */
export async function getUploadAuditLogs(
  uploadItemId: string
): Promise<{ success: boolean; logs: UploadAuditLogDoc[]; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const snap = await adminDb
      .collection('upload_audit_logs')
      .where('uploadItemId', '==', uploadItemId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UploadAuditLogDoc));
    return { success: true, logs };
  } catch (err: any) {
    console.error('[getUploadAuditLogs] Error:', err);
    return { success: false, logs: [], error: err.message };
  }
}

/**
 * Saves task row customizations (title, media type, department, enabled platforms)
 * and updates all corresponding upload_items for this month.
 */
export async function saveTaskRowOverride(
  params: {
    rowId: string;
    month: string;
    title: string;
    originalTitle?: string;
    contentType: 'image' | 'video';
    departmentId?: CanonicalDeptId | null;
    enabledPlatforms?: UploadPlatformKey[];
  },
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    // 1. Update config_vehari settings
    const settingsRef = adminDb.collection('upload_settings').doc('config_vehari');
    const settingsSnap = await settingsRef.get();
    const settingsData = settingsSnap.exists ? (settingsSnap.data() as UploadSettingsDoc) : ({} as any);
    const taskRowOverrides = settingsData.taskRowOverrides || {};

    taskRowOverrides[params.rowId] = {
      title: params.title,
      contentType: params.contentType,
      departmentId: params.departmentId,
      enabledPlatforms: params.enabledPlatforms
    };

    await settingsRef.set(
      {
        taskRowOverrides,
        updatedAt: new Date().toISOString(),
        updatedBy: caller.name
      },
      { merge: true }
    );

    // 2. Batch update matching upload_items for this month
    const snap = await adminDb
      .collection('upload_items')
      .where('month', '==', params.month)
      .get();

    const batch = adminDb.batch();
    let updatedCount = 0;

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as UploadItemDoc;
      const matchesCat = data.creationCategoryId === params.rowId;
      const matchesTitle =
        params.originalTitle && data.title.toLowerCase().trim() === params.originalTitle.toLowerCase().trim();

      if (matchesCat || matchesTitle) {
        batch.update(docSnap.ref, {
          title: params.title,
          contentType: params.contentType,
          departmentId: params.departmentId !== undefined ? params.departmentId : data.departmentId,
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    return { success: true };
  } catch (err: any) {
    console.error('[saveTaskRowOverride] Error:', err);
    return { success: false, error: err.message || 'Failed to save task overrides.' };
  }
}

/**
 * Deletes a task row and all its platform items from the upload sheet for the given month.
 * Also remembers the deletion in upload_settings so it stays removed across syncs.
 */
export async function deleteUploadTaskRow(
  month: string,
  rowId: string,
  taskTitle: string,
  idToken?: string
): Promise<{ success: boolean; countDeleted?: number; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    // 1. Delete matching upload_items documents for this month
    const snap = await adminDb
      .collection('upload_items')
      .where('month', '==', month)
      .get();

    const batch = adminDb.batch();
    let countDeleted = 0;

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as UploadItemDoc;
      const matchesCat = data.creationCategoryId === rowId;
      const matchesTitle = data.title.toLowerCase().trim() === taskTitle.toLowerCase().trim();

      if (matchesCat || matchesTitle) {
        batch.delete(docSnap.ref);
        countDeleted++;
      }
    });

    if (countDeleted > 0) {
      await batch.commit();
    }

    // 2. Record deletion in upload_settings/config_vehari
    const settingsRef = adminDb.collection('upload_settings').doc('config_vehari');
    const settingsSnap = await settingsRef.get();
    const settingsData = settingsSnap.exists ? (settingsSnap.data() as UploadSettingsDoc) : ({} as any);
    const deletedByMonth = settingsData.deletedTaskRowIdsByMonth || {};
    const monthDeleted = new Set(deletedByMonth[month] || []);

    if (rowId) monthDeleted.add(rowId);
    if (taskTitle) monthDeleted.add(taskTitle.toLowerCase().trim());
    deletedByMonth[month] = Array.from(monthDeleted);

    await settingsRef.set(
      {
        deletedTaskRowIdsByMonth: deletedByMonth,
        updatedAt: new Date().toISOString(),
        updatedBy: caller.name
      },
      { merge: true }
    );

    return { success: true, countDeleted };
  } catch (err: any) {
    console.error('[deleteUploadTaskRow] Error:', err);
    return { success: false, error: err.message || 'Failed to delete task from upload sheet.' };
  }
}

/**
 * Adds a new custom task row to the upload sheet and saves it in upload_settings.
 */
export async function addCustomUploadTaskRow(
  params: {
    month: string;
    name: string;
    type: 'video' | 'graphic';
    departmentId?: CanonicalDeptId | null;
    enabledPlatforms?: UploadPlatformKey[];
  },
  idToken?: string
): Promise<{ success: boolean; newId?: string; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    const newId = `custom_${Date.now()}`;
    const settingsRef = adminDb.collection('upload_settings').doc('config_vehari');
    const settingsSnap = await settingsRef.get();
    const settingsData = settingsSnap.exists ? (settingsSnap.data() as UploadSettingsDoc) : ({} as any);
    const customTaskRows = settingsData.customTaskRows || [];

    const nextSerial =
      customTaskRows.length > 0 ? Math.max(...customTaskRows.map((c: any) => c.serialNo || 0)) + 1 : 20;

    customTaskRows.push({
      id: newId,
      serialNo: nextSerial,
      name: params.name,
      type: params.type,
      departmentId: params.departmentId || null,
      enabledPlatforms: params.enabledPlatforms || DEFAULT_PLATFORM_KEYS,
      createdAt: new Date().toISOString()
    });

    await settingsRef.set(
      {
        customTaskRows,
        updatedAt: new Date().toISOString(),
        updatedBy: caller.name
      },
      { merge: true }
    );

    return { success: true, newId };
  } catch (err: any) {
    console.error('[addCustomUploadTaskRow] Error:', err);
    return { success: false, error: err.message || 'Failed to add custom upload task row.' };
  }
}

