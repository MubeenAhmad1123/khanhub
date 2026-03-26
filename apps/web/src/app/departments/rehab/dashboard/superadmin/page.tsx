'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useRehabSession();
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    activeUsers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || user.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [pendingSnap, usersSnap, transSnap] = await Promise.all([
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'rehab_users'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'approved'), where('type', '==', 'income')))
        ]);

        const totalRev = transSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        setStats({
          pendingApprovals: pendingSnap.size,
          activeUsers: usersSnap.size,
          totalRevenue: totalRev
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, user, sessionLoading]);

  if (sessionLoading || loading) return <div className="space-y-8 animate-pulse"><div className="grid grid-cols-3 gap-6"><div className="h-48 bg-gray-100 rounded-[2.5rem]" /><div className="h-48 bg-gray-100 rounded-[2.5rem]" /><div className="h-48 bg-gray-100 rounded-[2.5rem]" /></div></div>;

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-3">Superadmin Console</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.3em]">KhanHub Master Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Link href="/departments/rehab/dashboard/superadmin/approvals" className="group bg-[#1D9E75] p-10 rounded-[3rem] shadow-2xl shadow-[#1D9E75]/30 hover:scale-[1.02] transition-all">
          <p className="text-[#1D9E75] bg-white w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Action Required</p>
          <p className="text-6xl font-black text-white mb-2 tracking-tighter">{stats.pendingApprovals}</p>
          <p className="text-white/80 font-bold uppercase text-xs tracking-widest">Pending Approvals ➔</p>
        </Link>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6">Revenue Audit</p>
           <p className="text-4xl font-black text-gray-900 mb-2">{stats.totalRevenue.toLocaleString()}</p>
           <p className="text-[#1D9E75] font-bold uppercase text-xs tracking-widest">Total Approved Income (PKR)</p>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6">Portal Access</p>
           <p className="text-4xl font-black text-gray-900 mb-2">{stats.activeUsers}</p>
           <p className="text-[#1D9E75] font-bold uppercase text-xs tracking-widest">Active System Users</p>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-black text-gray-900">Administrative Hubs</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <HubCard title="Staff Roster" icon="⚕️" href="/departments/rehab/dashboard/admin/staff" />
          <HubCard title="User Access" icon="🔐" href="/departments/rehab/dashboard/superadmin/users" />
          <HubCard title="Patient Registry" icon="🏥" href="/departments/rehab/dashboard/admin/patients" />
          <HubCard title="Finance Logs" icon="📉" href="/departments/rehab/dashboard/admin/finance" />
          <HubCard title="Global Reports" icon="📑" href="/departments/rehab/dashboard/superadmin/reports" />
        </div>
      </section>
    </div>
  );
}

function HubCard({ title, icon, href }: { title: string, icon: string, href: string }) {
  return (
    <Link href={href} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="font-black text-gray-800 text-sm uppercase tracking-widest leading-tight">{title}</p>
    </Link>
  );
}
