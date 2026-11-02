// apps/web/src/lib/upload/whatsappActions.ts
'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyUploadCaller } from './uploadActions';
import {
  WhatsAppTargetKey,
  WhatsAppTargetStatus,
  WhatsAppDailyBroadcastDoc,
  WhatsAppDayContentItem,
  ALL_WHATSAPP_TARGET_KEYS,
  WhatsAppTargetPublishState
} from './whatsappTypes';

/**
 * Creates default initial target states for a single day.
 */
function createInitialTargetStates(): Record<WhatsAppTargetKey, WhatsAppTargetPublishState> {
  const result: Partial<Record<WhatsAppTargetKey, WhatsAppTargetPublishState>> = {};
  for (const k of ALL_WHATSAPP_TARGET_KEYS) {
    result[k] = { status: 'todo' };
  }
  return result as Record<WhatsAppTargetKey, WhatsAppTargetPublishState>;
}

/**
 * Loads all daily WhatsApp broadcast documents for the specified month ('YYYY-MM').
 */
export async function getWhatsAppMonthBroadcasts(
  month: string
): Promise<{ success: boolean; data: WhatsAppDailyBroadcastDoc[]; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const snap = await adminDb
      .collection('whatsapp_broadcasts')
      .where('month', '==', month)
      .get();

    const data: WhatsAppDailyBroadcastDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any)
    }));

    return { success: true, data };
  } catch (err: any) {
    console.error('[getWhatsAppMonthBroadcasts] Error:', err);
    return { success: false, data: [], error: err.message || 'Failed to fetch broadcasts.' };
  }
}

/**
 * Updates a single target status on a specific date.
 */
export async function setWhatsAppTargetStatus(
  date: string,
  targetKey: WhatsAppTargetKey,
  payload: {
    status: WhatsAppTargetStatus;
    skipReason?: string;
    notes?: string;
  },
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    if (!date || !targetKey || !payload.status) {
      return { success: false, error: 'Date, target key, and status are required.' };
    }

    const month = date.slice(0, 7);
    const docRef = adminDb.collection('whatsapp_broadcasts').doc(date);
    const snap = await docRef.get();
    const nowIso = new Date().toISOString();

    let docData: WhatsAppDailyBroadcastDoc;

    if (snap.exists) {
      docData = snap.data() as WhatsAppDailyBroadcastDoc;
      if (!docData.targets) {
        docData.targets = createInitialTargetStates();
      }
    } else {
      docData = {
        id: date,
        month,
        date,
        targets: createInitialTargetStates(),
        createdAt: nowIso,
        updatedAt: nowIso,
        updatedBy: caller.name
      };
    }

    const currentState = docData.targets[targetKey] || { status: 'todo' };
    docData.targets[targetKey] = {
      ...currentState,
      status: payload.status,
      postedAt: payload.status === 'posted' ? nowIso : currentState.postedAt,
      postedBy: payload.status === 'posted' ? caller.name : currentState.postedBy,
      skipReason: payload.status === 'skipped' ? (payload.skipReason || 'Skipped for this group') : undefined,
      notes: payload.notes !== undefined ? payload.notes : currentState.notes
    };

    docData.updatedAt = nowIso;
    docData.updatedBy = caller.name;

    await docRef.set(docData, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.error('[setWhatsAppTargetStatus] Error:', err);
    return { success: false, error: err.message || 'Failed to update target status.' };
  }
}

/**
 * Batch updates all 8 groups + 1 channel for a given day (e.g. Broadcast All).
 */
export async function setWhatsAppBroadcastAllDay(
  date: string,
  status: WhatsAppTargetStatus,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await verifyUploadCaller(idToken);
    const adminDb = getAdminDb();

    if (!date || !status) {
      return { success: false, error: 'Date and status are required.' };
    }

    const month = date.slice(0, 7);
    const docRef = adminDb.collection('whatsapp_broadcasts').doc(date);
    const snap = await docRef.get();
    const nowIso = new Date().toISOString();

    let docData: WhatsAppDailyBroadcastDoc;

    if (snap.exists) {
      docData = snap.data() as WhatsAppDailyBroadcastDoc;
      if (!docData.targets) {
        docData.targets = createInitialTargetStates();
      }
    } else {
      docData = {
        id: date,
        month,
        date,
        targets: createInitialTargetStates(),
        createdAt: nowIso,
        updatedAt: nowIso,
        updatedBy: caller.name
      };
    }

    for (const k of ALL_WHATSAPP_TARGET_KEYS) {
      docData.targets[k] = {
        status,
        postedAt: status === 'posted' ? nowIso : undefined,
        postedBy: status === 'posted' ? caller.name : undefined,
        skipReason: status === 'skipped' ? 'Batch skipped for the day' : undefined
      };
    }

    docData.updatedAt = nowIso;
    docData.updatedBy = caller.name;

    await docRef.set(docData, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.error('[setWhatsAppBroadcastAllDay] Error:', err);
    return { success: false, error: err.message || 'Failed to batch update day.' };
  }
}

/**
 * Fetches content tasks planned or created for a specific date so uploader can preview & copy.
 */
export async function getWhatsAppDailyContent(
  date: string
): Promise<{ success: boolean; items: WhatsAppDayContentItem[]; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const items: WhatsAppDayContentItem[] = [];

    // 1. Check upload_items first
    const uploadSnap = await adminDb
      .collection('upload_items')
      .where('date', '==', date)
      .get();

    uploadSnap.docs.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        title: data.title || 'Untitled Post',
        caption: data.caption || '',
        hashtags: data.hashtags || [],
        contentType: data.contentType === 'video' ? 'video' : 'image',
        primaryUrl: data.assets?.primaryUrl || '',
        categoryName: data.creationCategoryName || ''
      });
    });

    // 2. If no upload_items found, fallback to media_calendar_tasks
    if (items.length === 0) {
      const taskSnap = await adminDb
        .collection('media_calendar_tasks')
        .where('date', '==', date)
        .get();

      taskSnap.docs.forEach((d) => {
        const data = d.data();
        const isVideo =
          data.type === 'video_create' ||
          data.type === 'video_upload' ||
          String(data.title || '').toLowerCase().includes('video');

        items.push({
          id: d.id,
          title: data.title || data.categoryName || 'Content Post',
          caption: data.note ? `${data.title}\n\n${data.note}` : `${data.title || 'KhanHub Post'}`,
          hashtags: ['#KhanHub', '#Vehari'],
          contentType: isVideo ? 'video' : 'image',
          categoryName: data.categoryName || ''
        });
      });
    }

    return { success: true, items };
  } catch (err: any) {
    console.error('[getWhatsAppDailyContent] Error:', err);
    return { success: false, items: [], error: err.message };
  }
}

