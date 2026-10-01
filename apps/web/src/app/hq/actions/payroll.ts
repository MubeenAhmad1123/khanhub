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

    // 1. Record approved expense transaction in Cashier ledger (${prefix}_transactions)
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
      month: payload.month,
      monthLabel: payload.monthLabel || payload.month,
      description: `Official salary disbursement for ${payload.staffName} (${payload.monthLabel || payload.month})`,
      status: 'approved', // Direct superadmin / manager authorization
      approvedBy: payload.paidBy || 'Super Admin',
      approvedAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
      transactionDate: payload.paidDate,
      date: payload.paidDate,
      paymentMethod: 'cash',
      slipImageUrl: payload.slipImageUrl || null,
      createdAt: FieldValue.serverTimestamp(),
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
      paidAt: FieldValue.serverTimestamp(),
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

    const staffDocRef = adminDb.collection(staffColName).doc(payload.staffId);
    const staffSnap = await staffDocRef.get();

    if (staffSnap.exists) {
      const staffData = staffSnap.data() || {};
      let documents = Array.isArray(staffData.documents) ? [...staffData.documents] : [];

      if (newDocItem) {
        // Remove prior salary slip document for the same month to prevent duplicate stacking
        documents = documents.filter(
          (d: any) => !(d.type === 'salary_slip' && d.month === payload.month)
        );
        // Prepend latest salary slip
        documents.unshift(newDocItem);
      }

      await staffDocRef.update({
        salaryBalance: Number(payload.netPayable) || 0,
        outstandingBalance: payload.netPayable < 0 ? Math.abs(payload.netPayable) : 0,
        lastPayrollMonth: payload.month,
        lastSalaryPaid: Number(payload.netPayable) || 0,
        lastSalaryPaidAt: FieldValue.serverTimestamp(),
        lastSalarySlipUrl: payload.slipImageUrl || null,
        ...(newDocItem ? { documents } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // If Rehab department, also update rehab_staff if a document exists for this staff member
    if (dept === 'rehab') {
      try {
        const rehabStaffRef = adminDb.collection('rehab_staff').doc(payload.staffId);
        const rehabStaffSnap = await rehabStaffRef.get();
        if (rehabStaffSnap.exists) {
          const rData = rehabStaffSnap.data() || {};
          let documents = Array.isArray(rData.documents) ? [...rData.documents] : [];
          if (newDocItem) {
            documents = documents.filter(
              (d: any) => !(d.type === 'salary_slip' && d.month === payload.month)
            );
            documents.unshift(newDocItem);
          }
          await rehabStaffRef.update({
            salaryBalance: Number(payload.netPayable) || 0,
            lastPayrollMonth: payload.month,
            lastSalaryPaid: Number(payload.netPayable) || 0,
            lastSalaryPaidAt: FieldValue.serverTimestamp(),
            lastSalarySlipUrl: payload.slipImageUrl || null,
            ...(newDocItem ? { documents } : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (rErr) {
        console.warn('[markStaffPayrollAsPaid] rehab_staff sync notice:', rErr);
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
