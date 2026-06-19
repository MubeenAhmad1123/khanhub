// apps/web/src/lib/voice/voiceQueryActions.ts
'use server';

import { readHqSessionCookie } from '@/app/hq/actions/auth';
import { adminDb } from '@/lib/firebaseAdmin';

async function assertVoiceAccess() {
  const session = await readHqSessionCookie();
  if (!session) {
    throw new Error('Unauthorized');
  }
  if (!['superadmin', 'manager', 'cashier'].includes(session.role)) {
    throw new Error('Unauthorized: voice assistant not available for this role');
  }
  return session;
}

// Maps client collection name to its corresponding fee collection and relation key
const COLLECTION_MAPPINGS: Record<string, { feeCol: string; refKey: string; parentCol: string }> = {
  'rehab_patients': { feeCol: 'rehab_fees', refKey: 'patientId', parentCol: 'rehab_patients' },
  'spims_students': { feeCol: 'spims_fees', refKey: 'studentId', parentCol: 'spims_students' },
  'hospital_patients': { feeCol: 'hospital_fees', refKey: 'patientId', parentCol: 'hospital_patients' },
  'sukoon_patients': { feeCol: 'sukoon_fees', refKey: 'patientId', parentCol: 'sukoon_patients' },
  'welfare_children': { feeCol: 'welfare_fees', refKey: 'childId', parentCol: 'welfare_children' },
  'job_center_seekers': { feeCol: 'jobcenter_fees', refKey: 'seekerId', parentCol: 'job_center_seekers' },
};

function getPakistanDateString(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const pkrDate = new Date(utc + (3600000 * 5)); // Pakistan is UTC+5
  const year = pkrDate.getFullYear();
  const month = String(pkrDate.getMonth() + 1).padStart(2, '0');
  const day = String(pkrDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getRemainingFeeForEntity(entityId: string, collectionName: string) {
  await assertVoiceAccess();
  
  const mapping = COLLECTION_MAPPINGS[collectionName];
  if (!mapping) throw new Error('Unsupported collection');

  // 1. Fetch parent document to get general name and overall outstanding
  const parentDoc = await adminDb.collection(mapping.parentCol).doc(entityId).get();
  if (!parentDoc.exists) throw new Error('Entity not found');
  const parentData = parentDoc.data() || {};
  const name = parentData.name || parentData.fullName || 'Unknown';

  let overallRemaining = Number(parentData.remaining ?? parentData.overallRemaining ?? parentData.remainingAmount ?? parentData.amountRemaining ?? 0);
  
  // 2. Fetch the latest fee document to get month specific details
  let amountRemaining = overallRemaining;
  let amountPaid = 0;
  let totalFee = Number(parentData.monthlyPackage ?? parentData.packageAmount ?? parentData.totalPackage ?? parentData.monthlyFee ?? 0);
  let lastPaymentAmount = 0;
  let lastPaymentDate = '';

  try {
    const feeDocs = await adminDb.collection(mapping.feeCol)
      .where(mapping.refKey, '==', entityId)
      .get();

    if (!feeDocs.empty) {
      // Find the latest record based on month ("YYYY-MM") or date
      const docsData = feeDocs.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort by month or date descending
      docsData.sort((a: any, b: any) => {
        if (a.month && b.month) return b.month.localeCompare(a.month);
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tB - tA;
      });

      const latestFee: any = docsData[0];
      amountRemaining = latestFee.amountRemaining !== undefined ? Number(latestFee.amountRemaining) : overallRemaining;
      amountPaid = Number(latestFee.amountPaid || 0);
      totalFee = Number(latestFee.packageAmount || latestFee.totalCourseFee || totalFee);
      lastPaymentAmount = Number(latestFee.lastPaymentAmount || 0);
      
      if (latestFee.lastPaymentDate) {
        const dateObj = latestFee.lastPaymentDate.toDate ? latestFee.lastPaymentDate.toDate() : new Date(latestFee.lastPaymentDate);
        lastPaymentDate = dateObj.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
  } catch (err) {
    console.warn(`[getRemainingFeeForEntity] Error loading detailed fee record for ${entityId}:`, err);
  }

  return {
    name,
    amountRemaining,
    amountPaid,
    totalFee,
    lastPaymentAmount,
    lastPaymentDate,
  };
}

export async function getAttendanceStatusForEntity(entityId: string, collectionName: string, date?: string) {
  await assertVoiceAccess();

  const mapping = COLLECTION_MAPPINGS[collectionName];
  if (!mapping) throw new Error('Unsupported collection');

  const parentDoc = await adminDb.collection(mapping.parentCol).doc(entityId).get();
  if (!parentDoc.exists) throw new Error('Entity not found');
  const parentData = parentDoc.data() || {};
  const name = parentData.name || parentData.fullName || 'Unknown';

  const queryDate = date || getPakistanDateString();

  // ONLY SPIMS tracks student attendance in spims_student_attendance
  if (collectionName === 'spims_students') {
    try {
      const attId = `${queryDate}_${entityId}`;
      const attDoc = await adminDb.collection('spims_student_attendance').doc(attId).get();
      
      if (attDoc.exists) {
        const status = attDoc.data()?.status || 'unmarked';
        return { status, date: queryDate, name, tracked: true };
      }
      return { status: 'unmarked', date: queryDate, name, tracked: true };
    } catch (err) {
      console.error('[getAttendanceStatusForEntity] SPIMS query error:', err);
      return { status: 'error', date: queryDate, name, tracked: true };
    }
  }

  // Other departments do not track attendance for patients/seekers
  return { status: 'not_tracked', date: queryDate, name, tracked: false };
}

export async function getTotalPaidForEntity(entityId: string, collectionName: string) {
  await assertVoiceAccess();

  const mapping = COLLECTION_MAPPINGS[collectionName];
  if (!mapping) throw new Error('Unsupported collection');

  const parentDoc = await adminDb.collection(mapping.parentCol).doc(entityId).get();
  if (!parentDoc.exists) throw new Error('Entity not found');
  const parentData = parentDoc.data() || {};
  const name = parentData.name || parentData.fullName || 'Unknown';

  let totalPaid = 0;

  // SPIMS stores totalReceived on student document
  if (collectionName === 'spims_students' && parentData.totalReceived !== undefined) {
    totalPaid = Number(parentData.totalReceived || 0);
  } else {
    // For others, sum up all monthly fee paid records
    try {
      const feeDocs = await adminDb.collection(mapping.feeCol)
        .where(mapping.refKey, '==', entityId)
        .get();

      feeDocs.forEach((doc) => {
        totalPaid += Number(doc.data().amountPaid || 0);
      });
    } catch (err) {
      console.error('[getTotalPaidForEntity] Error summing fees:', err);
    }
  }

  return { name, totalPaid };
}

export async function getStatusForEntity(entityId: string, collectionName: string) {
  await assertVoiceAccess();

  const mapping = COLLECTION_MAPPINGS[collectionName];
  if (!mapping) throw new Error('Unsupported collection');

  const parentDoc = await adminDb.collection(mapping.parentCol).doc(entityId).get();
  if (!parentDoc.exists) throw new Error('Entity not found');
  const parentData = parentDoc.data() || {};
  
  return {
    name: parentData.name || parentData.fullName || 'Unknown',
    status: parentData.status || 'Active',
    isActive: parentData.isActive !== false,
  };
}
