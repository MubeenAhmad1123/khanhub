'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getRecentTransactions } from '@/lib/rehab/transactions';
import type { Transaction, RehabUser } from '@/types/rehab';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    staffCount: 0,
    pendingApprovals: 0
  });
  const [recentActivity, setRecentActivity] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const raw = localStorage.getItem('rehab_session');
      if (!raw) return;
      const user = JSON.parse(raw) as RehabUser;
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        router.push('/departments/rehab/login');
        return;
      }

      try {
        const [patientsSnap, staffSnap, pendingSnap, recentData] = await Promise.all([
          getDocs(collection(db, 'rehab_patients')),
          getDocs(collection(db, 'rehab_staff')),
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'pending'))),
          getRecentTransactions(8)
        ]);

        setStats({
          totalPatients: patientsSnap.size,
          activePatients: patientsSnap.docs.filter(d => d.data().isActive).length,
          staffCount: staffSnap.size,
          pendingApprovals: pendingSnap.size
        });
        setRecentActivity(recentData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) return <div className="space-y-8 animate-pulse"><div className="grid grid-cols-4 gap-6"><div className="h-32 bg-gray-100 rounded-3xl" /><div className="h-32 bg-gray-100 rounded-3xl" /><div className="h-32 bg-gray-100 rounded-3xl" /><div className="h-32 bg-gray-100 rounded-3xl" /></div><div className="h-96 bg-gray-100 rounded-3xl" /></div>;

  const quickLinks = [
    { label: 'Patients', href: '/departments/rehab/dashboard/admin/patients', icon: '👤', color: 'bg-blue-50 text-blue-600' },
    { label: 'Staff members', href: '/departments/rehab/dashboard/admin/staff', icon: '👨‍⚕️', color: 'bg-green-50 text-green-600' },
    { label: 'Finance records', href: '/departments/rehab/dashboard/admin/finance', icon: '💰', color: 'bg-orange-50 text-orange-600' },
    { label: 'Monthly Reports', href: '/departments/rehab/dashboard/admin/reports', icon: '📊', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-10 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Admin Control</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Main Operations Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Patients" value={stats.totalPatients} subValue={`${stats.activePatients} Active`} color="border-l-[#1D9E75]" />
        <StatCard label="Total Staff Members" value={stats.staffCount} subValue="On Payroll" color="border-l-blue-500" />
        <StatCard label="Pending Approval" value={stats.pendingApprovals} subValue="Transactions" color="border-l-orange-500" />
        <StatCard label="System Status" value="Online" subValue="Ver 2.4.1" color="border-l-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-black text-gray-900 mb-6">Quick Hub</h2>
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="group block bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-[#1D9E75]/20 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${link.color} group-hover:scale-110 transition-transform`}>
                  {link.icon}
                </div>
                <span className="font-bold text-gray-700">{link.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-black text-gray-900">Recent System Activity</h2>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActivity.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-gray-800 text-sm">{t.description}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{t.category.replace('_', ' ')} • {new Date(t.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                         {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${t.status === 'approved' ? 'bg-green-100 text-green-600' : t.status === 'pending' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                         {t.status}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, color }: { label: string, value: string | number, subValue: string, color: string }) {
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 border-l-[6px] ${color} hover:shadow-xl hover:shadow-gray-200/50 transition-all`}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 mb-2">{value}</p>
      <p className="text-xs font-bold text-[#1D9E75] uppercase tracking-widest">{subValue}</p>
    </div>
  );
}
