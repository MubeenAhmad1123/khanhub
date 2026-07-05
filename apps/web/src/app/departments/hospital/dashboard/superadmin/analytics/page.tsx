'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { toDate } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Calendar, Activity,
  Clock, DollarSign, Filter, RefreshCw, BarChart2, ShieldCheck, Heart
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300'];

export default function HospitalAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Year & Month selections for MoM comparison
  const [compareYear, setCompareYear] = useState(new Date().getFullYear());
  const [monthA, setMonthA] = useState(new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1);
  const [monthB, setMonthB] = useState(new Date().getMonth());

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
      
      // 1. Fetch Patients
      const patientsSnap = await getDocs(collection(db, 'hospital_patients'));
      const patientList = patientsSnap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          name: d.name || 'Unknown',
          isActive: d.isActive !== false,
          admissionDate: d.admissionDate ? toDate(d.admissionDate) : null,
          dischargeDate: d.dischargeDate ? toDate(d.dischargeDate) : null,
          remaining: Number(d.remaining || 0)
        };
      });
      setPatients(patientList);

      // 2. Fetch Transactions (last 12 months for trends)
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      
      const txnQuery = query(
        collection(db, 'hospital_transactions'),
        where('date', '>=', Timestamp.fromDate(twelveMonthsAgo)),
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

  // --- 1. KEY METRICS ---
  const totalAdmitted = patients.length;
  const currentlyActiveInpatients = patients.filter(p => p.isActive).length;
  const totalDischarged = patients.filter(p => !p.isActive).length;

  const dischargedPatients = patients.filter(p => !p.isActive && p.admissionDate && p.dischargeDate);
  const avgStayDays = dischargedPatients.length > 0
    ? Math.round(
        dischargedPatients.reduce((sum, p) => {
          const diffTime = Math.abs(p.dischargeDate.getTime() - p.admissionDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0) / dischargedPatients.length
      )
    : 0;

  // Counts of service activities
  const opdCount = transactions.filter(t => t.category === 'opd_reception').length;
  const labTestsCount = transactions.filter(t => t.category === 'lab_test').length;
  const operationsCount = transactions.filter(t => t.category === 'operation').length;

  // --- 2. CUMULATIVE ACTIVE INPATIENT TREND ---
  const getTimelineData = () => {
    const monthsData: Record<string, { monthLabel: string; admissions: number; discharges: number; index: number }> = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsData[key] = {
        monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        admissions: 0,
        discharges: 0,
        index: now.getMonth() - i
      };
    }

    patients.forEach(p => {
      if (p.admissionDate) {
        const aKey = `${p.admissionDate.getFullYear()}-${String(p.admissionDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[aKey]) monthsData[aKey].admissions += 1;
      }
      if (p.dischargeDate) {
        const dKey = `${p.dischargeDate.getFullYear()}-${String(p.dischargeDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[dKey]) monthsData[dKey].discharges += 1;
      }
    });

    const timeline = Object.entries(monthsData)
      .sort((a, b) => a[1].index - b[1].index)
      .map(([_, val]) => val);

    // Calculate running active inpatient count
    let runningActive = patients.filter(p => {
      if (!p.admissionDate) return false;
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return p.admissionDate < twelveMonthsAgo && (!p.dischargeDate || p.dischargeDate >= twelveMonthsAgo);
    }).length;

    return timeline.map(m => {
      runningActive = runningActive + m.admissions - m.discharges;
      return {
        ...m,
        activeInpatients: Math.max(0, runningActive)
      };
    });
  };

  const timelineData = getTimelineData();

  // --- 3. SERVICES DISTRIBUTION ---
  const servicesData = [
    { name: 'OPD Checkups', value: opdCount },
    { name: 'Lab Tests', value: labTestsCount },
    { name: 'Operations', value: operationsCount },
  ].filter(s => s.value > 0);

  // --- 4. MONTH-OVER-MONTH SERVICE VOLUME COMPARISON ---
  const getMonthComparisonData = () => {
    const daysInMonthA = new Date(compareYear, monthA + 1, 0).getDate();
    const daysInMonthB = new Date(compareYear, monthB + 1, 0).getDate();
    const maxDays = Math.max(daysInMonthA, daysInMonthB);

    const chartData = [];
    const nameA = new Date(compareYear, monthA).toLocaleDateString('en-US', { month: 'short' });
    const nameB = new Date(compareYear, monthB).toLocaleDateString('en-US', { month: 'short' });

    for (let day = 1; day <= maxDays; day++) {
      let countA = 0;
      let countB = 0;

      transactions.forEach(t => {
        if (t.date && t.date.getFullYear() === compareYear) {
          const isService = t.category === 'opd_reception' || t.category === 'lab_test' || t.category === 'operation';
          if (isService) {
            if (t.date.getMonth() === monthA && t.date.getDate() === day) {
              countA++;
            }
            if (t.date.getMonth() === monthB && t.date.getDate() === day) {
              countB++;
            }
          }
        }
      });

      chartData.push({
        day: `Day ${day}`,
        [nameA]: countA,
        [nameB]: countB
      });
    }

    return { chartData, nameA, nameB };
  };

  const { chartData: compareChartData, nameA: compareNameA, nameB: compareNameB } = getMonthComparisonData();

  return (
    <div className="space-y-8 p-1 sm:p-2">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 tracking-tight uppercase">
            <Heart className="w-8 h-8 text-teal-605 animate-pulse" /> Hospital Analytics
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">Detailed service statistics & patient flow timelines</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-teal-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">#</div>
          <Users className="w-8 h-8 text-teal-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-teal-900 tracking-tight">{totalAdmitted}</div>
          <div className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-1">Total Inpatients</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-emerald-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">✓</div>
          <Activity className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-emerald-900 tracking-tight">{currentlyActiveInpatients}</div>
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Active Inpatients</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-blue-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">🛬</div>
          <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-blue-900 tracking-tight">{totalDischarged}</div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Discharged</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-purple-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">⏳</div>
          <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-purple-900 tracking-tight">{avgStayDays} Days</div>
          <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mt-1">Avg Stay Inpatients</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-amber-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">🩺</div>
          <ShieldCheck className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-amber-900 tracking-tight">{opdCount + labTestsCount + operationsCount}</div>
          <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">Total Services Rendered</div>
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><TrendingUp className="w-5 h-5 text-teal-500" /> Inpatients Census & Admissions Timeline</h2>
            <p className="text-xs text-gray-400">Trend logs over the last 12 months</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ec4b6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2ec4b6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f4c5c" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0f4c5c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="activeInpatients" stroke="#0f4c5c" fillOpacity={1} fill="url(#colorActive)" name="Active Inpatient Census" strokeWidth={3} />
                <Area type="monotone" dataKey="admissions" stroke="#2ec4b6" fillOpacity={1} fill="url(#colorAdmissions)" name="Admissions" strokeWidth={2} />
                <Area type="monotone" dataKey="discharges" stroke="#e01e37" fillOpacity={0} name="Discharges" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Services Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><BarChart2 className="w-5 h-5 text-teal-500" /> Services Breakdown</h2>
            <p className="text-xs text-gray-400">Distribution of rendered healthcare services</p>
          </div>
          {servicesData.length > 0 ? (
            <>
              <div className="h-64 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={servicesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {servicesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Records`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-24 overflow-y-auto pr-1">
                {servicesData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-650 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-gray-400 italic">No service records registered in this period.</div>
          )}
        </div>
      </div>

      {/* Comparisons Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><Filter className="w-5 h-5 text-teal-500" /> MoM Overall Service Comparison</h2>
            <p className="text-xs text-gray-400">Compare combined daily healthcare services rendered (OPD, Labs, Ops) between two months</p>
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

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6B7280' }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6B7280' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Bar dataKey={compareNameA} fill="#0f4c5c" radius={[4, 4, 0, 0]} />
              <Bar dataKey={compareNameB} fill="#2ec4b6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
