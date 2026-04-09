// apps/web/src/app/hq/actions/approvals.ts
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { requireHqSuperadmin } from './auth';

type Dept = 'rehab' | 'spims';
type Decision = 'approved' | 'rejected';

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

function txCollection(dept: Dept) {
  return dept === 'rehab' ? 'rehab_transactions' : 'spims_transactions';
}

export async function decideTransaction(params: {
  dept: Dept;
  txId: string;
  decision: Decision;
  rejectReason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const caller = await requireHqSuperadmin();
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);

    const col = txCollection(params.dept);
    const ref = adminDb.collection(col).doc(params.txId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Transaction not found.' };

    const data = snap.data() as any;
    if (data?.processedAt) return { success: false, error: 'Already processed.' };

    const update: Record<string, any> = {
      status: params.decision,
      processedAt: new Date(),
      processedBy: caller.customId,
    };
    if (params.decision === 'approved') {
      update.approvedAt = new Date();
      update.approvedBy = caller.customId;
    } else {
      update.rejectedAt = new Date();
      update.rejectedBy = caller.customId;
      update.rejectionReason = String(params.rejectReason || '').trim();
    }

    await ref.set(update, { merge: true });

    await adminDb.collection('hq_audit').add({
      action: params.decision === 'approved' ? 'tx_approved' : 'tx_rejected',
      actorId: caller.uid,
      actorName: caller.name,
      dept: params.dept,
      entityId: data.patientId || data.studentId || data.staffId || null,
      entityLabel: data.patientName || data.studentName || data.staffName || null,
      message:
        params.decision === 'approved'
          ? `Approved ${params.dept} transaction`
          : `Rejected ${params.dept} transaction`,
      details: {
        txId: params.txId,
        amount: data.amount ?? null,
        category: data.category ?? null,
        rejectReason: params.decision === 'rejected' ? String(params.rejectReason || '').trim() : null,
      },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed.' };
  }
}

export async function bulkDecideTransactions(params: {
  dept: Dept;
  txIds: string[];
  decision: Decision;
  rejectReason?: string;
}): Promise<{ success: boolean; processed: number; error?: string }> {
  const caller = await requireHqSuperadmin();
  try {
    const app = getAdminApp();
    const adminDb = getFirestore(app);
    const col = txCollection(params.dept);

    const ids = Array.from(new Set(params.txIds || [])).filter(Boolean);
    if (!ids.length) return { success: true, processed: 0 };

    let processed = 0;
    const batch = adminDb.batch();
    for (const txId of ids.slice(0, 200)) {
      const ref = adminDb.collection(col).doc(txId);
      batch.set(
        ref,
        {
          status: params.decision,
          processedAt: new Date(),
          processedBy: caller.customId,
          ...(params.decision === 'approved'
            ? { approvedAt: new Date(), approvedBy: caller.customId }
            : { rejectedAt: new Date(), rejectedBy: caller.customId, rejectionReason: String(params.rejectReason || '').trim() }),
        },
        { merge: true }
      );
      processed++;
    }
    await batch.commit();

    await adminDb.collection('hq_audit').add({
      action: params.decision === 'approved' ? 'tx_bulk_approved' : 'tx_bulk_rejected',
      actorId: caller.uid,
      actorName: caller.name,
      dept: params.dept,
      message: `Bulk ${params.decision} ${processed} ${params.dept} transactions`,
      details: { count: processed },
      createdAt: new Date(),
      performedBy: 'hq_superadmin',
    });

    return { success: true, processed };
  } catch (err: any) {
    return { success: false, processed: 0, error: err?.message || 'Failed.' };
  }
}

