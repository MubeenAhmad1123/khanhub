'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { toDate } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Calendar, Activity,
  Briefcase, DollarSign, Filter, RefreshCw, BarChart2, CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28', '#8884d8', '#82ca9d', '#ff7300'];

export default function JobCenterAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [seekers, setSeekers] = useState<any[]>([]);
  const [employers, setEmployers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Year & Month selections for comparison
  const [compareYear, setCompareYear] = useState(new Date().getFullYear());
  const [monthA, setMonthA] = useState(new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1);
  const [monthB, setMonthB] = useState(new Date().getMonth());

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) { router.push('/departments/job-center/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') {
      router.push('/departments/job-center/login'); return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Seekers
      const seekersSnap = await getDocs(collection(db, 'jobcenter_seekers'));
      const seekersList = seekersSnap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          name: d.name || 'Unknown',
          isActive: d.isActive !== false,
          employmentStatus: d.employmentStatus || 'Unemployed',
          profession: d.profession || 'Not Specified',
          createdAt: d.createdAt ? toDate(d.createdAt) : (d.registrationDate ? toDate(d.registrationDate) : null)
        };
      });
      setSeekers(seekersList);

      // 2. Fetch Employers
      const employersSnap = await getDocs(collection(db, 'jobcenter_employers'));
      const employersList = employersSnap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          companyName: d.companyName || 'Unknown',
          isActive: d.isActive !== false,
          createdAt: d.createdAt ? toDate(d.createdAt) : null
        };
      });
      setEmployers(employersList);

      // 3. Fetch Transactions (last 12 months)
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const txnQuery = query(
        collection(db, 'jobcenter_transactions'),
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
          date: d.date ? toDate(d.date) : null
        };
      });
      setTransactions(txnsList);

    } catch (err) {
      console.error('Failed to fetch job center analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-orange-600 mx-auto" />
          <p className="text-sm font-semibold text-gray-500">Loading Job Center Analytics...</p>
        </div>
      </div>
    );
  }

  // --- 1. KEY METRICS ---
  const totalSeekers = seekers.length;
  const totalPlaced = seekers.filter(s => s.employmentStatus === 'Placed').length;
  const totalInProcess = seekers.filter(s => s.isActive && s.employmentStatus !== 'Placed').length;
  const activeEmployers = employers.filter(e => e.isActive).length;
  const placementRate = totalSeekers > 0 ? Math.round((totalPlaced / totalSeekers) * 100) : 0;

  // --- 2. REGISTRATION TIMELINE (SEEKERS VS EMPLOYERS - LAST 12 MONTHS) ---
  const getTimelineData = () => {
    const monthsData: Record<string, { monthLabel: string; seekers: number; employers: number; index: number }> = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsData[key] = {
        monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        seekers: 0,
        employers: 0,
        index: now.getMonth() - i
      };
    }

    seekers.forEach(s => {
      if (s.createdAt) {
        const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[key]) monthsData[key].seekers += 1;
      }
    });

    employers.forEach(e => {
      if (e.createdAt) {
        const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[key]) monthsData[key].employers += 1;
      }
    });

    return Object.entries(monthsData)
      .sort((a, b) => a[1].index - b[1].index)
      .map(([_, val]) => val);
  };

  const timelineData = getTimelineData();

  // --- 3. PROFESSION DISTRIBUTION ---
  const getProfessionData = () => {
    const counts: Record<string, number> = {};
    seekers.forEach(s => {
      const prof = s.profession || 'Not Specified';
      counts[prof] = (counts[prof] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // Top 7 professions
  };

  const professionData = getProfessionData();

  // --- 4. MONTH-OVER-MONTH SEEKER COMPARISON ---
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

      seekers.forEach(s => {
        if (s.createdAt && s.createdAt.getFullYear() === compareYear) {
          if (s.createdAt.getMonth() === monthA && s.createdAt.getDate() === day) {
            countA++;
          }
          if (s.createdAt.getMonth() === monthB && s.createdAt.getDate() === day) {
            countB++;
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
            <Briefcase className="w-8 h-8 text-orange-500 animate-pulse" /> Job Center Analytics
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">Detailed seeker insights, placement distributions & MoM enrollment ratios</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-orange-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">#</div>
          <Users className="w-8 h-8 text-orange-505 mx-auto mb-2" />
          <div className="text-3xl font-black text-orange-900 tracking-tight">{totalSeekers}</div>
          <div className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-1">Total Seekers</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-emerald-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">✓</div>
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-emerald-900 tracking-tight">{totalPlaced}</div>
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Placed Seekers</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-blue-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">⏳</div>
          <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-blue-900 tracking-tight">{totalInProcess}</div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">In Process</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-purple-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">🏢</div>
          <Briefcase className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-purple-900 tracking-tight">{activeEmployers}</div>
          <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mt-1">Active Employers</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-red-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">%</div>
          <TrendingUp className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-red-900 tracking-tight">{placementRate}%</div>
          <div className="text-xs font-bold text-red-600 uppercase tracking-widest mt-1">Placement Rate</div>
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><TrendingUp className="w-5 h-5 text-orange-500" /> Seekers & Employers Registration Trends</h2>
            <p className="text-xs text-gray-400">Monthly registration volume over the last 12 months</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSeekers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff7300" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEmployers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="seekers" stroke="#ff7300" fillOpacity={1} fill="url(#colorSeekers)" name="New Seekers" strokeWidth={3} />
                <Area type="monotone" dataKey="employers" stroke="#8884d8" fillOpacity={1} fill="url(#colorEmployers)" name="New Employers" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profession Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><BarChart2 className="w-5 h-5 text-orange-500" /> Top Professions</h2>
            <p className="text-xs text-gray-400">Distribution of registered seeker occupations</p>
          </div>
          {professionData.length > 0 ? (
            <>
              <div className="h-64 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={professionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {professionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Seekers`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
                {professionData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-650 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-gray-400 italic">No seeker professions registered.</div>
          )}
        </div>
      </div>

      {/* Comparisons Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><Filter className="w-5 h-5 text-orange-500" /> MoM Seeker Enrollment Comparison</h2>
            <p className="text-xs text-gray-400">Compare daily registered seekers side-by-side between two months</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={compareYear}
              onChange={e => setCompareYear(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500 font-bold text-black"
            >
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <select
                value={monthA}
                onChange={e => setMonthA(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500 font-bold text-black"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-gray-400 uppercase">vs</span>
              <select
                value={monthB}
                onChange={e => setMonthB(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500 font-bold text-black"
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
              <Bar dataKey={compareNameA} fill="#ff7300" radius={[4, 4, 0, 0]} />
              <Bar dataKey={compareNameB} fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
