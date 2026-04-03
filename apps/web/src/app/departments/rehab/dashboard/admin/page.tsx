// src/app/departments/rehab/dashboard/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp
} from 'firebase/firestore';
import {
  Heart, UserCog, TrendingUp, TrendingDown,
  Users, Calendar, ChevronRight, Activity, Loader2,
  BarChart3, Plus
} from 'lucide-react';
import { toDate } from '@/lib/utils';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [totalPatients, setTotalPatients] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, unmarked: 0 });
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin') {
      router.push('/departments/rehab/login'); return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const todayStr = now.toISOString().split('T')[0];

      const [
        patientsSnap, staffSnap,
        incomeSnap, expenseSnap,
        attendanceSnap, txnsSnap, contribSnap
      ] = await Promise.all([
        getDocs(query(collection(db, 'rehab_patients'), where('isActive', '==', true))),
        getDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true))),
        getDocs(query(
          collection(db, 'rehab_transactions'),
          where('type', '==', 'income'),
          where('status', '==', 'approved'),
          where('date', '>=', Timestamp.fromDate(firstOfMonth))
        )),
        getDocs(query(
          collection(db, 'rehab_transactions'),
          where('type', '==', 'expense'),
          where('status', '==', 'approved'),
          where('date', '>=', Timestamp.fromDate(firstOfMonth))
        )),
        getDocs(query(
          collection(db, 'rehab_attendance'),
          where('date', '==', todayStr)
        )),
        getDocs(query(collection(db, 'rehab_transactions'), orderBy('createdAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'rehab_contributions'), orderBy('createdAt', 'desc'), limit(5))),
      ]);

      // Count stats
      setTotalPatients(patientsSnap.size);
      const staffTotal = staffSnap.size;
      setTotalStaff(staffTotal);

      // Financials
      setMonthlyIncome(incomeSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0));
      setMonthlyExpenses(expenseSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0));

      // Attendance
      const presentCount = attendanceSnap.docs.filter(d => d.data().status === 'present').length;
      const absentCount = attendanceSnap.docs.filter(d => d.data().status === 'absent').length;
      setAttendance({ present: presentCount, absent: absentCount, unmarked: Math.max(0, staffTotal - attendanceSnap.size) });

      // Name Dictionaries for lookups
      const patientNames: Record<string, string> = {};
      patientsSnap.docs.forEach(d => { patientNames[d.id] = d.data().name; });
      
      const staffNames: Record<string, string> = {};
      staffSnap.docs.forEach(d => { 
        staffNames[d.id] = d.data().name;
        // Also map by loginUserId if available
        if (d.data().loginUserId) staffNames[d.data().loginUserId] = d.data().name;
      });

      // Transactions
      setRecentTxns(txnsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: toDate(data.date || data.createdAt),
          patientName: data.patientId ? (patientNames[data.patientId] || 'Patient') : null
        };
      }));

      // Contributions
      setContributions(contribSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: toDate(data.date || data.createdAt),
          staffName: staffNames[data.staffId] || 'Staff'
        };
      }));

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const net = monthlyIncome - monthlyExpenses;
  const attTotal = attendance.present + attendance.absent + attendance.unmarked || 1;

  return (
    <div className="space-y-6 pb-10">

      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">
            {getGreeting()}, {session?.displayName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{totalPatients}</div>
            <div className="text-xs text-gray-500 font-medium">Active Patients</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{totalStaff}</div>
            <div className="text-xs text-gray-500 font-medium">Active Staff</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-black text-gray-900">Rs. {monthlyIncome.toLocaleString()}</div>
            <div className="text-xs text-gray-500 font-medium">Month Income</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-black text-gray-900">Rs. {monthlyExpenses.toLocaleString()}</div>
            <div className="text-xs text-gray-500 font-medium">Month Expenses</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Attendance Today */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
              <Calendar className="w-5 h-5 text-teal-500" /> Today's Attendance
            </h2>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex mb-4">
              <div className="bg-teal-500 h-full" style={{ width: `${(attendance.present / attTotal) * 100}%` }} />
              <div className="bg-red-400 h-full" style={{ width: `${(attendance.absent / attTotal) * 100}%` }} />
              <div className="bg-gray-200 h-full" style={{ width: `${(attendance.unmarked / attTotal) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                <div className="text-2xl font-black text-teal-700">{attendance.present}</div>
                <div className="text-xs text-teal-600 font-medium">Present</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <div className="text-2xl font-black text-red-600">{attendance.absent}</div>
                <div className="text-xs text-red-500 font-medium">Absent</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div className="text-2xl font-black text-gray-500">{attendance.unmarked}</div>
                <div className="text-xs text-gray-400 font-medium">Unmarked</div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" /> Recent Transactions
              </h2>
              <Link href="/departments/rehab/dashboard/admin/finance" className="text-xs text-teal-600 font-medium flex items-center gap-1 hover:underline">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {recentTxns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No transactions yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentTxns.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 capitalize">{tx.category?.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-gray-400">{tx.description || '—'}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'} Rs. {tx.amount?.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {tx.date?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        tx.status === 'approved' ? 'bg-green-50 text-green-600' :
                        tx.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Net Balance */}
          <div className={`rounded-2xl border shadow-sm p-6 ${net >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <h2 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Net Balance (This Month)
            </h2>
            <div className={`text-3xl font-black mb-1 ${net >= 0 ? 'text-green-800' : 'text-red-700'}`}>
              Rs. {Math.abs(net).toLocaleString()}
              <span className="text-base font-medium ml-1">{net >= 0 ? '▲' : '▼'}</span>
            </div>
            <p className="text-xs text-gray-500">Based on approved transactions this month</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add Patient', href: '/departments/rehab/dashboard/admin/patients/new', icon: <Plus className="w-4 h-4" />, color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
                { label: 'View Staff', href: '/departments/rehab/dashboard/admin/staff', icon: <UserCog className="w-4 h-4" />, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { label: 'Finance Log', href: '/departments/rehab/dashboard/admin/finance', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                { label: 'Reports', href: '/departments/rehab/dashboard/admin/reports', icon: <BarChart3 className="w-4 h-4" />, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-xs font-bold transition-colors text-center ${link.color}`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Staff Contributions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" /> Recent Staff Activity
            </h2>
            {contributions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No contributions recorded yet</p>
            ) : (
              <div className="space-y-3">
                {contributions.map((c: any) => (
                  <div key={c.id} className="flex flex-col gap-0.5 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div className="text-xs font-bold text-gray-700">{c.staffName}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{c.content || c.text || '—'}</div>
                    <div className="text-[10px] text-gray-400">
                      {c.date?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
