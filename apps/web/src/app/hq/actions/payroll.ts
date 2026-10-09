// apps/web/src/app/hq/actions/payroll.ts
'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';

export interface MarkPaidPayload {
  staffId: string;
  dept: StaffDept;
  month: string; // 'YYYY-MM'
  monthLabel: string;
  paidDate: string; // 'YYYY-MM-DD'
  gross: number;
  dailyRate: number;
  payableDays: number;
  absentDays: number;
  absentDeduction: number;
  totalFines: number;
  totalAdvance: number;
  totalCustomAdditions: number;
  totalCustomDeductions: number;
  previousMonthDebt?: number;
  netPayable: number;
  staffName: string;
  designation?: string;
  employeeCode?: string;
  slipImageUrl?: string;
  paidBy: string;
  finesList?: Array<{ id: string; amount?: number; reason?: string; date?: string }>;
}

export interface MarkPaidResult {
  success: boolean;
  txId?: string;
  salaryRecordId?: string;
  error?: string;
}

export async function markStaffPayrollAsPaid(payload: MarkPaidPayload): Promise<MarkPaidResult> {
  try {
    const adminDb = getAdminDb();
    const prefix = getDeptPrefix(payload.dept);
    const dept = payload.dept;

    // 1. Calculate proper timestamp from selected paidDate so it saves to the exact selected date
    const [y, m, d] = (payload.paidDate || new Date().toISOString().slice(0, 10)).split('-').map(Number);
    const paidDateTime = new Date(y, m - 1, d, 12, 0, 0);
    const paidTimestamp = Timestamp.fromDate(paidDateTime);
    const paidMonthStr = `${y}-${String(m).padStart(2, '0')}`; // Month when payment occurred (e.g. 2026-08)

    // Record approved expense transaction in Cashier ledger (${prefix}_transactions)
    const txColName = `${prefix}_transactions`;
    const txData: Record<string, any> = {
      type: 'expense',
      category: 'staff_salary',
      categoryName: 'Staff Salary',
      amount: Number(payload.netPayable) || 0,
      grossAmount: Number(payload.gross) || 0,
      totalDeductions: Number(payload.absentDeduction + payload.totalFines + payload.totalAdvance + (payload.previousMonthDebt || 0) + payload.totalCustomDeductions) || 0,
      totalAdditions: Number(payload.totalCustomAdditions) || 0,
      staffId: payload.staffId,
      staffName: payload.staffName,
      month: paidMonthStr, // expense recorded in this month (e.g. 2026-08)
      salaryMonth: payload.month, // salary period (e.g. 2026-07)
      forMonth: payload.month,
      monthLabel: payload.monthLabel || payload.month,
      description: `Official salary disbursement for ${payload.staffName} (${payload.monthLabel || payload.month}) - Paid on ${payload.paidDate}`,
      status: 'approved', // Direct superadmin / manager authorization
      approvedBy: payload.paidBy || 'Super Admin',
      approvedAt: paidTimestamp,
      paidAt: paidTimestamp,
      transactionDate: paidTimestamp,
      date: paidTimestamp,
      dateString: payload.paidDate,
      dateStr: payload.paidDate,
      paymentMethod: 'cash',
      slipImageUrl: payload.slipImageUrl || null,
      createdAt: paidTimestamp, // Save exact date timestamp so queries sort it into selected date
    };

    const txRef = await adminDb.collection(txColName).add(txData);

    // 2. Create or update salary record in ${prefix}_salary_records
    const salaryColName = `${prefix}_salary_records`;
    const salaryColRef = adminDb.collection(salaryColName);

    // Check if salary record already exists for this staff member and month
    const existingSnap = await salaryColRef
      .where('staffId', '==', payload.staffId)
      .where('month', '==', payload.month)
      .limit(1)
      .get();

    const slipFileName = payload.slipImageUrl
      ? `Salary-Slip-${payload.staffName.replace(/\s+/g, '_')}-${payload.month}.png`
      : null;

    const salaryRecordData: Record<string, any> = {
      staffId: payload.staffId,
      employeeId: payload.employeeCode || payload.staffId,
      staffName: payload.staffName,
      department: payload.dept,
      month: payload.month,
      disbursementDate: payload.paidDate,
      basicSalary: Number(payload.gross) || 0,
      dailyWage: Number(payload.dailyRate) || 0,
      workingDays: 30,
      presentDays: Number(payload.payableDays) || 0,
      absentDays: Number(payload.absentDays) || 0,
      absentDeduction: Number(payload.absentDeduction) || 0,
      fine: Number(payload.totalFines) || 0,
      otherDeductions: Number(payload.totalCustomDeductions + (payload.previousMonthDebt || 0)) || 0,
      advance: Number(payload.totalAdvance) || 0,
      bonus: Number(payload.totalCustomAdditions) || 0,
      netSalary: Number(payload.netPayable) || 0,
      status: 'paid',
      paidAt: paidTimestamp,
      paidDate: payload.paidDate,
      paidBy: payload.paidBy || 'Super Admin',
      slipFileUrl: payload.slipImageUrl || null,
      slipFileName: slipFileName,
      linkedTxId: txRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    };

    let salaryRecordId = '';
    if (existingSnap.empty) {
      const newSalaryDoc = await salaryColRef.add({
        ...salaryRecordData,
        createdAt: FieldValue.serverTimestamp(),
      });
      salaryRecordId = newSalaryDoc.id;
    } else {
      const existingDoc = existingSnap.docs[0];
      await existingDoc.ref.update(salaryRecordData);
      salaryRecordId = existingDoc.id;
    }

    // 3. Mark all logged fines for this month as deducted/paid in ${prefix}_fines
    if (payload.finesList && payload.finesList.length > 0) {
      const finesColName = `${prefix}_fines`;
      await Promise.all(
        payload.finesList.map(async (fineItem) => {
          if (fineItem.id) {
            try {
              await adminDb.collection(finesColName).doc(fineItem.id).update({
                status: 'deducted',
                isDeducted: true,
                deductedInSalaryMonth: payload.month,
                salarySlipTxId: txRef.id,
                salaryRecordId: salaryRecordId,
                deductedAt: FieldValue.serverTimestamp(),
              });
            } catch (fineErr) {
              console.warn(`[markStaffPayrollAsPaid] Failed to update fine ${fineItem.id}:`, fineErr);
            }
          }
        })
      );
    }

    // 4. Update Staff Profile in department users collection (${prefix}_users / hq_users / etc.)
    const staffColName =
      dept === 'hq'
        ? 'hq_users'
        : dept === 'job-center'
        ? 'jobcenter_users'
        : dept === 'social-media'
        ? 'media_users'
        : `${prefix}_users`;

    const newDocItem = payload.slipImageUrl
      ? {
          title: `Salary Slip - ${payload.monthLabel || payload.month} (Rs. ${Number(payload.netPayable).toLocaleString()})`,
          url: payload.slipImageUrl,
          date: payload.paidDate,
          type: 'salary_slip',
          month: payload.month,
          amount: Number(payload.netPayable) || 0,
          txId: txRef.id,
          salaryRecordId: salaryRecordId,
          createdAt: new Date().toISOString(),
        }
      : null;

    const cleanStaffId = payload.staffId.replace(new RegExp(`^(hq|rehab|spims|hospital|sukoon|welfare|jobcenter|media|it)_`), '');
    const prefixedStaffId = `${prefix}_${cleanStaffId}`;
    const candidateStaffDocIds = Array.from(new Set([payload.staffId, cleanStaffId, prefixedStaffId]));

    // Find and update matching staff doc in staffColName
    const candidateCollections = Array.from(new Set([
      staffColName,
      dept === 'rehab' ? 'rehab_staff' : '',
      dept === 'rehab' ? 'rehab_users' : '',
    ].filter(Boolean)));

    for (const targetCol of candidateCollections) {
      try {
        let matchedRef: any = null;
        let matchedData: any = null;

        for (const sId of candidateStaffDocIds) {
          const dRef = adminDb.collection(targetCol).doc(sId);
          const sSnap = await dRef.get();
          if (sSnap.exists) {
            matchedRef = dRef;
            matchedData = sSnap.data() || {};
            break;
          }
        }

        // Fallback: search by staffId, customId, employeeId or name
        if (!matchedRef) {
          const qSnap = await adminDb.collection(targetCol)
            .where('staffId', '==', payload.staffId)
            .limit(1)
            .get()
            .catch(() => ({ empty: true, docs: [] } as any));

          if (!qSnap.empty) {
            matchedRef = qSnap.docs[0].ref;
            matchedData = qSnap.docs[0].data() || {};
          } else if (cleanStaffId) {
            const qClean = await adminDb.collection(targetCol)
              .where('staffId', '==', cleanStaffId)
              .limit(1)
              .get()
              .catch(() => ({ empty: true, docs: [] } as any));
            if (!qClean.empty) {
              matchedRef = qClean.docs[0].ref;
              matchedData = qClean.docs[0].data() || {};
            }
          }
        }

        if (matchedRef && matchedData) {
          let documents = Array.isArray(matchedData.documents) ? [...matchedData.documents] : [];
          if (newDocItem) {
            // Remove prior salary slip document for the same month to prevent duplicate stacking
            documents = documents.filter(
              (d: any) => !(d.type === 'salary_slip' && d.month === payload.month)
            );
            // Prepend latest salary slip
            documents.unshift(newDocItem);
          }

          await matchedRef.update({
            salaryBalance: Number(payload.netPayable) || 0,
            outstandingBalance: payload.netPayable < 0 ? Math.abs(payload.netPayable) : 0,
            lastPayrollMonth: payload.month,
            lastSalaryPaid: Number(payload.netPayable) || 0,
            lastSalaryPaidAt: paidTimestamp,
            lastSalaryPaidDate: payload.paidDate,
            lastSalarySlipUrl: payload.slipImageUrl || null,
            ...(newDocItem ? { documents } : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (colErr) {
        console.warn(`[markStaffPayrollAsPaid] Error updating ${targetCol}:`, colErr);
      }
    }

    // 5. Audit Trail in hq_audit
    try {
      await adminDb.collection('hq_audit').add({
        action: 'staff_payroll_paid',
        dept: payload.dept,
        staffId: payload.staffId,
        staffName: payload.staffName,
        month: payload.month,
        amount: Number(payload.netPayable) || 0,
        paidBy: payload.paidBy || 'Super Admin',
        txId: txRef.id,
        salaryRecordId: salaryRecordId,
        slipImageUrl: payload.slipImageUrl || null,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (auditErr) {
      console.warn('[markStaffPayrollAsPaid] Audit write notice:', auditErr);
    }

    return {
      success: true,
      txId: txRef.id,
      salaryRecordId: salaryRecordId,
    };
  } catch (err: any) {
    console.error('[markStaffPayrollAsPaid] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to mark salary as paid',
    };
  }
}

export interface SaveSalaryCustomizationPayload {
  staffId: string;
  staffName: string;
  dept: StaffDept;
  month: string; // 'YYYY-MM'
  baseSalary?: number | null;
  remainingBalance: number;
  bonus: number;
  allowance: number;
  securityFee: number;
  previousAdvance: number;
  overridePreviousAdvance: boolean;
  advanceSalaryOverride?: number | null;
  clearProfileDebt?: boolean;
  customAdditions: Array<{ id: string; label: string; amount: number }>;
  customDeductions: Array<{ id: string; label: string; amount: number }>;
  notes: string;
  updatedBy: string;
  calcNetPayable?: number;
}

export async function saveSalaryCustomizationAction(
  payload: SaveSalaryCustomizationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const prefix = getDeptPrefix(payload.dept);
    const dept = payload.dept;
    const docId = `${payload.staffId}_${payload.month}`;

    const adjRef = adminDb.collection(`${prefix}_salary_adjustments`).doc(docId);

    const baseSalaryNum =
      payload.baseSalary !== undefined && payload.baseSalary !== null && !isNaN(payload.baseSalary)
        ? Number(payload.baseSalary)
        : null;

    const advanceOverrideNum =
      payload.advanceSalaryOverride !== undefined && payload.advanceSalaryOverride !== null && !isNaN(payload.advanceSalaryOverride)
        ? Number(payload.advanceSalaryOverride)
        : null;

    const remainingBalNum = Number(payload.remainingBalance) || 0;
    const bonusNum = Number(payload.bonus) || 0;
    const allowanceNum = Number(payload.allowance) || 0;
    const secFeeNum = Number(payload.securityFee) || 0;
    const prevAdvNum = Number(payload.previousAdvance) || 0;

    await adjRef.set(
      {
        staffId: payload.staffId,
        staffName: payload.staffName,
        dept: payload.dept,
        month: payload.month,
        baseSalary: baseSalaryNum,
        baseSalaryOverride: baseSalaryNum,
        remainingBalance: remainingBalNum,
        bonus: bonusNum,
        allowance: allowanceNum,
        securityFee: secFeeNum,
        previousAdvance: prevAdvNum,
        overridePreviousAdvance: Boolean(payload.overridePreviousAdvance),
        advanceSalaryOverride: advanceOverrideNum,
        customAdditions: payload.customAdditions || [],
        customDeductions: payload.customDeductions || [],
        notes: (payload.notes || '').trim(),
        updatedBy: payload.updatedBy || 'Super Admin',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Sync to staff profile in department users collection
    const staffColName =
      dept === 'hq'
        ? 'hq_users'
        : dept === 'job-center'
        ? 'jobcenter_users'
        : dept === 'social-media'
        ? 'media_users'
        : `${prefix}_users`;

    const staffDocRef = adminDb.collection(staffColName).doc(payload.staffId);
    const staffSnap = await staffDocRef.get();

    const profileUpdates: Record<string, any> = {
      remainingBalance: remainingBalNum,
      securityFeeDeduction: secFeeNum,
      lastPayrollMonth: payload.month,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (baseSalaryNum !== null && baseSalaryNum > 0) {
      profileUpdates.salary = baseSalaryNum;
      profileUpdates.monthlySalary = baseSalaryNum;
    }

    if (payload.clearProfileDebt) {
      profileUpdates.outstandingBalance = 0;
      profileUpdates.salaryBalance = 0;
      profileUpdates.advance = 0;
      profileUpdates.advanceSalary = 0;
      profileUpdates.monthlyAdvance = 0;
    } else if (payload.calcNetPayable !== undefined) {
      const net = Math.floor(payload.calcNetPayable);
      profileUpdates.salaryBalance = net;
      profileUpdates.outstandingBalance = net < 0 ? Math.abs(net) : 0;
    }

    if (staffSnap.exists) {
      await staffDocRef.update(profileUpdates);
    }

    // If rehab, also update rehab_staff if document exists
    if (dept === 'rehab') {
      try {
        const rehabStaffRef = adminDb.collection('rehab_staff').doc(payload.staffId);
        const rehabStaffSnap = await rehabStaffRef.get();
        if (rehabStaffSnap.exists) {
          await rehabStaffRef.update(profileUpdates);
        }
      } catch (rErr) {
        console.warn('[saveSalaryCustomizationAction] rehab_staff sync notice:', rErr);
      }
    }

    // Audit log
    try {
      await adminDb.collection('hq_audit').add({
        action: 'salary_customization_saved',
        dept: payload.dept,
        staffId: payload.staffId,
        staffName: payload.staffName,
        month: payload.month,
        updatedBy: payload.updatedBy || 'Super Admin',
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[saveSalaryCustomizationAction] Error:', err);
    return { success: false, error: err.message || 'Failed to save salary customization' };
  }
}

export async function syncStaffProfileBalanceAction(payload: {
  staffId: string;
  dept: StaffDept;
  netPayable: number;
  month: string;
  syncedBy?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const prefix = getDeptPrefix(payload.dept);
    const dept = payload.dept;

    const staffColName =
      dept === 'hq'
        ? 'hq_users'
        : dept === 'job-center'
        ? 'jobcenter_users'
        : dept === 'social-media'
        ? 'media_users'
        : `${prefix}_users`;

    const staffDocRef = adminDb.collection(staffColName).doc(payload.staffId);
    const updateData: Record<string, any> = {
      salaryBalance: payload.netPayable,
      outstandingBalance: payload.netPayable < 0 ? Math.abs(payload.netPayable) : 0,
      lastPayrollMonth: payload.month,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await staffDocRef.update(updateData);

    if (dept === 'rehab') {
      try {
        const rehabStaffRef = adminDb.collection('rehab_staff').doc(payload.staffId);
        const rehabStaffSnap = await rehabStaffRef.get();
        if (rehabStaffSnap.exists) {
          await rehabStaffRef.update(updateData);
        }
      } catch {}
    }

    try {
      await adminDb.collection('hq_audit').add({
        action: 'staff_profile_balance_synced',
        dept: payload.dept,
        staffId: payload.staffId,
        month: payload.month,
        netPayable: payload.netPayable,
        syncedBy: payload.syncedBy || 'Super Admin',
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[syncStaffProfileBalanceAction] Error:', err);
    return { success: false, error: err.message || 'Failed to sync balance to profile' };
  }
}

export async function clearStaffProfileDebtAction(payload: {
  staffId: string;
  staffName: string;
  dept: StaffDept;
  month: string;
  clearedBy?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const prefix = getDeptPrefix(payload.dept);
    const dept = payload.dept;

    // 1. Clear profile fields in department users collection
    const staffColName =
      dept === 'hq'
        ? 'hq_users'
        : dept === 'job-center'
        ? 'jobcenter_users'
        : dept === 'social-media'
        ? 'media_users'
        : `${prefix}_users`;

    const staffDocRef = adminDb.collection(staffColName).doc(payload.staffId);
    const clearData: Record<string, any> = {
      outstandingBalance: 0,
      salaryBalance: 0,
      advance: 0,
      advanceSalary: 0,
      monthlyAdvance: 0,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await staffDocRef.update(clearData);

    if (dept === 'rehab') {
      try {
        const rehabStaffRef = adminDb.collection('rehab_staff').doc(payload.staffId);
        const rehabStaffSnap = await rehabStaffRef.get();
        if (rehabStaffSnap.exists) {
          await rehabStaffRef.update(clearData);
        }
      } catch {}
    }

    // 2. Set previousAdvance to 0 in salary adjustments doc so it never carries over
    const adjDocId = `${payload.staffId}_${payload.month}`;
    await adminDb.collection(`${prefix}_salary_adjustments`).doc(adjDocId).set(
      {
        staffId: payload.staffId,
        staffName: payload.staffName,
        dept: payload.dept,
        month: payload.month,
        previousAdvance: 0,
        overridePreviousAdvance: true,
        updatedBy: payload.clearedBy || 'Super Admin',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Audit trail
    try {
      await adminDb.collection('hq_audit').add({
        action: 'staff_profile_debt_cleared',
        dept: payload.dept,
        staffId: payload.staffId,
        staffName: payload.staffName,
        month: payload.month,
        clearedBy: payload.clearedBy || 'Super Admin',
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[clearStaffProfileDebtAction] Error:', err);
    return { success: false, error: err.message || 'Failed to clear debt from profile' };
  }
}

export interface DeleteStaffFinePayload {
  fineId: string;
  staffId?: string;
  dept?: string;
  date?: string;
  amount?: number;
  reason?: string;
  letterUrl?: string;
  referenceNumber?: string;
  deletedBy?: string;
}

export interface DeleteStaffFineResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

const ALL_DEPT_PREFIXES = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'jobcenter', 'media', 'it'];

export async function deleteStaffFineAction(payload: DeleteStaffFinePayload): Promise<DeleteStaffFineResult> {
  try {
    const adminDb = getAdminDb();
    const fineId = payload.fineId;
    if (!fineId) {
      return { success: false, error: 'Fine ID is required' };
    }

    const deptPrefix = payload.dept ? getDeptPrefix(payload.dept as StaffDept) : '';
    const searchPrefixes = deptPrefix
      ? [deptPrefix, ...ALL_DEPT_PREFIXES.filter(p => p !== deptPrefix)]
      : ALL_DEPT_PREFIXES;

    let fineData: Record<string, any> = { ...payload };
    let fineFoundCol = '';

    // 1. Locate and delete fine document in corresponding fines collection
    for (const p of searchPrefixes) {
      const colName = `${p}_fines`;
      try {
        const docRef = adminDb.collection(colName).doc(fineId);
        const snap = await docRef.get();
        if (snap.exists) {
          fineData = { ...snap.data(), ...fineData, id: fineId };
          fineFoundCol = colName;
          await docRef.delete();
          break;
        }
      } catch (e) {}
    }

    // Also check generic 'fines' or 'rehab_fines' if not found
    if (!fineFoundCol) {
      for (const fallbackCol of ['rehab_fines', 'hq_fines', 'fines']) {
        try {
          const docRef = adminDb.collection(fallbackCol).doc(fineId);
          const snap = await docRef.get();
          if (snap.exists) {
            fineData = { ...snap.data(), ...fineData, id: fineId };
            fineFoundCol = fallbackCol;
            await docRef.delete();
            break;
          }
        } catch (e) {}
      }
    }

    const targetDept = (fineData.dept || payload.dept || 'rehab') as StaffDept;
    const prefix = getDeptPrefix(targetDept);
    const targetStaffId = String(fineData.staffId || payload.staffId || '');
    const cleanStaffId = targetStaffId.replace(/^(hq|rehab|spims|hospital|sukoon|welfare|jobcenter|media|it)_/, '');
    const candidateStaffIds = new Set<string>([targetStaffId, cleanStaffId, `${prefix}_${cleanStaffId}`].filter(Boolean));

    // 2. Remove from Finance Records / Transactions (${prefix}_transactions)
    const txColNames = Array.from(new Set([`${prefix}_transactions`, 'rehab_transactions', 'hq_transactions', 'transactions']));
    for (const tCol of txColNames) {
      try {
        const q1 = await adminDb.collection(tCol).where('fineId', '==', fineId).get().catch(() => ({ docs: [] } as any));
        for (const d of q1.docs) {
          await d.ref.delete().catch(() => {});
        }
        const q2 = await adminDb.collection(tCol).where('linkedFineId', '==', fineId).get().catch(() => ({ docs: [] } as any));
        for (const d of q2.docs) {
          await d.ref.delete().catch(() => {});
        }

        // Also check if an expense/fine transaction matches this exact staff, amount, and date
        if (fineData.amount && (fineData.date || payload.date)) {
          const fineDateStr = String(fineData.date || payload.date || '');
          const q3 = await adminDb.collection(tCol)
            .where('amount', '==', Number(fineData.amount))
            .get()
            .catch(() => ({ docs: [] } as any));

          for (const d of q3.docs) {
            const tData = d.data() || {};
            const cat = String(tData.category || '').toLowerCase();
            const desc = String(tData.description || '').toLowerCase();
            const isFineCat = cat.includes('fine') || desc.includes('fine') || tData.type === 'fine';
            const tStaffId = String(tData.staffId || tData.userId || '');
            const tDateStr = String(tData.dateStr || tData.dateString || tData.date || '');

            if (isFineCat && candidateStaffIds.has(tStaffId) && (tDateStr.startsWith(fineDateStr) || fineDateStr.startsWith(tDateStr))) {
              await d.ref.delete().catch(() => {});
            }
          }
        }
      } catch (tErr) {
        console.warn(`[deleteStaffFineAction] Failed to clean transactions in ${tCol}:`, tErr);
      }
    }

    // 3. Remove/Update Duty Assessment Logs (${prefix}_duty_logs)
    const dutyColNames = Array.from(new Set([`${prefix}_duty_logs`, 'rehab_duty_logs', 'hq_duty_logs']));
    for (const dCol of dutyColNames) {
      try {
        if (targetStaffId && (fineData.date || payload.date)) {
          const dateStr = String(fineData.date || payload.date || '');
          for (const cId of Array.from(candidateStaffIds)) {
            const dutySnap = await adminDb.collection(dCol)
              .where('staffId', '==', cId)
              .where('date', '==', dateStr)
              .get()
              .catch(() => ({ docs: [] } as any));

            for (const dDoc of dutySnap.docs) {
              const data = dDoc.data();
              if (data.fineAmount && Number(data.fineAmount) === Number(fineData.amount)) {
                await dDoc.ref.update({
                  fineAmount: 0,
                  fineReason: '',
                  comment: 'Fine revoked/deleted',
                }).catch(() => {});
              }
            }
          }
        }
      } catch (dErr) {
        console.warn(`[deleteStaffFineAction] Duty log cleanup notice:`, dErr);
      }
    }

    // 4. Remove fine letter / picture from Staff Profile Documents Vault
    const profileCols = Array.from(new Set([
      targetDept === 'hq' ? 'hq_users' : targetDept === 'job-center' ? 'jobcenter_users' : targetDept === 'social-media' ? 'media_users' : `${prefix}_users`,
      'rehab_staff',
      'rehab_users',
      'hq_users'
    ]));

    const fineLetterUrl = fineData.letterUrl || payload.letterUrl;
    const fineRefNumber = String(fineData.referenceNumber || payload.referenceNumber || '').trim();
    const fineDateStr = String(fineData.date || payload.date || '').trim();
    const fineAmt = Number(fineData.amount || payload.amount || 0);
    const fineReasonStr = String(fineData.reason || payload.reason || '').toLowerCase().trim();

    for (const pCol of profileCols) {
      try {
        for (const sId of Array.from(candidateStaffIds)) {
          const docRef = adminDb.collection(pCol).doc(sId);
          const snap = await docRef.get();
          if (snap.exists) {
            const sData = snap.data() || {};
            const documents = Array.isArray(sData.documents) ? [...sData.documents] : [];
            const originalLen = documents.length;

            const filteredDocs = documents.filter((d: any) => {
              if (!d) return false;
              // Exact URL match
              if (fineLetterUrl && d.url === fineLetterUrl) return false;
              // Explicit fineId match
              if (d.fineId && d.fineId === fineId) return false;

              // Matching by fine attributes
              const dTitle = String(d.title || '').toLowerCase();
              const isFineType = d.type === 'fine' || dTitle.includes('fine');

              if (isFineType) {
                // If reference number matches
                if (fineRefNumber && (dTitle.includes(fineRefNumber.toLowerCase()) || String(d.referenceNumber || '') === fineRefNumber)) {
                  return false;
                }
                // If same date AND amount
                if (fineDateStr && d.date === fineDateStr && fineAmt > 0 && dTitle.includes(String(fineAmt))) {
                  return false;
                }
                // If same date and reason
                if (fineDateStr && d.date === fineDateStr && fineReasonStr && dTitle.includes(fineReasonStr)) {
                  return false;
                }
                // If exact URL has the fine reference
                if (fineRefNumber && d.url && d.url.includes(fineRefNumber)) {
                  return false;
                }
              }

              return true;
            });

            if (filteredDocs.length !== originalLen) {
              await docRef.update({
                documents: filteredDocs,
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          }
        }
      } catch (pErr) {
        console.warn(`[deleteStaffFineAction] Profile document vault cleanup notice for ${pCol}:`, pErr);
      }
    }

    // 5. Audit log
    try {
      await adminDb.collection('hq_audit').add({
        action: 'staff_fine_deleted',
        fineId,
        dept: targetDept,
        staffId: targetStaffId,
        staffName: fineData.staffName || '',
        amount: fineData.amount || 0,
        date: fineData.date || '',
        deletedBy: payload.deletedBy || 'Super Admin / Manager',
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[deleteStaffFineAction] Error:', err);
    return { success: false, error: err.message || 'Failed to delete fine' };
  }
}

export async function deleteStaffProfileDocumentAction(payload: {
  staffId: string;
  dept: StaffDept;
  docUrl: string;
  docTitle?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = getAdminDb();
    const prefix = getDeptPrefix(payload.dept);
    const cleanStaffId = payload.staffId.replace(/^(hq|rehab|spims|hospital|sukoon|welfare|jobcenter|media|it)_/, '');
    const candidateIds = [payload.staffId, cleanStaffId, `${prefix}_${cleanStaffId}`];

    const profileCols = Array.from(new Set([
      payload.dept === 'hq' ? 'hq_users' : payload.dept === 'job-center' ? 'jobcenter_users' : payload.dept === 'social-media' ? 'media_users' : `${prefix}_users`,
      'rehab_staff',
      'rehab_users',
      'hq_users'
    ]));

    for (const pCol of profileCols) {
      for (const sId of candidateIds) {
        try {
          const docRef = adminDb.collection(pCol).doc(sId);
          const snap = await docRef.get();
          if (snap.exists) {
            const data = snap.data() || {};
            const documents = Array.isArray(data.documents) ? [...data.documents] : [];
            const filtered = documents.filter((d: any) => d.url !== payload.docUrl && (!payload.docTitle || d.title !== payload.docTitle));
            if (filtered.length !== documents.length) {
              await docRef.update({ documents: filtered, updatedAt: FieldValue.serverTimestamp() });
            }
          }
        } catch {}
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

