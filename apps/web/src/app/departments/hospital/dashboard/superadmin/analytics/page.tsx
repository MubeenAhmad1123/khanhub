'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { toDate } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Calendar, Activity,
  Clock, DollarSign, Filter, RefreshCw, BarChart2, Heart, ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300'];

export default function HospitalAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Year & Month selections for MoM comparison
  const [compareYear, setCompareYear] = useState(new Date().getFullYear());
  const [monthA, setMonthA] = useState(new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1);
  const [monthB, setMonthB] = useState(new Date().getMonth());

  // Date range filter for main dashboard
  const [dateRangeType, setDateRangeType] = useState<'30days' | '90days' | 'allTime'>('30days');

  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) { router.push('/departments/hospital/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') {
      router.push('/departments/hospital/login'); return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch all daily stats from hospital_daily_stats
      const statsSnap = await getDocs(collection(db, 'hospital_daily_stats'));
      const statsList = statsSnap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          date: doc.id, // YYYY-MM-DD
          checkupCount: Number(d.checkupCount || 0),
          usgCount: Number(d.usgCount || 0),
          labTestsCount: Number(d.labTestsCount || 0),
          operationsCount: Number(d.operationsCount || 0),
        };
      }).sort((a, b) => a.date.localeCompare(b.date));
      setDailyStats(statsList);

      // 2. Fetch all approved transactions for hospital
      const txnQuery = query(
        collection(db, 'hospital_transactions'),
        where('status', '==', 'approved')
      );
      const txnsSnap = await getDocs(txnQuery);
      const txnsList = txnsSnap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          amount: Number(d.amount || 0),
          category: d.category || 'other',
          date: d.date ? toDate(d.date) : null,
          type: d.type || 'income'
        };
      });
      setTransactions(txnsList);

    } catch (err) {
      console.error('Failed to fetch hospital analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
          <p className="text-sm font-semibold text-gray-500">Loading Hospital Analytics...</p>
        </div>
      </div>
    );
  }

  // Filter data based on selected Date Range
  const getFilteredData = () => {
    const now = new Date();
    let limitDate = new Date();
    if (dateRangeType === '30days') {
      limitDate.setDate(now.getDate() - 30);
    } else if (dateRangeType === '90days') {
      limitDate.setDate(now.getDate() - 90);
    } else {
      limitDate = new Date(2020, 0, 1);
    }

    const limitStr = limitDate.toISOString().split('T')[0];

    const filteredStats = dailyStats.filter(s => s.date >= limitStr);
    const filteredTxns = transactions.filter(t => t.date && t.date >= limitDate);

    return { filteredStats, filteredTxns };
  };

  const { filteredStats, filteredTxns } = getFilteredData();

  // --- Calculate Key Stats ---
  const totalCheckups = filteredStats.reduce((sum, s) => sum + s.checkupCount, 0);
  const totalUsg = filteredStats.reduce((sum, s) => sum + s.usgCount, 0);
  const totalLabTests = filteredStats.reduce((sum, s) => sum + s.labTestsCount, 0);
  const totalOperations = filteredStats.reduce((sum, s) => sum + s.operationsCount, 0);

  const totalIncome = filteredTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  // --- Services Activity Breakdown ---
  const servicesPieData = [
    { name: 'Daily Checkups', value: totalCheckups },
    { name: 'Ultrasounds (USG)', value: totalUsg },
    { name: 'Lab Tests', value: totalLabTests },
    { name: 'Operations', value: totalOperations }
  ].filter(s => s.value > 0);

  // --- Income Categories Breakdown ---
  const getIncomeCategoryData = () => {
    const categories: Record<string, number> = {};
    filteredTxns.filter(t => t.type === 'income').forEach(t => {
      const cat = t.category || 'Other Income';
      categories[cat] = (categories[cat] || 0) + t.amount;
    });

    const labelMap: Record<string, string> = {
      opd_reception: 'OPD Reception Fees',
      lab_test: 'Lab Test Fees',
      operation: 'Operation Fees',
      operation_theater: 'Operation Theater Fees',
      other_income: 'Other Income'
    };

    return Object.entries(categories).map(([name, value]) => ({
      name: labelMap[name] || name?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value
    })).sort((a, b) => b.value - a.value);
  };

  const incomeCategoryData = getIncomeCategoryData();

  // --- Combined Daily Activity and Financial Trend Timeline ---
  const getTimelineData = () => {
    // Map dates in filtered range to combined object
    const map: Record<string, any> = {};

    filteredStats.forEach(s => {
      const label = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[s.date] = {
        dateStr: s.date,
        label,
        checkups: s.checkupCount,
        usg: s.usgCount,
        labTests: s.labTestsCount,
        operations: s.operationsCount,
        income: 0,
        expense: 0
      };
    });

    filteredTxns.forEach(t => {
      if (!t.date) return;
      const key = t.date.toISOString().split('T')[0];
      if (!map[key]) {
        const label = t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        map[key] = {
          dateStr: key,
          label,
          checkups: 0,
          usg: 0,
          labTests: 0,
          operations: 0,
          income: 0,
          expense: 0
        };
      }
      if (t.type === 'income') {
        map[key].income += t.amount;
      } else {
        map[key].expense += t.amount;
      }
    });

    return Object.values(map).sort((a: any, b: any) => a.dateStr.localeCompare(b.dateStr));
  };

  const timelineData = getTimelineData();

  // --- MoM Comparisons ---
  const getMomComparisonData = () => {
    const daysInMonthA = new Date(compareYear, monthA + 1, 0).getDate();
    const daysInMonthB = new Date(compareYear, monthB + 1, 0).getDate();
    const maxDays = Math.max(daysInMonthA, daysInMonthB);

    const chartData = [];
    const nameA = new Date(compareYear, monthA).toLocaleDateString('en-US', { month: 'short' });
    const nameB = new Date(compareYear, monthB).toLocaleDateString('en-US', { month: 'short' });

    for (let day = 1; day <= maxDays; day++) {
      let checkupA = 0;
      let checkupB = 0;
      let incomeA = 0;
      let incomeB = 0;

      const dateAStr = `${compareYear}-${String(monthA + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateBStr = `${compareYear}-${String(monthB + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Find daily stats
      const statsA = dailyStats.find(s => s.date === dateAStr);
      if (statsA) checkupA = statsA.checkupCount;

      const statsB = dailyStats.find(s => s.date === dateBStr);
      if (statsB) checkupB = statsB.checkupCount;

      // Find daily income
      transactions.forEach(t => {
        if (t.date && t.date.getFullYear() === compareYear && t.type === 'income') {
          if (t.date.getMonth() === monthA && t.date.getDate() === day) {
            incomeA += t.amount;
          }
          if (t.date.getMonth() === monthB && t.date.getDate() === day) {
            incomeB += t.amount;
          }
        }
      });

      chartData.push({
        day: `Day ${day}`,
        [`${nameA} Checkups`]: checkupA,
        [`${nameB} Checkups`]: checkupB,
        [`${nameA} Income`]: incomeA,
        [`${nameB} Income`]: incomeB
      });
    }

    return { chartData, nameA, nameB };
  };

  const { chartData: compareChartData, nameA: compareNameA, nameB: compareNameB } = getMomComparisonData();

  return (
    <div className="space-y-8 p-1 sm:p-2">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 tracking-tight uppercase">
            <Heart className="w-8 h-8 text-teal-605 animate-pulse" /> Hospital Analytics
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">OPD Checkups, USG Tests, Labs, Operations & Financial Trends</p>
        </div>

        {/* Date Scope Filter */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { key: '30days', label: 'Last 30 Days' },
            { key: '90days', label: 'Last 90 Days' },
            { key: 'allTime', label: 'All Time' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setDateRangeType(opt.key as any)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                dateRangeType === opt.key ? 'bg-white shadow-sm text-teal-600 font-bold' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient & Activity Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <Activity className="w-8 h-8 text-teal-600 mx-auto mb-2 animate-bounce" />
          <div className="text-3xl font-black text-teal-900 tracking-tight">{totalCheckups}</div>
          <div className="text-xs font-bold text-teal-650 uppercase tracking-widest mt-1">Daily Checkups (OPD)</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-blue-900 tracking-tight">{totalUsg}</div>
          <div className="text-xs font-bold text-blue-605 uppercase tracking-widest mt-1">Ultrasound (USG) Counts</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <ShieldCheck className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-indigo-900 tracking-tight">{totalLabTests}</div>
          <div className="text-xs font-bold text-indigo-650 uppercase tracking-widest mt-1">Lab Tests Count</div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <Heart className="w-8 h-8 text-rose-500 mx-auto mb-2 animate-pulse" />
          <div className="text-3xl font-black text-rose-900 tracking-tight">{totalOperations}</div>
          <div className="text-xs font-bold text-rose-650 uppercase tracking-widest mt-1">Operations Conducted</div>
        </div>
      </div>

      {/* Financial Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm text-center">
          <TrendingUp className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-emerald-900 tracking-tight">Rs. {totalIncome.toLocaleString()}</div>
          <div className="text-xs font-bold text-emerald-650 uppercase tracking-widest mt-1">OPD & Service Income</div>
        </div>

        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl shadow-sm text-center">
          <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-red-900 tracking-tight">Rs. {totalExpenses.toLocaleString()}</div>
          <div className="text-xs font-bold text-red-650 uppercase tracking-widest mt-1">Hospital Expenses</div>
        </div>

        <div className={`border p-6 rounded-2xl shadow-sm text-center ${netProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
          <DollarSign className={`w-8 h-8 mx-auto mb-2 ${netProfit >= 0 ? 'text-green-600' : 'text-orange-500'}`} />
          <div className="text-3xl font-black tracking-tight" style={{ color: netProfit >= 0 ? '#1b4332' : '#7f4f24' }}>
            Rs. {netProfit.toLocaleString()}
          </div>
          <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-orange-650'}`}>Net Operating Balance</div>
        </div>
      </div>

      {/* Daily Patient Count Timelines (USG, OPD, Labs, Ops) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><Activity className="w-5 h-5 text-teal-600" /> Daily Patient counts (Timeline)</h2>
          <p className="text-xs text-gray-400">Flow trends of OPD, ultrasound, labs, and operations</p>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
              <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              <Line type="monotone" dataKey="checkups" stroke="#0088FE" strokeWidth={3} name="OPD Checkups" dot={false} />
              <Line type="monotone" dataKey="usg" stroke="#00C49F" strokeWidth={3} name="Ultrasounds (USG)" dot={false} />
              <Line type="monotone" dataKey="labTests" stroke="#FFBB28" strokeWidth={2.5} name="Lab Tests" dot={false} />
              <Line type="monotone" dataKey="operations" stroke="#FF8042" strokeWidth={2} name="Operations" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Income Analytics Timeline */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><TrendingUp className="w-5 h-5 text-emerald-600" /> Income & Expense Analytics Trend</h2>
          <p className="text-xs text-gray-400">Financial progress breakdown</p>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
              <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
              <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Amount']} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" name="Income" strokeWidth={3} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Expenses" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><BarChart2 className="w-5 h-5 text-teal-605" /> Service Distributions</h2>
            <p className="text-xs text-gray-400">Activity share among hospital departments</p>
          </div>
          {servicesPieData.length > 0 ? (
            <>
              <div className="h-64 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={servicesPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {servicesPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Records`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
                {servicesPieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-650 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-gray-400 italic">No activity registered.</div>
          )}
        </div>

        {/* Income Category Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><DollarSign className="w-5 h-5 text-teal-605" /> Income Sources</h2>
            <p className="text-xs text-gray-400">Total fees collected by billing category</p>
          </div>
          {incomeCategoryData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeCategoryData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#6B7280' }} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#4B5563' }} width={120} />
                  <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Total Income']} />
                  <Bar dataKey="value" fill="#00C49F" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-xs text-gray-400 italic">No billing records found.</div>
          )}
        </div>
      </div>

      {/* Comparisons Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><Filter className="w-5 h-5 text-teal-600" /> MoM Hospital Service & Income Comparison</h2>
            <p className="text-xs text-gray-400">Compare daily checkups and revenues side-by-side between two months</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={compareYear}
              onChange={e => setCompareYear(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500 font-bold text-black"
            >
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <select
                value={monthA}
                onChange={e => setMonthA(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500 font-bold text-black"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-gray-400 uppercase">vs</span>
              <select
                value={monthB}
                onChange={e => setMonthB(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500 font-bold text-black"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checkups MoM */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Daily OPD Checkups Comparison</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" style={{ fontSize: '9px', fill: '#6B7280' }} />
                  <YAxis allowDecimals={false} style={{ fontSize: '9px', fill: '#6B7280' }} />
                  <Tooltip />
                  <Bar dataKey={`${compareNameA} Checkups`} fill="#0088FE" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={`${compareNameB} Checkups`} fill="#00C49F" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Income MoM */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Daily Revenues (Income) Comparison</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" style={{ fontSize: '9px', fill: '#6B7280' }} />
                  <YAxis style={{ fontSize: '9px', fill: '#6B7280' }} tickFormatter={(val: number) => `Rs.${(val/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenues']} />
                  <Bar dataKey={`${compareNameA} Income`} fill="#8884d8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={`${compareNameB} Income`} fill="#82ca9d" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
