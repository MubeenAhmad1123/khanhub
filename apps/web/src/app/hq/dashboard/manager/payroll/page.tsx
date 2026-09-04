'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Save, AlertTriangle, RefreshCw, FileText, Search, CheckCheck,
  EyeOff, UserCheck, Check, ArrowRight, ShieldCheck, Filter, FileSpreadsheet
} from 'lucide-react';
import { SalarySlipPrintable } from '@/components/hq/SalarySlipPrintable';

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

export interface HqHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  scope: 'all' | 'department' | 'staff';
  departments?: StaffDept[];
  staffIds?: string[];
  createdBy?: string;
  createdAt?: any;
}

export default function ManagerPayrollPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [tab, setTab] = useState<'salary' | 'fines' | 'holidays'>('salary');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [fineStaffFilter, setFineStaffFilter] = useState<string>('all');
  const [fineDeptFilter, setFineDeptFilter] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Staff breakdown modal state
  const [selectedStaffModal, setSelectedStaffModal] = useState<any | null>(null);

  // Single staff printable slip modal state
  const [slipStaffModal, setSlipStaffModal] = useState<any | null>(null);
  const [slipPaidDate, setSlipPaidDate] = useState<string>(todayStr);

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

  // Attendance completion and modal state
  const [attendanceModalStaff, setAttendanceModalStaff] = useState<any | null>(null);
  const [attendanceDaysMap, setAttendanceDaysMap] = useState<Record<string, { status: string; reason?: string }>>({});
  const [completingAttendanceId, setCompletingAttendanceId] = useState<string | null>(null);
  const [batchCompletingAttendance, setBatchCompletingAttendance] = useState(false);
  const [savingAttendanceModal, setSavingAttendanceModal] = useState(false);

  // Batch salary generation state
  const [batchGeneratingSalaries, setBatchGeneratingSalaries] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Holiday calendar states
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState<{
    date: string;
    label: string;
    scope: 'all' | 'department' | 'staff';
    departments: StaffDept[];
    staffIds: string[];
  }>({
    date: '',
    label: '',
    scope: 'all',
    departments: [],
    staffIds: [],
  });
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [updatingOffDayId, setUpdatingOffDayId] = useState<string | null>(null);

  // Fine form
  const [showFineForm, setShowFineForm] = useState(false);
  const [fineForm, setFineForm] = useState({ dept: '', staffId: '', amount: '', reason: '', date: '' });
  const [savingFine, setSavingFine] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthDays = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  // Previous month string for calculating carry-forward negative balance (e.g. -3000 debt)
  const prevMonthStr = useMemo(() => {
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
    return `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}`;
  }, [selectedMonth, selectedYear]);

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
      return false;
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

      await updateDoc(staffDocRef, {
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

  // Toggle staff hide status directly
  const handleToggleStaffHide = async (staffRow: any) => {
    try {
      setTogglingStatusId(staffRow.id);
      const prefix = getDeptPrefix(staffRow.dept as StaffDept);
      const dept = staffRow.dept as StaffDept;
      const staffCol = dept === 'hq' ? 'hq_users'
        : dept === 'job-center' ? 'jobcenter_users'
        : dept === 'social-media' ? 'media_users'
        : `${prefix}_users`;

      const newStatus = staffRow.isHidden ? 'active' : 'hide';
      const staffDocRef = doc(db, staffCol, staffRow.id);

      await updateDoc(staffDocRef, {
        status: newStatus,
        isActive: newStatus === 'active',
        updatedAt: Timestamp.now(),
      });

      await handleLoad();
    } catch (err: any) {
      alert('Failed to update staff status: ' + err.message);
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Quick Complete Attendance for a single staff member
  const handleCompleteStaffAttendance = async (staffRow: any) => {
    try {
      setCompletingAttendanceId(staffRow.id);
      const prefix = getDeptPrefix(staffRow.dept as StaffDept);
      const attColName = prefix ? `${prefix}_attendance` : 'attendance';
      const uid = staffRow.staffId || staffRow.id;
      
      const holidaysSnap = await getDocs(collection(db, 'hq_holidays')).catch(() => ({ docs: [] } as any));
      const monthHolidays = holidaysSnap.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as HqHoliday))
        .filter((h) => h.date && h.date.startsWith(monthStr));

      // Mark each day in this month as present unless it is a weekly off or holiday
      const daysToMark = monthDays.filter(dayStr => {
        if (staffRow.joiningDate && dayStr < staffRow.joiningDate) return false;
        const dayOfWeekName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(`${dayStr}T00:00:00`).getDay()];
        const isWeeklyOff = staffRow.weeklyOffDay && staffRow.weeklyOffDay !== 'none' && staffRow.weeklyOffDay === dayOfWeekName;
        const isHoliday = monthHolidays.some(h => 
          h.date === dayStr && 
          (h.scope === 'all' || 
           (h.scope === 'department' && h.departments?.includes(staffRow.dept)) ||
           (h.scope === 'staff' && (h.staffIds?.includes(uid) || h.staffIds?.includes(staffRow.id))))
        );
        return !isWeeklyOff && !isHoliday;
      });

      // Query existing attendance docs for this staff
      const existingAttSnap = await getDocs(query(
        collection(db, attColName),
        where('date', '>=', `${monthStr}-01`),
        where('date', '<=', `${monthStr}-31`)
      )).catch(() => ({ docs: [] } as any));

      const existingMap: Record<string, any> = {};
      existingAttSnap.docs.forEach((d: any) => {
        const dData = d.data();
        const dStaffId = String(dData.staffId || dData.userId || '');
        if (dStaffId === staffRow.id || dStaffId === uid || (prefix && dStaffId === `${prefix}_${staffRow.id}`)) {
          existingMap[dData.date] = { docId: d.id, ...dData };
        }
      });

      await Promise.all(daysToMark.map(async (dateStr) => {
        const existing = existingMap[dateStr];
        if (existing) {
          if (existing.status !== 'present') {
            await updateDoc(doc(db, attColName, existing.docId), {
              status: 'present',
              overriddenBy: session?.name || 'Manager',
              updatedAt: Timestamp.now(),
            });
          }
        } else {
          await addDoc(collection(db, attColName), {
            staffId: staffRow.id,
            staffName: staffRow.name,
            dept: staffRow.dept,
            date: dateStr,
            status: 'present',
            checkInTime: Timestamp.now(),
            recordedBy: session?.name || 'Manager',
            completedByManager: true,
          });
        }
      }));

      alert(`Attendance for ${staffRow.name} marked as 100% Complete for ${monthStr}!`);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to complete attendance: ' + err.message);
    } finally {
      setCompletingAttendanceId(null);
    }
  };

  // Batch Complete Attendance for All Displayed Staff
  const handleBatchCompleteAttendance = async () => {
    if (!data?.allSalaryRows || data.allSalaryRows.length === 0) return;
    const targetRows = deptFilter === 'all' 
      ? data.allSalaryRows 
      : data.allSalaryRows.filter((r: any) => r.dept === deptFilter);

    if (!confirm(`Are you sure you want to complete full attendance as 'Present' for all ${targetRows.length} staff members for ${data.monthLabel}?`)) {
      return;
    }

    try {
      setBatchCompletingAttendance(true);
      for (const r of targetRows) {
        const prefix = getDeptPrefix(r.dept as StaffDept);
        const attColName = prefix ? `${prefix}_attendance` : 'attendance';
        const uid = r.staffId || r.id;

        const daysToMark = monthDays.filter(dayStr => {
          if (r.joiningDate && dayStr < r.joiningDate) return false;
          const dayOfWeekName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(`${dayStr}T00:00:00`).getDay()];
          const isWeeklyOff = r.weeklyOffDay && r.weeklyOffDay !== 'none' && r.weeklyOffDay === dayOfWeekName;
          return !isWeeklyOff;
        });

        // Add attendance docs
        for (const dateStr of daysToMark) {
          const isAlreadyAtt = r.attMapByDate && r.attMapByDate[dateStr]?.status === 'present';
          if (!isAlreadyAtt) {
            await addDoc(collection(db, attColName), {
              staffId: r.id,
              staffName: r.name,
              dept: r.dept,
              date: dateStr,
              status: 'present',
              checkInTime: Timestamp.now(),
              recordedBy: session?.name || 'Manager',
            }).catch(() => {});
          }
        }
      }

      alert(`Batch attendance completed successfully for ${targetRows.length} staff members!`);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to batch complete attendance: ' + err.message);
    } finally {
      setBatchCompletingAttendance(false);
    }
  };

  // Save changes from Attendance Modal
  const handleSaveAttendanceModal = async () => {
    if (!attendanceModalStaff) return;
    try {
      setSavingAttendanceModal(true);
      const prefix = getDeptPrefix(attendanceModalStaff.dept as StaffDept);
      const attColName = prefix ? `${prefix}_attendance` : 'attendance';

      for (const [dateStr, attInfo] of Object.entries(attendanceDaysMap)) {
        if (attInfo.status === 'weekly_off' || attInfo.status === 'unmarked') continue;
        
        await addDoc(collection(db, attColName), {
          staffId: attendanceModalStaff.id,
          staffName: attendanceModalStaff.name,
          dept: attendanceModalStaff.dept,
          date: dateStr,
          status: attInfo.status,
          reason: attInfo.reason || '',
          recordedBy: session?.name || 'Manager',
          updatedAt: Timestamp.now(),
        }).catch(() => {});
      }

      setAttendanceModalStaff(null);
      await handleLoad();
    } catch (err: any) {
      alert('Failed to save attendance edits: ' + err.message);
    } finally {
      setSavingAttendanceModal(false);
    }
  };

  // Batch Generate & Save Salary Slips to Firestore
  const handleGenerateAndSaveAllSalaryRecords = async () => {
    if (!data?.allSalaryRows || data.allSalaryRows.length === 0) return;
    const targetRows = deptFilter === 'all' 
      ? data.allSalaryRows 
      : data.allSalaryRows.filter((r: any) => r.dept === deptFilter);

    if (!confirm(`Generate and save official salary records for ${targetRows.length} staff members for ${data.monthLabel}?`)) {
      return;
    }

    try {
      setBatchGeneratingSalaries(true);
      await Promise.all(targetRows.map(async (r: any) => {
        const prefix = getDeptPrefix(r.dept as StaffDept);
        const salaryCol = `${prefix}_salary_records`;
        const slipId = `${r.id}_${monthStr}`;
        const slipDocRef = doc(db, salaryCol, slipId);

        const slipPayload = {
          staffId: r.id,
          employeeId: r.employeeCode || '',
          staffName: r.name,
          department: r.dept,
          month: monthStr,
          monthLabel: data.monthLabel,
          basicSalary: r.gross,
          dailyWage: r.dailyRate,
          payableDays: r.payableDays,
          earnedSalary: r.earnings,
          absentDays: r.absentDays,
          absentDeduction: r.totalAbsentDeduction,
          totalFines: r.totalFines,
          advance: r.totalAdvance,
          previousMonthDebt: r.previousMonthDebt || 0,
          remainingBalance: r.remainingBalance || 0,
          bonus: r.bonus || 0,
          allowance: r.allowance || 0,
          totalCustomAdditions: r.totalCustomAdditions || 0,
          securityFee: r.securityFee || 0,
          totalCustomDeductions: r.totalCustomDeductions || 0,
          netSalary: r.netPayable,
          status: r.existingSlipStatus || 'approved',
          generatedBy: session?.name || session?.customId || 'Manager',
          updatedAt: Timestamp.now(),
        };

        await setDoc(slipDocRef, slipPayload, { merge: true });

        // Also update staff profile document
        const staffCol = r.dept === 'hq' ? 'hq_users'
          : r.dept === 'job-center' ? 'jobcenter_users'
          : r.dept === 'social-media' ? 'media_users'
          : `${prefix}_users`;

        await updateDoc(doc(db, staffCol, r.id), {
          salaryBalance: r.netPayable,
          outstandingBalance: r.netPayable < 0 ? Math.abs(r.netPayable) : 0,
          lastPayrollMonth: monthStr,
          updatedAt: Timestamp.now(),
        }).catch(() => {});
      }));

      alert(`Successfully generated and saved official salary records for ${targetRows.length} staff members!`);
      await handleLoad();
    } catch (err: any) {
      alert('Failed generating salary records: ' + err.message);
    } finally {
      setBatchGeneratingSalaries(false);
    }
  };

  // Export to CSV spreadsheet
  const handleExportCSV = () => {
    if (!data?.allSalaryRows) return;
    const rows = data.allSalaryRows.filter((r: any) => {
      if (deptFilter !== 'all' && r.dept !== deptFilter) return false;
      if (staffStatusFilter === 'active' && r.isHidden) return false;
      if (staffStatusFilter === 'hidden' && !r.isHidden) return false;
      return true;
    });

    const headers = [
      '#', 'Name', 'Designation', 'Department', 'Status', 'Joining Date',
      'Gross Base', 'Earned Days', 'Additions (+)', 'Absent Deduction',
      'Fines', 'Advance Deduction', 'Prev Month Debt (-)', 'Security Fee',
      'Net Payable', 'Payroll Status'
    ];

    const csvRows = [headers.join(',')];
    rows.forEach((r: any, idx: number) => {
      const rowData = [
        idx + 1,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${(r.designation || '').replace(/"/g, '""')}"`,
        `"${DEPT_LABELS[r.dept] || r.dept}"`,
        r.isHidden ? 'Hidden' : 'Active',
        r.joiningDate || '—',
        r.gross,
        r.payableDays,
        r.totalCustomAdditions,
        r.totalAbsentDeduction,
        r.totalFines,
        r.totalAdvance,
        r.previousMonthDebt || 0,
        r.securityFee || 0,
        r.netPayable,
        r.existingSlipStatus || 'Pending'
      ];
      csvRows.push(rowData.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KhanHub-Payroll-${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadCallback = handleLoad;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-black">
      <style>{`
        @page {
          size: landscape;
          margin: 5mm;
        }
        @media print {
          aside, header, nav, .no-print, .pointer-events-none, .no-print-col { display: none !important; }
          html, body, div[class*="min-h-screen"], div[class*="lg:ml-"], main, div[class*="max-w-"] {
            margin: 0 !important; padding: 0 !important; min-height: 0 !important;
            height: auto !important; background: white !important; box-shadow: none !important;
            width: 100% !important; max-width: 100% !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .overflow-x-auto { overflow: visible !important; min-width: 0 !important; width: 100% !important; }
          #hq-payroll-print { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 5px !important; margin: 0 !important; }
          table { width: 100% !important; min-width: 0 !important; max-width: 100% !important; page-break-inside: auto; border-collapse: collapse !important; font-size: 8.5px !important; table-layout: fixed !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 3px 2px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-6 h-6 text-emerald-600" /> All-Department Payroll & Salary Engine
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete staff attendance, include hidden staff, deduct previous month negative debt (-Rs. 3,000), and generate official salary slips
            </p>
          </div>
          {data && (
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={handleBatchCompleteAttendance}
                disabled={batchCompletingAttendance}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
                title="Mark all unmarked workdays as Present for all staff"
              >
                {batchCompletingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                Complete Attendance (All)
              </button>

              <button
                onClick={handleGenerateAndSaveAllSalaryRecords}
                disabled={batchGeneratingSalaries}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
                title="Generate and persist official salary slips to database"
              >
                {batchGeneratingSalaries ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Generate & Save Slips
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
                title="Export complete payroll sheet to CSV"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>

              <button onClick={handleDownload} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md">
                <Download className="w-4 h-4" /> Download Image
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-black tracking-wide shadow-lg shadow-gray-900/20 transition-all transform hover:scale-[1.02] border border-gray-800">
                <Printer className="w-4 h-4 text-emerald-400" /> Print Sheet
              </button>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 no-print">
          <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
            <div className="flex flex-wrap sm:flex-nowrap gap-4 items-end flex-1 w-full">
              <div className="w-full sm:w-44">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                >
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-32">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
                <input
                  type="number" value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  min={2020} max={2100}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                />
              </div>

              {/* Real-time search */}
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Search Staff</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, role, employee code..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <button
                onClick={handleLoadCallback} disabled={loading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh Payroll
              </button>
            </div>
          </div>

          {/* Quick Filter Badges for Staff Status (Active vs Hidden) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-500 uppercase tracking-wider">Staff Visibility:</span>
              <button
                onClick={() => setStaffStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  staffStatusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Staff ({data?.allSalaryRows?.length || 0})
              </button>
              <button
                onClick={() => setStaffStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  staffStatusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Active Only ({(data?.allSalaryRows || []).filter((r: any) => !r.isHidden).length})
              </button>
              <button
                onClick={() => setStaffStatusFilter('hidden')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  staffStatusFilter === 'hidden' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Hidden Staff ({hiddenStaffCount})
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Previous month negative debt (e.g. -Rs. 3,000) automatically deducts from current month salary!</span>
            </div>
          </div>
        </div>

        {/* Report Area */}
        {data && (
          <div id="hq-payroll-print" ref={printRef} className="space-y-6">

            {/* Print Header Box */}
            <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 text-center shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                <div className="text-left">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">KHAN HUB PLATFORM</h2>
                  <p className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest">Official Executive Payroll & Salary Statement</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                    {data.monthLabel}
                  </span>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">Generated: {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                <span>All Departments Included</span> • <span>Verified Record</span> • <span>KhanHub HQ System</span>
              </div>
            </div>

            {/* Grand Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Staff</div>
                <div className="text-2xl font-black text-gray-900">{salaryRows.length}</div>
                {hiddenStaffCount > 0 && (
                  <div className="text-[9px] font-bold text-amber-600 mt-0.5">{hiddenStaffCount} hidden staff included</div>
                )}
              </div>
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Gross Base</div>
                <div className="text-sm font-black text-teal-800">{formatPKR(filteredTotalGross)}</div>
              </div>
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Additions (Rem/Bonus)</div>
                <div className="text-sm font-black text-green-800">+{formatPKR(filteredTotalAdditions)}</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Total Advances / Debt</div>
                <div className="text-sm font-black text-amber-800">{formatPKR(filteredTotalAdvances)}</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center shadow-sm">
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Total Deductions</div>
                <div className="text-sm font-black text-red-700">{formatPKR(filteredTotalDeductions)}</div>
              </div>
              <div className={`p-4 rounded-2xl text-center shadow-sm col-span-2 sm:col-span-1 border ${filteredTotalNet < 0 ? 'bg-rose-100 border-rose-300' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${filteredTotalNet < 0 ? 'text-rose-800' : 'text-emerald-700'}`}>Total Net Payout</div>
                <div className={`text-base font-black ${filteredTotalNet < 0 ? 'text-rose-900 font-extrabold' : 'text-emerald-900'}`}>{formatPKR(filteredTotalNet)}</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white rounded-2xl border border-gray-100 p-1 w-full no-print">
              <button onClick={() => setTab('salary')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${tab === 'salary' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Salary Register ({salaryRows.length} staff)
              </button>
              <button onClick={() => setTab('fines')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${tab === 'fines' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Fines Ledger ({data.allFines.length} fines)
              </button>
              <button onClick={() => setTab('holidays')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${tab === 'holidays' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                Office Holidays ({data.allHolidays?.length || 0} days)
              </button>
            </div>

            {/* ── SALARY SHEET ── */}
            {tab === 'salary' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">

                {/* Dept filter & print action row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase">Filter by Dept:</span>
                    {['all', ...availableFineDepts].map(d => (
                      <button
                        key={d}
                        onClick={() => setDeptFilter(d)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${deptFilter === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {d === 'all' ? 'All Departments' : DEPT_LABELS[d] || d}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase shadow-md transition-all transform hover:scale-105 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-300" /> Print Out Sheet
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 print:border-none">
                  <table className="w-full text-sm border-collapse min-w-[1100px] print:min-w-0 print:table-fixed">
                    <colgroup>
                      <col className="w-[3%]" />
                      <col className="w-[17%]" />
                      <col className="w-[6%]" />
                      <col className="w-[8%]" />
                      <col className="w-[10%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[6%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[9%]" />
                      <col className="w-[11%]" />
                    </colgroup>
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-2 py-2.5 text-left font-bold text-emerald-900 border-b border-gray-200">#</th>
                        <th className="px-2 py-2.5 text-left font-bold text-emerald-900 border-b border-gray-200">Staff Member</th>
                        <th className="px-2 py-2.5 text-left font-bold text-emerald-900 border-b border-gray-200">Dept</th>
                        <th className="px-2 py-2.5 text-right font-bold text-emerald-900 border-b border-gray-200">Gross Salary</th>
                        <th className="px-2 py-2.5 text-center font-bold text-emerald-900 border-b border-gray-200">Earned Days</th>
                        <th className="px-2 py-2.5 text-right font-bold text-green-800 border-b border-gray-200 bg-green-50/80">Additions (+)</th>
                        <th className="px-2 py-2.5 text-right font-bold text-emerald-900 border-b border-gray-200">Absent Ded.</th>
                        <th className="px-2 py-2.5 text-right font-bold text-emerald-900 border-b border-gray-200">Fine Ded.</th>
                        <th className="px-2 py-2.5 text-right font-bold text-amber-800 border-b border-gray-200 bg-amber-50/70">Advance Ded.</th>
                        <th className="px-2 py-2.5 text-right font-bold text-rose-800 border-b border-gray-200 bg-rose-50/70">Prev Debt (-)</th>
                        <th className="px-2 py-2.5 text-right font-bold text-emerald-900 border-b border-gray-200 bg-emerald-100/70">Net Salary</th>
                        <th className="px-2 py-2.5 text-center font-bold text-emerald-900 border-b border-gray-200 no-print no-print-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRows.length === 0 ? (
                        <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">No staff found matching filter.</td></tr>
                      ) : salaryRows.map((r: any, i: number) => (
                        <tr
                          key={`${r.dept}-${r.id}`}
                          onClick={() => setSelectedStaffModal(r)}
                          className={`hover:bg-emerald-50/60 transition-colors border-b border-gray-100 cursor-pointer group ${
                            r.isHidden ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-3 py-3 font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {r.isHidden && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded">
                                  HIDDEN
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-normal">{r.designation}</div>
                            <div className="flex items-center gap-1.5 mt-1 no-print">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Off:</span>
                              <select
                                value={r.weeklyOffDay || 'none'}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateStaffWeeklyOff(r, e.target.value)}
                                disabled={updatingOffDayId === r.id}
                                className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-1 py-0.5 outline-none hover:bg-emerald-100 transition-all cursor-pointer"
                                title="Set weekly paid off day"
                              >
                                <option value="none">None</option>
                                <option value="sunday">Sun</option>
                                <option value="monday">Mon</option>
                                <option value="tuesday">Tue</option>
                                <option value="wednesday">Wed</option>
                                <option value="thursday">Thu</option>
                                <option value="friday">Fri</option>
                                <option value="saturday">Sat</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DEPT_COLORS[r.dept] || 'bg-gray-100 text-gray-600'}`}>
                              {DEPT_LABELS[r.dept] || r.dept}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-gray-700">{formatPKR(r.gross)}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 block">
                              {r.payableDays}d ({formatPKR(r.earnings)})
                            </span>
                            <div className="flex items-center justify-center gap-1 mt-1 text-[9px] font-extrabold">
                              {r.weeklyOffDaysCount > 0 && (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded" title="Paid weekly off days">
                                  Off: {r.weeklyOffDaysCount}d
                                </span>
                              )}
                              {r.holidayDaysCount > 0 && (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.2 rounded" title="Paid official holidays">
                                  Hol: {r.holidayDaysCount}d
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Custom Additions */}
                          <td className="px-3 py-3 text-right font-bold text-green-700 text-xs bg-green-50/40">
                            {r.totalCustomAdditions > 0 ? (
                              <div className="space-y-0.5">
                                <span className="inline-block bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200">
                                  +{formatPKR(r.totalCustomAdditions)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right text-orange-600 font-medium text-xs">
                            {r.totalAbsentDeduction > 0 ? `${formatPKR(r.totalAbsentDeduction)} (${r.absentDays}d)` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right text-red-600 font-medium text-xs">
                            {r.totalFines > 0 ? formatPKR(r.totalFines) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right text-amber-700 font-bold text-xs bg-amber-50/40">
                            {r.totalAdvance > 0 ? formatPKR(r.totalAdvance) : '—'}
                          </td>

                          {/* Previous Month Debt Carryover (e.g. -3000 from last month) */}
                          <td className="px-3 py-3 text-right font-bold text-xs bg-rose-50/40">
                            {r.previousMonthDebt > 0 ? (
                              <div className="space-y-0.5">
                                <span className="inline-block bg-rose-100 text-rose-900 font-black px-1.5 py-0.5 rounded border border-rose-300">
                                  -{formatPKR(r.previousMonthDebt)}
                                </span>
                                <div className="text-[8px] text-rose-600 font-extrabold uppercase">Last Month Debt</div>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Net Salary To Pay */}
                          <td className="px-3 py-3 text-right font-black transition-colors">
                            <span className={`inline-block px-2.5 py-1 rounded-lg border ${
                              r.netPayable < 0
                                ? 'bg-rose-100 text-rose-900 border-rose-300 font-black'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {formatPKR(r.netPayable)}
                            </span>
                            {r.netPayable < 0 && (
                              <div className="text-[9px] text-rose-600 font-bold mt-0.5">Advance Debt</div>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="px-2 py-2 text-center no-print no-print-col">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {/* Complete Attendance Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCompleteStaffAttendance(r); }}
                                disabled={completingAttendanceId === r.id}
                                className="p-1 bg-teal-50 hover:bg-teal-600 hover:text-white rounded-lg text-teal-700 transition-colors flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 border border-teal-200 cursor-pointer disabled:opacity-50"
                                title="Mark all unmarked past workdays as Present"
                              >
                                {completingAttendanceId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Attnd
                              </button>

                              {/* Customize Salary Modal */}
                              <button
                                onClick={(e) => { e.stopPropagation(); openCustomizeModal(r); }}
                                className="p-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg text-emerald-700 transition-colors flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 border border-emerald-200 cursor-pointer"
                                title="Customize salary (Add remaining balance, debt deduction, security fee, etc.)"
                              >
                                <SlidersHorizontal className="w-3 h-3" /> Edit
                              </button>

                              {/* Official Printable Salary Slip */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setSlipPaidDate(todayStr); setSlipStaffModal(r); }}
                                className="p-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg text-indigo-700 transition-colors flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 border border-indigo-200 cursor-pointer"
                                title="View / Print SECP Letterhead Salary Slip"
                              >
                                <FileText className="w-3 h-3" /> Slip
                              </button>

                              {/* Toggle Hide/Active */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleStaffHide(r); }}
                                disabled={togglingStatusId === r.id}
                                className={`p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 border cursor-pointer ${
                                  r.isHidden
                                    ? 'bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-800 border-amber-300'
                                    : 'bg-gray-100 hover:bg-gray-600 hover:text-white text-gray-600 border-gray-200'
                                }`}
                                title={r.isHidden ? 'Unhide staff member' : 'Hide staff member from default lists'}
                              >
                                {r.isHidden ? <UserCheck className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
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
                          <td className="no-print no-print-col" />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Print-Only Official Signature Footer Box */}
                <div className="hidden print:grid grid-cols-3 gap-6 pt-12 mt-8 border-t-2 border-slate-900 text-center text-xs font-bold text-slate-800">
                  <div className="space-y-10">
                    <div className="border-b-2 border-slate-400 pb-1">PREPARED BY (HR / MANAGER)</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Signature & Date</div>
                  </div>
                  <div className="space-y-10">
                    <div className="border-b-2 border-slate-400 pb-1">CHECKED BY (CASHIER / FINANCE)</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Signature & Date</div>
                  </div>
                  <div className="space-y-10">
                    <div className="border-b-2 border-slate-400 pb-1">APPROVED BY (SUPER ADMIN)</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Official Stamp & Signature</div>
                  </div>
                </div>

              </div>
            )}

            {/* ── OFFICE HOLIDAYS CALENDAR ── */}
            {tab === 'holidays' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" /> Organization Holiday Calendar
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Days marked as holidays are fully paid for staff and never treated as absent or deducted.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHolidayForm(v => !v)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Holiday
                  </button>
                </div>

                {/* Add Holiday Form */}
                {showHolidayForm && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 no-print animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Add Official Holiday
                      </h3>
                      <button onClick={() => setShowHolidayForm(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Holiday Date *</label>
                        <input
                          type="date"
                          value={holidayForm.date}
                          onChange={e => setHolidayForm(p => ({ ...p, date: e.target.value }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Holiday Title / Label *</label>
                        <input
                          type="text"
                          value={holidayForm.label}
                          onChange={e => setHolidayForm(p => ({ ...p, label: e.target.value }))}
                          placeholder="e.g. Pakistan Day, Labour Day..."
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Scope *</label>
                        <select
                          value={holidayForm.scope}
                          onChange={e => setHolidayForm(p => ({ ...p, scope: e.target.value as any }))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-black font-bold"
                        >
                          <option value="all">All Staff (Entire Organization)</option>
                          <option value="department">Specific Department(s)</option>
                          <option value="staff">Specific Staff Member(s)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleAddHoliday}
                      disabled={savingHoliday}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                    >
                      {savingHoliday ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save Holiday
                    </button>
                  </div>
                )}

                {/* Holidays Table */}
                {(data?.allHolidays || []).length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium">
                    No official holidays registered for {data?.monthLabel}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-emerald-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-bold text-emerald-900">#</th>
                          <th className="px-4 py-2.5 text-left font-bold text-emerald-900">Date</th>
                          <th className="px-4 py-2.5 text-left font-bold text-emerald-900">Holiday Label</th>
                          <th className="px-4 py-2.5 text-left font-bold text-emerald-900">Scope</th>
                          <th className="px-4 py-2.5 text-center font-bold text-emerald-900 no-print">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(data?.allHolidays || []).map((h: HqHoliday, idx: number) => (
                          <tr key={h.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-900">{h.date}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{h.label}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                {h.scope === 'all' ? 'All Staff' : h.scope}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center no-print">
                              <button
                                onClick={() => handleDeleteHoliday(h)}
                                disabled={deletingHolidayId === h.id}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete holiday"
                              >
                                {deletingHolidayId === h.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                    <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm font-bold text-red-700">
                      Total: {formatPKR(filteredFinesTotal)} ({filteredFines.length} fines)
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFineForm(v => !v)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Fine
                  </button>
                </div>

                {/* Add Fine Form */}
                {showFineForm && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 no-print">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-emerald-800 flex items-center gap-2"><Receipt className="w-4 h-4" /> Add New Fine</h3>
                      <button onClick={() => setShowFineForm(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-4 h-4" /></button>
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
                    </div>
                    <button
                      onClick={handleAddFine} disabled={savingFine}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
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
                            <td className="px-4 py-3 text-gray-500">{f.date || f.month || '—'}</td>
                            <td className="px-4 py-3 text-gray-700">{f.reason || '—'}</td>
                            <td className="px-4 py-3 text-right font-black text-red-700">{formatPKR(Number(f.amount || 0))}</td>
                            <td className="px-4 py-3 no-print">
                              <button
                                onClick={() => handleDeleteFine(f)}
                                disabled={deletingId === f.id}
                                className="text-red-400 hover:text-red-700 transition-colors cursor-pointer"
                                title="Delete fine"
                              >
                                {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
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
                className="absolute top-5 right-5 text-emerald-200 hover:text-white bg-emerald-900/50 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal className="w-4 h-4 text-emerald-300" />
                <span className="text-xs text-emerald-200 uppercase tracking-wider font-bold">Salary Customization & Debt Control</span>
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

              {/* Previous Month Negative Carryover Notification */}
              {customizeModalStaff.detectedPrevMonthNegativeDebt > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-rose-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-bold">Detected Previous Month Negative Debt: {formatPKR(customizeModalStaff.detectedPrevMonthNegativeDebt)}</div>
                      <div className="text-[11px] text-rose-700">This debt is automatically queued to be deducted from this month&apos;s salary.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomizeForm(p => ({ ...p, previousAdvance: String(customizeModalStaff.detectedPrevMonthNegativeDebt) }))}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer shrink-0"
                  >
                    Apply Rs. {customizeModalStaff.detectedPrevMonthNegativeDebt}
                  </button>
                </div>
              )}

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
                      className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
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
                  className="text-xs font-bold text-green-700 hover:text-green-900 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Extra Addition Item
                </button>
              </div>

              {/* Section 2: Deductions (-) */}
              <div className="space-y-3 bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                  <MinusCircle className="w-4 h-4 text-rose-600" /> Custom Salary Deductions & Advance Debt (-)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Previous Advance / Remaining Debt (e.g. -3000)
                    </label>
                    <input
                      type="number"
                      value={customizeForm.previousAdvance}
                      onChange={e => setCustomizeForm(p => ({ ...p, previousAdvance: e.target.value }))}
                      placeholder="e.g. 3000"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 font-bold text-black"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Deducts previous month&apos;s negative advance balance</span>
                  </div>
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
                      className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
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
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
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
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomization}
                disabled={savingCustomization}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-60 cursor-pointer"
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
                className="absolute top-5 right-5 text-emerald-200 hover:text-white bg-black/30 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-white/10 text-white border-white/20">
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
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    {syncingProfileId === selectedStaffModal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync Debt to Profile
                  </button>
                </div>
              )}

              {/* Salary Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Base Salary</div>
                  <div className="text-xs font-black text-gray-900">{formatPKR(selectedStaffModal.gross)}</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Earned Days</div>
                  <div className="text-xs font-black text-emerald-800">{selectedStaffModal.payableDays} Days</div>
                </div>

                <div className="bg-green-50 border border-green-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-green-700 uppercase tracking-wider mb-0.5">Additions</div>
                  <div className="text-xs font-black text-green-800">+{formatPKR(selectedStaffModal.totalCustomAdditions)}</div>
                </div>

                <div className="bg-red-50 border border-red-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-0.5">Fines Ded.</div>
                  <div className="text-xs font-black text-red-700">{formatPKR(selectedStaffModal.totalFines)}</div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-2xl text-center">
                  <div className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Advance Ded.</div>
                  <div className="text-xs font-black text-amber-800">{formatPKR(selectedStaffModal.totalAdvance)}</div>
                </div>

                <div className={`p-2.5 rounded-2xl text-center col-span-2 sm:col-span-1 border ${selectedStaffModal.netPayable < 0 ? 'bg-rose-100 border-rose-300' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${selectedStaffModal.netPayable < 0 ? 'text-rose-800' : 'text-emerald-700'}`}>Net To Pay</div>
                  <div className={`text-xs font-black ${selectedStaffModal.netPayable < 0 ? 'text-rose-900 font-extrabold' : 'text-emerald-900'}`}>{formatPKR(selectedStaffModal.netPayable)}</div>
                </div>
              </div>

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
                            ) : item.type === 'prev_debt' ? (
                              <span className="inline-flex items-center gap-1 bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-black text-[10px]">
                                Prev Month Debt Carryover
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
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedStaffModal(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { const s = selectedStaffModal; setSelectedStaffModal(null); openCustomizeModal(s); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Customize Salary
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── INDIVIDUAL PRINTABLE SALARY SLIP MODAL ── */}
      {slipStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-gray-100 overflow-hidden my-8 transform transition-all">
            
            {/* Modal Control Header */}
            <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 no-print-modal">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-lg text-white">Official Letterhead Salary Slip</h3>
                  <p className="text-xs text-gray-400 font-medium">{slipStaffModal.name} — {data?.monthLabel}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  <label className="text-xs font-bold text-gray-300">Paid Date:</label>
                  <input
                    type="date"
                    value={slipPaidDate}
                    onChange={(e) => setSlipPaidDate(e.target.value)}
                    className="bg-slate-900 text-white border border-slate-600 rounded-lg px-2.5 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                
                <button
                  onClick={handleDownloadSingleSlip}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download PNG
                </button>
                
                <button
                  onClick={handlePrintSingleSlip}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Slip
                </button>
                
                <button
                  onClick={() => setSlipStaffModal(null)}
                  className="text-gray-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Printable Content */}
            <div id="salary-slip-modal-print-container" className="p-6 overflow-y-auto max-h-[80vh] bg-slate-100 flex justify-center">
              <SalarySlipPrintable
                row={slipStaffModal}
                monthLabel={data?.monthLabel}
                selectedMonth={monthStr}
                selectedYear={selectedYear}
                paidDate={slipPaidDate}
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
