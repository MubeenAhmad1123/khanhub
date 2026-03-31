'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, UserCheck, CheckCircle, Heart, Building2,
  GraduationCap, Briefcase, ArrowRight, Loader2, Shield
} from 'lucide-react';

export default function HqSuperadminPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState({
    managers: 0,
    cashiers: 0,
    staff: 0,
    pendingApprovals: 0,
    rehabPatients: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [usersSnap, staffSnap, pendingSnap, patientsSnap] = await Promise.all([
          getDocs(collection(db, 'hq_users')),
          getDocs(collection(db, 'hq_staff')),
          getDocs(collection(db, 'rehab_transactions')),
          getDocs(collection(db, 'rehab_patients')),
        ]);

        const usersList = usersSnap.docs.map(d => d.data());
        const managers = usersList.filter(u => u.role === 'manager' && u.isActive !== false).length;
        const cashiers = usersList.filter(u => u.role === 'cashier' && u.isActive !== false).length;
        const pending = pendingSnap.docs.filter(d => d.data().status === 'pending').length;

        setStats({
          managers,
          cashiers,
          staff: staffSnap.docs.filter(d => d.data().isActive !== false).length,
          pendingApprovals: pending,
          rehabPatients: patientsSnap.size,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-gray-800" />
            HQ Overview
          </h1>
          <p className="text-gray-400 text-sm mt-1">System-wide control center</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-900">{session?.name}</p>
            <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest">Superadmin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold border-2 border-white shadow-sm">
            {session?.name?.charAt(0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Managers" value={stats.managers} icon={<Users size={18} />} color="bg-blue-50 text-blue-600" />
        <StatCard label="Cashiers" value={stats.cashiers} icon={<UserCheck size={18} />} color="bg-amber-50 text-amber-600" />
        <StatCard label="Staff" value={stats.staff} icon={<Briefcase size={18} />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Pending" value={stats.pendingApprovals} icon={<CheckCircle size={18} />} color="bg-red-50 text-red-600" urgent={stats.pendingApprovals > 0} />
        <StatCard label="Rehab Patients" value={stats.rehabPatients} icon={<Heart size={18} />} color="bg-green-50 text-green-600" />
      </div>

      <div>
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Department Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DeptCard name="Rehab Center" status="Active" statusColor="text-green-600 bg-green-50" icon={<Heart size={20} />} href="/departments/rehab/dashboard/admin" />
          <DeptCard name="SPIMS College" status="Coming Soon" statusColor="text-amber-600 bg-amber-50" icon={<GraduationCap size={20} />} href="/departments/spims/dashboard/admin" />
          <DeptCard name="Hospital" status="Planned" statusColor="text-gray-400 bg-gray-50" icon={<Building2 size={20} />} href="#" />
          <DeptCard name="Job Center" status="Planned" statusColor="text-gray-400 bg-gray-50" icon={<Briefcase size={20} />} href="#" />
        </div>
      </div>

      <div>
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ArrowRight size={12} className="text-gray-800" /> Quick Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/hq/dashboard/superadmin/users"
            className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl border border-gray-100 hover:shadow-lg transition-all group">
            <div>
              <p className="font-black text-gray-900 text-sm">Create Users</p>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Manager & Cashier accounts</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link href="/hq/dashboard/superadmin/passwords"
            className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl border border-gray-100 hover:shadow-lg transition-all group">
            <div>
              <p className="font-black text-gray-900 text-sm">All Passwords</p>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">View credentials</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link href="/hq/dashboard/superadmin/audit"
            className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl border border-gray-100 hover:shadow-lg transition-all group">
            <div>
              <p className="font-black text-gray-900 text-sm">Audit Log</p>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">System activity history</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, urgent }: {
  label: string; value: number; icon: React.ReactNode; color: string; urgent?: boolean;
}) {
  return (
    <div className={`rounded-3xl p-5 border border-transparent transition-all shadow-sm ${color.split(' ')[0]} ${urgent ? 'ring-2 ring-red-300 shadow-xl shadow-red-100' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl sm:text-3xl font-black text-gray-900">{value}</p>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">{label}</p>
    </div>
  );
}

function DeptCard({ name, status, statusColor, icon, href }: {
  name: string; status: string; statusColor: string; icon: React.ReactNode; href: string;
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500">
          {icon}
        </div>
        <div>
          <p className="font-black text-gray-900 text-sm">{name}</p>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-1 ${statusColor}`}>
            {status}
          </span>
        </div>
      </div>
      {href !== '#' && (
        <Link href={href} className="text-gray-400 hover:text-gray-800 transition-colors">
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}