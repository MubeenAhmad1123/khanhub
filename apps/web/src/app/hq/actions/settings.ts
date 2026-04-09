// apps/web/src/app/hq/actions/settings.ts
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { requireHqSuperadmin } from './auth';
import type { HqSettings } from '@/lib/hq/superadmin/types';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
  if (existing) return existing;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
  const sa = JSON.parse(json);
  return initializeApp(
    {
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    },
    'hq-admin'
  );
}

export async function updateHqSettings(next: Partial<HqSettings> & { changeNote: string }) {
  const caller = await requireHqSuperadmin();
  const note = String(next.changeNote || '').trim();
  if (!note) return { success: false, error: 'Change note is required.' as const };

  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);
    const ref = adminDb.collection('hq_settings').doc('superadmin');

    const payload: Record<string, any> = { ...next };
    delete payload.changeNote;

    await ref.set(
      {
        ...payload,
        updatedAt: new Date(),
        updatedBy: caller.customId,
      },
      { merge: true }
    );

    await adminDb.collection('hq_audit').add({
      action: 'hq_settings_updated',
      actorId: caller.uid,
      actorName: caller.name,
      message: 'Updated HQ settings',
      details: { changeNote: note, keys: Object.keys(payload) },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    return { success: true as const };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed.' };
  }
}

