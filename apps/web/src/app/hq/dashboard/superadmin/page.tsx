'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, UserCheck, CheckCircle, Heart, Building2,
  GraduationCap, Briefcase, ArrowRight, Loader2, Shield,
  TrendingUp, Users2, FileText, PieChart, Activity, User
} from 'lucide-react';

export default function HqSuperadminPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState({
    rehabPatients: 0,
    spimsStudents: 0,
    hqStaff: 0,
    pendingApprovals: 0,
    revenueToday: 0,
    hqUsers: 0,
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [patientsSnap, studentsSnap, staffSnap, hqUsersSnap, rehabTransSnap, spimsTransSnap] = await Promise.all([
          getDocs(collection(db, 'rehab_patients')),
          getDocs(collection(db, 'spims_students')),
          getDocs(collection(db, 'hq_staff')),
          getDocs(collection(db, 'hq_users')),
          getDocs(collection(db, 'rehab_transactions')),
          getDocs(collection(db, 'spims_transactions')),
        ]);

        const rehabTrans = rehabTransSnap.docs.map(d => d.data());
        const spimsTrans = spimsTransSnap.docs.map(d => d.data());

        const pendingCount = 
          rehabTrans.filter(t => t.status === 'pending').length + 
          spimsTrans.filter(t => t.status === 'pending').length;

        const revenueToday = [...rehabTrans, ...spimsTrans]
          .filter(t => {
            if (t.status !== 'approved' || t.type !== 'income') return false;
            const date = t.createdAt instanceof Timestamp ? t.createdAt.toDate() : new Date(t.createdAt);
            return date >= today;
          })
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        setStats({
          rehabPatients: patientsSnap.size,
          spimsStudents: studentsSnap.size,
          hqStaff: staffSnap.size,
          pendingApprovals: pendingCount,
          revenueToday: revenueToday,
          hqUsers: hqUsersSnap.size,
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-slate-400 font-medium animate-pulse">Initializing HQ Dashboard...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/hq/dashboard/superadmin/users', label: 'User Management', icon: <Users2 size={24} />, description: 'Manage HQ & Department Users' },
    { href: '/hq/dashboard/superadmin/approvals', label: 'Approvals', icon: <CheckCircle size={24} />, description: 'Cross-system Transaction Approvals' },
    { href: '/hq/dashboard/superadmin/audit', label: 'Audit Log', icon: <Activity size={24} />, description: 'View All System Activities' },
    { href: '/hq/dashboard/superadmin/rehab/patients', label: 'Rehab Patients', icon: <Heart size={24} />, description: 'Monitor Rehab Center Patients' },
    { href: '/hq/dashboard/superadmin/rehab/staff', label: 'Rehab Staff', icon: <Users size={24} />, description: 'Manage Rehab Staff Members' },
    { href: '/hq/dashboard/superadmin/rehab/finance', label: 'Rehab Finance', icon: <TrendingUp size={24} />, description: 'Rehab Revenue & Expenses' },
    { href: '/hq/dashboard/superadmin/rehab/reports', label: 'Rehab Reports', icon: <FileText size={24} />, description: 'Analytics & Performance Reports' },
    { href: '/hq/dashboard/superadmin/spims/students', label: 'SPIMS Students', icon: <GraduationCap size={24} />, description: 'Monitor College Students' },
    { href: '/hq/dashboard/superadmin/spims/staff', label: 'SPIMS Staff', icon: <Briefcase size={24} />, description: 'Manage SPIMS Staff Members' },
    { href: '/hq/dashboard/superadmin/spims/finance', label: 'SPIMS Finance', icon: <PieChart size={24} />, description: 'SPIMS Financial Oversight' },
    { href: '/hq/dashboard/superadmin/spims/reports', label: 'SPIMS Reports', icon: <FileText size={24} />, description: 'College Analytics & Data' },
    { href: '/hq/dashboard/superadmin/profile', label: 'My Profile', icon: <User size={24} />, description: 'Account Settings & Security' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            HQ SUPERADMIN
          </h1>
          <p className="text-slate-400 mt-2 font-medium">System-wide Command & Control Center</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
          <div className="text-right">
            <p className="text-white font-bold">{session?.name}</p>
            <p className="text-teal-500 text-xs font-black uppercase tracking-widest">Master Account</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-teal-900/20">
            {session?.name?.charAt(0)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard 
            label="Rehab Patients" 
            value={stats.rehabPatients} 
            icon={<Heart className="text-rose-500" />} 
            trend="Live"
          />
          <StatCard 
            label="SPIMS Students" 
            value={stats.spimsStudents} 
            icon={<GraduationCap className="text-blue-500" />} 
            trend="Live"
          />
          <StatCard 
            label="HQ Staff" 
            value={stats.hqStaff} 
            icon={<Briefcase className="text-indigo-500" />} 
            trend="Active"
          />
          <StatCard 
            label="Pending Approvals" 
            value={stats.pendingApprovals} 
            icon={<CheckCircle className="text-amber-500" />} 
            trend="Needs Action"
            highlight={stats.pendingApprovals > 0}
          />
          <StatCard 
            label="Revenue Today" 
            value={`Rs. ${stats.revenueToday.toLocaleString()}`} 
            icon={<TrendingUp className="text-emerald-500" />} 
            trend="Verified"
          />
          <StatCard 
            label="HQ Users" 
            value={stats.hqUsers} 
            icon={<Users2 className="text-teal-500" />} 
            trend="System"
          />
        </div>

        {/* Navigation Hub */}
        <div>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
            <div className="h-[1px] w-8 bg-slate-700"></div>
            Navigation Hub
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {navItems.map((item, idx) => (
              <Link 
                key={idx} 
                href={item.href}
                className="group bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-teal-500/50 p-6 rounded-3xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  {item.icon}
                </div>
                <div className="mb-4 p-3 bg-slate-900/50 w-fit rounded-2xl text-teal-500 group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{item.label}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                <div className="mt-4 flex items-center gap-2 text-teal-500 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Access Portal <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, highlight }: {
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-slate-800/40 border ${highlight ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700/50'} p-6 rounded-3xl relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-900/50 rounded-xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${highlight ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-900/50 text-slate-500'}`}>
          {trend}
        </span>
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}
