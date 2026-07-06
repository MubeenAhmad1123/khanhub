'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toDate } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Calendar, Activity,
  GraduationCap, DollarSign, Filter, RefreshCw, BarChart2
} from 'lucide-react';
import { LogoLoader } from '@/components/ui';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function SpimsAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  
  // Year & Month selections for comparison
  const [compareYear, setCompareYear] = useState(new Date().getFullYear());
  const [monthA, setMonthA] = useState(new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1);
  const [monthB, setMonthB] = useState(new Date().getMonth());

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) { router.push('/departments/spims/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') {
      router.push('/departments/spims/login'); return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'spims_students'));
      const list = snap.docs.map(doc => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          name: d.name || 'Unknown',
          status: d.status || 'Active', // Active, Pass, Left, Fail
          admissionDate: d.admissionDate ? toDate(d.admissionDate) : null,
          course: d.course || 'Unassigned',
          monthlyFee: Number(d.monthlyFee || 0),
          overallRemaining: Number(d.remaining || d.remainingBalance || 0)
        };
      });
      setStudents(list);
    } catch (err) {
      console.error('Failed to fetch SPIMS student analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LogoLoader size="lg" />
      </div>
    );
  }

  // --- 1. KEY METRICS ---
  const totalStudents = students.length;
  const currentlyActive = students.filter(s => s.status === 'Active').length;
  const totalPassed = students.filter(s => s.status === 'Pass').length;
  const totalLeftFailed = students.filter(s => s.status === 'Left' || s.status === 'Fail').length;
  const totalOutstandingDues = students.reduce((sum, s) => sum + s.overallRemaining, 0);

  // --- 2. CUMULATIVE ACTIVE CENSUS TREND (LAST 12 MONTHS) ---
  const getTimelineData = () => {
    const monthsData: Record<string, { monthLabel: string; admissions: number; index: number }> = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsData[key] = {
        monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        admissions: 0,
        index: now.getMonth() - i
      };
    }

    students.forEach(s => {
      if (s.admissionDate) {
        const aKey = `${s.admissionDate.getFullYear()}-${String(s.admissionDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData[aKey]) monthsData[aKey].admissions += 1;
      }
    });

    const timeline = Object.entries(monthsData)
      .sort((a, b) => a[1].index - b[1].index)
      .map(([_, val]) => val);

    // Calculate running active count
    let runningActive = students.filter(s => {
      if (!s.admissionDate) return false;
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      // admmitted before 12 months ago and currently active
      return s.admissionDate < twelveMonthsAgo && s.status === 'Active';
    }).length;

    return timeline.map(m => {
      runningActive = runningActive + m.admissions;
      return {
        ...m,
        activeCount: Math.max(0, runningActive)
      };
    });
  };

  const timelineData = getTimelineData();

  // --- 3. COURSE DISTRIBUTION ---
  const getCourseData = () => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const courseName = s.course || 'Unassigned';
      counts[courseName] = (counts[courseName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const courseData = getCourseData();

  // --- 4. MONTH-OVER-MONTH ENROLLMENTS COMPARISON ---
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

      students.forEach(s => {
        if (s.admissionDate && s.admissionDate.getFullYear() === compareYear) {
          if (s.admissionDate.getMonth() === monthA && s.admissionDate.getDate() === day) {
            countA++;
          }
          if (s.admissionDate.getMonth() === monthB && s.admissionDate.getDate() === day) {
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
            <Activity className="w-8 h-8 text-violet-600 animate-pulse" /> SPIMS Analytics
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">Detailed student enrollment insights & course distributions</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-violet-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">#</div>
          <Users className="w-8 h-8 text-violet-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-violet-900 tracking-tight">{totalStudents}</div>
          <div className="text-xs font-bold text-violet-600 uppercase tracking-widest mt-1">Total Enrolled</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-emerald-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">✓</div>
          <Activity className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-emerald-900 tracking-tight">{currentlyActive}</div>
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Currently Active</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-blue-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">🎓</div>
          <GraduationCap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-blue-900 tracking-tight">{totalPassed}</div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Completed / passed</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-red-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">✗</div>
          <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-red-900 tracking-tight">{totalLeftFailed}</div>
          <div className="text-xs font-bold text-red-650 uppercase tracking-widest mt-1">Left / Failed</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-6 rounded-2xl shadow-sm text-center relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-2 -top-2 opacity-10 text-amber-500 text-7xl font-bold select-none group-hover:scale-110 transition-transform">$</div>
          <DollarSign className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <div className="text-3xl font-black text-amber-900 tracking-tight">Rs. {(totalOutstandingDues/1000).toFixed(1)}k</div>
          <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">Outstanding Dues</div>
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><TrendingUp className="w-5 h-5 text-violet-600" /> Enrollments & Active Students Timeline</h2>
            <p className="text-xs text-gray-400">Monthly admission volume and active student census</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="activeCount" stroke="#8884d8" fillOpacity={1} fill="url(#colorActive)" name="Active Student Census" strokeWidth={3} />
                <Area type="monotone" dataKey="admissions" stroke="#82ca9d" fillOpacity={1} fill="url(#colorAdmissions)" name="Monthly Admissions" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><BarChart2 className="w-5 h-5 text-violet-600" /> Course Distribution</h2>
            <p className="text-xs text-gray-400">Share of student enrollment by course</p>
          </div>
          <div className="h-64 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {courseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Students`, 'Enrolled']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
            {courseData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-650 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparisons Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide"><Filter className="w-5 h-5 text-violet-600" /> Month-over-Month Enrollment Comparison</h2>
            <p className="text-xs text-gray-400">Compare daily admission counts side-by-side between two months</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={compareYear}
              onChange={e => setCompareYear(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-500 font-bold text-black"
            >
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <select
                value={monthA}
                onChange={e => setMonthA(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-500 font-bold text-black"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-gray-400 uppercase">vs</span>
              <select
                value={monthB}
                onChange={e => setMonthB(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-500 font-bold text-black"
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
              <Bar dataKey={compareNameA} fill="#8884d8" radius={[4, 4, 0, 0]} />
              <Bar dataKey={compareNameB} fill="#82ca9d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
