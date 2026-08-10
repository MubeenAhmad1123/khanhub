'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, Timestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';
import { toDate, downloadElementAsPng } from '@/lib/utils';
import {
  UserCog, Printer, Calendar, DollarSign, Loader2, Download,
  Plus, X, Receipt, Trash2, Building2, Eye, CheckCircle2,
  Info, CreditCard, SlidersHorizontal, PlusCircle, MinusCircle,
  Save, AlertTriangle, RefreshCw
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ALL_DEPTS: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
const ALL_PREFIXES = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'jobcenter', 'media', 'it', ''];

const DEPT_LABELS: Record<string, string> = {
  hq: 'HQ', rehab: 'Rehab', spims: 'SPIMS', hospital: 'Hospital',
  sukoon: 'Sukoon', welfare: 'Welfare', 'job-center': 'Job Center',
  'social-media': 'Social Media', it: 'IT',
};

const DEPT_COLORS: Record<string, string> = {
  hq: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  rehab: 'bg-rose-100 text-rose-700 border-rose-200',
  spims: 'bg-teal-100 text-teal-700 border-teal-200',
  hospital: 'bg-blue-100 text-blue-700 border-blue-200',
  sukoon: 'bg-purple-100 text-purple-700 border-purple-200',
  welfare: 'bg-amber-100 text-amber-700 border-amber-200',
  'job-center': 'bg-orange-100 text-orange-700 border-orange-200',
  'social-media': 'bg-pink-100 text-pink-700 border-pink-200',
  it: 'bg-slate-100 text-slate-700 border-slate-200',
};

function formatPKR(n: number) {
  const rounded = Math.round(n);
  if (rounded < 0) {
    return `-Rs. ${Math.abs(rounded).toLocaleString('en-PK')}`;
  }
  return `Rs. ${rounded.toLocaleString('en-PK')}`;
}

function formatDateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try {
    const dObj = toDate(val);
    if (dObj) {
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const d = String(dObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}
  return String(val || '');
}

function getDaysInMonth(year: number, monthZeroIndexed: number): string[] {
  const date = new Date(year, monthZeroIndexed, 1);
  const days: string[] = [];
  while (date.getMonth() === monthZeroIndexed) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function ManagerPayrollPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [tab, setTab] = useState<'salary' | 'fines'>('salary');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [fineStaffFilter, setFineStaffFilter] = useState<string>('all');
  const [fineDeptFilter, setFineDeptFilter] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Staff breakdown modal state
  const [selectedStaffModal, setSelectedStaffModal] = useState<any | null>(null);

  // Staff customization modal state
  const [customizeModalStaff, setCustomizeModalStaff] = useState<any | null>(null);
  const [customizeForm, setCustomizeForm] = useState({
    remainingBalance: '',
    bonus: '',
    allowance: '',
    securityFee: '',
    previousAdvance: '',
    notes: '',
    customAdditions: [] as Array<{ id: string; label: string; amount: string }>,
    customDeductions: [] as Array<{ id: string; label: string; amount: string }>,
  });
  const [savingCustomization, setSavingCustomization] = useState(false);
  const [syncingProfileId, setSyncingProfileId] = useState<string | null>(null);

  // Fine form
  const [showFineForm, setShowFineForm] = useState(false);
  const [fineForm, setFineForm] = useState({ dept: '', staffId: '', amount: '', reason: '', date: '' });
  const [savingFine, setSavingFine] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthDays = getDaysInMonth(selectedYear, selectedMonth);

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const fetchGlobalTransactionsForMonth = async () => {
    const txMap = new Map<string, any>();

    await Promise.all(ALL_PREFIXES.map(async (p) => {
      const txCol = p ? `${p}_transactions` : 'transactions';
      const advCol = p ? `${p}_advances` : 'advances';

      for (const colName of [txCol, advCol]) {
        try {
          const snap = await getDocs(collection(db, colName)).catch(() => ({ docs: [] }));
          snap.docs.forEach((d: any) => {
            if (d && d.id) {
              txMap.set(`${colName}-${d.id}`, { id: d.id, _collection: colName, ...d.data() });
            }
          });
        } catch (e) {}
      }
    }));

    return Array.from(txMap.values());
  };

  const isAdvanceTxInSelectedMonth = (tx: any, targetMonthStr: string) => {
    if (tx.status === 'rejected') return false;
    const cat = String(tx.category || '').toLowerCase();
    const catName = String(tx.categoryName || '').toLowerCase();
    const desc = String(tx.description || '').toLowerCase();
    const col = String(tx._collection || '').toLowerCase();

    const isAdvanceCat =
      cat === 'advance_salary' ||
      cat === 'advance' ||
      cat === 'staff_advance' ||
      catName.includes('advance') ||
      desc.includes('advance') ||
      col.includes('advances');

    if (!isAdvanceCat) return false;
    const txDate = tx.transactionDate || tx.date || tx.createdAt;
    if (!txDate) {
      if (tx.month) return String(tx.month) === targetMonthStr;
      return true;
    }
    const parsedStr = formatDateString(txDate);
    if (parsedStr && parsedStr.startsWith(targetMonthStr)) {
      return true;
    }
    if (tx.month) {
      return String(tx.month) === targetMonthStr;
    }
    return false;
  };

  const syncStaffProfileBalance = async (staffRow: any) => {
    try {
      setSyncingProfileId(staffRow.id);
      const prefix = getDeptPrefix(staffRow.dept as StaffDept);
      const dept = staffRow.dept as StaffDept;
      const staffCol = dept === 'hq' ? 'hq_users'
        : dept === 'job-center' ? 'jobcenter_users'
        : dept === 'social-media' ? 'media_users'
        : `${prefix}_users`;

      const staffDocRef = doc(db, staffCol, staffRow.id);

      // If net salary is negative, advance / debt balance is the positive magnitude
      const outstandingDebt = staffRow.netPayable < 0 ? Math.abs(staffRow.netPayable) : staffRow.totalAdvance;

      await updateDoc(staffDocRef, {
        advance: outstandingDebt,
        advanceSalary: outstandingDebt,
        monthlyAdvance: outstandingDebt,
        salaryBalance: staffRow.netPayable,
        outstandingBalance: staffRow.netPayable < 0 ? Math.abs(staffRow.netPayable) : 0,
        lastPayrollMonth: monthStr,
        updatedAt: Timestamp.now(),
      });

      alert(`Successfully saved balance (${formatPKR(staffRow.netPayable)}) to ${staffRow.name}'s profile!`);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to sync balance to profile: ' + err.message);
    } finally {
      setSyncingProfileId(null);
    }
  };

  const handleLoad = useCallback(async () => {
    try {
      setLoading(true);

      const globalTxns = await fetchGlobalTransactionsForMonth();

      const results = await Promise.all(ALL_DEPTS.map(async (dept) => {
        const prefix = getDeptPrefix(dept);
        try {
          const staffCol = dept === 'hq' ? 'hq_users'
            : dept === 'job-center' ? 'jobcenter_users'
            : dept === 'social-media' ? 'media_users'
            : `${prefix}_users`;

          const STAFF_ROLES = new Set([
            'admin', 'staff', 'cashier', 'superadmin', 'manager',
            'doctor', 'nurse', 'counselor', 'personnel', 'other',
          ]);

          const daysInThisCalendarMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
          const monthEndStr = `${monthStr}-${String(daysInThisCalendarMonth).padStart(2, '0')}`;

          const staffSnap = await getDocs(collection(db, staffCol));
          const allStaff = staffSnap.docs
            .map(d => ({ id: d.id, ...d.data() as any, dept }))
            .filter((s: any) => {
              const name = String(s.name || s.displayName || '').toLowerCase();
              const email = String(s.email || '').toLowerCase();
              if (name.includes('super') || name.includes('network') || email.includes('super') || email.includes('network')) return false;

              const role = String(s.role || '').toLowerCase();
              if (['student', 'patient', 'family', 'visitor'].includes(role)) return false;

              const hasSalaryField = s.monthlySalary !== undefined || s.salary !== undefined;
              if (role && !STAFF_ROLES.has(role) && !hasSalaryField) return false;

              // Exclude if staff joined after selected month
              const joiningRaw = s.joiningDate || s.startDate || s.dateJoined || s.createdAt;
              const joiningStr = formatDateString(joiningRaw);
              if (joiningStr && joiningStr > monthEndStr) {
                return false;
              }

              const statusStr = String(s.status || '').toLowerCase();
              return s.isActive !== false && !['inactive', 'resigned', 'terminated', 'executive', 'hide'].includes(statusStr);
            })
            .sort((a: any, b: any) => (a.name || a.displayName || '').localeCompare(b.name || b.displayName || ''));

          if (allStaff.length === 0) return { dept, salaryRows: [], allFines: [], allStaff: [] };

          // Fines
          const finesCol = `${prefix}_fines`;
          const finesSnap = await getDocs(collection(db, finesCol)).catch(() => ({ docs: [] } as any));
          const allFines = finesSnap.docs.map((d: any) => ({ id: d.id, dept, ...d.data() }));

          // Custom Salary Adjustments (e.g. security fee, remaining arrears, custom additions/deductions)
          const adjCol = `${prefix}_salary_adjustments`;
          const adjSnap = await getDocs(collection(db, adjCol)).catch(() => ({ docs: [] } as any));
          const allAdjustments = adjSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

          // Attendance for selected month
          const attCol = `${prefix}_attendance`;
          const attSnap = await getDocs(query(
            collection(db, attCol),
            where('date', '>=', `${monthStr}-01`),
            where('date', '<=', `${monthStr}-31`)
          )).catch(() => ({ docs: [] } as any));
          const allAttDocs = attSnap.docs.map((d: any) => d.data());

          // Salary Slips
          const salarySnap = await getDocs(collection(db, `${prefix}_salary_records`)).catch(() => ({ docs: [] } as any));
          const allSalarySlips = salarySnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

          const staffMap = Object.fromEntries(allStaff.map((s: any) => [s.id, s.name || s.displayName || s.id]));

          // Build salary rows
          const salaryRows = allStaff.map((staff: any) => {
            const gross = Number(staff.monthlySalary || staff.salary || 0);
            const dailyRate = gross / 30;

            const uid = staff.staffId || staff.id;
            const loginId = staff.loginUserId || staff.uid || staff.userId || '';

            const candidateIds = new Set<string>();
            const rawIds = [uid, loginId, staff.customId, staff.employeeId, staff.userId, staff.staffId].filter(Boolean);

            rawIds.forEach(idStr => {
              const id = String(idStr);
              candidateIds.add(id);
              const stripped = id.replace(/^(hq|rehab|spims|hospital|sukoon|welfare|jobcenter|media|it)_/, '');
              candidateIds.add(stripped);
              ALL_PREFIXES.forEach(p => {
                if (p) {
                  candidateIds.add(`${p}_${stripped}`);
                }
              });
            });

            const staffNameLower = String(staff.name || staff.displayName || '').toLowerCase();

            // Match advances from globalTxns array
            const staffAdvanceTxns = globalTxns.filter((tx: any) => {
              if (!isAdvanceTxInSelectedMonth(tx, monthStr)) return false;
              const txStaffId = String(tx.staffId || tx.patientId || tx.userId || tx.customId || tx.employeeId || tx.memberId || '');
              if (txStaffId && candidateIds.has(txStaffId)) return true;

              if (staffNameLower) {
                if (tx.staffName && String(tx.staffName).toLowerCase() === staffNameLower) return true;
                if (tx.userName && String(tx.userName).toLowerCase() === staffNameLower) return true;
                if (tx.name && String(tx.name).toLowerCase() === staffNameLower) return true;
                if (tx.description && String(tx.description).toLowerCase().includes(staffNameLower)) return true;
              }
              return false;
            });

            const approvedAdvancesForMonth = staffAdvanceTxns.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            const staffDocAdvance = Number(staff.advance || staff.advanceSalary || staff.monthlyAdvance || 0);

            // Salary Slip check
            const slip = allSalarySlips.find((s: any) => {
              if (s.month !== monthStr) return false;
              if (candidateIds.has(String(s.staffId))) return true;
              if (s.staffName && String(s.staffName).toLowerCase() === staffNameLower) return true;
              return false;
            });

            // Find Custom Adjustment Doc for staff
            const customAdj = allAdjustments.find((a: any) => {
              if (a.month !== monthStr) return false;
              if (candidateIds.has(String(a.staffId))) return true;
              if (a.staffName && String(a.staffName).toLowerCase() === staffNameLower) return true;
              return false;
            });

            const customAdvanceVal = Number(customAdj?.previousAdvance || 0);
            const actualAdvance = Math.max(Number(slip?.advance || 0), approvedAdvancesForMonth, staffDocAdvance, customAdvanceVal);

            // Additional Custom Additions (Remaining balance/arrears, bonus, allowance, custom items)
            const remainingBalance = Number(customAdj?.remainingBalance || 0);
            const bonus = Number(customAdj?.bonus || 0);
            const allowance = Number(customAdj?.allowance || 0);
            const customAdditionsList: Array<{ label: string; amount: number }> = (customAdj?.customAdditions || []).map((ca: any) => ({
              label: ca.label || 'Custom Addition',
              amount: Number(ca.amount || 0)
            }));

            const totalCustomAdditions = remainingBalance + bonus + allowance + customAdditionsList.reduce((acc, c) => acc + c.amount, 0);

            // Additional Custom Deductions (Security fee, damage/penalties, custom items)
            const securityFee = Number(customAdj?.securityFee || 0);
            const customDeductionsList: Array<{ label: string; amount: number }> = (customAdj?.customDeductions || []).map((cd: any) => ({
              label: cd.label || 'Custom Deduction',
              amount: Number(cd.amount || 0)
            }));

            const totalCustomDeductions = securityFee + customDeductionsList.reduce((acc, c) => acc + c.amount, 0);

            // Filter attendance docs for this staff member
            const staffAtt = allAttDocs.filter((a: any) => {
              if (candidateIds.has(String(a.staffId)) || candidateIds.has(String(a.userId))) return true;
              if (a.staffName && String(a.staffName).toLowerCase() === staffNameLower) return true;
              return false;
            });

            const attMapByDate: Record<string, any> = {};
            staffAtt.forEach((a: any) => {
              const dStr = formatDateString(a.date);
              if (dStr) attMapByDate[dStr] = a;
            });

            // Joining Date calculation
            const joiningRaw = staff.joiningDate || staff.startDate || staff.dateJoined || staff.createdAt;
            const joiningDateStr = formatDateString(joiningRaw);

            let joiningDay = 1;
            let joinedMidMonth = false;

            if (joiningDateStr && joiningDateStr.startsWith(monthStr)) {
              joiningDay = parseInt(joiningDateStr.substring(8, 10), 10) || 1;
              if (joiningDay > 1) {
                joinedMidMonth = true;
              }
            }

            let totalBaseDaysForStaff = 30;
            if (joinedMidMonth) {
              totalBaseDaysForStaff = Math.max(0, 30 - joiningDay + 1);
            }

            // Calculate days passed in month (always based on 30-day standard)
            let daysPassed = totalBaseDaysForStaff;
            if (monthStr === currentMonthStr) {
              const currentDay = today.getDate();
              if (joinedMidMonth) {
                if (currentDay < joiningDay) {
                  daysPassed = 0;
                } else {
                  const elapsedDays = currentDay - joiningDay + 1;
                  daysPassed = Math.min(elapsedDays, totalBaseDaysForStaff);
                }
              } else {
                daysPassed = Math.min(currentDay, 30);
              }
            } else if (monthStr > currentMonthStr) {
              daysPassed = 0;
            }

            const absences: Array<{ date: string; reason: string; isUnmarked: boolean }> = [];
            let absentDaysCount = 0;
            let unmarkedDaysCount = 0;

            monthDays.forEach(dayStr => {
              // Ignore dates before staff joining date
              if (joiningDateStr && dayStr < joiningDateStr) {
                return;
              }

              const att = attMapByDate[dayStr];
              const status = att ? String(att.status || att.state || '').toLowerCase() : 'unmarked';
              const isPast = dayStr < todayStr;

              if (status === 'absent') {
                absentDaysCount++;
                if (dayStr <= todayStr) {
                  absences.push({
                    date: dayStr,
                    reason: att?.reason || `Absent from duty (Daily rate: ${formatPKR(dailyRate)})`,
                    isUnmarked: false,
                  });
                }
              } else if (status === 'unmarked') {
                if (isPast) {
                  unmarkedDaysCount++;
                  absences.push({
                    date: dayStr,
                    reason: `Unmarked Attendance (Past Day) (Daily rate: ${formatPKR(dailyRate)})`,
                    isUnmarked: true,
                  });
                }
              }
            });

            const totalAbsentDays = absentDaysCount + unmarkedDaysCount;
            const payableDays = Math.max(0, daysPassed - totalAbsentDays);

            const baseEarnedSalary = payableDays * dailyRate;
            const totalAbsentDeduction = totalAbsentDays * dailyRate;

            // Filter fines for this staff member
            const staffFines = allFines.filter((f: any) => {
              const fDateStr = formatDateString(f.date || f.month);
              if (!fDateStr || !fDateStr.startsWith(monthStr)) return false;

              if (candidateIds.has(String(f.staffId))) return true;
              if (f.staffName && String(f.staffName).toLowerCase() === staffNameLower) return true;
              return false;
            });

            const totalFines = staffFines.reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0);

            // Total Gross & Net formula: CAN GO IN MINUS IF ADVANCE/DEDUCTIONS > EARNINGS!
            const totalEarningsWithAdditions = baseEarnedSalary + totalCustomAdditions;
            const totalDeductions = Math.round(totalAbsentDeduction + totalFines + actualAdvance + totalCustomDeductions);
            
            // Allow negative net payable (e.g. -10,000 PKR if advance exceeds salary)
            const netPayable = Math.floor(totalEarningsWithAdditions - totalDeductions);

            // Itemized date-wise deduction & addition breakdown
            const breakdownItems: Array<{
              id: string;
              date: string;
              category: 'addition' | 'deduction';
              type: 'absent' | 'fine' | 'advance' | 'security' | 'remaining' | 'bonus' | 'allowance' | 'custom_add' | 'custom_ded';
              amount: number;
              reason: string;
              recordedBy?: string;
            }> = [];

            // Additions to breakdown
            if (remainingBalance > 0) {
              breakdownItems.push({
                id: `rem-${staff.id}`,
                date: monthStr,
                category: 'addition',
                type: 'remaining',
                amount: remainingBalance,
                reason: 'Remaining Salary / Previous Arrears Added',
                recordedBy: customAdj?.updatedBy || 'Manager',
              });
            }
            if (bonus > 0) {
              breakdownItems.push({
                id: `bonus-${staff.id}`,
                date: monthStr,
                category: 'addition',
                type: 'bonus',
                amount: bonus,
                reason: 'Performance Bonus / Reward',
                recordedBy: customAdj?.updatedBy || 'Manager',
              });
            }
            if (allowance > 0) {
              breakdownItems.push({
                id: `allow-${staff.id}`,
                date: monthStr,
                category: 'addition',
                type: 'allowance',
                amount: allowance,
                reason: 'Overtime / Special Allowance',
                recordedBy: customAdj?.updatedBy || 'Manager',
              });
            }
            customAdditionsList.forEach((ca, idx) => {
              breakdownItems.push({
                id: `cadd-${staff.id}-${idx}`,
                date: monthStr,
                category: 'addition',
                type: 'custom_add',
                amount: ca.amount,
                reason: ca.label || 'Custom Salary Addition',
                recordedBy: customAdj?.updatedBy || 'Manager',
              });
            });

            // Deductions to breakdown
            absences.forEach((a: any, idx: number) => {
              breakdownItems.push({
                id: `absent-${a.date}-${idx}`,
                date: String(a.date),
                category: 'deduction',
                type: 'absent',
                amount: Math.round(dailyRate),
                reason: a.reason,
              });
            });

            staffFines.forEach((f: any) => {
              const dStr = formatDateString(f.date || f.month) || '—';
              breakdownItems.push({
                id: f.id || `fine-${dStr}`,
                date: dStr,
                category: 'deduction',
                type: 'fine',
                amount: Number(f.amount || 0),
                reason: f.reason || 'Fine imposed',
                recordedBy: f.recordedBy || 'Manager',
              });
            });

            staffAdvanceTxns.forEach((tx: any) => {
              const dateStr = formatDateString(tx.transactionDate || tx.date || tx.createdAt) || String(tx.month || monthStr);
              breakdownItems.push({
                id: tx.id || `adv-${dateStr}`,
                date: dateStr,
                category: 'deduction',
                type: 'advance',
                amount: Number(tx.amount || 0),
                reason: tx.description || tx.categoryName || 'Advance Salary taken',
                recordedBy: tx.recordedBy || tx.cashierName || 'Cashier / Manager',
              });
            });

            if (staffAdvanceTxns.length === 0 && actualAdvance > 0) {
              breakdownItems.push({
                id: `doc-adv-${staff.id}`,
                date: monthStr,
                category: 'deduction',
                type: 'advance',
                amount: actualAdvance,
                reason: customAdvanceVal > 0 ? 'Previous Advance Salary Adjustment' : 'Monthly Advance Salary Record',
                recordedBy: customAdj?.updatedBy || 'System Record',
              });
            }

            if (securityFee > 0) {
              breakdownItems.push({
                id: `sec-${staff.id}`,
                date: monthStr,
                category: 'deduction',
                type: 'security',
                amount: securityFee,
                reason: 'Security Fee Deduction',
                recordedBy: customAdj?.updatedBy || 'Manager',
              });
            }

            customDeductionsList.forEach((cd, idx) => {
              breakdownItems.push({
                id: `cded-${staff.id}-${idx}`,
                date: monthStr,
                category: 'deduction',
                type: 'custom_ded',
                amount: cd.amount,
                reason: cd.label || 'Custom Salary Deduction',
                recordedBy: customAdj?.updatedBy || 'Manager',
              });
            });

            // Safe sort with string conversion
            breakdownItems.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

            return {
              id: staff.id,
              name: staff.name || staff.displayName || '—',
              designation: staff.designation || staff.role || '—',
              dept,
              gross,
              dailyRate: Math.round(dailyRate),
              payableDays,
              earnings: Math.round(baseEarnedSalary),
              absentDays: totalAbsentDays,
              totalAbsentDeduction: Math.round(totalAbsentDeduction),
              staffFines,
              totalFines,
              totalAdvance: actualAdvance,
              staffAdvanceTxns,
              // Custom Salary Customizations
              customAdj,
              remainingBalance,
              bonus,
              allowance,
              customAdditionsList,
              totalCustomAdditions,
              securityFee,
              customDeductionsList,
              totalCustomDeductions,
              notes: customAdj?.notes || '',
              deductions: totalDeductions,
              netPayable,
              breakdownItems,
            };
          });

          const monthFinesFiltered = allFines.filter((f: any) => {
            const fDateStr = formatDateString(f.date || f.month);
            return fDateStr.startsWith(monthStr);
          }).map((f: any) => ({
            ...f,
            date: formatDateString(f.date || f.month),
            staffName: staffMap[f.staffId] || f.staffId
          }));

          return { dept, salaryRows, allFines: monthFinesFiltered, allStaff };
        } catch (e) {
          console.error(`Error loading dept ${dept}:`, e);
          return { dept, salaryRows: [], allFines: [], allStaff: [] };
        }
      }));

      const allSalaryRows = results.flatMap(r => r.salaryRows);
      const allFines = results.flatMap(r => r.allFines);
      const allStaff = results.flatMap(r => r.allStaff);

      setData({
        byDept: Object.fromEntries(results.map(r => [r.dept, r])),
        allSalaryRows,
        allFines,
        allStaff,
        totalGross: allSalaryRows.reduce((s, r) => s + r.gross, 0),
        totalNet: allSalaryRows.reduce((s, r) => s + r.netPayable, 0),
        totalAdditions: allSalaryRows.reduce((s, r) => s + r.totalCustomAdditions, 0),
        totalSecurityFees: allSalaryRows.reduce((s, r) => s + r.securityFee, 0),
        totalDeductions: allSalaryRows.reduce((s, r) => s + r.deductions, 0),
        totalAbsentDeductions: allSalaryRows.reduce((s, r) => s + r.totalAbsentDeduction, 0),
        totalFinesAmount: allFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0),
        totalAdvancesAmount: allSalaryRows.reduce((s, r) => s + r.totalAdvance, 0),
        monthLabel: `${MONTHS[selectedMonth]} ${selectedYear}`,
      });
    } catch (err: any) {
      console.error('Payroll load error:', err);
    } finally {
      setLoading(false);
    }
  }, [monthStr, monthDays, currentMonthStr, todayStr, today, selectedMonth, selectedYear]);

  // Auto-load on mount & month/year change
  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !['manager', 'superadmin'].includes(session.role)) {
      router.push('/hq/login');
      return;
    }
    handleLoad();
  }, [session, sessionLoading, router, handleLoad]);

  // Customization Form Handler
  const openCustomizeModal = (staffRow: any) => {
    const adj = staffRow.customAdj || {};
    setCustomizeModalStaff(staffRow);
    setCustomizeForm({
      remainingBalance: adj.remainingBalance ? String(adj.remainingBalance) : '',
      bonus: adj.bonus ? String(adj.bonus) : '',
      allowance: adj.allowance ? String(adj.allowance) : '',
      securityFee: adj.securityFee ? String(adj.securityFee) : '',
      previousAdvance: adj.previousAdvance ? String(adj.previousAdvance) : (staffRow.totalAdvance ? String(staffRow.totalAdvance) : ''),
      notes: adj.notes || '',
      customAdditions: adj.customAdditions ? adj.customAdditions.map((ca: any) => ({
        id: ca.id || String(Math.random()),
        label: ca.label || '',
        amount: String(ca.amount || '')
      })) : [],
      customDeductions: adj.customDeductions ? adj.customDeductions.map((cd: any) => ({
        id: cd.id || String(Math.random()),
        label: cd.label || '',
        amount: String(cd.amount || '')
      })) : [],
    });
  };

  const handleSaveCustomization = async () => {
    if (!customizeModalStaff) return;
    try {
      setSavingCustomization(true);
      const prefix = getDeptPrefix(customizeModalStaff.dept as StaffDept);
      const docId = `${customizeModalStaff.id}_${monthStr}`;
      const adjRef = doc(db, `${prefix}_salary_adjustments`, docId);

      const parsedAdditions = customizeForm.customAdditions
        .filter(ca => ca.label.trim() && Number(ca.amount) > 0)
        .map(ca => ({ id: ca.id, label: ca.label.trim(), amount: Number(ca.amount) }));

      const parsedDeductions = customizeForm.customDeductions
        .filter(cd => cd.label.trim() && Number(cd.amount) > 0)
        .map(cd => ({ id: cd.id, label: cd.label.trim(), amount: Number(cd.amount) }));

      const remainingBalNum = Number(customizeForm.remainingBalance) || 0;
      const bonusNum = Number(customizeForm.bonus) || 0;
      const allowanceNum = Number(customizeForm.allowance) || 0;
      const secFeeNum = Number(customizeForm.securityFee) || 0;
      const prevAdvNum = Number(customizeForm.previousAdvance) || 0;

      // 1. Save salary adjustment doc
      await setDoc(adjRef, {
        staffId: customizeModalStaff.id,
        staffName: customizeModalStaff.name,
        dept: customizeModalStaff.dept,
        month: monthStr,
        remainingBalance: remainingBalNum,
        bonus: bonusNum,
        allowance: allowanceNum,
        securityFee: secFeeNum,
        previousAdvance: prevAdvNum,
        customAdditions: parsedAdditions,
        customDeductions: parsedDeductions,
        notes: customizeForm.notes.trim(),
        updatedBy: session?.name || session?.customId || 'Manager',
        updatedAt: Timestamp.now(),
      }, { merge: true });

      // 2. ALSO save & sync to staff member's profile document in Firestore
      const dept = customizeModalStaff.dept as StaffDept;
      const staffCol = dept === 'hq' ? 'hq_users'
        : dept === 'job-center' ? 'jobcenter_users'
        : dept === 'social-media' ? 'media_users'
        : `${prefix}_users`;

      const staffDocRef = doc(db, staffCol, customizeModalStaff.id);
      
      // Calculate net salary for this customization
      const baseEarned = customizeModalStaff.earnings || 0;
      const totalCustomAdd = remainingBalNum + bonusNum + allowanceNum + parsedAdditions.reduce((s, a) => s + a.amount, 0);
      const totalCustomDed = secFeeNum + parsedDeductions.reduce((s, d) => s + d.amount, 0);
      const totalDed = (customizeModalStaff.totalAbsentDeduction || 0) + (customizeModalStaff.totalFines || 0) + Math.max(customizeModalStaff.totalAdvance || 0, prevAdvNum) + totalCustomDed;
      const calcNetPayable = Math.floor((baseEarned + totalCustomAdd) - totalDed);

      const outstandingDebt = calcNetPayable < 0 ? Math.abs(calcNetPayable) : (prevAdvNum > 0 ? prevAdvNum : (customizeModalStaff.totalAdvance || 0));

      await updateDoc(staffDocRef, {
        advance: outstandingDebt,
        advanceSalary: outstandingDebt,
        monthlyAdvance: outstandingDebt,
        salaryBalance: calcNetPayable,
        outstandingBalance: calcNetPayable < 0 ? Math.abs(calcNetPayable) : 0,
        remainingBalance: remainingBalNum,
        securityFeeDeduction: secFeeNum,
        lastPayrollMonth: monthStr,
        updatedAt: Timestamp.now(),
      }).catch(e => console.error('Failed updating staff profile doc:', e));

      setCustomizeModalStaff(null);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to save salary customization: ' + err.message);
    } finally {
      setSavingCustomization(false);
    }
  };

  const handleAddFine = async () => {
    if (!fineForm.dept || !fineForm.staffId || !fineForm.amount || !fineForm.reason) {
      alert('Department, staff, amount and reason are all required.');
      return;
    }
    try {
      setSavingFine(true);
      const prefix = getDeptPrefix(fineForm.dept as StaffDept);
      await addDoc(collection(db, `${prefix}_fines`), {
        staffId: fineForm.staffId,
        amount: Number(fineForm.amount),
        reason: fineForm.reason.trim(),
        date: fineForm.date || monthStr,
        month: fineForm.date ? fineForm.date.substring(0, 7) : monthStr,
        recordedBy: session?.name || session?.customId || 'Manager',
        createdAt: Timestamp.now(),
      });
      setFineForm({ dept: '', staffId: '', amount: '', reason: '', date: '' });
      setShowFineForm(false);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to save fine: ' + err.message);
    } finally {
      setSavingFine(false);
    }
  };

  const handleDeleteFine = async (fine: any) => {
    if (!confirm('Delete this fine? This cannot be undone.')) return;
    try {
      setDeletingId(fine.id);
      const prefix = getDeptPrefix(fine.dept as StaffDept);
      await deleteDoc(doc(db, `${prefix}_fines`, fine.id));
      await handleLoad();
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => window.print();
  const handleDownload = async () => {
    if (!printRef.current) return;
    await downloadElementAsPng(printRef.current, `hq-payroll-all-depts-${monthStr}.png`, {
      scale: 2, backgroundColor: '#ffffff', style: { width: '1400px', maxWidth: 'none' }
    });
  };

  // Filtered salary rows
  const salaryRows = data?.allSalaryRows?.filter((r: any) =>
    deptFilter === 'all' || r.dept === deptFilter
  ) || [];

  const filteredTotalGross = salaryRows.reduce((s: number, r: any) => s + r.gross, 0);
  const filteredTotalNet = salaryRows.reduce((s: number, r: any) => s + r.netPayable, 0);
  const filteredTotalAdditions = salaryRows.reduce((s: number, r: any) => s + r.totalCustomAdditions, 0);
  const filteredTotalDeductions = salaryRows.reduce((s: number, r: any) => s + r.deductions, 0);
  const filteredTotalAdvances = salaryRows.reduce((s: number, r: any) => s + r.totalAdvance, 0);

  // Filtered fines
  const filteredFines = data?.allFines?.filter((f: any) => {
    if (fineDeptFilter !== 'all' && f.dept !== fineDeptFilter) return false;
    if (fineStaffFilter !== 'all' && f.staffId !== fineStaffFilter) return false;
    return true;
  }) || [];
  const filteredFinesTotal = filteredFines.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

  // Staff for fine dept filter
  const staffForFineDept = fineForm.dept
    ? (data?.allStaff?.filter((s: any) => s.dept === fineForm.dept) || [])
    : [];

  const availableFineDepts = data ? ALL_DEPTS.filter(d => (data.byDept[d]?.allStaff?.length || 0) > 0) : [];

  if (sessionLoading || (loading && !data)) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
        <p className="text-sm font-bold text-gray-600">Loading All-Department Payroll & Custom Adjustments...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-black">
      <style>{`
        @media print {
          aside, header, .no-print, .pointer-events-none { display: none !important; }
          html, body, div[class*="min-h-screen"], div[class*="lg:ml-"], main, div[class*="max-w-"] {
            margin: 0 !important; padding: 0 !important; min-height: 0 !important;
            height: auto !important; background: white !important; box-shadow: none !important;
            width: 100% !important; max-width: 100% !important;
          }
          .overflow-x-auto { overflow: visible !important; }
          #hq-payroll-print { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 24px !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-6 h-6 text-emerald-600" /> All-Department Payroll & Custom Adjustments
            </h1>
            <p className="text-sm text-gray-500 mt-1">Customize salary, add remaining arrears, deduct security fee, manage negative salary balances, and track staff advances</p>
          </div>
          {data && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleDownload} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                <Download className="w-4 h-4" /> Download Image
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 no-print">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-500" /> Select Month</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
              <input
                type="number" value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                min={2020} max={2100}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
              />
            </div>
            <button
              onClick={handleLoad} disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Refresh Payroll
            </button>
          </div>
        </div>

        {/* Report Area */}
        {data && (
          <div id="hq-payroll-print" ref={printRef} className="space-y-6">

            {/* Print Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <h2 className="text-xl font-black text-gray-900">Khan Hub — All Departments Payroll Report</h2>
              <p className="text-base font-bold text-emerald-700 mt-1">{data.monthLabel}</p>
              <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* Grand Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Staff</div>
                <div className="text-2xl font-black text-gray-900">{data.allSalaryRows.length}</div>
              </div>
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Gross Base</div>
                <div className="text-sm font-black text-teal-800">{formatPKR(data.totalGross)}</div>
              </div>
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Additions (Rem/Bonus)</div>
                <div className="text-sm font-black text-green-800">+{formatPKR(data.totalAdditions)}</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Total Advances</div>
                <div className="text-sm font-black text-amber-800">{formatPKR(data.totalAdvancesAmount)}</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Total Deductions</div>
                <div className="text-sm font-black text-red-700">{formatPKR(data.totalDeductions)}</div>
              </div>
              <div className={`p-4 rounded-2xl text-center shadow-sm col-span-2 sm:col-span-1 border ${data.totalNet < 0 ? 'bg-rose-100 border-rose-300' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${data.totalNet < 0 ? 'text-rose-800' : 'text-emerald-700'}`}>Total Net Payout</div>
                <div className={`text-base font-black ${data.totalNet < 0 ? 'text-rose-900 font-extrabold' : 'text-emerald-900'}`}>{formatPKR(data.totalNet)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-2xl border border-gray-100 p-1 w-full no-print">
              <button onClick={() => setTab('salary')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'salary' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Salary Sheet ({data.allSalaryRows.length} staff)
              </button>
              <button onClick={() => setTab('fines')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'fines' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Fines Ledger ({data.allFines.length} fines)
              </button>
            </div>

            {/* ── SALARY SHEET ── */}
            {tab === 'salary' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">

                {/* Dept filter & helper note */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase">Filter by Dept:</span>
                    {['all', ...availableFineDepts].map(d => (
                      <button
                        key={d}
                        onClick={() => setDeptFilter(d)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${deptFilter === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {d === 'all' ? 'All Departments' : DEPT_LABELS[d] || d}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Negative Net Salary (e.g. -Rs. 5,000) shows in red and syncs to staff profile!
                  </div>
                </div>

                {/* Filtered summary */}
                {deptFilter !== 'all' && (
                  <div className="grid grid-cols-5 gap-3">
                    <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-teal-600 mb-0.5">Gross Base</div>
                      <div className="text-sm font-black text-teal-800">{formatPKR(filteredTotalGross)}</div>
                    </div>
                    <div className="bg-green-50 border border-green-100 p-3 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-green-600 mb-0.5">Total Additions</div>
                      <div className="text-sm font-black text-green-800">+{formatPKR(filteredTotalAdditions)}</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-amber-600 mb-0.5">Total Advances</div>
                      <div className="text-sm font-black text-amber-800">{formatPKR(filteredTotalAdvances)}</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-red-500 mb-0.5">Total Deductions</div>
                      <div className="text-sm font-black text-red-700">{formatPKR(filteredTotalDeductions)}</div>
                    </div>
                    <div className={`p-3 rounded-xl text-center border ${filteredTotalNet < 0 ? 'bg-rose-100 border-rose-300' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className={`text-[10px] font-bold mb-0.5 ${filteredTotalNet < 0 ? 'text-rose-800' : 'text-emerald-700'}`}>Net Salary to Pay</div>
                      <div className={`text-sm font-black ${filteredTotalNet < 0 ? 'text-rose-900' : 'text-emerald-900'}`}>{formatPKR(filteredTotalNet)}</div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse min-w-[1100px]">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-bold text-emerald-900 border-b border-gray-200">#</th>
                        <th className="px-3 py-3 text-left font-bold text-emerald-900 border-b border-gray-200">Staff Member</th>
                        <th className="px-3 py-3 text-left font-bold text-emerald-900 border-b border-gray-200">Dept</th>
                        <th className="px-3 py-3 text-right font-bold text-emerald-900 border-b border-gray-200">Gross Salary</th>
                        <th className="px-3 py-3 text-center font-bold text-emerald-900 border-b border-gray-200">Earned Days</th>
                        <th className="px-3 py-3 text-right font-bold text-green-800 border-b border-gray-200 bg-green-50/80">Additions (+)</th>
                        <th className="px-3 py-3 text-right font-bold text-emerald-900 border-b border-gray-200">Absent Ded.</th>
                        <th className="px-3 py-3 text-right font-bold text-emerald-900 border-b border-gray-200">Fine Ded.</th>
                        <th className="px-3 py-3 text-right font-bold text-amber-800 border-b border-gray-200 bg-amber-50/70">Advance Ded.</th>
                        <th className="px-3 py-3 text-right font-bold text-rose-800 border-b border-gray-200 bg-rose-50/70">Security / Custom Ded.</th>
                        <th className="px-3 py-3 text-right font-bold text-emerald-900 border-b border-gray-200 bg-emerald-100/70">Net Salary To Pay</th>
                        <th className="px-2.5 py-3 text-center font-bold text-emerald-900 border-b border-gray-200 no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRows.length === 0 ? (
                        <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">No staff found for selected department.</td></tr>
                      ) : salaryRows.map((r: any, i: number) => (
                        <tr
                          key={`${r.dept}-${r.id}`}
                          onClick={() => setSelectedStaffModal(r)}
                          className="hover:bg-emerald-50/60 transition-colors border-b border-gray-100 cursor-pointer group"
                        >
                          <td className="px-3 py-3.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-3 py-3.5 font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            <div>{r.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{r.designation}</div>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DEPT_COLORS[r.dept] || 'bg-gray-100 text-gray-600'}`}>
                              {DEPT_LABELS[r.dept] || r.dept}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-right font-medium text-gray-700">{formatPKR(r.gross)}</td>
                          <td className="px-3 py-3.5 text-center">
                            <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {r.payableDays} Days ({formatPKR(r.earnings)})
                            </span>
                          </td>

                          {/* Custom Additions Column */}
                          <td className="px-3 py-3.5 text-right font-bold text-green-700 text-xs bg-green-50/40">
                            {r.totalCustomAdditions > 0 ? (
                              <div className="space-y-0.5">
                                <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200">
                                  +{formatPKR(r.totalCustomAdditions)}
                                </span>
                                {r.remainingBalance > 0 && (
                                  <div className="text-[9px] text-green-600">Arrears: {formatPKR(r.remainingBalance)}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3.5 text-right text-orange-600 font-medium text-xs">
                            {r.totalAbsentDeduction > 0 ? `${formatPKR(r.totalAbsentDeduction)} (${r.absentDays}d)` : '—'}
                          </td>
                          <td className="px-3 py-3.5 text-right text-red-600 font-medium text-xs">
                            {r.totalFines > 0 ? formatPKR(r.totalFines) : '—'}
                          </td>
                          <td className="px-3 py-3.5 text-right text-amber-700 font-bold text-xs bg-amber-50/40">
                            {r.totalAdvance > 0 ? formatPKR(r.totalAdvance) : '—'}
                          </td>

                          {/* Security & Custom Deductions Column */}
                          <td className="px-3 py-3.5 text-right text-rose-700 font-bold text-xs bg-rose-50/40">
                            {r.totalCustomDeductions > 0 ? (
                              <div className="space-y-0.5">
                                <span className="inline-block bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                                  -{formatPKR(r.totalCustomDeductions)}
                                </span>
                                {r.securityFee > 0 && (
                                  <div className="text-[9px] text-rose-600">Security: {formatPKR(r.securityFee)}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Net Salary To Pay Column (Shows Negative in Red/Rose!) */}
                          <td className="px-3 py-3.5 text-right font-black transition-colors">
                            <span className={`inline-block px-2.5 py-1 rounded-lg border ${
                              r.netPayable < 0
                                ? 'bg-rose-100 text-rose-900 border-rose-300 font-black animate-pulse'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {formatPKR(r.netPayable)}
                            </span>
                            {r.netPayable < 0 && (
                              <div className="text-[9px] text-rose-600 font-bold mt-0.5">Advance Debt</div>
                            )}
                          </td>

                          <td className="px-2.5 py-3.5 text-center no-print">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openCustomizeModal(r); }}
                                className="p-1.5 bg-emerald-100 hover:bg-emerald-600 hover:text-white rounded-lg text-emerald-700 transition-colors flex items-center gap-1 text-xs font-bold px-2 py-1"
                                title="Customize salary (Add remaining balance, security fee, advance, etc.)"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" /> Edit
                              </button>

                              {r.netPayable < 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); syncStaffProfileBalance(r); }}
                                  disabled={syncingProfileId === r.id}
                                  className="p-1.5 bg-rose-100 hover:bg-rose-600 hover:text-white rounded-lg text-rose-700 transition-colors flex items-center gap-1 text-xs font-bold px-2 py-1 disabled:opacity-50"
                                  title="Sync negative advance debt to staff profile document in Firestore"
                                >
                                  {syncingProfileId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                  Sync Profile
                                </button>
                              )}

                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedStaffModal(r); }}
                                className="p-1.5 bg-gray-100 hover:bg-gray-700 hover:text-white rounded-lg text-gray-500 transition-colors"
                                title="Click to view date-wise deduction breakdown"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {salaryRows.length > 0 && (
                        <tr className="bg-emerald-50 font-black text-xs">
                          <td colSpan={3} className="px-3.5 py-3.5 text-emerald-900 uppercase tracking-wider">
                            TOTAL ({salaryRows.length} STAFF MEMBERS)
                          </td>
                          <td className="px-3.5 py-3.5 text-right text-emerald-900">{formatPKR(filteredTotalGross)}</td>
                          <td />
                          <td className="px-3.5 py-3.5 text-right text-green-800 bg-green-100/60">+{formatPKR(filteredTotalAdditions)}</td>
                          <td colSpan={2} />
                          <td className="px-3.5 py-3.5 text-right text-amber-800 bg-amber-100/60">{formatPKR(filteredTotalAdvances)}</td>
                          <td className="px-3.5 py-3.5 text-right text-red-700">{formatPKR(filteredTotalDeductions)}</td>
                          <td className={`px-3.5 py-3.5 text-right font-black text-sm ${filteredTotalNet < 0 ? 'text-rose-900 bg-rose-100' : 'text-emerald-950 bg-emerald-100/90'}`}>{formatPKR(filteredTotalNet)}</td>
                          <td className="no-print" />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── FINES LEDGER ── */}
            {tab === 'fines' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={fineDeptFilter}
                      onChange={e => { setFineDeptFilter(e.target.value); setFineStaffFilter('all'); }}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                    >
                      <option value="all">All Departments</option>
                      {availableFineDepts.map(d => <option key={d} value={d}>{DEPT_LABELS[d] || d}</option>)}
                    </select>
                    <select
                      value={fineStaffFilter}
                      onChange={e => setFineStaffFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                    >
                      <option value="all">All Staff</option>
                      {(fineDeptFilter === 'all' ? data.allStaff : data.byDept[fineDeptFilter]?.allStaff || []).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name || s.displayName}</option>
                      ))}
                    </select>
                    <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm font-bold text-red-700">
                      Total: {formatPKR(filteredFinesTotal)} ({filteredFines.length} fines)
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFineForm(v => !v)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Fine
                  </button>
                </div>

                {/* Add Fine Form */}
                {showFineForm && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 no-print">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-emerald-800 flex items-center gap-2"><Receipt className="w-4 h-4" /> Add New Fine</h3>
                      <button onClick={() => setShowFineForm(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Department *</label>
                        <select
                          value={fineForm.dept}
                          onChange={e => setFineForm(p => ({ ...p, dept: e.target.value, staffId: '' }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        >
                          <option value="">Select dept...</option>
                          {availableFineDepts.map(d => <option key={d} value={d}>{DEPT_LABELS[d] || d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Staff Member *</label>
                        <select
                          value={fineForm.staffId}
                          onChange={e => setFineForm(p => ({ ...p, staffId: e.target.value }))}
                          disabled={!fineForm.dept}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold disabled:opacity-50"
                        >
                          <option value="">Select staff...</option>
                          {staffForFineDept.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name || s.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Amount (PKR) *</label>
                        <input
                          type="number" value={fineForm.amount}
                          onChange={e => setFineForm(p => ({ ...p, amount: e.target.value }))}
                          placeholder="e.g. 500"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date</label>
                        <input
                          type="date" value={fineForm.date}
                          onChange={e => setFineForm(p => ({ ...p, date: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Reason *</label>
                        <input
                          type="text" value={fineForm.reason}
                          onChange={e => setFineForm(p => ({ ...p, reason: e.target.value }))}
                          placeholder="e.g. Late arrival, misconduct, uniform violation..."
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddFine} disabled={savingFine}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {savingFine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save Fine
                    </button>
                  </div>
                )}

                {/* Fines Table */}
                {filteredFines.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium">
                    No fines recorded for {data.monthLabel}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm border-collapse min-w-[700px]">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">#</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Staff Member</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Dept</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Date</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Reason</th>
                          <th className="px-4 py-3 text-right font-bold text-red-800 border-b border-gray-200">Amount</th>
                          <th className="px-4 py-3 text-left font-bold text-red-800 border-b border-gray-200">Recorded By</th>
                          <th className="px-4 py-3 border-b border-gray-200 no-print" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFines.map((f: any, i: number) => (
                          <tr key={f.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{f.staffName}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DEPT_COLORS[f.dept] || 'bg-gray-100 text-gray-600'}`}>
                                {DEPT_LABELS[f.dept] || f.dept}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{f.date || f.month || '—'}</td>
                            <td className="px-4 py-3 text-gray-700 max-w-[180px]">{f.reason || '—'}</td>
                            <td className="px-4 py-3 text-right font-black text-red-700">{formatPKR(Number(f.amount || 0))}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs font-mono">{f.recordedBy || '—'}</td>
                            <td className="px-4 py-3 no-print">
                              <button
                                onClick={() => handleDeleteFine(f)}
                                disabled={deletingId === f.id}
                                className="text-red-400 hover:text-red-700 transition-colors disabled:opacity-40"
                                title="Delete fine"
                              >
                                {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-red-50 font-black">
                          <td colSpan={5} className="px-4 py-3 text-red-800">Total Fines ({filteredFines.length})</td>
                          <td className="px-4 py-3 text-right text-red-800">{formatPKR(filteredFinesTotal)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SALARY CUSTOMIZATION MODAL ── */}
      {customizeModalStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden my-8 transform transition-all">
            
            {/* Modal Header */}
            <div className="bg-emerald-800 text-white p-6 relative">
              <button
                onClick={() => setCustomizeModalStaff(null)}
                className="absolute top-5 right-5 text-emerald-200 hover:text-white bg-emerald-900/50 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal className="w-4 h-4 text-emerald-300" />
                <span className="text-xs text-emerald-200 uppercase tracking-wider font-bold">Salary Customization</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">{customizeModalStaff.name}</h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                {customizeModalStaff.designation} • Dept: {DEPT_LABELS[customizeModalStaff.dept] || customizeModalStaff.dept} ({data?.monthLabel})
              </p>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

              {/* Base Salary Reference Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-500 font-bold">Gross Base Salary: </span>
                  <span className="font-black text-gray-900">{formatPKR(customizeModalStaff.gross)}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold">Base Days Earned: </span>
                  <span className="font-black text-emerald-800">{customizeModalStaff.payableDays} Days ({formatPKR(customizeModalStaff.earnings)})</span>
                </div>
              </div>

              {/* Section 1: Additions (+) */}
              <div className="space-y-3 bg-green-50/50 border border-green-100 rounded-2xl p-4">
                <h3 className="font-bold text-green-900 text-sm flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-green-600" /> Custom Salary Additions (+)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Remaining Balance / Arrears
                    </label>
                    <input
                      type="number"
                      value={customizeForm.remainingBalance}
                      onChange={e => setCustomizeForm(p => ({ ...p, remainingBalance: e.target.value }))}
                      placeholder="e.g. 2500"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 font-bold text-black"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Previous unpaid balance</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Performance Bonus
                    </label>
                    <input
                      type="number"
                      value={customizeForm.bonus}
                      onChange={e => setCustomizeForm(p => ({ ...p, bonus: e.target.value }))}
                      placeholder="e.g. 1000"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 font-bold text-black"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Reward / Incentive</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Allowance / Overtime
                    </label>
                    <input
                      type="number"
                      value={customizeForm.allowance}
                      onChange={e => setCustomizeForm(p => ({ ...p, allowance: e.target.value }))}
                      placeholder="e.g. 1500"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 font-bold text-black"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Special allowance</span>
                  </div>
                </div>

                {/* Additional Custom Addition Items */}
                {customizeForm.customAdditions.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-200">
                    <input
                      type="text"
                      placeholder="Reason / Label (e.g. Mobile Allowance)"
                      value={item.label}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomizeForm(p => ({
                          ...p,
                          customAdditions: p.customAdditions.map((ca, i) => i === idx ? { ...ca, label: val } : ca)
                        }));
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-black"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomizeForm(p => ({
                          ...p,
                          customAdditions: p.customAdditions.map((ca, i) => i === idx ? { ...ca, amount: val } : ca)
                        }));
                      }}
                      className="w-28 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-black"
                    />
                    <button
                      onClick={() => setCustomizeForm(p => ({
                        ...p,
                        customAdditions: p.customAdditions.filter((_, i) => i !== idx)
                      }))}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomizeForm(p => ({
                    ...p,
                    customAdditions: [...p.customAdditions, { id: String(Math.random()), label: '', amount: '' }]
                  }))}
                  className="text-xs font-bold text-green-700 hover:text-green-900 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Extra Addition Item
                </button>
              </div>

              {/* Section 2: Deductions (-) */}
              <div className="space-y-3 bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                  <MinusCircle className="w-4 h-4 text-rose-600" /> Custom Salary Deductions (-)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Security Fee Deduction
                    </label>
                    <input
                      type="number"
                      value={customizeForm.securityFee}
                      onChange={e => setCustomizeForm(p => ({ ...p, securityFee: e.target.value }))}
                      placeholder="e.g. 1000"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 font-bold text-black"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Staff security deposit fee</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Previous Advance Salary Adjustment
                    </label>
                    <input
                      type="number"
                      value={customizeForm.previousAdvance}
                      onChange={e => setCustomizeForm(p => ({ ...p, previousAdvance: e.target.value }))}
                      placeholder="e.g. 3000"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 font-bold text-black"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Advance salary taken before</span>
                  </div>
                </div>

                {/* Additional Custom Deduction Items */}
                {customizeForm.customDeductions.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-200">
                    <input
                      type="text"
                      placeholder="Reason / Label (e.g. Equipment Damage, Uniform)"
                      value={item.label}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomizeForm(p => ({
                          ...p,
                          customDeductions: p.customDeductions.map((cd, i) => i === idx ? { ...cd, label: val } : cd)
                        }));
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-black"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomizeForm(p => ({
                          ...p,
                          customDeductions: p.customDeductions.map((cd, i) => i === idx ? { ...cd, amount: val } : cd)
                        }));
                      }}
                      className="w-28 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-black"
                    />
                    <button
                      onClick={() => setCustomizeForm(p => ({
                        ...p,
                        customDeductions: p.customDeductions.filter((_, i) => i !== idx)
                      }))}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomizeForm(p => ({
                    ...p,
                    customDeductions: [...p.customDeductions, { id: String(Math.random()), label: '', amount: '' }]
                  }))}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Extra Deduction Item
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Customization Notes / Reason
                </label>
                <textarea
                  rows={2}
                  value={customizeForm.notes}
                  onChange={e => setCustomizeForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes explaining why salary additions/deductions were customized for this staff member..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setCustomizeModalStaff(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomization}
                disabled={savingCustomization}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-60"
              >
                {savingCustomization ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Sync to Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── STAFF DEDUCTION & PAYOUT BREAKDOWN MODAL ── */}
      {selectedStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden my-8 transform transition-all">
            
            {/* Modal Header */}
            <div className={`p-6 relative text-white ${selectedStaffModal.netPayable < 0 ? 'bg-rose-900' : 'bg-emerald-800'}`}>
              <button
                onClick={() => setSelectedStaffModal(null)}
                className="absolute top-5 right-5 text-emerald-200 hover:text-white bg-black/30 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-white/10 text-white border-white/20`}>
                  {DEPT_LABELS[selectedStaffModal.dept] || selectedStaffModal.dept}
                </span>
                <span className="text-xs text-white/80">{data?.monthLabel}</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">{selectedStaffModal.name}</h2>
              <p className="text-xs text-white/80 mt-0.5">{selectedStaffModal.designation}</p>
            </div>

            <div className="p-6 space-y-6">

              {/* Negative Salary Warning Alert Banner if netPayable < 0 */}
              {selectedStaffModal.netPayable < 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-900">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-extrabold text-sm">Negative Net Salary ({formatPKR(selectedStaffModal.netPayable)})</div>
                      <div className="text-xs text-rose-700">Total advances and deductions exceed earned salary by {formatPKR(Math.abs(selectedStaffModal.netPayable))}.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => syncStaffProfileBalance(selectedStaffModal)}
                    disabled={syncingProfileId === selectedStaffModal.id}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    {syncingProfileId === selectedStaffModal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync Debt to Profile
                  </button>
                </div>
              )}

              {/* Salary Summary Cards matching Staff Profile */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Base Salary</div>
                  <div className="text-xs font-black text-gray-900">{formatPKR(selectedStaffModal.gross)}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Daily: {formatPKR(selectedStaffModal.dailyRate)}</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Earned Days</div>
                  <div className="text-xs font-black text-emerald-800">{selectedStaffModal.payableDays} Days</div>
                  <div className="text-[9px] text-emerald-600 mt-0.5">+{formatPKR(selectedStaffModal.earnings)}</div>
                </div>

                <div className="bg-green-50 border border-green-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-green-700 uppercase tracking-wider mb-0.5">Additions</div>
                  <div className="text-xs font-black text-green-800">+{formatPKR(selectedStaffModal.totalCustomAdditions)}</div>
                  <div className="text-[9px] text-green-600 mt-0.5">Rem / Bonus</div>
                </div>

                <div className="bg-red-50 border border-red-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-0.5">Fines Ded.</div>
                  <div className="text-xs font-black text-red-700">{formatPKR(selectedStaffModal.totalFines)}</div>
                  <div className="text-[9px] text-red-500 mt-0.5">{selectedStaffModal.staffFines?.length || 0} fines</div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Advance Ded.</div>
                  <div className="text-xs font-black text-amber-800">{formatPKR(selectedStaffModal.totalAdvance)}</div>
                  <div className="text-[9px] text-amber-600 mt-0.5">Salary Advance</div>
                </div>

                <div className={`p-2.5 rounded-2xl text-center col-span-2 sm:col-span-1 border ${selectedStaffModal.netPayable < 0 ? 'bg-rose-100 border-rose-300' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${selectedStaffModal.netPayable < 0 ? 'text-rose-800' : 'text-emerald-700'}`}>Net To Pay</div>
                  <div className={`text-xs font-black ${selectedStaffModal.netPayable < 0 ? 'text-rose-900 font-extrabold' : 'text-emerald-900'}`}>{formatPKR(selectedStaffModal.netPayable)}</div>
                  <div className={`text-[9px] font-bold mt-0.5 ${selectedStaffModal.netPayable < 0 ? 'text-rose-700' : 'text-emerald-600'}`}>{selectedStaffModal.netPayable < 0 ? 'Advance Debt' : 'Final Payout'}</div>
                </div>
              </div>

              {/* Customization Notes if any */}
              {selectedStaffModal.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <span className="font-bold">Manager Customization Note: </span>
                  {selectedStaffModal.notes}
                </div>
              )}

              {/* Date-wise Itemized Deduction & Addition Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Itemized Salary Breakdown & History
                  </h3>
                  <span className="text-xs font-bold text-gray-400">
                    {selectedStaffModal.breakdownItems.length} total items
                  </span>
                </div>

                {selectedStaffModal.breakdownItems.length === 0 ? (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center text-emerald-800 space-y-1">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                    <p className="font-bold text-sm">Standard Full Payout!</p>
                    <p className="text-xs text-emerald-600">
                      This staff member has zero absences, zero fines, and zero advance salary taken for {data?.monthLabel}. Full base salary of {formatPKR(selectedStaffModal.gross)} will be paid.
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600">Date</th>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600">Item Type</th>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600">Reason / Description</th>
                          <th className="px-3.5 py-2.5 font-bold text-gray-600 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedStaffModal.breakdownItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50/80">
                            <td className="px-3.5 py-3 font-mono font-bold text-gray-800 whitespace-nowrap">
                              {item.date}
                            </td>
                            <td className="px-3.5 py-3">
                              {item.category === 'addition' ? (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  + Addition ({item.type})
                                </span>
                              ) : item.type === 'absent' ? (
                                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  Absent Deduction
                                </span>
                              ) : item.type === 'fine' ? (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  Fine Deduction
                                </span>
                              ) : item.type === 'security' ? (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  Security Fee
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  <CreditCard className="w-3 h-3" /> Advance Salary
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-gray-700">
                              <div>{item.reason}</div>
                              {item.recordedBy && (
                                <div className="text-[10px] text-gray-400 mt-0.5">By: {item.recordedBy}</div>
                              )}
                            </td>
                            <td className={`px-3.5 py-3 text-right font-bold whitespace-nowrap ${item.category === 'addition' ? 'text-green-700' : 'text-red-600'}`}>
                              {item.category === 'addition' ? '+' : '-'}{formatPKR(item.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className={`font-black ${selectedStaffModal.netPayable < 0 ? 'bg-rose-50' : 'bg-emerald-50/60'}`}>
                          <td colSpan={3} className={`px-3.5 py-2.5 ${selectedStaffModal.netPayable < 0 ? 'text-rose-900' : 'text-emerald-950'}`}>NET PAYOUT AFTER ALL DEDUCTIONS & ADDITIONS</td>
                          <td className={`px-3.5 py-2.5 text-right ${selectedStaffModal.netPayable < 0 ? 'text-rose-900 font-black' : 'text-emerald-900'}`}>{formatPKR(selectedStaffModal.netPayable)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Net Payout Summary Banner in Modal */}
              <div className={`rounded-2xl p-4 flex items-center justify-between text-white ${selectedStaffModal.netPayable < 0 ? 'bg-rose-900' : 'bg-emerald-900'}`}>
                <div>
                  <div className="text-[11px] font-medium text-white/80">
                    {selectedStaffModal.netPayable < 0 ? 'Outstanding Advance Balance (Staff Owes Hub)' : 'Final Money To Pay Staff'}
                  </div>
                  <div className="text-xs text-white/70">(Base Earned + Additions) - Total Deductions</div>
                </div>
                <div className="text-2xl font-black text-white">
                  {formatPKR(selectedStaffModal.netPayable)}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedStaffModal(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { const s = selectedStaffModal; setSelectedStaffModal(null); openCustomizeModal(s); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded-xl text-xs transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Customize Salary
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
