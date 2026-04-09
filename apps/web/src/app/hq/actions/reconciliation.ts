// apps/web/src/app/hq/actions/reconciliation.ts
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { requireHqSuperadmin } from './auth';

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

export async function decideReconciliation(params: {
  id: string;
  status: 'verified' | 'flagged';
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const caller = await requireHqSuperadmin();
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);

    const ref = adminDb.collection('hq_reconciliation').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Record not found.' };

    await ref.set(
      {
        status: params.status,
        verifiedBy: caller.customId,
        verifiedAt: new Date(),
        ...(params.note ? { note: String(params.note).trim() } : {}),
      },
      { merge: true }
    );

    await adminDb.collection('hq_audit').add({
      action: params.status === 'verified' ? 'reconciliation_verified' : 'reconciliation_flagged',
      actorId: caller.uid,
      actorName: caller.name,
      message: params.status === 'verified' ? 'Verified reconciliation' : 'Flagged reconciliation',
      details: { reconciliationId: params.id, note: params.note ? String(params.note).trim() : null },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed.' };
  }
}

