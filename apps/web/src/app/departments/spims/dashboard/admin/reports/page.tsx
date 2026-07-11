'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { formatDateDMY, downloadElementAsPng, toDate } from '@/lib/utils';
import {
  FileBarChart, Printer, Calendar, Download,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3,
  Users, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

const CATEGORIES: Record<string, string> = {
  student_fee: 'Student Tuition Fees',
  admission_fee: 'Admission / Enrollment Fees',
  staff_salary: 'Staff Salary Disbursements',
  utilities: 'Utility Bills',
  rent: 'Rent & Lease Payments',
  marketing: 'Marketing & CRM Ads',
  office_supplies: 'Office & Study Materials',
  repairs_maintenance: 'Repairs & Maintenance',
  miscellaneous: 'Miscellaneous Expenses',
  canteen_deposit: 'Canteen Deposits'
};

function formatCat(cat: string) {
  if (CATEGORIES[cat]) return CATEGORIES[cat];
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || cat;
}

function calculateStudentRemaining(
  studentDocId: string,
  studentCustomId: any,
  totalPackageVal: any,
  allApprovedFees: any[],
  allApprovedTxns: any[]
): number {
  const sId = studentDocId;
  const sCustomId = studentCustomId ? String(studentCustomId).trim() : '';

  // Filter fees for this student
  const studentFees = allApprovedFees.filter(f => {
    const fStudentId = f.studentId ? String(f.studentId).trim() : '';
    return fStudentId === sId || (sCustomId && fStudentId === sCustomId);
  });

  // Filter transactions for this student
  const studentTxns = allApprovedTxns.filter(t => {
    const tStudentId = t.studentId ? String(t.studentId).trim() : '';
    const tPatientId = t.patientId ? String(t.patientId).trim() : '';
    return tStudentId === sId || (sCustomId && tStudentId === sCustomId) || tPatientId === sId || (sCustomId && tPatientId === sCustomId);
  });

  let totalReceived = 0;
  const syncedTxIds = new Set<string>();
  const syncedFeeIds = new Set<string>();

  studentFees.forEach(fee => {
    totalReceived += Number(fee.amount || 0);
    syncedFeeIds.add(fee.id);
    if (fee.linkedTransactionId) syncedTxIds.add(fee.linkedTransactionId);
  });

  studentTxns.forEach(tx => {
    // Only process fee-related transactions
    const cat = String(tx.category || '').toLowerCase();
    const isFee = cat.includes('fee') || cat.includes('admission') || !!tx.feePaymentId;
    if (!isFee) return;

    const isSynced = syncedTxIds.has(tx.id) || (tx.feePaymentId && syncedFeeIds.has(tx.feePaymentId));
    if (!isSynced) {
      totalReceived += Number(tx.amount || 0);
    }
  });

  const pkg = Number(totalPackageVal) || 0;
  return Math.max(0, pkg - totalReceived);
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  const now = new Date();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedWeek, setSelectedWeek] = useState(1); // 1-5
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [reportFocus, setReportFocus] = useState<'income' | 'remaining' | 'students'>('income');
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, boolean>>({
    active: true,
    inactive: true,
    completed: true,
    left: true,
    failed: true,
    no_status: true
  });
  const [filterByDateType, setFilterByDateType] = useState<'none' | 'admission'>('none');

  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({
    name: true,
    fatherName: true,
    rollNo: true,
    studentId: true,
    course: true,
    contact: true,
    admissionDate: true,
    monthlyFee: true,
    totalPackage: true,
    status: true,
    remaining: true,
    pendingTillNow: true
  });

  const columnsList = [
    { key: 'name', label: 'Student Name' },
    { key: 'fatherName', label: 'Father Name' },
    { key: 'rollNo', label: 'Roll Number' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'course', label: 'Course' },
    { key: 'contact', label: 'Contact Number' },
    { key: 'admissionDate', label: 'Admission Date' },
    { key: 'monthlyFee', label: 'Monthly Fee' },
    { key: 'totalPackage', label: 'Total Package' },
    { key: 'status', label: 'Status' },
    { key: 'remaining', label: 'Remaining Dues' },
    { key: 'pendingTillNow', label: 'Pending Till Now' }
  ];

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) { router.push('/departments/spims/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/spims/login'); return;
    }
    setSession(parsed);
  }, [router]);

  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortField === field && sortDirection === 'asc') {
      direction = 'desc';
    }
    setSortField(field);
    setSortDirection(direction);
  };

  const getSortedStudents = () => {
    if (!reportData?.students) return [];
    let list = [...reportData.students];
    if (sortField) {
      list.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  };

  const getSortedStudentFees = () => {
    if (!reportData?.studentFeesBreakdown) return [];
    
    // 1. Filter by reportFocus
    let list = [...reportData.studentFeesBreakdown];
    if (reportData.reportFocus === 'income') {
      list = list.filter((s: any) => s.paidInPeriod > 0);
    } else if (reportData.reportFocus === 'remaining') {
      list = list.filter((s: any) => s.overallRemaining > 0);
    }

    // 2. Sort list
    if (sortField) {
      list.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        if (sortField === 'rollNo') {
          const numA = parseInt(String(valA).replace(/\D/g, '')) || 0;
          const numB = parseInt(String(valB).replace(/\D/g, '')) || 0;
          if (numA !== numB) {
            return sortDirection === 'asc' ? numA - numB : numB - numA;
          }
        }

        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      if (reportData.reportFocus === 'remaining') {
        list.sort((a: any, b: any) => {
          const paidA = a.paidInPeriod > 0 ? 1 : 0;
          const paidB = b.paidInPeriod > 0 ? 1 : 0;
          if (paidA !== paidB) {
            return paidA - paidB;
          }
          return b.overallRemaining - a.overallRemaining;
        });
      }
    }
    return list;
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerated(false);
      setSortField('');

      // Fetch all approved fees and all approved transactions ever for dynamic remaining calculation
      const [allApprovedFeesSnap, allApprovedTxnsSnap] = await Promise.all([
        getDocs(query(collection(db, 'spims_fees'), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'spims_transactions'), where('status', '==', 'approved')))
      ]);
      const allApprovedFees = allApprovedFeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const allApprovedTxns = allApprovedTxnsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      let firstDay: Date;
      let lastDay: Date;
      let label: string;
      let monthStr: string;

      if (reportType === 'daily') {
        const parts = selectedDate.split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        firstDay = new Date(y, m, d, 0, 0, 0);
        lastDay = new Date(y, m, d, 23, 59, 59);
        label = `Daily Report — ${d} ${MONTHS[m]} ${y}`;
        monthStr = `${parts[0]}-${parts[1]}`;
      } else if (reportType === 'weekly') {
        const startDay = (selectedWeek - 1) * 7 + 1;
        const endOfPeriod = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const endDay = selectedWeek === 5 ? endOfPeriod : Math.min(selectedWeek * 7, endOfPeriod);
        firstDay = new Date(selectedYear, selectedMonth, startDay, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth, endDay, 23, 59, 59);
        label = `Weekly Report — Week ${selectedWeek} (${startDay} ${MONTHS[selectedMonth]} - ${endDay} ${MONTHS[selectedMonth]} ${selectedYear})`;
        monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      } else {
        firstDay = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
        label = `Monthly Report — ${MONTHS[selectedMonth]} ${selectedYear}`;
        monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      }

      if (reportFocus === 'students') {
        const studentsSnap = await getDocs(collection(db, 'spims_students'));
        let students = studentsSnap.docs.map(doc => {
          const d = doc.data() as any;
          
          const sId = doc.id;
          const sCustomId = d.studentId ? String(d.studentId).trim() : '';

          // Filter fees for this student
          const studentFees = allApprovedFees.filter(f => {
            const fStudentId = f.studentId ? String(f.studentId).trim() : '';
            return fStudentId === sId || (sCustomId && fStudentId === sCustomId);
          });

          // Filter transactions for this student
          const studentTxns = allApprovedTxns.filter(t => {
            const tStudentId = t.studentId ? String(t.studentId).trim() : '';
            const tPatientId = t.patientId ? String(t.patientId).trim() : '';
            return tStudentId === sId || (sCustomId && tStudentId === sCustomId) || tPatientId === sId || (sCustomId && tPatientId === sCustomId);
          });

          let totalReceived = 0;
          const syncedTxIds = new Set<string>();
          const syncedFeeIds = new Set<string>();

          studentFees.forEach(fee => {
            totalReceived += Number(fee.amount || 0);
            syncedFeeIds.add(fee.id);
            if (fee.linkedTransactionId) syncedTxIds.add(fee.linkedTransactionId);
          });

          studentTxns.forEach(tx => {
            const cat = String(tx.category || '').toLowerCase();
            const isFee = cat.includes('fee') || cat.includes('admission') || !!tx.feePaymentId;
            if (!isFee) return;

            const isSynced = syncedTxIds.has(tx.id) || (tx.feePaymentId && syncedFeeIds.has(tx.feePaymentId));
            if (!isSynced) {
              totalReceived += Number(tx.amount || 0);
            }
          });

          const pkg = Number(d.totalPackage ?? d.totalPackageAmount ?? 0);
          const remaining = Math.max(0, pkg - totalReceived);
          
          // Calculate pending till now
          let pendingTillNow = 0;
          const admissionDate = d.admissionDate ? toDate(d.admissionDate) : null;
          const monthlyFee = Number(d.monthlyFee ?? d.expectedFee ?? 0);
          
          if (remaining > 0 && admissionDate && monthlyFee > 0) {
            const now = new Date();
            const billableMonths = Math.max(0, (now.getFullYear() - admissionDate.getFullYear()) * 12 + (now.getMonth() - admissionDate.getMonth()) + 1);
            const monthsPaid = totalReceived / monthlyFee;
            const unpaidMonths = Math.max(0, billableMonths - monthsPaid);
            pendingTillNow = Math.max(0, Math.min(remaining, unpaidMonths * monthlyFee));
          }

          return {
            id: doc.id,
            name: d.name || '—',
            fatherName: d.fatherName || '—',
            rollNo: d.rollNo || d.serialNumber || '—',
            studentId: d.studentId || d.customId || '—',
            course: d.course || '—',
            contact: d.contact || d.phone || d.guardianPhone || d.fatherContact || '—',
            status: d.status || '',
            activity: d.activity || 'Active',
            admissionDate,
            monthlyFee,
            totalPackage: pkg,
            overallRemaining: remaining,
            pendingTillNow
          };
        });

        // Filter based on selectedStatuses checkboxes
        students = students.filter(s => {
          const isLeft = String(s.status).toLowerCase() === 'left';
          const isActive = (s.activity || 'Active') === 'Active' && !isLeft;
          const isInactive = (s.activity || '').toLowerCase() === 'inactive' || (s.status || '').toLowerCase() === 'inactive';
          const isCompleted = ['pass', 'overall pass', 'second year pass', 'first year pass'].includes(String(s.status).toLowerCase());
          const isFailed = ['fail', 'overall fail', 'second year fail', 'first year fail'].includes(String(s.status).toLowerCase());
          const isNoStatus = !s.status;

          if (selectedStatuses.active && isActive) return true;
          if (selectedStatuses.inactive && isInactive) return true;
          if (selectedStatuses.completed && isCompleted) return true;
          if (selectedStatuses.failed && isFailed) return true;
          if (selectedStatuses.left && isLeft) return true;
          if (selectedStatuses.no_status && isNoStatus) return true;

          return false;
        });

        if (filterByDateType === 'admission') {
          students = students.filter(s => {
            if (!s.admissionDate) return false;
            return s.admissionDate >= firstDay && s.admissionDate <= lastDay;
          });
        }

        const totalStudentsCount = students.length;
        const totalActiveCount = students.filter(s => {
          const isLeft = String(s.status).toLowerCase() === 'left';
          return (s.activity || 'Active') === 'Active' && !isLeft;
        }).length;
        const totalInactiveCount = students.filter(s => (s.activity || '').toLowerCase() === 'inactive' || (s.status || '').toLowerCase() === 'inactive').length;
        const totalCompletedCount = students.filter(s => ['pass', 'overall pass', 'second year pass', 'first year pass'].includes(String(s.status).toLowerCase())).length;
        const totalLeftCount = students.filter(s => String(s.status).toLowerCase() === 'left').length;
        const totalFailedCount = students.filter(s => ['fail', 'overall fail', 'second year fail', 'first year fail'].includes(String(s.status).toLowerCase())).length;
        const totalNoStatusCount = students.filter(s => !s.status).length;
        const totalOutstandingDues = students.reduce((sum, s) => sum + s.overallRemaining, 0);

        setReportData({
          students,
          totalStudentsCount,
          totalActiveCount,
          totalInactiveCount,
          totalCompletedCount,
          totalLeftCount,
          totalFailedCount,
          totalNoStatusCount,
          totalOutstandingDues,
          reportLabel: label,
          reportFocus,
          generatedAt: new Date().toLocaleString(),
        });
        setGenerated(true);
        return;
      }

      // === FINANCIAL TRANSACTIONS ===
      const txnQ = query(
        collection(db, 'spims_transactions'),
        where('date', '>=', Timestamp.fromDate(firstDay)),
        where('date', '<=', Timestamp.fromDate(lastDay)),
        where('status', '==', 'approved'),
        orderBy('date', 'asc')
      );
      const txnSnap = await getDocs(txnQ);
      const txns = txnSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const income = txns.filter((t: any) => t.type === 'income');
      const expense = txns.filter((t: any) => t.type === 'expense');
      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalExpenses = expense.reduce((s: number, t: any) => s + (t.amount || 0), 0);

      const byCategory = (list: any[]) => {
        const map: Record<string, number> = {};
        list.forEach((t: any) => {
          const isFee = 
            t.category === 'student_fee' || 
            t.category === 'fee' || 
            String(t.category || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('admission');
          const catKey = isFee ? 'student_fee' : t.category;
          map[catKey] = (map[catKey] || 0) + (t.amount || 0);
        });
        return map;
      };

      // === STUDENTS ===
      const activeStudentsSnap = await getDocs(collection(db, 'spims_students'));
      const allStudents = activeStudentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const students = allStudents.filter(student => (student.status || 'Active') === 'Active');
      const totalActiveStudents = students.length;

      const newAdmissions = allStudents.filter((student: any) => {
        if (!student.admissionDate) return false;
        const d = student.admissionDate.toDate?.() ? student.admissionDate.toDate() : new Date(student.admissionDate);
        return d >= firstDay && d <= lastDay;
      }).length;

      // === STUDENT FEES BREAKDOWN ===
      const feesSnap = await getDocs(collection(db, 'spims_fees'));
      const allFees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const monthFees = allFees.filter(fee => {
        if (fee.status !== 'approved') return false;
        const feeDate = fee.date?.toDate?.() ? fee.date.toDate() : new Date(fee.date || 0);
        const feeMonthStr = `${feeDate.getFullYear()}-${String(feeDate.getMonth() + 1).padStart(2, '0')}`;
        return feeMonthStr === monthStr;
      });

      const studentFeesBreakdown = students.map(student => {
        const studentPayments = monthFees.filter(f => f.studentId === student.id);
        const amountPaidThisMonth = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const studentPeriodTxns = txns.filter((t: any) => {
          if (t.studentId !== student.id && t.patientId !== student.id) return false;
          return (
            t.category === 'student_fee' ||
            t.category === 'fee' ||
            String(t.category || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('admission')
          );
        });
        const paidInPeriod = studentPeriodTxns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        return {
          id: student.id,
          name: student.name,
          rollNo: student.rollNo || student.serialNumber || '—',
          studentId: student.studentId || student.customId || '—',
          course: student.course || '—',
          monthlyFee: Number(student.monthlyFee || 0),
          totalPackage: Number(student.totalPackage || student.totalPackageAmount || 0),
          paidInPeriod,
          amountPaidThisMonth,
          overallRemaining: calculateStudentRemaining(student.id, student.studentId, student.totalPackage || student.totalPackageAmount, allApprovedFees, allApprovedTxns)
        };
      });

      const totalStudentFeesCollectedInPeriod = studentFeesBreakdown.reduce((sum, s) => sum + s.paidInPeriod, 0);
      const totalStudentOutstandingDues = studentFeesBreakdown.reduce((sum, s) => sum + s.overallRemaining, 0);

      setReportData({
        txns,
        income,
        expense,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        incomeByCategory: byCategory(income),
        expenseByCategory: byCategory(expense),
        totalActiveStudents,
        newAdmissions,
        studentFeesBreakdown,
        totalStudentFeesCollectedInPeriod,
        totalStudentOutstandingDues,
        reportLabel: label,
        generatedAt: new Date().toLocaleString(),
        reportFocus,
      });
      setGenerated(true);
    } catch (error) {
      console.error('Report error:', error);
      alert('Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    try {
      const filename = `spims-report-${reportFocus}-${reportType}-${Date.now()}.png`;
      await downloadElementAsPng(printRef.current, filename, {
        scale: 2,
        backgroundColor: '#ffffff',
        style: {
          width: '1280px',
          maxWidth: 'none',
        }
      });
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Failed to export report as image.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <style>{`
        @media print {
          aside,
          header,
          .no-print,
          .pointer-events-none {
            display: none !important;
          }
          
          html, body,
          div[class*="min-h-screen"],
          div[class*="lg:ml-"],
          main,
          div[class*="max-w-"] {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            background: white !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .overflow-x-auto {
            overflow: visible !important;
            overflow-x: visible !important;
          }

          #spims-report-print {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
          }
        }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-teal-605" /> Financial Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive reports including student summaries and transaction list</p>
          </div>
          {generated && (
            <div className="flex gap-3">
              <button onClick={handleDownloadImage} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors">
                <Download className="w-4 h-4" /> Download as Image
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-500" /> Select Period</h2>
            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    reportType === t ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Report Focus Selector */}
          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Report Category</h3>
              <p className="text-xs text-gray-400">Choose the type of report you want to generate</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setReportFocus('income')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  reportFocus === 'income' ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Income Report
              </button>
              <button
                onClick={() => setReportFocus('remaining')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  reportFocus === 'remaining' ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Remaining Dues
              </button>
              <button
                onClick={() => setReportFocus('students')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  reportFocus === 'students' ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Student List
              </button>
            </div>
          </div>

          {/* Student List Filters & Columns selector */}
          {reportFocus === 'students' && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Student Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.active}
                        onChange={e => setSelectedStatuses(prev => ({ ...prev, active: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.inactive}
                        onChange={e => setSelectedStatuses(prev => ({ ...prev, inactive: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      Inactive
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.completed}
                        onChange={e => setSelectedStatuses(prev => ({ ...prev, completed: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      Passed
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.failed}
                        onChange={e => setSelectedStatuses(prev => ({ ...prev, failed: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      Failed
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.left}
                        onChange={e => setSelectedStatuses(prev => ({ ...prev, left: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      Left
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.no_status}
                        onChange={e => setSelectedStatuses(prev => ({ ...prev, no_status: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      No Status
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date Scope Filter</label>
                  <select
                    value={filterByDateType}
                    onChange={e => setFilterByDateType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                  >
                    <option value="none">Show All Matching Students (No Date Filter)</option>
                    <option value="admission">Filter by Admission Date falling in Selected Period</option>
                  </select>
                </div>
              </div>

              {/* Column Selector Checkboxes */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Include Columns in Report</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {columnsList.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColumns[col.key] || false}
                        onChange={e => setSelectedColumns(prev => ({ ...prev, [col.key]: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-605 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {reportType === 'daily' && (
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                />
              </div>
            )}

            {reportType === 'weekly' && (
              <div className="w-full sm:w-1/4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Week</label>
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                >
                  <option value={1}>Week 1 (1st - 7th)</option>
                  <option value={2}>Week 2 (8th - 14th)</option>
                  <option value={3}>Week 3 (15th - 21st)</option>
                  <option value={4}>Week 4 (22nd - 28th)</option>
                  <option value={5}>Week 5 (29th - End)</option>
                </select>
              </div>
            )}

            {reportType !== 'daily' && (
              <>
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    min={2020}
                    max={2100}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {generated && reportData && (
          <div id="spims-report-print" ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-10">

            {/* Report Header */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-black text-gray-900">SPIMS Medical Institute — Financial Report</h2>
              <p className="text-lg font-bold text-teal-700 mt-1">
                {reportData.reportLabel} — {
                  reportData.reportFocus === 'income' 
                    ? 'Income Report' 
                    : reportData.reportFocus === 'remaining' 
                    ? 'Remaining Dues Report' 
                    : 'Student List Report'
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">Generated: {reportData.generatedAt}</p>
            </div>

            {/* Students List Summary Cards */}
            {reportData.reportFocus === 'students' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                  <Users className="w-6 h-6 text-teal-605 mx-auto mb-2" />
                  <div className="text-xs font-bold text-teal-650 uppercase tracking-wider mb-1">Total Matching</div>
                  <div className="text-2xl font-black text-teal-800">{reportData.totalStudentsCount}</div>
                </div>
                <div className="bg-green-50 border border-green-100 p-5 rounded-2xl text-center">
                  <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-green-650 tracking-wider mb-1">Active Students</div>
                  <div className="text-2xl font-black text-green-800">{reportData.totalActiveCount}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
                  <TrendingDown className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-650 uppercase tracking-wider mb-1">Inactive Students</div>
                  <div className="text-2xl font-black text-slate-750">{reportData.totalInactiveCount}</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-center">
                  <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-blue-650 uppercase tracking-wider mb-1">Passed/Completed</div>
                  <div className="text-2xl font-black text-blue-800">{reportData.totalCompletedCount}</div>
                </div>
                <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-center">
                  <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <div className="text-xs font-bold text-red-650 uppercase tracking-wider mb-1">Left Students</div>
                  <div className="text-2xl font-black text-red-750">{reportData.totalLeftCount}</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl text-center">
                  <TrendingDown className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                  <div className="text-xs font-bold text-rose-650 uppercase tracking-wider mb-1">Failed Students</div>
                  <div className="text-2xl font-black text-rose-750">{reportData.totalFailedCount}</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl text-center">
                  <TrendingDown className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <div className="text-xs font-bold text-amber-650 uppercase tracking-wider mb-1">No Status</div>
                  <div className="text-2xl font-black text-amber-750">{reportData.totalNoStatusCount}</div>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl text-center col-span-1">
                  <DollarSign className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-orange-650 uppercase tracking-wider mb-1">Total Remaining</div>
                  <div className="text-2xl font-black text-orange-850">{formatPKR(reportData.totalOutstandingDues)}</div>
                </div>
              </div>
            ) : (
              /* Students Summary (Only for finance/non-students reports) */
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-teal-500" /> Student Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                    <div className="text-3xl font-black text-teal-800">{reportData.totalActiveStudents}</div>
                    <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mt-1">Active Students</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-center">
                    <div className="text-3xl font-black text-blue-800">{reportData.newAdmissions}</div>
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">New Admissions (Selected Period)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            {reportData.reportFocus !== 'students' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5 text-teal-500" /> Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                    <TrendingUp className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                    <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Total Income</div>
                    <div className="text-2xl font-black text-teal-800">{formatPKR(reportData.totalIncome)}</div>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-center">
                    <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
                    <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Total Expenses</div>
                    <div className="text-2xl font-black text-red-700">{formatPKR(reportData.totalExpenses)}</div>
                  </div>
                  <div className={`border p-5 rounded-2xl text-center ${reportData.netBalance >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                    <DollarSign className={`w-6 h-6 mx-auto mb-2 ${reportData.netBalance >= 0 ? 'text-green-600' : 'text-orange-552'}`} />
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${reportData.netBalance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Net Balance</div>
                    <div className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-700'}`}>{formatPKR(reportData.netBalance)}</div>
                  </div>
                </div>
              </div>
            )}

            {reportData.reportFocus === 'students' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-605" /> Student List Details
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs border-collapse min-w-[300px]">
                      <thead className="bg-gray-50 text-gray-650 border-b border-gray-200 select-none">
                        <tr>
                          {selectedColumns.name && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                              <div className="flex items-center gap-1">
                                Student Name
                                {sortField === 'name' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.fatherName && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('fatherName')}>
                              <div className="flex items-center gap-1">
                                Father Name
                                {sortField === 'fatherName' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.rollNo && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('rollNo')}>
                              <div className="flex items-center gap-1">
                                Roll Number
                                {sortField === 'rollNo' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.studentId && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('studentId')}>
                              <div className="flex items-center gap-1">
                                Student ID
                                {sortField === 'studentId' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.course && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('course')}>
                              <div className="flex items-center gap-1">
                                Course
                                {sortField === 'course' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.contact && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('contact')}>
                              <div className="flex items-center gap-1">
                                Contact
                                {sortField === 'contact' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.admissionDate && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('admissionDate')}>
                              <div className="flex items-center gap-1">
                                Admission Date
                                {sortField === 'admissionDate' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.monthlyFee && (
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('monthlyFee')}>
                              <div className="flex items-center justify-end gap-1">
                                Monthly Fee
                                {sortField === 'monthlyFee' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.totalPackage && (
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalPackage')}>
                              <div className="flex items-center justify-end gap-1">
                                Total Package
                                {sortField === 'totalPackage' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.status && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                              <div className="flex items-center gap-1">
                                Status
                                {sortField === 'status' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.remaining && (
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('overallRemaining')}>
                              <div className="flex items-center justify-end gap-1">
                                Remaining Dues
                                {sortField === 'overallRemaining' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-rose-450" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.pendingTillNow && (
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pendingTillNow')}>
                              <div className="flex items-center justify-end gap-1">
                                Pending Till Now
                                {sortField === 'pendingTillNow' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {getSortedStudents().map((s: any) => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                            {selectedColumns.name && (
                              <td className="px-3 py-2.5 text-gray-855 font-bold">
                                {s.name}
                                {s.status && s.status !== 'Active' && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{s.status}</span>}
                              </td>
                            )}
                            {selectedColumns.fatherName && <td className="px-3 py-2.5 text-gray-600">{s.fatherName}</td>}
                            {selectedColumns.rollNo && <td className="px-3 py-2.5 text-gray-555 font-mono">{s.rollNo}</td>}
                            {selectedColumns.studentId && <td className="px-3 py-2.5 text-gray-555 font-mono">{s.studentId}</td>}
                            {selectedColumns.course && <td className="px-3 py-2.5 text-gray-600">{s.course}</td>}
                            {selectedColumns.contact && <td className="px-3 py-2.5 text-gray-600">{s.contact}</td>}
                            {selectedColumns.admissionDate && <td className="px-3 py-2.5 text-gray-655">{s.admissionDate ? formatDateDMY(s.admissionDate) : '—'}</td>}
                            {selectedColumns.monthlyFee && <td className="px-3 py-2.5 text-right text-gray-800">{formatPKR(s.monthlyFee)}</td>}
                            {selectedColumns.totalPackage && <td className="px-3 py-2.5 text-right text-gray-800">{formatPKR(s.totalPackage)}</td>}
                            {selectedColumns.status && <td className="px-3 py-2.5 text-gray-600">{s.status || 'No Status'}</td>}
                            {selectedColumns.remaining && (
                              <td className={`px-3 py-2.5 text-right font-black ${s.overallRemaining > 0 ? 'text-rose-600 bg-rose-50/20' : 'text-blue-700 bg-blue-50/20'}`}>
                                {formatPKR(s.overallRemaining)}
                              </td>
                            )}
                            {selectedColumns.pendingTillNow && (
                              <td className={`px-3 py-2.5 text-right font-black ${s.pendingTillNow > 0 ? 'text-amber-600 bg-amber-50/20' : 'text-green-700 bg-green-50/20'}`}>
                                {formatPKR(s.pendingTillNow)}
                              </td>
                            )}
                          </tr>
                        ))}
                        {getSortedStudents().length === 0 && (
                          <tr>
                            <td colSpan={Object.values(selectedColumns).filter(Boolean).length} className="px-3 py-8 text-center text-gray-400 italic">
                              No student records found matching the criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : reportData.txns.length === 0 && reportData.reportFocus === 'income' ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-500">No approved transactions found for the selected period.</div>
            ) : (
              <>
                {/* Income Breakdown */}
                {reportData.reportFocus === 'income' && Object.keys(reportData.incomeByCategory).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-500" /> Income Breakdown</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm border-collapse min-w-[300px]">
                        <thead className="bg-teal-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-teal-800">Category</th>
                            <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-teal-800">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.incomeByCategory).map(([cat, amt]: any) => (
                            <tr key={cat} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                              <td className="px-4 py-3 text-gray-700 font-medium">{formatCat(cat)}</td>
                              <td className="px-4 py-3 text-right font-bold">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-teal-50/50 font-black">
                            <td className="px-4 py-3 text-teal-800">Total Income</td>
                            <td className="px-4 py-3 text-right text-teal-800">{formatPKR(reportData.totalIncome)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expense Breakdown */}
                {reportData.reportFocus === 'income' && Object.keys(reportData.expenseByCategory).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Expense Breakdown</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm border-collapse min-w-[300px]">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-red-700">Category</th>
                            <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-red-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.expenseByCategory).map(([cat, amt]: any) => (
                            <tr key={cat} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                              <td className="px-4 py-3 text-gray-700 font-medium">{formatCat(cat)}</td>
                              <td className="px-4 py-3 text-right font-bold">{formatPKR(amt)}</td>
                            </tr>
                          ))}
                          <tr className="bg-red-50/50 font-black">
                            <td className="px-4 py-3 text-red-700">Total Expenses</td>
                            <td className="px-4 py-3 text-right text-red-700">{formatPKR(reportData.totalExpenses)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Student Fee Collection Breakdown */}
                {reportData.studentFeesBreakdown && reportData.studentFeesBreakdown.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-605" /> {reportData.reportFocus === 'income' ? 'Student Fee Collections' : 'Outstanding Student Dues'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Period Collections</div>
                        <div className="text-xl font-black text-teal-800">{formatPKR(reportData.totalStudentFeesCollectedInPeriod)}</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Total Outstanding Balances</div>
                        <div className="text-xl font-black text-orange-850">{formatPKR(reportData.totalStudentOutstandingDues)}</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-650 border-b border-gray-200 select-none">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                              <div className="flex items-center gap-1">
                                Student Name
                                {sortField === 'name' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('rollNo')}>
                              <div className="flex items-center gap-1">
                                Roll No / Course
                                {sortField === 'rollNo' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalPackage')}>
                              <div className="flex items-center justify-end gap-1">
                                Total Package
                                {sortField === 'totalPackage' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-teal-800 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paidInPeriod')}>
                              <div className="flex items-center justify-end gap-1">
                                Paid in Period
                                {sortField === 'paidInPeriod' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-indigo-800 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amountPaidThisMonth')}>
                              <div className="flex items-center justify-end gap-1">
                                Paid in Month
                                {sortField === 'amountPaidThisMonth' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-rose-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('overallRemaining')}>
                              <div className="flex items-center justify-end gap-1">
                                Overall Remaining
                                {sortField === 'overallRemaining' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-rose-455" />
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {getSortedStudentFees().map((s: any) => (
                            <tr key={s.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                              <td className="px-3 py-2.5 text-gray-855 font-bold">{s.name}</td>
                              <td className="px-3 py-2.5 text-gray-555 font-mono">{s.rollNo} / {s.course}</td>
                              <td className="px-3 py-2.5 text-right text-gray-900">{formatPKR(s.totalPackage)}</td>
                              <td className="px-3 py-2.5 text-right text-teal-700 font-black bg-teal-50/20">{formatPKR(s.paidInPeriod)}</td>
                              <td className="px-3 py-2.5 text-right text-indigo-700 font-black bg-indigo-50/30">{formatPKR(s.amountPaidThisMonth)}</td>
                              <td className={`px-3 py-2.5 text-right font-black ${s.overallRemaining > 0 ? 'text-rose-600 bg-rose-50/20' : 'text-blue-700 bg-blue-50/20'}`}>{formatPKR(s.overallRemaining)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Transaction Detail (Only for Income Report) */}
                {reportData.reportFocus === 'income' && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">Transaction Details</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Date</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Student Name</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Type</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Category</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Description</th>
                            <th className="px-3 py-3 text-right font-bold text-gray-600">Amount</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Cashier ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.txns.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50 border-b border-gray-100">
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                              <td className="px-3 py-2.5 text-gray-855 font-bold whitespace-nowrap">{t.studentName || t.patientName || '—'}</td>
                              <td className="px-3 py-2.5">
                                <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span>
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 font-medium">{formatCat(t.category)}</td>
                              <td className="px-3 py-2.5 text-gray-500 max-w-[200px] truncate" title={t.description}>{t.description || '—'}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatPKR(t.amount)}</td>
                              <td className="px-3 py-2.5 text-gray-555 font-mono text-[10px]">{t.cashierId || t.submittedBy || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
