// apps/web/src/app/hq/actions/approvals.ts
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireHqSuperadmin } from './auth';
import { sendHqPushServer } from '@/lib/hqNotificationsServer';

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

async function updateEntityTotals(
  adminDb: FirebaseFirestore.Firestore,
  dept: Dept,
  txData: any
) {
  const entityId = txData.patientId || txData.studentId;
  if (!entityId) return;

  const col = dept === 'rehab' ? 'rehab_patients' : 'spims_students';
  const ref = adminDb.collection(col).doc(entityId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const amount = Number(txData.amount) || 0;
  const isIncome = txData.type === 'income';
  const diff = isIncome ? amount : -amount;

  const update: Record<string, any> = {
    totalReceived: FieldValue.increment(diff),
  };

  if (dept === 'spims' && isIncome) {
    const subtype = txData.spimsFeeSubtype;
    if (subtype === 'admission') update.admissionPaid = FieldValue.increment(amount);
    if (subtype === 'registration') update.registrationPaid = FieldValue.increment(amount);
    if (subtype === 'examination') update.examinationPaid = FieldValue.increment(amount);
  }

  // After incrementing, we should technically recalculate remaining,
  // but since increment is atomic, we might need a separate step or just do it in the next read.
  // To keep it simple and accurate, we'll fetch then set or use a transaction if very critical.
  // However, increment is usually preferred for concurrency.
  // For 'remaining', we will update it based on the new total if we can.
  
  await ref.update(update);

  // Re-read to sync 'remaining' balance field if it exists
  const updatedSnap = await ref.get();
  const updatedData = updatedSnap.data() as any;
  const pkg = Number(updatedData?.totalPackage || updatedData?.totalPackageAmount) || 0;
  const received = Number(updatedData?.totalReceived) || 0;
  
  await ref.update({
    remaining: Math.max(0, pkg - received),
    remainingBalance: Math.max(0, pkg - received), // Support both naming conventions
  });
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

    if (params.decision === 'approved') {
      await updateEntityTotals(adminDb, params.dept, data);
    }

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

    // Notify the cashier who created the transaction
    if (data.createdBy) {
      void (async () => {
        try {
          const userSnap = await adminDb.collection('hq_users').doc(data.createdBy).get();
          if (userSnap.exists) {
            const cashierData = userSnap.data();
            const recipientId = String(cashierData?.customId || '').toUpperCase();
            if (recipientId) {
              await sendHqPushServer({
                recipientId,
                type: params.decision === 'approved' ? 'tx_approved' : 'tx_rejected',
                title: params.decision === 'approved' ? 'Transaction Approved' : 'Transaction Rejected',
                body: `Your transaction of Rs ${Number(data.amount).toLocaleString()} for ${data.patientName || data.studentName || 'Patient/Student'} has been ${params.decision}.`,
                actionUrl: '/hq/dashboard/cashier',
                relatedId: params.txId,
              });
            }
          }
        } catch (warn) {
          console.warn('[Approvals] Notification failed:', warn);
        }
      })();
    }

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

    const snaps = await Promise.all(ids.slice(0, 100).map((id) => adminDb.collection(col).doc(id).get()));
    const validSnaps = snaps.filter((s) => s.exists && !s.data()?.processedAt);

    let processed = 0;
    const batch = adminDb.batch();
    for (const snap of validSnaps) {
      const txId = snap.id;
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

    if (params.decision === 'approved') {
      // Process entity updates sequentially to avoid race conditions on same entity
      for (const snap of validSnaps) {
        await updateEntityTotals(adminDb, params.dept, snap.data());
      }
    }

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

    // Notify creators (simplified for bulk - unique creators)
    const creators = Array.from(new Set(validSnaps.map(s => s.data()?.createdBy).filter(Boolean)));
    for (const uid of creators) {
      void (async () => {
        try {
          const userSnap = await adminDb.collection('hq_users').doc(uid as string).get();
          if (userSnap.exists) {
            const cashierData = userSnap.data();
            const recipientId = String(cashierData?.customId || '').toUpperCase();
            if (recipientId) {
              await sendHqPushServer({
                recipientId,
                type: 'tx_bulk_processed',
                title: 'Transactions Processed',
                body: `The superadmin has ${params.decision} ${validSnaps.filter(s => s.data()?.createdBy === uid).length} of your pending transactions.`,
                actionUrl: '/hq/dashboard/cashier',
              });
            }
          }
        } catch (warn) {
          console.warn('[Approvals] Bulk notification failed:', warn);
        }
      })();
    }

    return { success: true, processed };
  } catch (err: any) {
    return { success: false, processed: 0, error: err?.message || 'Failed.' };
  }
}

