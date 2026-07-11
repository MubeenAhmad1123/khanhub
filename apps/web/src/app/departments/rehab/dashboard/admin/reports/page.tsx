'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { formatDateDMY, downloadElementAsPng, toDate } from '@/lib/utils';
import {
  FileBarChart, Printer, Calendar,
  TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3,
  ArrowUpDown, ArrowUp, ArrowDown, Download, Users
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPKR(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`;
}

// Map database categories to user-friendly titles
const CATEGORIES: Record<string, string> = {
  patient_fee: 'Patient Package Fees',
  canteen_deposit: 'Canteen Deposits',
  staff_salary: 'Staff Salary Disbursements',
  food_expense: 'Food & Kitchen Expenses',
  utilities: 'Utility Bills',
  medicine: 'Medicines & Medical Supplies',
  canteen_purchase: 'Canteen Purchases',
  rent: 'Rent & Lease Payments',
  marketing: 'Marketing & CRM Ads',
  office_supplies: 'Office Supplies',
  repairs_maintenance: 'Repairs & Maintenance',
  miscellaneous: 'Miscellaneous Expenses',
  registration: 'New Patient Registration Fees'
};

function formatCat(cat: string) {
  if (CATEGORIES[cat]) return CATEGORIES[cat];
  return cat?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || cat;
}

function calculatePatientOverallRemaining(
  patient: any,
  allTxns: any[]
): number {
  if (patient.isActive === false || (typeof patient.manualRemainingAdjustment === 'number' && patient.manualRemainingAdjustment !== 0)) {
    return Number(patient.remaining ?? patient.overallRemaining ?? patient.remainingBalance ?? patient.amountRemaining ?? 0);
  }

  const patientId = patient.id;
  const patientTxns = allTxns.filter(t => t.patientId === patientId);

  let totalReceived = 0;
  let totalMedicineCharges = 0;
  let totalDiscount = 0;

  patientTxns.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    const discount = Number(tx.discount || 0);
    const returnAmount = Number(tx.returnAmount || tx.return || 0);
    const netAmount = amount - returnAmount;

    if (tx.category === 'medicine_charge') {
      totalMedicineCharges += netAmount;
    } else if (tx.category === 'canteen_deposit' || tx.category === 'canteen' || tx.category === 'canteen_expense') {
      // Exclude canteen
    } else {
      totalReceived += netAmount;
      totalDiscount += discount;
    }
  });

  const monthlyPkg = Number(patient.monthlyPackage || patient.packageAmount || 0);
  
  const safeToDateLocal = (d: any) => {
    if (!d) return new Date();
    if (d.toDate) return d.toDate();
    return new Date(d);
  };

  let admissionDate = safeToDateLocal(patient.admissionDate);
  let endDate = new Date();
  if (patient.isActive === false && patient.dischargeDate) {
    endDate = safeToDateLocal(patient.dischargeDate);
  }

  // Calculate billable calendar months for current stay
  const currentStayMonths = (endDate.getFullYear() - admissionDate.getFullYear()) * 12 + (endDate.getMonth() - admissionDate.getMonth()) + 1;
  const currentStayPackage = Math.max(1, currentStayMonths) * monthlyPkg;

  // Calculate historical stays using calendar months
  let historicalStayPackage = 0;
  const history = patient.rejoinHistory || [];
  history.forEach((stay: any) => {
    const sAdmission = safeToDateLocal(stay.admissionDate);
    const sDischarge = stay.dischargeDate ? safeToDateLocal(stay.dischargeDate) : new Date();
    const sMonthlyPkg = Number(stay.monthlyPackage || stay.packageAmount || 0);

    const sMonths = (sDischarge.getFullYear() - sAdmission.getFullYear()) * 12 + (sDischarge.getMonth() - sAdmission.getMonth()) + 1;
    historicalStayPackage += Math.max(1, sMonths) * sMonthlyPkg;
  });

  const totalStayPackage = currentStayPackage + historicalStayPackage;
  const finalMedicineCharges = typeof patient.medicineCharges === 'number' ? patient.medicineCharges : totalMedicineCharges;
  const calculatedRemaining = (totalStayPackage + finalMedicineCharges) - totalReceived - totalDiscount + Number(patient.manualRemainingAdjustment || 0);

  return Math.max(0, calculatedRemaining);
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

  const [reportFocus, setReportFocus] = useState<'income' | 'remaining' | 'patients'>('income');
  const [patientGroup, setPatientGroup] = useState<'all' | 'active' | 'discharged'>('all');
  const [filterByDateType, setFilterByDateType] = useState<'none' | 'admission' | 'discharge'>('none');
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({
    name: true,
    inpatientNumber: true,
    address: true,
    admissionDate: true,
    dischargeDate: true,
    remaining: true,
    substanceOfAddiction: false,
    monthlyPackage: true,
    guardianPhone: false
  });

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login'); return;
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

  const getSortedPatientFees = () => {
    if (!reportData?.patientFeesBreakdown) return [];
    
    // 1. Filter by reportFocus
    let list = [...reportData.patientFeesBreakdown];
    if (reportData.reportFocus === 'income') {
      list = list.filter((p: any) => p.paidInPeriod > 0);
    } else if (reportData.reportFocus === 'remaining') {
      list = list.filter((p: any) => p.overallRemaining > 0);
    }

    // 2. Sort list
    if (sortField) {
      list.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Handle numeric fields
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        // Handle inpatientNumber / patient ID numeric sorting if possible
        if (sortField === 'inpatientNumber') {
          const numA = parseInt(String(valA).replace(/\D/g, '')) || 0;
          const numB = parseInt(String(valB).replace(/\D/g, '')) || 0;
          if (numA !== numB) {
            return sortDirection === 'asc' ? numA - numB : numB - numA;
          }
        }

        // Handle string fields
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default Sort Order for Remaining Report
      if (reportData.reportFocus === 'remaining') {
        list.sort((a: any, b: any) => {
          const paidA = a.paidInPeriod > 0 ? 1 : 0;
          const paidB = b.paidInPeriod > 0 ? 1 : 0;
          if (paidA !== paidB) {
            return paidA - paidB; // 0 (unpaid) comes before 1 (paid)
          }
          // Secondary sort: sort by remaining dues descending
          return b.overallRemaining - a.overallRemaining;
        });
      }
    }
    return list;
  };

  const getSortedPatients = () => {
    if (!reportData?.patients) return [];
    let list = [...reportData.patients];
    if (sortField) {
      list.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Handle numeric fields
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        // Handle Date fields
        if (sortField === 'admissionDate' || sortField === 'dischargeDate') {
          const dateA = valA ? toDate(valA).getTime() : 0;
          const dateB = valB ? toDate(valB).getTime() : 0;
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }

        // Handle string fields
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerated(false);
      setSortField(''); // Reset sort field on fresh generation

      let firstDay: Date;
      let lastDay: Date;
      let label: string;
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

      if (reportType === 'daily') {
        const parts = selectedDate.split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        firstDay = new Date(y, m, d, 0, 0, 0);
        lastDay = new Date(y, m, d, 23, 59, 59);
        label = `Daily Report — ${d} ${MONTHS[m]} ${y}`;
      } else if (reportType === 'weekly') {
        const startDay = (selectedWeek - 1) * 7 + 1;
        const endOfPeriod = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const endDay = selectedWeek === 5 ? endOfPeriod : Math.min(selectedWeek * 7, endOfPeriod);
        firstDay = new Date(selectedYear, selectedMonth, startDay, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth, endDay, 23, 59, 59);
        label = `Weekly Report — Week ${selectedWeek} (${startDay} ${MONTHS[selectedMonth]} - ${endDay} ${MONTHS[selectedMonth]} ${selectedYear})`;
      } else {
        firstDay = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
        lastDay = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
        label = `Monthly Report — ${MONTHS[selectedMonth]} ${selectedYear}`;
      }

      if (reportFocus === 'patients') {
        const patientsSnap = await getDocs(collection(db, 'rehab_patients'));
        const txnSnap = await getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved')));
        const allTxns = txnSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        let patients = patientsSnap.docs.map(doc => {
          const data = doc.data() as any;
          const patientId = doc.id;
          const patientObj = { id: patientId, ...data };
          const overallRemaining = calculatePatientOverallRemaining(patientObj, allTxns);

          return {
            id: doc.id,
            name: data.name || '—',
            fatherName: data.fatherName || '—',
            inpatientNumber: data.inpatientNumber || data.patientId || data.serialNumber || '—',
            address: data.address || '—',
            guardianName: data.guardianName || '—',
            guardianPhone: data.guardianPhone || data.contactNumber || '—',
            isActive: data.isActive !== false,
            admissionDate: data.admissionDate,
            dischargeDate: data.dischargeDate,
            substanceOfAddiction: data.substanceOfAddiction || (data.reasonsForAdmission?.join(', ') || '—'),
            monthlyPackage: Number(data.monthlyPackage ?? data.packageAmount ?? 60000),
            overallRemaining,
          };
        });

        // 1. Filter by patientGroup
        if (patientGroup === 'active') {
          patients = patients.filter(p => p.isActive === true);
        } else if (patientGroup === 'discharged') {
          patients = patients.filter(p => p.isActive === false);
        }

        // 2. Filter by date if filterByDateType is not 'none'
        if (filterByDateType !== 'none') {
          patients = patients.filter(p => {
            const dateVal = filterByDateType === 'admission' ? p.admissionDate : p.dischargeDate;
            if (!dateVal) return false;
            const dateObj = toDate(dateVal);
            return dateObj >= firstDay && dateObj <= lastDay;
          });
        }

        const totalPatientsCount = patients.length;
        const totalActiveCount = patients.filter(p => p.isActive).length;
        const totalDischargedCount = patients.filter(p => !p.isActive).length;
        const totalOutstandingDues = patients.reduce((s, p) => s + p.overallRemaining, 0);

        setReportData({
          patients,
          totalPatientsCount,
          totalActiveCount,
          totalDischargedCount,
          totalOutstandingDues,
          reportLabel: label,
          reportFocus,
          generatedAt: new Date().toLocaleString(),
        });
        setGenerated(true);
        return;
      }

      const snap = await getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved')));
      let txns = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      // Filter by date range client-side
      txns = txns.filter((t: any) => {
        if (!t.date) return false;
        const dateObj = toDate(t.date);
        return dateObj >= firstDay && dateObj <= lastDay;
      });

      // Sort by date asc client-side
      txns.sort((a: any, b: any) => {
        const dateA = toDate(a.date).getTime();
        const dateB = toDate(b.date).getTime();
        return dateA - dateB;
      });

      const income = txns.filter((t: any) => t.type === 'income');
      const expense = txns.filter((t: any) => t.type === 'expense');

      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalExpenses = expense.reduce((s: number, t: any) => s + (t.amount || 0), 0);

      const byCategory = (list: any[]) => {
        const map: Record<string, number> = {};
        list.forEach((t: any) => {
          const isFee = 
            t.category === 'patient_fee' || 
            t.category === 'fee' || 
            String(t.category || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('admission');
          const catKey = isFee ? 'patient_fee' : t.category;
          map[catKey] = (map[catKey] || 0) + (t.amount || 0);
        });
        return map;
      };

      // Fetch active patients and their monthly fee records
      const patientsSnap = await getDocs(query(collection(db, 'rehab_patients'), where('isActive', '==', true)));
      const patients = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const feesSnap = await getDocs(collection(db, 'rehab_fees'));
      const allFees = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const txnAllSnap = await getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved')));
      const allTxnsForDues = txnAllSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      const monthFees = allFees.filter(fee => fee.month === monthStr);

      const patientFeesBreakdown = patients.map(patient => {
        const patientFeeRecord = monthFees.find(f => f.patientId === patient.id);
        const amountPaidThisMonth = patientFeeRecord ? Number(patientFeeRecord.amountPaid || 0) : 0;
        const expectedFee = Number(patient.packageAmount || 60000);
        
        // Calculate paid specifically in selected range (e.g. daily, weekly, monthly)
        const patientPeriodTxns = txns.filter((t: any) => {
          if (t.patientId !== patient.id) return false;
          return (
            t.category === 'patient_fee' ||
            t.category === 'fee' ||
            String(t.category || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('fee') ||
            String(t.categoryName || '').toLowerCase().includes('admission')
          );
        });
        const paidInPeriod = patientPeriodTxns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        return {
          id: patient.id,
          name: patient.name,
          inpatientNumber: patient.inpatientNumber || patient.serialNumber || '—',
          expectedFee,
          paidInPeriod,
          amountPaidThisMonth,
          overallRemaining: calculatePatientOverallRemaining(patient, allTxnsForDues)
        };
      });

      const totalPatientFeesCollectedInPeriod = patientFeesBreakdown.reduce((sum, p) => sum + p.paidInPeriod, 0);
      const totalPatientOutstandingDues = patientFeesBreakdown.reduce((sum, p) => sum + p.overallRemaining, 0);

      setReportData({
        txns,
        income,
        expense,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        incomeByCategory: byCategory(income),
        expenseByCategory: byCategory(expense),
        reportLabel: label,
        reportFocus, // Storing selected report focus type
        generatedAt: new Date().toLocaleString(),
        patientFeesBreakdown,
        totalPatientFeesCollectedInPeriod,
        totalPatientOutstandingDues
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
      const filename = `rehab-report-${reportFocus}-${reportType}-${Date.now()}.png`;
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

          #rehab-report-print {
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
              <FileBarChart className="w-6 h-6 text-teal-600" /> Financial Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Generate approved transaction reports for any day, week, or month</p>
          </div>
          {generated && (
            <div className="flex gap-3">
              <button onClick={handleDownloadImage} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-teal-700">
                <Download className="w-4 h-4" /> Download as Image
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-gray-900">
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
                    reportType === t ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-755'
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
                Remaining Dues Report
              </button>
              <button
                onClick={() => setReportFocus('patients')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  reportFocus === 'patients' ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Patient List Report
              </button>
            </div>
          </div>

          {reportFocus === 'patients' && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient Status Group Filter */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Patient Status Filter</label>
                  <div className="flex bg-gray-150 p-1 rounded-xl w-full">
                    {(['all', 'active', 'discharged'] as const).map(group => (
                      <button
                        key={group}
                        type="button"
                        onClick={() => setPatientGroup(group)}
                        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                          patientGroup === group ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter by Date Range Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date Range Filter Type</label>
                  <select
                    value={filterByDateType}
                    onChange={e => setFilterByDateType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-black font-bold"
                  >
                    <option value="none">Show All Matching Patients (No Date Filter)</option>
                    <option value="admission">Filter by Admission Date falling in Selected Period</option>
                    <option value="discharge">Filter by Discharge Date falling in Selected Period</option>
                  </select>
                </div>
              </div>

              {/* Column Selector Checkboxes */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Include Columns in Report</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {[
                    { key: 'name', label: 'Patient Name' },
                    { key: 'inpatientNumber', label: 'Inpatient #' },
                    { key: 'address', label: 'Address' },
                    { key: 'admissionDate', label: 'Admission Date' },
                    { key: 'dischargeDate', label: 'Discharge Date' },
                    { key: 'remaining', label: 'Remaining Dues' },
                    { key: 'substanceOfAddiction', label: 'Substance' },
                    { key: 'monthlyPackage', label: 'Monthly Package' },
                    { key: 'guardianPhone', label: 'Guardian Phone' },
                  ].map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColumns[col.key] || false}
                        onChange={e => setSelectedColumns(prev => ({ ...prev, [col.key]: e.target.checked }))}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-end pt-2">
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
          <div id="rehab-report-print" ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-8">

            {/* Report Header */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-2xl font-black text-gray-900">Khan Hub Rehab Center</h2>
              <p className="text-lg font-bold text-teal-700 mt-1">
                {reportData.reportLabel} — {
                  reportData.reportFocus === 'income' 
                    ? 'Income Report' 
                    : reportData.reportFocus === 'remaining' 
                    ? 'Remaining Dues Report' 
                    : 'Patient List Report'
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">Generated: {reportData.generatedAt}</p>
            </div>

            {/* Summary Stats */}
            {reportData.reportFocus === 'patients' ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl text-center">
                  <Users className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Total Matching</div>
                  <div className="text-2xl font-black text-teal-800">{reportData.totalPatientsCount}</div>
                </div>
                <div className="bg-green-50 border border-green-100 p-5 rounded-2xl text-center">
                  <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Active Patients</div>
                  <div className="text-2xl font-black text-green-800">{reportData.totalActiveCount}</div>
                </div>
                <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-center">
                  <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Discharged</div>
                  <div className="text-2xl font-black text-red-750">{reportData.totalDischargedCount}</div>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl text-center">
                  <DollarSign className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Total Dues</div>
                  <div className="text-2xl font-black text-orange-850">{formatPKR(reportData.totalOutstandingDues)}</div>
                </div>
              </div>
            ) : (
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
                  <DollarSign className={`w-6 h-6 mx-auto mb-2 ${reportData.netBalance >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${reportData.netBalance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Net Balance</div>
                  <div className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-green-800' : 'text-orange-600'}`}>{formatPKR(reportData.netBalance)}</div>
                </div>
              </div>
            )}

            {reportData.reportFocus === 'patients' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-600" /> Patient List Details
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-50 text-gray-650 border-b border-gray-200 select-none">
                        <tr>
                          {selectedColumns.name && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                              <div className="flex items-center gap-1">
                                Patient Name
                                {sortField === 'name' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.inpatientNumber && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('inpatientNumber')}>
                              <div className="flex items-center gap-1">
                                Inpatient Number
                                {sortField === 'inpatientNumber' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.address && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('address')}>
                              <div className="flex items-center gap-1">
                                Address
                                {sortField === 'address' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.guardianPhone && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('guardianPhone')}>
                              <div className="flex items-center gap-1">
                                Contact
                                {sortField === 'guardianPhone' ? (
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
                          {selectedColumns.dischargeDate && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('dischargeDate')}>
                              <div className="flex items-center gap-1">
                                Discharge Date
                                {sortField === 'dischargeDate' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.substanceOfAddiction && (
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('substanceOfAddiction')}>
                              <div className="flex items-center gap-1">
                                Substance of Addiction
                                {sortField === 'substanceOfAddiction' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                          )}
                          {selectedColumns.monthlyPackage && (
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('monthlyPackage')}>
                              <div className="flex items-center justify-end gap-1">
                                Monthly Package
                                {sortField === 'monthlyPackage' ? (
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {getSortedPatients().map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            {selectedColumns.name && (
                              <td className="px-3 py-2.5 text-gray-850 font-bold">
                                {p.name}
                                {!p.isActive && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Discharged</span>}
                              </td>
                            )}
                            {selectedColumns.inpatientNumber && <td className="px-3 py-2.5 text-gray-550 font-mono">{p.inpatientNumber}</td>}
                            {selectedColumns.address && <td className="px-3 py-2.5 text-gray-600">{p.address}</td>}
                            {selectedColumns.guardianPhone && <td className="px-3 py-2.5 text-gray-600">{p.guardianPhone}</td>}
                            {selectedColumns.admissionDate && <td className="px-3 py-2.5 text-gray-650">{formatDateDMY(p.admissionDate)}</td>}
                            {selectedColumns.dischargeDate && (
                              <td className="px-3 py-2.5 text-gray-650">
                                {p.dischargeDate ? formatDateDMY(p.dischargeDate) : '—'}
                              </td>
                            )}
                            {selectedColumns.substanceOfAddiction && <td className="px-3 py-2.5 text-gray-600">{p.substanceOfAddiction}</td>}
                            {selectedColumns.monthlyPackage && <td className="px-3 py-2.5 text-right text-gray-800">{formatPKR(p.monthlyPackage)}</td>}
                            {selectedColumns.remaining && (
                              <td className={`px-3 py-2.5 text-right font-black ${p.overallRemaining > 0 ? 'text-rose-600 bg-rose-50/20' : 'text-blue-700 bg-blue-50/20'}`}>
                                {formatPKR(p.overallRemaining)}
                              </td>
                            )}
                          </tr>
                        ))}
                        {getSortedPatients().length === 0 && (
                          <tr>
                            <td colSpan={Object.values(selectedColumns).filter(Boolean).length} className="px-3 py-8 text-center text-gray-400 italic">
                              No patient records found matching the criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : reportData.txns.length === 0 && reportData.reportFocus === 'income' ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl text-gray-500">
                No approved transactions found for the selected period.
              </div>
            ) : (
              <>
                {/* Income Breakdown */}
                {reportData.reportFocus === 'income' && Object.keys(reportData.incomeByCategory).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-500" /> Income Breakdown</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-teal-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-teal-800">Category</th>
                            <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-teal-800">Amount (PKR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.incomeByCategory).map(([cat, amt]: any) => (
                            <tr key={cat} className="hover:bg-gray-50 border-b border-gray-100">
                              <td className="px-4 py-3 text-gray-700 font-medium">{formatCat(cat)}</td>
                              <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatPKR(amt)}</td>
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
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-red-700">Category</th>
                            <th className="border-b border-gray-200 px-4 py-3 text-right font-bold text-red-700">Amount (PKR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.expenseByCategory).map(([cat, amt]: any) => (
                            <tr key={cat} className="hover:bg-gray-50 border-b border-gray-100">
                              <td className="px-4 py-3 text-gray-700 font-medium">{formatCat(cat)}</td>
                              <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatPKR(amt)}</td>
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

                {/* Patient Fee Collection Breakdown */}
                {reportData.patientFeesBreakdown && reportData.patientFeesBreakdown.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-600" /> {reportData.reportFocus === 'income' ? 'Patient Fee Collections' : 'Outstanding Patient Dues'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Period Collections</div>
                        <div className="text-xl font-black text-teal-800">{formatPKR(reportData.totalPatientFeesCollectedInPeriod)}</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Total Outstanding Remaining Dues</div>
                        <div className="text-xl font-black text-orange-850">{formatPKR(reportData.totalPatientOutstandingDues)}</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-650 border-b border-gray-200 select-none">
                          <tr>
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                              <div className="flex items-center gap-1">
                                Patient Name
                                {sortField === 'name' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-left font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('inpatientNumber')}>
                              <div className="flex items-center gap-1">
                                Inpatient Number
                                {sortField === 'inpatientNumber' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('expectedFee')}>
                              <div className="flex items-center justify-end gap-1">
                                Monthly Package
                                {sortField === 'expectedFee' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-teal-800 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('paidInPeriod')}>
                              <div className="flex items-center justify-end gap-1">
                                Paid in Selected Period
                                {sortField === 'paidInPeriod' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-indigo-800 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amountPaidThisMonth')}>
                              <div className="flex items-center justify-end gap-1">
                                Paid in Month Total
                                {sortField === 'amountPaidThisMonth' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right font-bold text-rose-700 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('overallRemaining')}>
                              <div className="flex items-center justify-end gap-1">
                                Total Remaining Dues
                                {sortField === 'overallRemaining' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 text-rose-450" />
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {getSortedPatientFees().map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5 text-gray-850 font-bold">{p.name}</td>
                              <td className="px-3 py-2.5 text-gray-550 font-mono">{p.inpatientNumber}</td>
                              <td className="px-3 py-2.5 text-right text-gray-800">{formatPKR(p.expectedFee)}</td>
                              <td className="px-3 py-2.5 text-right text-teal-800 font-bold bg-teal-50/20">{formatPKR(p.paidInPeriod)}</td>
                              <td className="px-3 py-2.5 text-right text-indigo-700 font-black bg-indigo-50/30">{formatPKR(p.amountPaidThisMonth)}</td>
                              <td className={`px-3 py-2.5 text-right font-black ${p.overallRemaining > 0 ? 'text-rose-600 bg-rose-50/20' : 'text-blue-700 bg-blue-50/20'}`}>{formatPKR(p.overallRemaining)}</td>
                            </tr>
                          ))}
                          {getSortedPatientFees().length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-8 text-center text-gray-400 italic">
                                No records found for this category.
                              </td>
                            </tr>
                          )}
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
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Patient Name</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Type</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Category</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Description</th>
                            <th className="px-3 py-3 text-right font-bold text-gray-600">Amount</th>
                            <th className="px-3 py-3 text-left font-bold text-gray-600">Cashier Signature</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.txns.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50 border-b border-gray-100">
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</td>
                              <td className="px-3 py-2.5 text-gray-850 font-bold whitespace-nowrap">{t.patientName || '—'}</td>
                              <td className="px-3 py-2.5">
                                <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span>
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 font-medium">{formatCat(t.category)}</td>
                              <td className="px-3 py-2.5 text-gray-500 max-w-[200px] truncate" title={t.description}>{t.description || '—'}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatPKR(t.amount)}</td>
                              <td className="px-3 py-2.5 text-gray-550 font-mono text-[10px]">{t.cashierId || t.submittedBy || '—'}</td>
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
