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

const DEPT_TX_COLLECTIONS: Record<string, string> = {
  'rehab': 'rehab_transactions',
  'spims': 'spims_transactions',
  'hospital': 'hospital_transactions',
  'sukoon': 'sukoon_transactions',
  'welfare': 'welfare_transactions',
  'job-center': 'jobcenter_transactions',
  'hq': 'cashierTransactions',
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

  const parentDoc = await adminDb.collection(mapping.parentCol).doc(entityId).get();
  if (!parentDoc.exists) throw new Error('Entity not found');
  const parentData = parentDoc.data() || {};
  const name = parentData.name || parentData.fullName || 'Unknown';

  let overallRemaining = Number(parentData.remaining ?? parentData.overallRemaining ?? parentData.remainingAmount ?? parentData.amountRemaining ?? 0);
  
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
      const docsData = feeDocs.docs.map(d => ({ id: d.id, ...d.data() }));
      
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

  if (collectionName === 'spims_students' && parentData.totalReceived !== undefined) {
    totalPaid = Number(parentData.totalReceived || 0);
  } else {
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

// UPGRADE: Fetch total remainings across all departments
export async function getTodayRemainingOverall() {
  await assertVoiceAccess();
  
  const [rehabSnap, spimsSnap, hospitalSnap, sukoonSnap, welfareSnap, jobcenterSnap] = await Promise.all([
    adminDb.collection('rehab_patients').get().catch(() => ({ docs: [] })),
    adminDb.collection('spims_students').get().catch(() => ({ docs: [] })),
    adminDb.collection('hospital_patients').get().catch(() => ({ docs: [] })),
    adminDb.collection('sukoon_patients').get().catch(() => ({ docs: [] })),
    adminDb.collection('welfare_children').get().catch(() => ({ docs: [] })),
    adminDb.collection('job_center_seekers').get().catch(() => ({ docs: [] })),
  ]);

  let rehabTotal = 0;
  let spimsTotal = 0;
  let hospitalTotal = 0;
  let sukoonTotal = 0;
  let welfareTotal = 0;
  let jobcenterTotal = 0;

  rehabSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (data.isActive !== false) {
      rehabTotal += Number(data.remaining ?? data.overallRemaining ?? data.amountRemaining ?? 0);
    }
  });

  spimsSnap.docs.forEach((d: any) => {
    const data = d.data();
    const status = (data.status || '').toLowerCase();
    if (status !== 'left' && status !== 'pass' && status !== 'fail' && status !== 'terminated') {
      spimsTotal += Number(data.remaining ?? data.remainingBalance ?? 0);
    }
  });

  hospitalSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (data.isActive !== false) {
      hospitalTotal += Number(data.remaining ?? data.remainingAmount ?? 0);
    }
  });

  sukoonSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (data.isActive !== false) {
      sukoonTotal += Number(data.remaining ?? data.amountRemaining ?? 0);
    }
  });

  welfareSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (data.isActive !== false) {
      welfareTotal += Number(data.remaining ?? data.amountRemaining ?? 0);
    }
  });

  jobcenterSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (data.isActive !== false) {
      jobcenterTotal += Number(data.remaining ?? data.amountRemaining ?? 0);
    }
  });

  const grandTotal = rehabTotal + spimsTotal + hospitalTotal + sukoonTotal + welfareTotal + jobcenterTotal;

  return {
    rehabTotal,
    spimsTotal,
    hospitalTotal,
    sukoonTotal,
    welfareTotal,
    jobcenterTotal,
    grandTotal,
  };
}

// Helper to fetch approved income transactions from a collection
async function fetchApprovedIncomeForCollection(colName: string, start: Date, end: Date): Promise<number> {
  let income = 0;
  try {
    const snap = await adminDb.collection(colName)
      .where('createdAt', '>=', start)
      .where('createdAt', '<', end)
      .get();
      
    snap.forEach((doc: any) => {
      const data = doc.data();
      const status = data.status || 'pending';
      const type = data.type || '';
      
      const isApproved = status === 'approved';
      const isExpense = type === 'expense' || String(data.categoryName || data.category || '').toLowerCase().includes('expense');
      
      if (isApproved && !isExpense) {
        income += Number(data.amount || 0);
      }
    });
  } catch (err) {
    console.error(`[fetchApprovedIncomeForCollection] Error for ${colName}:`, err);
  }
  return income;
}

// UPGRADE: Fetch approved income/earnings for today (PKT timezone)
export async function getTodayEarnings(deptCode?: string) {
  await assertVoiceAccess();

  // 1. Calculate boundaries of today in Pakistan Time (UTC+5)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const pktDate = new Date(utc + (3600000 * 5)); // Pakistan Time
  
  const pktStart = new Date(pktDate);
  pktStart.setHours(0, 0, 0, 0);
  const pktEnd = new Date(pktDate);
  pktEnd.setHours(23, 59, 59, 999);
  
  // Convert back to UTC to query Firestore Timestamp fields
  const startTimestamp = new Date(pktStart.getTime() - 5 * 60 * 60 * 1000);
  const endTimestamp = new Date(pktEnd.getTime() - 5 * 60 * 60 * 1000);

  // If a specific department is requested
  if (deptCode && deptCode !== 'overall' && DEPT_TX_COLLECTIONS[deptCode]) {
    const colName = DEPT_TX_COLLECTIONS[deptCode];
    const total = await fetchApprovedIncomeForCollection(colName, startTimestamp, endTimestamp);
    return {
      grandTotal: total,
      breakdown: { [deptCode]: total }
    };
  }

  // Query all departments in parallel
  const breakdown: Record<string, number> = {};
  let grandTotal = 0;

  await Promise.all(
    Object.entries(DEPT_TX_COLLECTIONS).map(async ([code, colName]) => {
      const total = await fetchApprovedIncomeForCollection(colName, startTimestamp, endTimestamp);
      breakdown[code] = total;
      grandTotal += total;
    })
  );

  return { grandTotal, breakdown };
}

// ==============================================================
// DATE-BASED AND HISTORICAL QUERIES
// ==============================================================

const DEPT_PARENT_COLLECTIONS: Record<string, string> = {
  'rehab': 'rehab_patients',
  'spims': 'spims_students',
  'hospital': 'hospital_patients',
  'sukoon': 'sukoon_patients',
  'welfare': 'welfare_children',
  'job-center': 'job_center_seekers',
};

function getDateBoundariesInUTC(
  targetDate: string | null,
  daysBack: number | null
): { start: Date; end: Date; formattedDate: string } {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  let pktDate = new Date(utc + (3600000 * 5)); // Pakistan Time (UTC+5)

  if (daysBack !== null && daysBack > 0) {
    pktDate.setDate(pktDate.getDate() - daysBack);
  } else if (targetDate) {
    const [year, month, day] = targetDate.split('-').map(Number);
    pktDate = new Date(year, month - 1, day);
  }

  const pktStart = new Date(pktDate);
  pktStart.setHours(0, 0, 0, 0);
  const pktEnd = new Date(pktDate);
  pktEnd.setHours(23, 59, 59, 999);

  const start = new Date(pktStart.getTime() - 5 * 60 * 60 * 1000);
  const end = new Date(pktEnd.getTime() - 5 * 60 * 60 * 1000);

  const formattedDate = pktDate.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return { start, end, formattedDate };
}

async function fetchApprovedTransactionsForCollection(
  colName: string,
  start: Date,
  end: Date
): Promise<{ income: number; expense: number }> {
  let income = 0;
  let expense = 0;
  try {
    const snap = await adminDb.collection(colName)
      .where('createdAt', '>=', start)
      .where('createdAt', '<', end)
      .get();
      
    snap.forEach((doc: any) => {
      const data = doc.data();
      const status = data.status || 'pending';
      const type = data.type || '';
      
      const isApproved = status === 'approved';
      const isExpense = type === 'expense' || String(data.categoryName || data.category || '').toLowerCase().includes('expense');
      const amount = Number(data.amount || 0);
      
      if (isApproved) {
        if (isExpense) {
          expense += amount;
        } else {
          income += amount;
        }
      }
    });
  } catch (err) {
    console.error(`[fetchApprovedTransactionsForCollection] Error for ${colName}:`, err);
  }
  return { income, expense };
}

async function fetchAdmissionsCount(colName: string, start: Date, end: Date): Promise<number> {
  let count = 0;
  try {
    const snap = await adminDb.collection(colName)
      .where('createdAt', '>=', start)
      .where('createdAt', '<', end)
      .get();
    count = snap.size;
  } catch (err) {
    console.error(`[fetchAdmissionsCount] Error for ${colName}:`, err);
  }
  return count;
}

export async function getEarningsByDate(
  deptCode: string | null,
  targetDate: string | null,
  daysBack: number | null
): Promise<{
  date: string;
  departmentBreakdown: { dept: string; income: number; expense: number }[];
  totalIncome: number;
  totalExpense: number;
}> {
  await assertVoiceAccess();

  const { start, end, formattedDate } = getDateBoundariesInUTC(targetDate, daysBack);

  const breakdown: { dept: string; income: number; expense: number }[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  const targetDepts = deptCode && deptCode !== 'overall' && DEPT_TX_COLLECTIONS[deptCode]
    ? [[deptCode, DEPT_TX_COLLECTIONS[deptCode]]]
    : Object.entries(DEPT_TX_COLLECTIONS);

  await Promise.all(
    targetDepts.map(async ([code, colName]) => {
      const res = await fetchApprovedTransactionsForCollection(colName, start, end);
      breakdown.push({ dept: code, income: res.income, expense: res.expense });
      totalIncome += res.income;
      totalExpense += res.expense;
    })
  );

  return {
    date: formattedDate,
    departmentBreakdown: breakdown,
    totalIncome,
    totalExpense
  };
}

export async function getPatientCountByDate(
  deptCode: string | null,
  targetDate: string | null,
  daysBack: number | null
): Promise<{
  date: string;
  newAdmissions: number;
  department: string;
}> {
  await assertVoiceAccess();

  const { start, end, formattedDate } = getDateBoundariesInUTC(targetDate, daysBack);

  let newAdmissions = 0;
  let departmentLabel = 'overall';

  const targetCols: string[] = [];
  if (deptCode && deptCode !== 'overall' && DEPT_PARENT_COLLECTIONS[deptCode]) {
    targetCols.push(DEPT_PARENT_COLLECTIONS[deptCode]);
    departmentLabel = deptCode;
  } else {
    targetCols.push(...Object.values(DEPT_PARENT_COLLECTIONS));
  }

  await Promise.all(
    targetCols.map(async (colName) => {
      const c = await fetchAdmissionsCount(colName, start, end);
      newAdmissions += c;
    })
  );

  return {
    date: formattedDate,
    newAdmissions,
    department: departmentLabel
  };
}

