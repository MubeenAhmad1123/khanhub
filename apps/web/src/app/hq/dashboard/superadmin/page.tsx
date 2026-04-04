'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, CheckCircle, Heart, Building2,
  GraduationCap, Briefcase, ArrowRight, Loader2, Shield,
  TrendingUp, Users2, FileText, PieChart, Activity, User,
  Moon, Sun, Menu, X
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
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('hq_dark_mode') === 'true';
    setDarkMode(isDark);
  }, []);

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

        const [patientsSnap, studentsSnap, hqStaffSnap, rehabStaffSnap, hqUsersSnap, rehabTransSnap, spimsTransSnap] = await Promise.all([
          getDocs(collection(db, 'rehab_patients')),
          getDocs(collection(db, 'spims_students')),
          getDocs(collection(db, 'hq_staff')),
          getDocs(collection(db, 'rehab_staff')),
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
          hqStaff: hqStaffSnap.size + rehabStaffSnap.size,
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
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`w-10 h-10 animate-spin ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} font-medium animate-pulse`}>Initializing HQ Command Center...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/hq/dashboard/superadmin/users', label: 'User Management', icon: <Users2 size={24} />, description: 'Manage HQ & Department Users', color: 'teal' },
    { href: '/hq/dashboard/superadmin/approvals', label: 'Approvals', icon: <CheckCircle size={24} />, description: 'Cross-system Transaction Approvals', color: 'emerald' },
    { href: '/hq/dashboard/superadmin/audit', label: 'Audit Log', icon: <Activity size={24} />, description: 'Security & Activity Monitoring', color: 'indigo' },
    { href: '/hq/dashboard/superadmin/passwords', label: 'Credential Hub', icon: <Shield size={24} />, description: 'Emergency Password Management', color: 'amber' },
    { href: '/hq/dashboard/superadmin/rehab/patients', label: 'Rehab Data', icon: <Heart size={24} />, description: 'Global Access to Rehab Center', color: 'rose' },
    { href: '/hq/dashboard/superadmin/rehab/staff', label: 'Rehab Staff', icon: <Users size={24} />, description: 'Staff Records from Rehab Center', color: 'blue' },
    { href: '/hq/dashboard/superadmin/rehab/finance', label: 'Rehab Finance', icon: <TrendingUp size={24} />, description: 'Financial Oversight for Rehab', color: 'teal' },
    { href: '/hq/dashboard/superadmin/spims/students', label: 'SPIMS Data', icon: <GraduationCap size={24} />, description: 'Global Access to SPIMS College', color: 'indigo' },
    { href: '/hq/dashboard/superadmin/spims/staff', label: 'SPIMS Staff', icon: <Briefcase size={24} />, description: 'Staff Records from SPIMS Center', color: 'slate' },
    { href: '/hq/dashboard/superadmin/spims/finance', label: 'SPIMS Finance', icon: <PieChart size={24} />, description: 'Financial Oversight for SPIMS', color: 'emerald' },
    { href: '/hq/dashboard/superadmin/profile', label: 'Admin Settings', icon: <User size={24} />, description: 'My Profile & Master Settings', color: 'slate' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
      {/* Dynamic Header */}
      <div className={`sticky top-0 z-30 transition-all border-b ${darkMode ? 'bg-[#0A0A0A]/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-slate-200 backdrop-blur-xl shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${darkMode ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
                <Shield className={`w-8 h-8 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              </div>
              <div>
                <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  HQ <span className="text-teal-500">SUPERADMIN</span>
                </h1>
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-[10px] font-black uppercase tracking-[0.2em]`}>
                  Command & Control Center
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               {/* Quick Info (Desktop) */}
               <div className="hidden md:flex items-center gap-4 bg-slate-500/5 px-6 py-3 rounded-2xl border border-slate-500/10">
                  <div className="text-right">
                    <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{session?.name}</p>
                    <p className="text-teal-500 text-[10px] font-black uppercase tracking-[0.2em]">Master Key</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                    {session?.name?.charAt(0)}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 space-y-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard 
            label="Rehab Patients" 
            value={stats.rehabPatients} 
            icon={<Heart />} 
            trend="Live"
            color="rose"
            darkMode={darkMode}
          />
          <StatCard 
            label="SPIMS Students" 
            value={stats.spimsStudents} 
            icon={<GraduationCap />} 
            trend="Live"
            color="blue"
            darkMode={darkMode}
          />
          <StatCard 
            label="Unified Staff" 
            value={stats.hqStaff} 
            icon={<Briefcase />} 
            trend="Active"
            color="indigo"
            darkMode={darkMode}
          />
          <StatCard 
            label="Pending" 
            value={stats.pendingApprovals} 
            icon={<CheckCircle />} 
            trend="Needs Action"
            color="amber"
            highlight={stats.pendingApprovals > 0}
            darkMode={darkMode}
          />
          <StatCard 
            label="Revenue Today" 
            value={`Rs. ${stats.revenueToday.toLocaleString()}`} 
            icon={<TrendingUp />} 
            trend="Verified"
            color="emerald"
            darkMode={darkMode}
          />
          <StatCard 
            label="HQ Users" 
            value={stats.hqUsers} 
            icon={<Users2 />} 
            trend="System"
            color="teal"
            darkMode={darkMode}
          />
        </div>

        {/* Navigation Hub */}
        <div>
          <div className="flex items-center gap-4 mb-8">
            <h2 className={`text-sm font-black uppercase tracking-[0.3em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Access Hub
            </h2>
            <div className={`h-px flex-1 ${darkMode ? 'bg-white/5' : 'bg-slate-200'}`}></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {navItems.map((item, idx) => (
              <Link 
                key={idx} 
                href={item.href}
                className={`group relative overflow-hidden p-6 rounded-[2.5rem] border transition-all duration-500 ${
                  darkMode 
                    ? 'bg-white/[0.03] border-white/5 hover:border-teal-500/50 hover:bg-white/[0.06]' 
                    : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-2xl hover:shadow-teal-100/50'
                }`}
              >
                {/* Background Glow */}
                <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${
                  item.color === 'rose' ? 'bg-rose-500' : 
                  item.color === 'emerald' ? 'bg-emerald-500' :
                  item.color === 'amber' ? 'bg-amber-500' : 'bg-teal-500'
                }`} />

                <div className={`mb-4 p-4 w-fit rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 mt-1 ${
                  darkMode ? 'bg-white/5 text-teal-400 group-hover:bg-teal-500 group-hover:text-white' : 'bg-slate-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white shadow-sm'
                }`}>
                  {item.icon}
                </div>
                
                <h3 className={`font-black text-lg mb-1 transition-colors ${darkMode ? 'text-white group-hover:text-teal-400' : 'text-slate-900 group-hover:text-teal-600'}`}>
                  {item.label}
                </h3>
                <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.description}
                </p>

                <div className="mt-6 flex items-center justify-between">
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                     Open Portal
                   </span>
                   <div className={`p-2 rounded-xl transition-all ${darkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                     <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                   </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, highlight, color, darkMode }: {
  label: string; 
  value: string | number; 
  icon: React.ReactElement; 
  trend: string;
  highlight?: boolean;
  color: string;
  darkMode: boolean;
}) {
  const colorClasses: any = {
    rose: darkMode ? 'text-rose-400 bg-rose-400/10' : 'text-rose-600 bg-rose-50',
    blue: darkMode ? 'text-blue-400 bg-blue-400/10' : 'text-blue-600 bg-blue-50',
    indigo: darkMode ? 'text-indigo-400 bg-indigo-400/10' : 'text-indigo-600 bg-indigo-50',
    amber: darkMode ? 'text-amber-400 bg-amber-400/10 border-amber-500/20' : 'text-amber-600 bg-amber-50 border-amber-200',
    emerald: darkMode ? 'text-emerald-400 bg-emerald-400/10' : 'text-emerald-600 bg-emerald-50',
    teal: darkMode ? 'text-teal-400 bg-teal-400/10' : 'text-teal-600 bg-teal-50',
  };

  return (
    <div className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-500 group ${
      darkMode 
        ? `bg-white/[0.03] ${highlight ? 'border-amber-500/30' : 'border-white/5'}` 
        : `bg-white ${highlight ? 'border-amber-500/30 shadow-xl shadow-amber-500/10' : 'border-slate-200 shadow-sm'}`
    }`}>
      {/* Hover Background Pattern */}
      <div className={`absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        {icon}
      </div>

      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl transition-transform duration-500 group-hover:scale-110 ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
          highlight 
            ? (darkMode ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600')
            : (darkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400')
        }`}>
          {trend}
        </span>
      </div>
      
      <p className={`text-3xl font-black tracking-tight mb-1 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
      <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
    </div>
  );
}
