// src/app/departments/hospital/dashboard/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc, setDoc
} from 'firebase/firestore';
import {
  TrendingUp, TrendingDown, Users, Activity, Loader2,
  Plus, FileText, UserCircle, LayoutDashboard, Receipt, ArrowUpRight, ArrowDownRight, X, Calendar, BarChart3, Wallet, CheckCircle2
} from 'lucide-react';
import { formatDateDMY, toDate } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { toast } from 'react-hot-toast';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

const CATEGORY_LABELS: Record<string, string> = {
  opd_reception: 'OPD Reception',
  lab_test: 'Lab Test',
  operation: 'Operation',
  staff_salary: 'Staff Salary',
  utilities: 'Utilities',
  other_expense: 'Other Expense',
  other_income: 'Other Income',
  fee: 'Admission / Fees',
  canteen: 'Canteen Ledger'
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const formatTxDateTime = (timestamp: any) => {
  if (!timestamp) return '—';
  const d = toDate(timestamp);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr} - ${timeStr}`;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsTab, setAnalyticsTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const [selectedDateStr, setSelectedDateStr] = useState(() => getLocalDateString());

  const [stats, setStats] = useState({
    // Daily
    dailyIncome: 0,
    dailyExpense: 0,
    dailyOpdCount: 0,
    dailyLabCount: 0,
    dailyOpCount: 0,
    dailyOpdBreakdown: { morning: { count: 0, amount: 0 }, evening: { count: 0, amount: 0 } },
    dailyLabBreakdown: { count: 0, amount: 0 },
    dailyOpBreakdown: { count: 0, amount: 0 },
    
    // Weekly
    weeklyIncome: 0,
    weeklyExpense: 0,
    weeklyOpdCount: 0,
    weeklyLabCount: 0,
    weeklyOpCount: 0,
    weeklyOpdAmount: 0,
    weeklyLabAmount: 0,
    weeklyOpAmount: 0,
    
    // Monthly
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlyOpdCount: 0,
    monthlyLabCount: 0,
    monthlyOpCount: 0,
    monthlyOpdAmount: 0,
    monthlyLabAmount: 0,
    monthlyOpAmount: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);

  // Day-Close Stats State
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [submittingStats, setSubmittingStats] = useState(false);
  const [statsForm, setStatsForm] = useState({
    date: getLocalDateString(),
    checkupCount: '',
    usgCount: '',
    labTestsCount: '',
    operationsCount: ''
  });

  // Left Patients State
  const [leftPatients, setLeftPatients] = useState<any[]>([]);
  const [showLeftPatientModal, setShowLeftPatientModal] = useState(false);
  const [addingLeftPatient, setAddingLeftPatient] = useState(false);
  const [leftPatientForm, setLeftPatientForm] = useState({
    fullName: '',
    address: '',
    phone: '',
    remaining: '',
    disease: '',
    date: getLocalDateString()
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) { router.push('/departments/hospital/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/hospital/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard(selectedDateStr);
  }, [session, selectedDateStr]);

  const loadDashboard = async (targetDateStr?: string) => {
    try {
      setLoading(true);
      const dateStr = targetDateStr || selectedDateStr;

      // Selected date components
      const parts = dateStr.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);

      const selectedDate = new Date(year, month, day);

      // Boundaries for the containing calendar month
      const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Boundaries for the 7-day week ending on the selected date
      const weeklyStart = new Date(year, month, day - 6, 0, 0, 0, 0);
      const weeklyEnd = new Date(year, month, day, 23, 59, 59, 999);

      // Query hospital_transactions for the entire month
      const monthQuery = query(
        collection(db, 'hospital_transactions'),
        where('departmentCode', '==', 'hospital'),
        where('date', '>=', Timestamp.fromDate(monthStart)),
        where('date', '<=', Timestamp.fromDate(monthEnd)),
        orderBy('date', 'asc')
      );
      const monthSnap = await getDocs(monthQuery);

      let dailyInc = 0, dailyExp = 0;
      let dailyOpd = 0, dailyLab = 0, dailyOp = 0;
      const dailyOpdBr = { morning: { count: 0, amount: 0 }, evening: { count: 0, amount: 0 } };
      const dailyLabBr = { count: 0, amount: 0 };
      const dailyOpBr = { count: 0, amount: 0 };

      let weeklyInc = 0, weeklyExp = 0;
      let weeklyOpd = 0, weeklyLab = 0, weeklyOp = 0;
      let weeklyOpdAm = 0, weeklyLabAm = 0, weeklyOpAm = 0;

      let monthlyInc = 0, monthlyExp = 0;
      let monthlyOpd = 0, monthlyLab = 0, monthlyOp = 0;
      let monthlyOpdAm = 0, monthlyLabAmount = 0, monthlyOpAmount = 0;

      // Setup charts maps
      const weeklyDays: Record<string, { name: string, income: number, expense: number }> = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(year, month, day - (6 - i));
        const dStr = getLocalDateString(d);
        weeklyDays[dStr] = {
          name: dayNames[d.getDay()],
          income: 0,
          expense: 0
        };
      }

      const monthlyDays: Record<string, { dateStr: string, dayNum: number, income: number, expense: number }> = {};
      const numDays = monthEnd.getDate();
      for (let i = 1; i <= numDays; i++) {
        const d = new Date(year, month, i);
        const dStr = getLocalDateString(d);
        monthlyDays[dStr] = {
          dateStr: `${i} ${selectedDate.toLocaleString('en-US', { month: 'short' })}`,
          dayNum: i,
          income: 0,
          expense: 0
        };
      }

      monthSnap.docs.forEach(doc => {
        const tx = doc.data();
        const amount = Number(tx.amount) || 0;
        const category = tx.category;
        const status = tx.status;
        const txDate = toDate(tx.date);
        const dStr = getLocalDateString(txDate);

        const isDaily = isSameDay(txDate, selectedDate);
        const isWeekly = txDate.getTime() >= weeklyStart.getTime() && txDate.getTime() <= weeklyEnd.getTime();
        const isMonthly = true; 

        if (status === 'approved') {
          // Accumulate sums
          if (tx.type === 'income') {
            if (isDaily) dailyInc += amount;
            if (isWeekly) weeklyInc += amount;
            if (isMonthly) monthlyInc += amount;
          } else if (tx.type === 'expense') {
            if (isDaily) dailyExp += amount;
            if (isWeekly) weeklyExp += amount;
            if (isMonthly) monthlyExp += amount;
          }

          // Populate charts
          if (weeklyDays[dStr]) {
            if (tx.type === 'income') weeklyDays[dStr].income += amount;
            else if (tx.type === 'expense') weeklyDays[dStr].expense += amount;
          }
          if (monthlyDays[dStr]) {
            if (tx.type === 'income') monthlyDays[dStr].income += amount;
            else if (tx.type === 'expense') monthlyDays[dStr].expense += amount;
          }
        }

        // Categorized counts
        if (category === 'opd_reception') {
          if (isDaily) {
            dailyOpd++;
            const shift = tx.hospitalMeta?.shift === 'evening' ? 'evening' : 'morning';
            dailyOpdBr[shift].count++;
            dailyOpdBr[shift].amount += amount;
          }
          if (isWeekly) {
            weeklyOpd++;
            if (status === 'approved') weeklyOpdAm += amount;
          }
          if (isMonthly) {
            monthlyOpd++;
            if (status === 'approved') monthlyOpdAm += amount;
          }
        } else if (category === 'lab_test') {
          if (isDaily) {
            dailyLab++;
            dailyLabBr.count++;
            dailyLabBr.amount += amount;
          }
          if (isWeekly) {
            weeklyLab++;
            if (status === 'approved') weeklyLabAm += amount;
          }
          if (isMonthly) {
            monthlyLab++;
            if (status === 'approved') monthlyLabAmount += amount;
          }
        } else if (category === 'operation') {
          if (isDaily) {
            dailyOp++;
            dailyOpBr.count++;
            dailyOpBr.amount += amount;
          }
          if (isWeekly) {
            weeklyOp++;
            if (status === 'approved') weeklyOpAm += amount;
          }
          if (isMonthly) {
            monthlyOp++;
            if (status === 'approved') monthlyOpAmount += amount;
          }
        }
      });

      setStats({
        dailyIncome: dailyInc,
        dailyExpense: dailyExp,
        dailyOpdCount: dailyOpd,
        dailyLabCount: dailyLab,
        dailyOpCount: dailyOp,
        dailyOpdBreakdown: dailyOpdBr,
        dailyLabBreakdown: dailyLabBr,
        dailyOpBreakdown: dailyOpBr,

        weeklyIncome: weeklyInc,
        weeklyExpense: weeklyExp,
        weeklyOpdCount: weeklyOpd,
        weeklyLabCount: weeklyLab,
        weeklyOpCount: weeklyOp,
        weeklyOpdAmount: weeklyOpdAm,
        weeklyLabAmount: weeklyLabAm,
        weeklyOpAmount: weeklyOpAm,

        monthlyIncome: monthlyInc,
        monthlyExpense: monthlyExp,
        monthlyOpdCount: monthlyOpd,
        monthlyLabCount: monthlyLab,
        monthlyOpCount: monthlyOp,
        monthlyOpdAmount: monthlyOpdAm,
        monthlyLabAmount: monthlyLabAmount,
        monthlyOpAmount: monthlyOpAmount,
      });

      setWeeklyChartData(Object.values(weeklyDays));
      setMonthlyChartData(Object.values(monthlyDays));

      // Filter transactions for the selected date to show in the table
      const dailyTxList = monthSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((tx: any) => {
          const txDate = toDate(tx.date);
          return isSameDay(txDate, selectedDate);
        })
        .sort((a: any, b: any) => toDate(b.date).getTime() - toDate(a.date).getTime());
      
      setRecentTransactions(dailyTxList);

      // Fetch Day-Close Stats for the selected date
      const dailyDocRef = doc(db, 'hospital_daily_stats', dateStr);
      const dailyDocSnap = await getDoc(dailyDocRef);
      
      if (dailyDocSnap.exists()) {
        const ds = dailyDocSnap.data();
        setDailyStats(ds);
        setStatsForm({
          date: dateStr,
          checkupCount: String(ds.checkupCount || 0),
          usgCount: String(ds.usgCount || 0),
          labTestsCount: String(ds.labTestsCount || 0),
          operationsCount: String(ds.operationsCount || 0)
        });
      } else {
        setDailyStats(null);
        setStatsForm({
          date: dateStr,
          checkupCount: String(dailyOpd),
          usgCount: '0',
          labTestsCount: String(dailyLab),
          operationsCount: String(dailyOp)
        });
      }

      // Fetch Left Patients (Outstanding Amounts)
      const leftQuery = query(
        collection(db, 'hospital_patients'),
        where('remaining', '>', 0)
      );
      const leftSnap = await getDocs(leftQuery);
      const leftList = leftSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => Number(b.remaining) - Number(a.remaining));
      setLeftPatients(leftList);

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChangeInStatsForm = async (selectedDateStr: string) => {
    try {
      setStatsForm(prev => ({
        ...prev,
        date: selectedDateStr
      }));
      
      const dailyDocRef = doc(db, 'hospital_daily_stats', selectedDateStr);
      const dailyDocSnap = await getDoc(dailyDocRef);
      if (dailyDocSnap.exists()) {
        const ds = dailyDocSnap.data();
        setStatsForm({
          date: selectedDateStr,
          checkupCount: String(ds.checkupCount || 0),
          usgCount: String(ds.usgCount || 0),
          labTestsCount: String(ds.labTestsCount || 0),
          operationsCount: String(ds.operationsCount || 0)
        });
      } else {
        // Query dynamic transactions for that date
        const parts = selectedDateStr.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        const dateStart = new Date(year, month, day, 0, 0, 0, 0);
        const dateEnd = new Date(year, month, day, 23, 59, 59, 999);
        
        const customQuery = query(
          collection(db, 'hospital_transactions'),
          where('departmentCode', '==', 'hospital'),
          where('date', '>=', Timestamp.fromDate(dateStart)),
          where('date', '<=', Timestamp.fromDate(dateEnd)),
          orderBy('date', 'desc')
        );
        const customSnap = await getDocs(customQuery);
        
        let opdC = 0;
        let labC = 0;
        let opC = 0;
        
        customSnap.docs.forEach(doc => {
          const tx = doc.data();
          const category = tx.category;
          if (category === 'opd_reception') opdC++;
          else if (category === 'lab_test') labC++;
          else if (category === 'operation') opC++;
        });
        
        setStatsForm({
          date: selectedDateStr,
          checkupCount: String(opdC),
          usgCount: '0',
          labTestsCount: String(labC),
          operationsCount: String(opC)
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStats = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingStats(true);
      const targetDateStr = statsForm.date || getLocalDateString();
      const dailyDocRef = doc(db, 'hospital_daily_stats', targetDateStr);
      
      const checkupCount = Number(statsForm.checkupCount) || 0;
      const usgCount = Number(statsForm.usgCount) || 0;
      const operationsCount = Number(statsForm.operationsCount) || 0;
      
      const dataToSave = {
        checkupCount,
        usgCount,
        patientsCount: checkupCount + usgCount + operationsCount,
        labTestsCount: Number(statsForm.labTestsCount) || 0,
        operationsCount,
        reportedBy: session.uid,
        reportedByName: session.displayName || session.name || 'Hospital Admin',
        reportedAt: Timestamp.now()
      };

      await setDoc(dailyDocRef, dataToSave);
      toast.success('Day-Close operational report saved successfully ✓');
      setShowStatsModal(false);
      loadDashboard(selectedDateStr);
    } catch (error) {
      console.error('Error saving stats:', error);
      toast.error('Failed to save day-close stats');
    } finally {
      setSubmittingStats(false);
    }
  };

  const handleAddLeftPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddingLeftPatient(true);
      const remainingAmount = Number(leftPatientForm.remaining);
      const newPatientRef = doc(collection(db, 'hospital_patients'));

      const dateObj = new Date(leftPatientForm.date);
      const now = new Date();
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      const createdAtTimestamp = Timestamp.fromDate(dateObj);

      await setDoc(newPatientRef, {
        fullName: leftPatientForm.fullName,
        address: leftPatientForm.address,
        phone: leftPatientForm.phone,
        disease: leftPatientForm.disease,
        remaining: remainingAmount,
        totalPackageAmount: remainingAmount,
        totalReceived: 0,
        createdAt: createdAtTimestamp,
        createdBy: session.uid,
        isActive: true
      });
      toast.success('Left patient added successfully');
      setShowLeftPatientModal(false);
      setLeftPatientForm({ 
        fullName: '', 
        address: '', 
        phone: '', 
        remaining: '', 
        disease: '',
        date: getLocalDateString()
      });
      loadDashboard(selectedDateStr);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add left patient');
    } finally {
      setAddingLeftPatient(false);
    }
  };

  const handleMarkAsPaid = async (patient: any) => {
    const amountStr = window.prompt(`Enter amount paid by ${patient.fullName || patient.name || 'patient'} (Remaining: ₨ ${patient.remaining}):`, String(patient.remaining));
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount entered');
      return;
    }
    try {
      const txRef = doc(collection(db, 'hospital_transactions'));
      await setDoc(txRef, {
        departmentCode: 'hospital',
        type: 'income',
        amount: amount,
        category: 'other_income',
        patientId: patient.id,
        patientName: patient.fullName || patient.name || 'Unknown Patient',
        description: `Payment for outstanding amount`,
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
        createdBy: session.uid,
        createdByName: session.displayName || session.name,
        status: 'pending_cashier'
      });
      toast.success('Payment submitted for cashier approval');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Analytics tab calculations
  const currentIncome = 
    analyticsTab === 'daily' ? stats.dailyIncome :
    analyticsTab === 'weekly' ? stats.weeklyIncome : stats.monthlyIncome;

  const currentExpense = 
    analyticsTab === 'daily' ? stats.dailyExpense :
    analyticsTab === 'weekly' ? stats.weeklyExpense : stats.monthlyExpense;

  const currentNet = currentIncome - currentExpense;

  const currentOPD = 
    analyticsTab === 'daily' 
      ? (dailyStats ? dailyStats.patientsCount : stats.dailyOpdCount)
      : (analyticsTab === 'weekly' ? stats.weeklyOpdCount : stats.monthlyOpdCount);

  const currentLabs = 
    analyticsTab === 'daily'
      ? (dailyStats ? dailyStats.labTestsCount : stats.dailyLabCount)
      : (analyticsTab === 'weekly' ? stats.weeklyLabCount : stats.monthlyLabCount);

  const currentOps = 
    analyticsTab === 'daily'
      ? (dailyStats ? dailyStats.operationsCount : stats.dailyOpCount)
      : (analyticsTab === 'weekly' ? stats.weeklyOpCount : stats.monthlyOpCount);

  const currentOPDAmount = 
    analyticsTab === 'daily'
      ? (stats.dailyOpdBreakdown.morning.amount + stats.dailyOpdBreakdown.evening.amount)
      : (analyticsTab === 'weekly' ? stats.weeklyOpdAmount : stats.monthlyOpdAmount);

  const currentLabAmount = 
    analyticsTab === 'daily'
      ? stats.dailyLabBreakdown.amount
      : (analyticsTab === 'weekly' ? stats.weeklyLabAmount : stats.monthlyLabAmount);

  const currentOpAmount = 
    analyticsTab === 'daily'
      ? stats.dailyOpBreakdown.amount
      : (analyticsTab === 'weekly' ? stats.weeklyOpAmount : stats.monthlyOpAmount);

  return (
    <div className="space-y-6 pb-10 w-full overflow-x-hidden">

      {/* Greeting & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {getGreeting()}, {session?.displayName?.split(' ')?.[0] || 'Admin'} 👋
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
            {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link 
            href={session?.role === 'superadmin' ? "/departments/hospital/dashboard/superadmin/reports" : "/departments/hospital/dashboard/admin/reports"}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-[11px] font-black hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 dark:shadow-none text-center"
          >
            <BarChart3 size={14} /> Reports
          </Link>
          <Link 
            href="/hq/dashboard/cashier"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-black transition-all shadow-md shadow-slate-100 dark:shadow-none text-center"
          >
            <Wallet size={14} /> Cashier
          </Link>
          <Link 
            href="/departments/hospital/dashboard/admin/patients"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black hover:bg-blue-700 transition-all shadow-md shadow-blue-100 dark:shadow-none text-center"
          >
            <FileText size={14} /> Records
          </Link>
          <Link 
            href="/departments/hospital/dashboard/profile"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-xl text-[11px] font-black hover:bg-gray-600 transition-all shadow-md shadow-gray-100 dark:shadow-none text-center"
          >
            <UserCircle size={14} /> Profile
          </Link>
        </div>
      </div>

      {/* Control Panel: Date Selector & Analytics Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm">
        {/* Toggle tabs */}
        <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-2xl w-full lg:w-auto">
          {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAnalyticsTab(tab)}
              className={`flex-1 lg:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                analyticsTab === tab
                  ? 'bg-white dark:bg-emerald-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Date Selector input */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/10 p-2.5 rounded-2xl border border-gray-200/50 dark:border-white/5 w-full lg:w-auto justify-center lg:justify-start">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Selected Date:</span>
          <input 
            type="date"
            value={selectedDateStr}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-black text-gray-700 dark:text-white cursor-pointer"
          />
        </div>
      </div>

      {/* Day-Close Operational Stats Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 md:p-8 rounded-[2rem] border border-slate-700/30 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
          <Activity size={180} className="text-indigo-400" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${dailyStats ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'}`}>
                {dailyStats ? 'Day-Close Active ✓' : 'Day-Close Pending'}
              </span>
              <span className="text-xs text-slate-400 font-bold">Official Operational Stats</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              {dailyStats ? "Verified report has been filed" : "Day-Close report is pending submission"}
            </h2>
            <p className="text-xs text-slate-300 font-medium max-w-xl">
              {dailyStats 
                ? `Filed by ${dailyStats.reportedByName || 'Admin'} at ${dailyStats.reportedAt?.toDate?.() ? dailyStats.reportedAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}. These values override dynamic transaction counts.`
                : `Submit verified patient visits, conducted lab tests, and completed operations for ${new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`}
            </p>
          </div>
          <button
            onClick={() => {
              setShowStatsModal(true);
              handleDateChangeInStatsForm(selectedDateStr);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 whitespace-nowrap border border-indigo-500/20"
          >
            <Plus size={16} />
            {dailyStats ? 'Update Day-Close Stats' : 'Submit Day-Close Stats'}
          </button>
        </div>

        {dailyStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/50">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Check-ups</p>
              <p className="text-lg md:text-xl font-black text-white mt-1">{dailyStats.checkupCount || 0}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">USG</p>
              <p className="text-lg md:text-xl font-black text-white mt-1">{dailyStats.usgCount || 0}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operations</p>
              <p className="text-lg md:text-xl font-black text-white mt-1">{dailyStats.operationsCount || 0}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Labs</p>
              <p className="text-lg md:text-xl font-black text-white mt-1">{dailyStats.labTestsCount || 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* Row 1: 4 Stat Cards (Dynamic based on selected tab) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">Income</span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white truncate">₨ {currentIncome.toLocaleString()}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-tight">
            {analyticsTab === 'daily' ? "Day's Total" : analyticsTab === 'weekly' ? "Week's Total" : "Month's Total"}
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown size={24} />
            </div>
            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">Expense</span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white truncate">₨ {currentExpense.toLocaleString()}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-tight">
            {analyticsTab === 'daily' ? "Day's Total" : analyticsTab === 'weekly' ? "Week's Total" : "Month's Total"}
          </div>
        </div>

        {/* Net Status Card */}
        <div className={`bg-white dark:bg-white/5 p-6 rounded-3xl border ${currentNet >= 0 ? 'border-emerald-100 dark:border-emerald-500/30' : 'border-rose-100 dark:border-rose-500/30'} shadow-sm transition-all hover:shadow-md group`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl ${currentNet >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              {currentNet >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
            </div>
            <span className={`text-[10px] font-black ${currentNet >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'} px-2.5 py-1 rounded-full uppercase tracking-widest`}>Net status</span>
          </div>
          <div className={`text-2xl font-black ${currentNet >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'} truncate`}>
            ₨ {Math.abs(currentNet).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-tight">{currentNet >= 0 ? 'Net Profit' : 'Net Loss'}</div>
        </div>

        {/* Patient Volume Card */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
              {analyticsTab === 'daily' ? (dailyStats ? 'Verified' : 'Dynamic') : 'Total'}
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white truncate">
            {currentOPD}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-tight">
            {analyticsTab === 'daily' ? "Today's OPD" : analyticsTab === 'weekly' ? "Week's OPD" : "Month's OPD"}
          </div>
        </div>
      </div>

      {/* Row 2: Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2/3 width): Analytics Charts */}
        <div className="lg:col-span-2 bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-500" /> 
              {analyticsTab === 'daily' && "Daily Trend (Selected Week)"}
              {analyticsTab === 'weekly' && "Weekly Trend (7 Days Ending Selected Date)"}
              {analyticsTab === 'monthly' && `Monthly Trend (${new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`}
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /> Income</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-500" /> Expense</div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {analyticsTab === 'monthly' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis 
                    dataKey="dayNum" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `₨${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', opacity: 0.1 }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1f2937', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val: any) => [`₨ ${val.toLocaleString()}`, '']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `₨${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', opacity: 0.1 }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1f2937', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val: any) => [`₨ ${val.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right (1/3 width): Period's Breakdown */}
        <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h2 className="font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5 text-blue-500" /> 
              {analyticsTab === 'daily' ? "Today's Breakdown" : analyticsTab === 'weekly' ? "Weekly Breakdown" : "Monthly Breakdown"}
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between group hover:bg-white dark:hover:bg-white/10 hover:border-emerald-100 dark:hover:border-emerald-500/30 hover:shadow-sm transition-all underline-offset-4 cursor-default">
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">OPD Patients</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {currentOPD} {analyticsTab === 'daily' && (dailyStats ? '(Verified)' : '(Dynamic)')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-600 dark:text-emerald-400 font-black">₨ {currentOPDAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between group hover:bg-white dark:hover:bg-white/10 hover:border-blue-100 dark:hover:border-blue-500/30 hover:shadow-sm transition-all underline-offset-4 cursor-default">
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Lab Tests</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {currentLabs} {analyticsTab === 'daily' && (dailyStats ? '(Verified)' : '(Dynamic)')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 dark:text-blue-400 font-black">₨ {currentLabAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between group hover:bg-white dark:hover:bg-white/10 hover:border-purple-100 dark:hover:border-purple-500/30 hover:shadow-sm transition-all underline-offset-4 cursor-default">
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Operations</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {currentOps} {analyticsTab === 'daily' && (dailyStats ? '(Verified)' : '(Dynamic)')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-purple-600 dark:text-purple-400 font-black">₨ {currentOpAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Management Note</span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-300 font-medium">
              Only approved income and expense transactions are reflected in the net status. Pending transactions require SuperAdmin approval in the HQ portal.
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Daily Transactions Table */}
      <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-50 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-500" /> Daily Transactions
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Transactions for {new Date(selectedDateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <Link 
            href="/departments/hospital/dashboard/admin/patients" 
            className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors text-center w-full sm:w-auto"
          >
            View Full Log
          </Link>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">Date / Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">Service</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">Patient / Recipient</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm font-medium">
                    No transactions found for this date.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatTxDateTime(tx.date)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-700 dark:text-gray-300">{CATEGORY_LABELS[tx.category] || tx.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-600 dark:text-gray-400 truncate max-w-[150px]">
                        {tx.patientName || tx.otherMeta?.paidTo || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}₨ {Number(tx.amount).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`
                        inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider
                        ${tx.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                          tx.status === 'rejected' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 
                          'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}
                      `}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Left Patients (Outstanding Amounts) */}
      <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden mt-6">
        <div className="p-6 md:p-8 border-b border-gray-50 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Wallet className="w-5 h-5 text-rose-500" /> Left Patients / Outstanding Amounts
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Patients with remaining balances</p>
          </div>
          <button 
            onClick={() => setShowLeftPatientModal(true)}
            className="flex items-center justify-center gap-2 text-[10px] font-black text-white bg-rose-600 px-4 py-2.5 rounded-full uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-md shadow-rose-200 w-full sm:w-auto"
          >
            <Plus size={14} /> Add Left Patient
          </button>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">Patient Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5">Contact Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5 text-right">Outstanding</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {leftPatients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm font-medium">
                    No patients with outstanding balances found.
                  </td>
                </tr>
              ) : (
                leftPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[200px]">
                        {patient.fullName || patient.name || 'Unknown Patient'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {patient.disease || 'No disease specified'}
                        </span>
                        {patient.createdAt && (
                          <span className="text-[9px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {formatDateDMY(patient.createdAt)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-700 dark:text-gray-300">{patient.phone || '—'}</p>
                      <p className="text-[10px] font-bold text-gray-400 truncate max-w-[200px] mt-0.5">{patient.address || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                        ₨ {Number(patient.remaining).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleMarkAsPaid(patient)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-emerald-200 dark:border-emerald-500/30"
                      >
                        <CheckCircle2 size={14} /> Mark as Paid
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Input Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <h2 className="text-lg font-black flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-400" />
                Day-Close Operational Stats
              </h2>
              <button 
                onClick={() => setShowStatsModal(false)}
                className="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStats} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Date *</label>
                <input
                  type="date"
                  value={statsForm.date}
                  onChange={e => handleDateChangeInStatsForm(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Check-up Patients *</label>
                  <input
                    type="number"
                    min="0"
                    value={statsForm.checkupCount}
                    onChange={e => setStatsForm({ ...statsForm, checkupCount: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                    placeholder="e.g. 15"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">USG Patients *</label>
                  <input
                    type="number"
                    min="0"
                    value={statsForm.usgCount}
                    onChange={e => setStatsForm({ ...statsForm, usgCount: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                    placeholder="e.g. 10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Lab Tests Conducted Today *</label>
                <input
                  type="number"
                  min="0"
                  value={statsForm.labTestsCount}
                  onChange={e => setStatsForm({ ...statsForm, labTestsCount: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="e.g. 12"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Operations Performed Today *</label>
                <input
                  type="number"
                  min="0"
                  value={statsForm.operationsCount}
                  onChange={e => setStatsForm({ ...statsForm, operationsCount: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="e.g. 2"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStatsModal(false)}
                  className="px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStats}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all"
                >
                  {submittingStats && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Stats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Left Patient Modal */}
      {showLeftPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-600 to-rose-700 text-white">
              <h2 className="text-lg font-black flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-white/80" />
                Add Left Patient
              </h2>
              <button 
                onClick={() => setShowLeftPatientModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLeftPatient} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  value={leftPatientForm.fullName}
                  onChange={e => setLeftPatientForm({ ...leftPatientForm, fullName: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="Patient Name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={leftPatientForm.phone}
                    onChange={e => setLeftPatientForm({ ...leftPatientForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 focus:bg-white transition-all"
                    placeholder="Phone Number"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Remaining Amount *</label>
                  <input
                    type="number"
                    min="1"
                    value={leftPatientForm.remaining}
                    onChange={e => setLeftPatientForm({ ...leftPatientForm, remaining: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 focus:bg-white transition-all"
                    placeholder="₨ 0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Disease</label>
                  <input
                    type="text"
                    value={leftPatientForm.disease}
                    onChange={e => setLeftPatientForm({ ...leftPatientForm, disease: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 focus:bg-white transition-all"
                    placeholder="Condition / Disease"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Date *</label>
                  <input
                    type="date"
                    value={leftPatientForm.date}
                    onChange={e => setLeftPatientForm({ ...leftPatientForm, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Address</label>
                <textarea
                  value={leftPatientForm.address}
                  onChange={e => setLeftPatientForm({ ...leftPatientForm, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 focus:bg-white transition-all resize-none h-24"
                  placeholder="Patient Address"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLeftPatientModal(false)}
                  className="px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLeftPatient}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-200 transition-all"
                >
                  {addingLeftPatient && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
