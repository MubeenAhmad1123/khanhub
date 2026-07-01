// apps/web/src/lib/voice/getData.ts
import { adminDb } from '@/lib/firebaseAdmin';

interface GetDataParams {
  moduleId: string;
  collectionKey: string;
  filters?: {
    entityId?: string;
    status?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    department?: string;
    entityIdField?: string;
  };
  limit?: number;
}

const DEFAULT_KNOWLEDGE: Record<string, any> = {
  rehab: {
    moduleId: 'rehab',
    displayName: 'Rehab Department',
    entityType: 'patient',
    collections: {
      attendance: 'rehab_attendance',
      dutyLogs: 'rehab_duty_logs',
      dressLogs: 'rehab_dress_logs',
      fees: 'rehab_fees',
      transactions: 'rehab_transactions',
      growthPoints: 'rehab_growth_points',
      deletionLogs: 'rehab_deletion_logs',
      dailyActivities: 'rehab_daily_activities',
      contributions: 'rehab_contributions',
      therapySessions: 'rehab_therapy_sessions',
      medicationRecords: 'rehab_medication_records',
      specialTasks: 'rehab_special_tasks',
      audit: 'rehab_audit'
    },
    financialPattern: 'fees+transactions',
    rules: [
      'Financial queries (remaining fee, payments, dues) must read BOTH rehab_fees and rehab_transactions and combine — never answer from one alone',
      "Only count rehab_transactions where status == 'approved' as actual paid amount",
      'Patient identity resolves via patientId'
    ]
  },
  spims: {
    moduleId: 'spims',
    displayName: 'SPIMS (Student/Medical College)',
    entityType: 'student',
    collections: {
      attendance: 'spims_attendance',
      studentAttendance: 'spims_student_attendance',
      dutyLogs: 'spims_duty_logs',
      dressLogs: 'spims_dress_logs',
      fees: 'spims_fees',
      transactions: 'spims_transactions',
      boardFees: 'spims_board_fees',
      studentDocuments: 'spims_student_documents',
      exams: 'spims_exams',
      tests: 'spims_tests',
      specialTasks: 'spims_special_tasks',
      audit: 'spims_audit',
      salaryRecords: 'spims_salary_records'
    },
    financialPattern: 'fees+transactions',
    rules: [
      'Two separate attendance collections: spims_attendance (staff) vs spims_student_attendance (students) — never confuse',
      'Financial queries must read BOTH spims_fees and spims_transactions and combine',
      'spims_transactions may key off studentId OR patientId — check both fields if entity type is ambiguous',
      "Only status == 'approved' transactions count as actual payments received"
    ]
  },
  hospital: {
    moduleId: 'hospital',
    displayName: 'Hospital',
    entityType: 'patient',
    collections: {
      attendance: 'hospital_attendance',
      dutyLogs: null,
      dressLogs: null,
      fees: 'hospital_fees',
      transactions: 'hospital_transactions',
      fines: 'hospital_fines',
      canteen: 'hospital_canteen',
      dailyStats: 'hospital_daily_stats',
      leaves: 'hospital_leaves',
      visits: 'hospital_visits',
      videos: 'hospital_videos',
      salaryRecords: 'hospital_salary_records',
      specialTasks: 'hospital_special_tasks',
      audit: 'hospital_audit'
    },
    financialPattern: 'fees+transactions',
    rules: [
      "hospital_transactions is further scoped by 'departmentCode' — ask which sub-department if not specified",
      'Financial queries must read BOTH hospital_fees and hospital_transactions and combine'
    ]
  },
  sukoon: {
    moduleId: 'sukoon',
    displayName: 'Sukoon',
    entityType: 'client',
    collections: {
      attendance: 'sukoon_attendance',
      dutyLogs: 'sukoon_duty_logs',
      dressLogs: 'sukoon_dress_logs',
      fees: 'sukoon_fees',
      transactions: 'sukoon_transactions',
      dailyStats: 'sukoon_daily_stats',
      clients: 'sukoon_clients',
      salaryRecords: 'sukoon_salary_records',
      specialTasks: 'sukoon_special_tasks',
      audit: 'sukoon_audit'
    },
    financialPattern: 'fees+transactions',
    rules: [
      'Financial queries must read BOTH sukoon_fees and sukoon_transactions and combine'
    ]
  },
  welfare: {
    moduleId: 'welfare',
    displayName: 'Welfare',
    entityType: 'child',
    collections: {
      attendance: 'welfare_attendance',
      dutyLogs: 'welfare_duty_logs',
      dressLogs: 'welfare_dress_logs',
      fees: 'welfare_fees',
      transactions: 'welfare_transactions',
      canteen: 'welfare_canteen',
      videos: 'welfare_videos',
      visits: 'welfare_visits',
      fines: 'welfare_fines',
      donors: 'welfare_donors',
      children: 'welfare_children',
      salaryRecords: 'welfare_salary_records',
      specialTasks: 'welfare_special_tasks',
      audit: 'welfare_audit'
    },
    financialPattern: 'fees+transactions',
    rules: [
      'Welfare mixes childId (fees/canteen) and patientId (videos/visits) — resolve entity type from context before querying',
      "welfare_transactions supports category-based queries ('show me all medical-category transactions')",
      'Financial queries must read BOTH welfare_fees and welfare_transactions and combine'
    ]
  },
  jobcenter: {
    moduleId: 'jobcenter',
    displayName: 'Job Center',
    entityType: 'seeker',
    collections: {
      attendance: { primary: 'jobcenter_attendance', twin: 'job_center_attendance' },
      dressLogs: { primary: 'jobcenter_dress_logs', twin: 'job_center_dress_logs' },
      dutyLogs: { primary: 'jobcenter_duty_logs', twin: 'job_center_duty_logs' },
      salaryRecords: { primary: 'jobcenter_salary_records', twin: 'job_center_salary_records' },
      canteen: { primary: 'jobcenter_canteen', twin: 'job_center_canteen' },
      meetings: { primary: 'jobcenter_meetings', twin: 'job_center_meetings' },
      customOptions: { primary: 'jobcenter_custom_options', twin: 'job_center_custom_options' },
      fees: { primary: 'jobcenter_fees', twin: 'job_center_fees' },
      audit: { primary: 'jobcenter_audit', twin: 'job_center_audit' },
      users: { primary: 'jobcenter_users', twin: 'job_center_users' },
      staff: { primary: 'jobcenter_staff', twin: 'job_center_staff' },
      transactions: 'job_center_transactions',
      financeLog: 'jobcenter_finance',
      seekers: 'jobcenter_seekers',
      employers: 'jobcenter_employers',
      jobs: 'jobcenter_jobs',
      videos: 'jobcenter_videos',
      contributions: 'jobcenter_contributions',
      dailyActivities: 'jobcenter_daily_activities',
      dressCode: 'job_center_dress_code',
      dutyLogSingle: 'job_center_duty_log'
    },
    financialPattern: 'fees+transactions (with dual-prefix merge on fees)',
    rules: [
      'CRITICAL: for any key marked {primary, twin} above, query BOTH and merge results by docId — do not just fallback on empty, both may hold distinct real data',
      "For 'pending transactions' / 'cashier approvals' / 'finance for date X' queries: job_center_transactions is the primary, full-workflow source. jobcenter_finance is a simpler type/category log and should only be checked as a secondary source, not the first stop",
      'seekers, employers, jobs, videos, contributions, daily_activities have NO twin — only the jobcenter_ prefix exists for these, do not try a job_center_ fallback',
      'Financial queries must also read BOTH jobcenter_fees/job_center_fees (merged) and job_center_transactions and combine'
    ]
  },
  hq: {
    moduleId: 'hq',
    displayName: 'HQ / Cross-Department',
    collections: {
      dutyLogs: 'hq_duty_logs',
      notifications: 'hq_notifications',
      reconciliation: 'hq_reconciliation',
      staffNotifications: 'staff_notifications',
      cashierTransactions: 'cashierTransactions',
      fees: 'hq_fees',
      fines: 'hq_fines',
      ledgerEntries: 'hq_ledger_entries',
      targets: 'hq_targets',
      growthPoints: 'hq_growth_points',
      leadResponses: 'hq_lead_responses',
      cashierCategories: 'hq_cashier_categories',
      attendance: 'hq_attendance',
      salaryRecords: 'hq_salary_records',
      audit: 'hq_audit'
    },
    rules: [
      'cashierTransactions is the ONE camelCase collection in the whole system — never auto-generate this name from a snake_case pattern, it must be looked up explicitly from this knowledge base',
      "HQ has no single 'hq_transactions' — cashierTransactions (individual transactions) + hq_reconciliation (cashier day-end totals) + hq_ledger_entries (running ledger) together cover what other departments' single _transactions collection does"
    ]
  }
};

export async function getModuleKnowledge(moduleId: string): Promise<any> {
  const cleanId = moduleId.toLowerCase().trim();
  try {
    const docRef = adminDb.collection('erp_system_knowledge').doc(cleanId);
    const snap = await docRef.get();
    
    if (snap.exists) {
      return snap.data();
    }
    
    // Seed database if this document (or database) does not exist
    console.log(`[ERP Knowledge] Seeding module knowledge for "${cleanId}"...`);
    const batch = adminDb.batch();
    for (const [mid, data] of Object.entries(DEFAULT_KNOWLEDGE)) {
      const ref = adminDb.collection('erp_system_knowledge').doc(mid);
      batch.set(ref, data);
    }
    await batch.commit();
    
    return DEFAULT_KNOWLEDGE[cleanId] || null;
  } catch (err) {
    console.error(`[getModuleKnowledge] Error reading or seeding knowledge for "${cleanId}":`, err);
    // Fallback to default local config to prevent crashes
    return DEFAULT_KNOWLEDGE[cleanId] || null;
  }
}

export async function getData(params: GetDataParams): Promise<any> {
  const knowledge = await getModuleKnowledge(params.moduleId);
  if (!knowledge) {
    throw new Error(`Unknown moduleId: "${params.moduleId}"`);
  }

  const entry = knowledge.collections[params.collectionKey];
  if (!entry) {
    throw new Error(
      `Unknown collectionKey "${params.collectionKey}" for module "${params.moduleId}". ` +
      `Available keys: ${Object.keys(knowledge.collections).join(', ')}`
    );
  }

  // Dual-prefix lookup (Job Center)
  if (typeof entry === 'object' && entry.primary && entry.twin) {
    const [primaryRes, twinRes] = await Promise.all([
      runQuery(entry.primary, params.filters, params.limit),
      runQuery(entry.twin, params.filters, params.limit)
    ]);
    const merged = mergeAndDedupe(primaryRes.docs, twinRes.docs);
    return {
      collectionsUsed: [entry.primary, entry.twin],
      count: merged.length,
      data: merged
    };
  }

  // Single-prefix lookup
  const result = await runQuery(entry, params.filters, params.limit);
  return {
    collectionUsed: entry,
    count: result.docs.length,
    data: result.docs.map(d => ({ id: d.id, ...d.data() }))
  };
}

export async function getFinancialSummary(moduleId: string, entityId: string): Promise<any> {
  const knowledge = await getModuleKnowledge(moduleId);
  if (!knowledge) {
    throw new Error(`Unknown moduleId: "${moduleId}"`);
  }

  const feesEntry = knowledge.collections.fees;
  const txEntry = knowledge.collections.transactions;

  if (!feesEntry || !txEntry) {
    throw new Error(`Module "${moduleId}" does not support a standard fees+transactions pattern.`);
  }

  // Resolve entity identifier field name from context/resolver
  const idField = (moduleId === 'rehab' || moduleId === 'hospital') 
    ? 'patientId' 
    : (moduleId === 'spims' ? 'studentId' : (moduleId === 'welfare' ? 'childId' : (moduleId === 'jobcenter' ? 'seekerId' : 'entityId')));

  const [feesResult, txResult] = await Promise.all([
    getData({ moduleId, collectionKey: 'fees', filters: { entityId, entityIdField: idField } }),
    getData({ moduleId, collectionKey: 'transactions', filters: { entityId, entityIdField: idField } })
  ]);

  const totalDue = feesResult.data.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
  
  const approvedPaid = txResult.data
    .filter((t: any) => String(t.status || '').toLowerCase() === 'approved')
    .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

  const pendingAmount = txResult.data
    .filter((t: any) => {
      const s = String(t.status || '').toLowerCase();
      return s === 'pending' || s === 'pending_cashier';
    })
    .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

  return {
    moduleId,
    entityId,
    totalDue,
    approvedPaid,
    pendingAmount,
    remainingDue: totalDue - approvedPaid,
    collectionsUsed: [feesResult.collectionsUsed || feesResult.collectionUsed, txResult.collectionsUsed || txResult.collectionUsed].flat()
  };
}

function mergeAndDedupe(a: FirebaseFirestore.QueryDocumentSnapshot[], b: FirebaseFirestore.QueryDocumentSnapshot[]) {
  const seen = new Map<string, any>();
  for (const doc of [...a, ...b]) {
    const key = doc.id;
    if (!seen.has(key)) {
      seen.set(key, { id: doc.id, ...doc.data() });
    }
  }
  return Array.from(seen.values());
}

async function runQuery(collectionName: string, filters?: GetDataParams['filters'], limit = 25) {
  const db = adminDb;
  let q: FirebaseFirestore.Query = db.collection(collectionName);

  const idField = filters?.entityIdField || 'staffId';
  if (filters?.entityId) {
    q = q.where(idField, '==', filters.entityId);
  }
  if (filters?.status) {
    q = q.where('status', '==', filters.status);
  }
  if (filters?.date) {
    q = q.where('date', '==', filters.date);
  }
  if (filters?.dateFrom) {
    q = q.where('date', '>=', filters.dateFrom);
  }
  if (filters?.dateTo) {
    q = q.where('date', '<=', filters.dateTo);
  }

  // Query is limited to prevent massive reads
  return q.limit(limit).get();
}
