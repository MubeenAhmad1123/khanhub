'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { toDate } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Calendar, Activity,
  Briefcase, DollarSign, Filter, RefreshCw, BarChart2,
  PieChart as PieIcon, LineChart as LineIcon, CheckCircle,
  HelpCircle, ChevronRight, Layers, ArrowUpRight, ArrowDownRight, Award, Heart
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#ef4444', '#14b8a6', '#0088FE', '#ff9f1c', '#8884d8', '#82ca9d', '#ff7300'];

const DEPT_LABELS: Record<string, string> = {
  rehab: 'Rehab Center',
  spims: 'SPIMS College',
  hospital: 'Hospital',
  jobCenter: 'Job Center'
};

export default function HQSuperAdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'finance' | 'stats'>('finance');
  const [timeRange, setTimeRange] = useState<'30d' | '6m' | '12m'>('6m');
  const [selectedDept, setSelectedDept] = useState<'all' | 'rehab' | 'spims' | 'hospital' | 'jobCenter'>('all');

  // Compare Panel state
  const [compDeptA, setCompDeptA] = useState<string>('hospital');
  const [compDeptB, setCompDeptB] = useState<string>('rehab');

  // Database Data States
  const [rehabPatients, setRehabPatients] = useState<any[]>([]);
  const [spimsStudents, setSpimsStudents] = useState<any[]>([]);
  const [hospitalStats, setHospitalStats] = useState<any[]>([]);
  const [jobSeekers, setJobSeekers] = useState<any[]>([]);
  const [jobEmployers, setJobEmployers] = useState<any[]>([]);

  const [rehabTx, setRehabTx] = useState<any[]>([]);
  const [spimsTx, setSpimsTx] = useState<any[]>([]);
  const [hospitalTx, setHospitalTx] = useState<any[]>([]);
  const [jobTx, setJobTx] = useState<any[]>([]);

  useEffect(() => {
    // Validate session
    const hqSession = localStorage.getItem('hq_session');
    if (!hqSession) { router.push('/hq/login'); return; }
    const parsed = JSON.parse(hqSession);
    if (parsed.role !== 'superadmin') {
      router.push('/hq/login'); return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - 12); // Fetch last 12 months for trends

      // Parallel Data Fetching
      const [
        rehabP, spimsS, hospS, jobS, jobE,
        rehabT, spimsT, hospT, jobT
      ] = await Promise.all([
        getDocs(collection(db, 'rehab_patients')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'spims_students')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'hospital_daily_stats')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'jobcenter_seekers')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'jobcenter_employers')).catch(() => ({ docs: [] } as any)),

        getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved'))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, 'spims_transactions'), where('status', '==', 'approved'))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, 'hospital_transactions'), where('status', '==', 'approved'))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, 'jobcenter_transactions'), where('status', '==', 'approved'))).catch(() => ({ docs: [] } as any))
      ]);

      // Map Patients / Admissions
      setRehabPatients(rehabP.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          createdAt: data.createdAt ? toDate(data.createdAt) : (data.admissionDate ? toDate(data.admissionDate) : null),
          isActive: data.isActive !== false
        };
      }));

      setSpimsStudents(spimsS.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          createdAt: data.createdAt ? toDate(data.createdAt) : (data.admissionDate ? toDate(data.admissionDate) : null),
          status: data.status || 'Active'
        };
      }));

      setHospitalStats(hospS.docs.map((d: any) => {
        const data = d.data();
        return {
          date: d.id, // YYYY-MM-DD
          checkups: Number(data.checkupCount || 0),
          usg: Number(data.usgCount || 0),
          labs: Number(data.labTestsCount || 0),
          operations: Number(data.operationsCount || 0)
        };
      }).sort((a: any, b: any) => a.date.localeCompare(b.date)));

      setJobSeekers(jobS.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          createdAt: data.createdAt ? toDate(data.createdAt) : null,
          employmentStatus: data.employmentStatus || 'Unemployed',
          isActive: data.isActive !== false
        };
      }));

      setJobEmployers(jobE.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          createdAt: data.createdAt ? toDate(data.createdAt) : null,
          isActive: data.isActive !== false
        };
      }));

      // Map Transactions
      const mapTx = (docs: any[]) => docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          amount: Number(data.amount || 0),
          type: data.type || 'income',
          category: data.category || 'other',
          date: data.date ? toDate(data.date) : (data.createdAt ? toDate(data.createdAt) : null)
        };
      });

      setRehabTx(mapTx(rehabT.docs));
      setSpimsTx(mapTx(spimsT.docs));
      setHospitalTx(mapTx(hospT.docs));
      setJobTx(mapTx(jobT.docs));

    } catch (err) {
      console.error('Failed to load HQ intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter Data based on selected date ranges
  const dateRangeLimit = useMemo(() => {
    const limit = new Date();
    if (timeRange === '30d') limit.setDate(limit.getDate() - 30);
    else if (timeRange === '6m') limit.setMonth(limit.getMonth() - 6);
    else limit.setMonth(limit.getMonth() - 12);
    return limit;
  }, [timeRange]);

  const filteredData = useMemo(() => {
    const filterTx = (list: any[]) => list.filter(t => t.date && t.date >= dateRangeLimit);
    const filterReg = (list: any[]) => list.filter(p => p.createdAt && p.createdAt >= dateRangeLimit);

    return {
      rehabTx: filterTx(rehabTx),
      spimsTx: filterTx(spimsTx),
      hospitalTx: filterTx(hospitalTx),
      jobTx: filterTx(jobTx),

      rehabPatients: filterReg(rehabPatients),
      spimsStudents: filterReg(spimsStudents),
      jobSeekers: filterReg(jobSeekers),
      jobEmployers: filterReg(jobEmployers),

      hospitalStats: hospitalStats.filter(s => {
        const d = new Date(s.date);
        return d >= dateRangeLimit;
      })
    };
  }, [dateRangeLimit, rehabTx, spimsTx, hospitalTx, jobTx, rehabPatients, spimsStudents, hospitalStats, jobSeekers, jobEmployers]);

  // Aggregate Finance metrics per department
  const financeMetrics = useMemo(() => {
    const agg = (list: any[]) => {
      const inc = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { income: inc, expense: exp, balance: inc - exp };
    };

    return {
      rehab: agg(filteredData.rehabTx),
      spims: agg(filteredData.spimsTx),
      hospital: agg(filteredData.hospitalTx),
      jobCenter: agg(filteredData.jobTx)
    };
  }, [filteredData]);

  // Total Summary values for selected department/all
  const activeMetrics = useMemo(() => {
    const getDeptFinance = (key: 'rehab' | 'spims' | 'hospital' | 'jobCenter') => financeMetrics[key];

    if (selectedDept === 'all') {
      const totalInc = financeMetrics.rehab.income + financeMetrics.spims.income + financeMetrics.hospital.income + financeMetrics.jobCenter.income;
      const totalExp = financeMetrics.rehab.expense + financeMetrics.spims.expense + financeMetrics.hospital.expense + financeMetrics.jobCenter.expense;

      // Stats sums
      const rehabAdmissions = filteredData.rehabPatients.length;
      const spimsAdmissions = filteredData.spimsStudents.length;
      const jobReg = filteredData.jobSeekers.length;
      const hospCheckups = filteredData.hospitalStats.reduce((sum, s) => sum + s.checkups, 0);

      return {
        income: totalInc,
        expense: totalExp,
        balance: totalInc - totalExp,
        statValA: rehabAdmissions + spimsAdmissions + jobReg, // Total clients/students/seekers registered
        statLabelA: 'Admissions & Registrations',
        statValB: hospCheckups,
        statLabelB: 'OPD Patients Served'
      };
    } else {
      const fm = getDeptFinance(selectedDept as any);
      let statA = 0;
      let labelA = '';
      let statB = 0;
      let labelB = '';

      if (selectedDept === 'rehab') {
        statA = filteredData.rehabPatients.length;
        labelA = 'New Rehab Clients';
        statB = rehabPatients.filter(p => p.isActive).length;
        labelB = 'Currently Active Census';
      } else if (selectedDept === 'spims') {
        statA = filteredData.spimsStudents.length;
        labelA = 'New Student Admissions';
        statB = spimsStudents.filter(s => s.status === 'Active').length;
        labelB = 'Currently Active Students';
      } else if (selectedDept === 'hospital') {
        statA = filteredData.hospitalStats.reduce((s, d) => s + d.checkups, 0);
        labelA = 'Total OPD Checkups';
        statB = filteredData.hospitalStats.reduce((s, d) => s + d.operations, 0);
        labelB = 'Operations Conducted';
      } else if (selectedDept === 'jobCenter') {
        statA = filteredData.jobSeekers.length;
        labelA = 'New Seekers Registered';
        statB = jobSeekers.filter(s => s.employmentStatus === 'Placed').length;
        labelB = 'Placed Job Seekers';
      }

      return {
        income: fm.income,
        expense: fm.expense,
        balance: fm.balance,
        statValA: statA,
        statLabelA: labelA,
        statValB: statB,
        statLabelB: labelB
      };
    }
  }, [selectedDept, financeMetrics, filteredData, rehabPatients, spimsStudents, jobSeekers]);

  // Daily or Monthly Combined Timeline data for charts
  const chartTimelineData = useMemo(() => {
    const map: Record<string, { dateStr: string; label: string; rehabInc: number; rehabExp: number; rehabCount: number; spimsInc: number; spimsExp: number; spimsCount: number; hospInc: number; hospExp: number; hospCount: number; jobInc: number; jobExp: number; jobCount: number; totalInc: number; totalExp: number; totalCount: number }> = {};

    const getFormatLabel = (d: Date) => {
      if (timeRange === '30d') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    const getKey = (d: Date) => {
      if (timeRange === '30d') {
        return d.toISOString().split('T')[0];
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const initializeKey = (key: string, label: string) => {
      if (!map[key]) {
        map[key] = {
          dateStr: key,
          label,
          rehabInc: 0, rehabExp: 0, rehabCount: 0,
          spimsInc: 0, spimsExp: 0, spimsCount: 0,
          hospInc: 0, hospExp: 0, hospCount: 0,
          jobInc: 0, jobExp: 0, jobCount: 0,
          totalInc: 0, totalExp: 0, totalCount: 0
        };
      }
    };

    // 1. Process Transactions
    const addTx = (list: any[], incKey: string, expKey: string) => {
      list.forEach(t => {
        if (!t.date) return;
        const key = getKey(t.date);
        initializeKey(key, getFormatLabel(t.date));

        if (t.type === 'income') {
          (map[key] as any)[incKey] += t.amount;
          map[key].totalInc += t.amount;
        } else {
          (map[key] as any)[expKey] += t.amount;
          map[key].totalExp += t.amount;
        }
      });
    };

    addTx(filteredData.rehabTx, 'rehabInc', 'rehabExp');
    addTx(filteredData.spimsTx, 'spimsInc', 'spimsExp');
    addTx(filteredData.hospitalTx, 'hospInc', 'hospExp');
    addTx(filteredData.jobTx, 'jobInc', 'jobExp');

    // 2. Process Registrations
    const addCount = (list: any[], countKey: string) => {
      list.forEach(item => {
        if (!item.createdAt) return;
        const key = getKey(item.createdAt);
        initializeKey(key, getFormatLabel(item.createdAt));
        (map[key] as any)[countKey] += 1;
        map[key].totalCount += 1;
      });
    };

    addCount(filteredData.rehabPatients, 'rehabCount');
    addCount(filteredData.spimsStudents, 'spimsCount');
    addCount(filteredData.jobSeekers, 'jobCount');

    // 3. Process Hospital Daily Checkups
    filteredData.hospitalStats.forEach(s => {
      const d = new Date(s.date);
      const key = getKey(d);
      initializeKey(key, getFormatLabel(d));
      map[key].hospCount += s.checkups;
      map[key].totalCount += s.checkups;
    });

    return Object.values(map).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [filteredData, timeRange]);

  // Departmental distribution pie charts
  const deptPieData = useMemo(() => {
    const totalRev = financeMetrics.rehab.income + financeMetrics.spims.income + financeMetrics.hospital.income + financeMetrics.jobCenter.income;
    if (totalRev === 0) return [];

    return [
      { name: 'Rehab', value: financeMetrics.rehab.income },
      { name: 'SPIMS', value: financeMetrics.spims.income },
      { name: 'Hospital', value: financeMetrics.hospital.income },
      { name: 'Job Center', value: financeMetrics.jobCenter.income }
    ].filter(d => d.value > 0);
  }, [financeMetrics]);

  const clientPieData = useMemo(() => {
    const rehabAdmissions = filteredData.rehabPatients.length;
    const spimsAdmissions = filteredData.spimsStudents.length;
    const jobReg = filteredData.jobSeekers.length;
    const hospCheckups = filteredData.hospitalStats.reduce((sum, s) => sum + s.checkups, 0);

    return [
      { name: 'Rehab Clients', value: rehabAdmissions },
      { name: 'SPIMS Students', value: spimsAdmissions },
      { name: 'Hospital Patients (OPD)', value: hospCheckups },
      { name: 'Job Seekers', value: jobReg }
    ].filter(d => d.value > 0);
  }, [filteredData]);

  // Comparison department chart builder
  const comparisonChartData = useMemo(() => {
    const listAName = `${compDeptA}Val`;
    const listBName = `${compDeptB}Val`;

    const getVal = (item: any, dept: string, type: 'finance' | 'stats') => {
      if (type === 'finance') {
        if (dept === 'rehab') return item.rehabInc;
        if (dept === 'spims') return item.spimsInc;
        if (dept === 'hospital') return item.hospInc;
        return item.jobInc;
      } else {
        if (dept === 'rehab') return item.rehabCount;
        if (dept === 'spims') return item.spimsCount;
        if (dept === 'hospital') return item.hospCount;
        return item.jobCount;
      }
    };

    return chartTimelineData.map(item => ({
      label: item.label,
      [DEPT_LABELS[compDeptA] || compDeptA]: getVal(item, compDeptA, activeTab),
      [DEPT_LABELS[compDeptB] || compDeptB]: getVal(item, compDeptB, activeTab)
    }));
  }, [chartTimelineData, compDeptA, compDeptB, activeTab]);

  return (
    <div className="space-y-6 md:space-y-8 p-3 md:p-6 bg-gray-50/50 min-h-screen">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight italic">
            <Layers className="w-8 h-8 text-primary animate-pulse" /> HQ Intelligence Analytics
          </h1>
          <p className="text-xs md:text-sm font-semibold text-gray-500 mt-1 uppercase tracking-wider">
            Consolidated network dashboard & cross-department intelligence comparisons
          </p>
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* Timeframe */}
          <div className="flex bg-gray-200/80 p-0.5 rounded-xl border border-gray-300">
            {[
              { key: '30d', label: '30D' },
              { key: '6m', label: '6M' },
              { key: '12m', label: '12M' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTimeRange(t.key as any)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  timeRange === t.key ? 'bg-white shadow-sm text-black font-bold' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Department selector */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value as any)}
            className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary font-bold text-black"
          >
            <option value="all">All Departments</option>
            <option value="rehab">Rehab Center</option>
            <option value="spims">SPIMS College</option>
            <option value="hospital">Hospital</option>
            <option value="jobCenter">Job Center</option>
          </select>
        </div>
      </div>

      {/* Main Tab Controller */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex-1 md:flex-none px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'finance' ? 'border-primary text-primary font-black bg-white/50' : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Finance Analytics
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 md:flex-none px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stats' ? 'border-primary text-primary font-black bg-white/50' : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          <Activity className="w-4 h-4" /> Stats & Activity
        </button>
      </div>

      {/* Metrics Row */}
      {activeTab === 'finance' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl text-center shadow-sm relative overflow-hidden">
            <TrendingUp className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-xl md:text-2xl font-black text-emerald-900 tracking-tight">Rs. {activeMetrics.income.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">OPD & Fee Income</div>
          </div>
          <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-center shadow-sm relative overflow-hidden">
            <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-xl md:text-2xl font-black text-red-900 tracking-tight">Rs. {activeMetrics.expense.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-red-650 uppercase tracking-widest mt-1">Total Expenditures</div>
          </div>
          <div className={`p-5 rounded-2xl text-center shadow-sm border ${activeMetrics.balance >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
            <DollarSign className={`w-8 h-8 mx-auto mb-2 ${activeMetrics.balance >= 0 ? 'text-green-600' : 'text-orange-500'}`} />
            <div className="text-xl md:text-2xl font-black tracking-tight" style={{ color: activeMetrics.balance >= 0 ? '#1b4332' : '#7f4f24' }}>
              Rs. {activeMetrics.balance.toLocaleString()}
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${activeMetrics.balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>Net Operating Balance</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-purple-50 border border-purple-100 p-5 rounded-2xl text-center shadow-sm">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-xl md:text-2xl font-black text-purple-900 tracking-tight">{activeMetrics.statValA}</div>
            <div className="text-[10px] font-bold text-purple-650 uppercase tracking-widest mt-1">{activeMetrics.statLabelA}</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-center shadow-sm">
            <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-pulse" />
            <div className="text-xl md:text-2xl font-black text-blue-900 tracking-tight">{activeMetrics.statValB}</div>
            <div className="text-[10px] font-bold text-blue-650 uppercase tracking-widest mt-1">{activeMetrics.statLabelB}</div>
          </div>
        </div>
      )}

      {/* Main Charts & Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline Chart Card */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-md md:text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
              {activeTab === 'finance' ? <TrendingUp className="w-5 h-5 text-primary" /> : <Activity className="w-5 h-5 text-primary" />}
              {activeTab === 'finance' ? 'Liquidity Flow Timeline' : 'Activity & Volume Growth'}
            </h2>
            <p className="text-xs text-gray-400">Monthly aggregate data trended across domains</p>
          </div>
          <div className="h-72 md:h-80 w-full">
            {activeTab === 'finance' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hqIncGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#9CA3AF' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#9CA3AF' }} />
                  <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, '']} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="totalInc" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#hqIncGrad)" name="Total Income" />
                  <Area type="monotone" dataKey="totalExp" stroke="#ef4444" strokeWidth={2} fillOpacity={0} name="Total Expenses" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#9CA3AF' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#9CA3AF' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="rehabCount" stroke="#ef4444" strokeWidth={2.5} name="Rehab Admissions" dot={false} />
                  <Line type="monotone" dataKey="spimsCount" stroke="#14b8a6" strokeWidth={2.5} name="SPIMS Admissions" dot={false} />
                  <Line type="monotone" dataKey="hospCount" stroke="#0088FE" strokeWidth={2.5} name="OPD Checkups" dot={false} />
                  <Line type="monotone" dataKey="jobCount" stroke="#ff9f1c" strokeWidth={2.5} name="Job Seekers" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Share Pie Chart Card */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-md md:text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
              <PieIcon className="w-5 h-5 text-primary" /> Department Shares
            </h2>
            <p className="text-xs text-gray-400">Consolidated percentage distributions</p>
          </div>
          {activeTab === 'finance' ? (
            deptPieData.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-6">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deptPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                        {deptPieData.map((e, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                  {deptPieData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-600 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-gray-400 italic">No revenue recorded.</div>
            )
          ) : (
            clientPieData.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-6">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={clientPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                        {clientPieData.map((e, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                  {clientPieData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-600 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-gray-400 italic">No client records found.</div>
            )
          )}
        </div>
      </div>

      {/* consolidated side by side bar chart comparing values */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-md md:text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
            <BarChart2 className="w-5 h-5 text-primary" /> Consolidated Financials breakdown
          </h2>
          <p className="text-xs text-gray-400">Total Income vs Expenses per department</p>
        </div>
        <div className="h-72 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Rehab', Income: financeMetrics.rehab.income, Expenses: financeMetrics.rehab.expense },
                { name: 'SPIMS', Income: financeMetrics.spims.income, Expenses: financeMetrics.spims.expense },
                { name: 'Hospital', Income: financeMetrics.hospital.income, Expenses: financeMetrics.hospital.expense },
                { name: 'Job Center', Income: financeMetrics.jobCenter.income, Expenses: financeMetrics.jobCenter.expense }
              ]}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#4B5563' }} />
              <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#4B5563' }} />
              <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross-Department Comparison Overlay Panel */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-md md:text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
              <Filter className="w-5 h-5 text-primary" /> Overlay Department Comparison
            </h2>
            <p className="text-xs text-gray-400">
              Select two departments to compare their {activeTab === 'finance' ? 'daily/monthly revenues' : 'registration volumes'} side-by-side
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 self-end select-none">
            <select
              value={compDeptA}
              onChange={e => setCompDeptA(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary font-bold text-black"
            >
              <option value="rehab">Rehab</option>
              <option value="spims">SPIMS</option>
              <option value="hospital">Hospital</option>
              <option value="jobCenter">Job Center</option>
            </select>
            <span className="text-[10px] font-black text-gray-400 uppercase">vs</span>
            <select
              value={compDeptB}
              onChange={e => setCompDeptB(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary font-bold text-black"
            >
              <option value="rehab">Rehab</option>
              <option value="spims">SPIMS</option>
              <option value="hospital">Hospital</option>
              <option value="jobCenter">Job Center</option>
            </select>
          </div>
        </div>

        <div className="h-72 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#4B5563' }} />
              <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#4B5563' }} />
              <Tooltip formatter={(value) => [activeTab === 'finance' ? `Rs. ${value.toLocaleString()}` : `${value} admissions`, '']} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              <Bar dataKey={DEPT_LABELS[compDeptA] || compDeptA} fill="#8884d8" radius={[4, 4, 0, 0]} />
              <Bar dataKey={DEPT_LABELS[compDeptB] || compDeptB} fill="#82ca9d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
