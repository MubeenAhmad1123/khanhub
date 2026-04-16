// src/app/departments/hospital/dashboard/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp
} from 'firebase/firestore';
import {
  TrendingUp, TrendingDown, Users, Activity, Loader2,
  Plus, FileText, UserCircle, LayoutDashboard, Receipt, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { formatDateDMY, toDate } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

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
  other_income: 'Other Income'
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayIncome: 0,
    todayExpense: 0,
    opdCount: 0,
    labCount: 0,
    opCount: 0,
    opdBreakdown: { morning: { count: 0, amount: 0 }, evening: { count: 0, amount: 0 } },
    labBreakdown: { count: 0, amount: 0 },
    opBreakdown: { count: 0, amount: 0 }
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) { router.push('/departments/hospital/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin') {
      router.push('/departments/hospital/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Today range
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

      // Query hospital_transactions for today
      const todayQuery = query(
        collection(db, 'hospital_transactions'),
        where('departmentCode', '==', 'hospital'),
        where('date', '>=', Timestamp.fromDate(todayStart)),
        where('date', '<=', Timestamp.fromDate(todayEnd)),
        orderBy('date', 'desc')
      );

      const todaySnap = await getDocs(todayQuery);
      
      let income = 0;
      let expense = 0;
      let opdCount = 0;
      let labCount = 0;
      let opCount = 0;
      
      const opdBreakdown = { morning: { count: 0, amount: 0 }, evening: { count: 0, amount: 0 } };
      const labBreakdown = { count: 0, amount: 0 };
      const opBreakdown = { count: 0, amount: 0 };

      todaySnap.docs.forEach(doc => {
        const tx = doc.data();
        const amount = Number(tx.amount) || 0;
        const category = tx.category;
        const status = tx.status;

        if (status === 'approved') {
          if (tx.type === 'income') income += amount;
          else if (tx.type === 'expense') expense += amount;
        }

        if (category === 'opd_reception') {
          opdCount++;
          const shift = tx.hospitalMeta?.shift === 'evening' ? 'evening' : 'morning';
          opdBreakdown[shift].count++;
          opdBreakdown[shift].amount += amount;
        } else if (category === 'lab_test') {
          labCount++;
          labBreakdown.count++;
          labBreakdown.amount += amount;
        } else if (category === 'operation') {
          opCount++;
          opBreakdown.count++;
          opBreakdown.amount += amount;
        }
      });

      setStats({
        todayIncome: income,
        todayExpense: expense,
        opdCount,
        labCount,
        opCount,
        opdBreakdown,
        labBreakdown,
        opBreakdown
      });

      // Recent Transactions (Last 10)
      const recentQuery = query(
        collection(db, 'hospital_transactions'),
        where('departmentCode', '==', 'hospital'),
        orderBy('date', 'desc'),
        limit(10)
      );
      const recentSnap = await getDocs(recentQuery);
      setRecentTransactions(recentSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 7-day chart data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0,0,0,0);

      const chartQuery = query(
        collection(db, 'hospital_transactions'),
        where('departmentCode', '==', 'hospital'),
        where('date', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('date', 'asc')
      );
      const chartSnap = await getDocs(chartQuery);
      
      const days: Record<string, { name: string, income: number, expense: number }> = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        days[dateStr] = {
          name: dayNames[d.getDay()],
          income: 0,
          expense: 0
        };
      }

      chartSnap.docs.forEach(doc => {
        const tx = doc.data();
        if (tx.status !== 'approved') return;
        const dateStr = toDate(tx.date).toISOString().split('T')[0];
        if (days[dateStr]) {
          if (tx.type === 'income') days[dateStr].income += Number(tx.amount) || 0;
          else if (tx.type === 'expense') days[dateStr].expense += Number(tx.amount) || 0;
        }
      });

      setChartData(Object.values(days));

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const netProfit = stats.todayIncome - stats.todayExpense;

  return (
    <div className="space-y-6 pb-10 w-full overflow-x-hidden">

      {/* Greeting & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {getGreeting()}, {session?.displayName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/hq/dashboard/cashier"
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 whitespace-nowrap"
          >
            Go to Cashier Station
          </Link>
          <Link 
            href="/departments/hospital/dashboard/admin/patients"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 whitespace-nowrap"
          >
            View Transaction Records
          </Link>
          <Link 
            href="/departments/hospital/dashboard/profile"
            className="flex items-center gap-2 px-5 py-3 bg-gray-500 text-white rounded-xl text-xs font-black hover:bg-gray-600 transition-all shadow-lg shadow-gray-100 whitespace-nowrap"
          >
            My Profile
          </Link>
        </div>
      </div>

      {/* Row 1: 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Income</span>
          </div>
          <div className="text-2xl font-black text-gray-900 truncate">₨ {stats.todayIncome.toLocaleString()}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tight">Today's Total</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown size={24} />
            </div>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Expense</span>
          </div>
          <div className="text-2xl font-black text-gray-900 truncate">₨ {stats.todayExpense.toLocaleString()}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tight">Today's Total</div>
        </div>

        <div className={`bg-white p-6 rounded-3xl border ${netProfit >= 0 ? 'border-emerald-100' : 'border-rose-100'} shadow-sm transition-all hover:shadow-md group`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              {netProfit >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
            </div>
            <span className={`text-[10px] font-black ${netProfit >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2.5 py-1 rounded-full uppercase tracking-widest`}>Net status</span>
          </div>
          <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'} truncate`}>
            ₨ {Math.abs(netProfit).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tight">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Patients</span>
          </div>
          <div className="text-2xl font-black text-gray-900 truncate">{stats.opdCount}</div>
          <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tight">Total OPD Today</div>
        </div>
      </div>

      {/* Row 2: Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2/3 width): Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-black text-gray-900 flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-500" /> Income vs Expense (Last 7 Days)
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /> Income</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-500" /> Expense</div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  tickFormatter={(val) => `₨${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`₨ ${val.toLocaleString()}`, '']}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (1/3 width): Today's Breakdown */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8">
          <h2 className="font-black text-gray-900 mb-6 flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-blue-500" /> Today's Breakdown
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-emerald-100 hover:shadow-sm transition-all underline-offset-4 cursor-default">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OPD Morning</p>
                <p className="font-bold text-gray-900">{stats.opdBreakdown.morning.count} Patients</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-600 font-black">₨ {stats.opdBreakdown.morning.amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-emerald-100 hover:shadow-sm transition-all underline-offset-4 cursor-default">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OPD Evening</p>
                <p className="font-bold text-gray-900">{stats.opdBreakdown.evening.count} Patients</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-600 font-black">₨ {stats.opdBreakdown.evening.amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all underline-offset-4 cursor-default">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lab Tests</p>
                <p className="font-bold text-gray-900">{stats.labBreakdown.count} Tests</p>
              </div>
              <div className="text-right">
                <p className="text-blue-600 font-black">₨ {stats.labBreakdown.amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-purple-100 hover:shadow-sm transition-all underline-offset-4 cursor-default">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operations</p>
                <p className="font-bold text-gray-900">{stats.opBreakdown.count} Cases</p>
              </div>
              <div className="text-right">
                <p className="text-purple-600 font-black">₨ {stats.opBreakdown.amount.toLocaleString()}</p>
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

      {/* Row 3: Recent Transactions Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-black text-gray-900 flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-500" /> Recent Daily Transactions
          </h2>
          <Link 
            href="/departments/hospital/dashboard/admin/patients" 
            className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-emerald-100 transition-colors"
          >
            View Full Log
          </Link>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50">Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50">Service</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50">Patient Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm font-medium">
                    No recent transactions found.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900">
                        {toDate(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-700">{CATEGORY_LABELS[tx.category] || tx.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-600">{tx.patientName || tx.otherMeta?.paidTo || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}₨ {Number(tx.amount).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`
                        inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider
                        ${tx.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                          tx.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 
                          'bg-amber-50 text-amber-600'}
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
    </div>
  );
}
