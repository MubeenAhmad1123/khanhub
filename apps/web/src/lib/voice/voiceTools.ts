// apps/web/src/lib/voice/voiceTools.ts
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { readHqSessionCookie } from '@/app/hq/actions/auth';
import { resolveEntityByName } from './entityResolver';

// Helper to get PKT boundaries in UTC
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

async function assertVoiceAccess() {
  const session = await readHqSessionCookie();
  if (!session || !['superadmin', 'manager', 'cashier'].includes(session.role)) {
    throw new Error('Unauthorized');
  }
  return session;
}

// TOOL 1: Get most recent patient/student/child admitted
export async function getLatestAdmission(
  department: 'rehab' | 'spims' | 'hospital' | 'welfare' | 'job-center'
): Promise<{ name: string; id: string; admittedAt: string; detail: string }[]> {
  await assertVoiceAccess();
  
  const collectionMap: Record<string, string> = {
    rehab: 'rehab_patients',
    spims: 'spims_students', 
    hospital: 'hospital_patients',
    welfare: 'welfare_children',
    'job-center': 'job_center_seekers',
  };
  
  const col = collectionMap[department];
  if (!col) return [];
  
  // Get most recent 5 admissions ordered by createdAt
  const snap = await adminDb.collection(col)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  
  return snap.docs.map(doc => {
    const d = doc.data();
    let admittedAt = '';
    if (d.createdAt) {
      const dateObj = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      admittedAt = dateObj.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
    } else if (d.admissionDate) {
      admittedAt = d.admissionDate;
    }
    return {
      name: d.name || d.displayName || d.fullName || 'Unknown',
      id: doc.id,
      admittedAt,
      detail: d.fatherName ? `Father: ${d.fatherName}` : '',
    };
  });
}

// TOOL 2: Get admissions count for a specific date
export async function getAdmissionsByDate(
  department: 'rehab' | 'spims' | 'hospital' | 'welfare' | 'job-center' | 'all',
  targetDate: string | null,
  daysBack: number | null
): Promise<{ date: string; count: number; patients: { name: string; id: string }[] }> {
  await assertVoiceAccess();
  
  const { start, end, formattedDate } = getDateBoundariesInUTC(targetDate, daysBack);
  
  const collectionMap: Record<string, string> = {
    rehab: 'rehab_patients',
    spims: 'spims_students',
    hospital: 'hospital_patients',
    welfare: 'welfare_children',
    'job-center': 'job_center_seekers',
  };

  const collections = department === 'all' 
    ? Object.values(collectionMap)
    : [collectionMap[department]];
  
  let allPatients: { name: string; id: string }[] = [];
  
  for (const col of collections) {
    if (!col) continue;
    try {
      const snap = await adminDb.collection(col)
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();
      
      snap.docs.forEach(doc => {
        const d = doc.data();
        allPatients.push({ name: d.name || d.displayName || d.fullName || 'Unknown', id: doc.id });
      });
    } catch (e) {
      console.warn(`[VoiceTools] Error querying admissions for ${col}:`, e);
    }
  }
  
  return { date: formattedDate, count: allPatients.length, patients: allPatients };
}

// TOOL 3: Get earnings and expenses for a date
export async function getFinancialSummary(
  department: string | null,
  targetDate: string | null,
  daysBack: number | null
): Promise<{
  date: string;
  income: number;
  expense: number;
  net: number;
  department: string;
  transactionCount: number;
}> {
  await assertVoiceAccess();
  
  const { start, end, formattedDate } = getDateBoundariesInUTC(targetDate, daysBack);
  
  const txCollections: Record<string, string> = {
    rehab: 'rehab_transactions',
    spims: 'spims_transactions',
    hospital: 'hospital_transactions',
    welfare: 'welfare_transactions',
    'job-center': 'jobcenter_transactions',
  };
  
  const collectionsToQuery = department && txCollections[department]
    ? [txCollections[department]]
    : Object.values(txCollections);
  
  let totalIncome = 0;
  let totalExpense = 0;
  let txCount = 0;
  
  for (const col of collectionsToQuery) {
    try {
      const snap = await adminDb.collection(col)
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();
      
      snap.docs.forEach(doc => {
        const d = doc.data();
        const status = d.status || 'pending';
        if (status !== 'approved') return;

        txCount++;
        const amount = Number(d.amount || 0);
        const type = d.type || '';
        const isExpense = type === 'expense' || String(d.categoryName || d.category || '').toLowerCase().includes('expense');
        
        if (isExpense) {
          totalExpense += amount;
        } else {
          totalIncome += amount;
        }
      });
    } catch (e) {
      console.warn(`[VoiceTools] Error querying financial summary for ${col}:`, e);
    }
  }
  
  return {
    date: formattedDate,
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
    department: department || 'all departments',
    transactionCount: txCount,
  };
}

// TOOL 4: Find patient/student by name
export async function searchPersonByName(
  name: string,
  entityType: string | null,
  department: string | null
): Promise<{ name: string; id: string; fatherName: string; department: string; type: string }[]> {
  await assertVoiceAccess();
  
  const depts = department 
    ? [department] 
    : ['rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];
  
  const { matches } = await resolveEntityByName(name, null, entityType as any, depts);
  
  return matches.map(m => {
    let type = 'patient';
    if (m.collection.endsWith('_users') || m.collection.endsWith('_staff')) {
      type = 'staff';
    } else if (m.collection === 'spims_students') {
      type = 'student';
    } else if (m.collection === 'welfare_children') {
      type = 'child';
    } else if (m.collection === 'job_center_seekers') {
      type = 'seeker';
    }
    
    return {
      name: m.name,
      id: m.id,
      fatherName: m.fatherName,
      department: m.department,
      type,
    };
  });
}
