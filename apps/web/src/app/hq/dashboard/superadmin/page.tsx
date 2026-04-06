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

interface Transaction {
  id: string;
  status: string;
  type: string;
  amount: number | string;
  createdAt: any;
}

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

        const rehabTrans = rehabTransSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        const spimsTrans = spimsTransSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));

        const pendingCount = 
          rehabTrans.filter(t => t?.status === 'pending').length + 
          spimsTrans.filter(t => t?.status === 'pending').length;

        const revenueToday = [...rehabTrans, ...spimsTrans]
          .filter(t => {
            if (!t || t.status !== 'approved' || t.type !== 'income') return false;
            // Handle Timestamp vs Date string safely
            let date;
            if (t.createdAt instanceof Timestamp) {
              date = t.createdAt.toDate();
            } else if (t.createdAt?.seconds) {
              // Sometimes it's a plain object with seconds (from JSON or similar)
              date = new Date(t.createdAt.seconds * 1000);
            } else if (t.createdAt) {
              date = new Date(t.createdAt);
            } else {
              return false;
            }
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
    <div className={`min-h-screen overflow-x-hidden w-full max-w-full transition-colors duration-500 pb-20 ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
      {/* Dynamic Header */}
      <header className={`sticky top-0 z-10 py-4 px-4 md:px-8 transition-all border-b ${darkMode ? 'bg-[#0A0A0A]/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-slate-200 backdrop-blur-xl shadow-sm'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-2 md:p-3 rounded-2xl ${darkMode ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
                <Shield className={`w-6 h-6 md:w-8 md:h-8 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              </div>
              <div>
                <h1 className={`text-xl md:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  HQ <span className="text-teal-500">SUPERADMIN</span>
                </h1>
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-[10px] font-black uppercase tracking-[0.2em] opacity-50`}>
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
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 space-y-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <StatCard 
            label="Rehab Patients" 
            value={stats.rehabPatients} 
            trend="Live"
            borderColor="border-teal-500"
            darkMode={darkMode}
          />
          <StatCard 
            label="SPIMS Students" 
            value={stats.spimsStudents} 
            trend="Live"
            borderColor="border-purple-500"
            darkMode={darkMode}
          />
          <StatCard 
            label="Unified Staff" 
            value={stats.hqStaff} 
            trend="Active"
            borderColor="border-amber-500"
            darkMode={darkMode}
          />
          <StatCard 
            label="Pending" 
            value={stats.pendingApprovals} 
            trend="Needs Action"
            borderColor="border-red-500"
            darkMode={darkMode}
          />
          <StatCard 
            label="Revenue Today" 
            value={`Rs. ${stats.revenueToday.toLocaleString()}`} 
            trend="Verified"
            borderColor="border-emerald-500"
            darkMode={darkMode}
          />
          <StatCard 
            label="HQ Users" 
            value={stats.hqUsers} 
            trend="System"
            borderColor="border-slate-500"
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
            {navItems.map((item, idx) => (
              <Link 
                key={idx} 
                href={item.href}
                className={`rounded-2xl p-4 flex flex-col gap-2 ${darkMode ? 'bg-white/5 border border-white/10 hover:border-teal-500/40 hover:bg-teal-500/5' : 'bg-white border border-slate-200 shadow-sm hover:border-teal-500 hover:bg-teal-50'} active:scale-95 transition-all cursor-pointer`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 ${darkMode ? 'bg-white/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                  {item.icon}
                </div>
                <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
                <p className={`text-[10px] leading-tight ${darkMode ? 'opacity-50 text-slate-300' : 'text-slate-500'}`}>{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, borderColor, darkMode }: {
  label: string; 
  value: string | number; 
  trend: string;
  borderColor: string;
  darkMode: boolean;
}) {
  return (
    <div className={`relative rounded-2xl p-4 flex flex-col gap-1 border-l-4 ${borderColor} ${darkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
      <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</span>
      <span className={`text-[10px] uppercase tracking-widest ${darkMode ? 'opacity-60 text-slate-400' : 'text-slate-500'}`}>{label}</span>
      <span className={`absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
        {trend}
      </span>
    </div>
  );
}
