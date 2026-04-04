'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, CheckCircle, XCircle, Clock, FileText,
  ArrowRight, Loader2, AlertTriangle
} from 'lucide-react';

function timeAgo(dateInput: any): string {
  if (!dateInput) return 'N/A';
  const now = Date.now();
  let then: number;
  
  if (dateInput instanceof Timestamp) {
    then = dateInput.toMillis();
  } else if (dateInput?.seconds) {
    then = dateInput.seconds * 1000;
  } else {
    then = new Date(dateInput).getTime();
  }

  if (isNaN(then)) return 'N/A';
  
  const diff = now - then;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ManagerOverviewPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    notMarkedToday: 0,
    pendingApprovals: 0,
    urgentApprovals: 0,
  });
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hq_dark_mode') === 'true';
    setIsDark(saved);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'manager') return;

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const now = Date.now();

        // 1. Fetch Staff (Unified)
        const [hqStaffSnap, rehabStaffSnap] = await Promise.all([
          getDocs(query(collection(db, 'hq_staff'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true)))
        ]);

        const totalStaff = hqStaffSnap.size + rehabStaffSnap.size;

        // 2. Fetch Attendance (Unified)
        const [hqAttSnap, rehabAttSnap] = await Promise.all([
          getDocs(query(collection(db, 'hq_attendance'), where('date', '==', today))),
          getDocs(query(collection(db, 'rehab_attendance'), where('date', '==', today)))
        ]);

        const attendanceMap = new Map<string, string>();
        hqAttSnap.docs.forEach(d => attendanceMap.set(d.data().staffId, d.data().status));
        rehabAttSnap.docs.forEach(d => attendanceMap.set(d.data().staffId, d.data().status));

        let presentCount = 0;
        let absentCount = 0;
        
        // Count from both snaps
        [...hqStaffSnap.docs, ...rehabStaffSnap.docs].forEach(d => {
          const status = attendanceMap.get(d.id);
          if (status === 'present') presentCount++;
          else if (status === 'absent') absentCount++;
        });

        const [pendingSnap] = await Promise.all([
          getDocs(query(collection(db, 'rehab_transactions'), where('status', '==', 'pending'))),
        ]);

        const pending = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        pending.sort((a, b) => {
          const dateA = a.createdAt ? (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
          const dateB = b.createdAt ? (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
          return dateB - dateA;
        });

        const urgent = pending.filter(p => {
          if (!p.createdAt) return false;
          const ts = p.createdAt instanceof Timestamp ? p.createdAt.toMillis() : new Date(p.createdAt).getTime();
          return (now - ts) > 48 * 60 * 60 * 1000;
        });

        setStats({
          totalStaff,
          presentToday: presentCount,
          absentToday: absentCount,
          notMarkedToday: totalStaff - presentCount - absentCount,
          pendingApprovals: pending.length,
          urgentApprovals: urgent.length,
        });

        setPendingList(pending.slice(0, 5));
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-8 pb-12 p-4 md:p-8 min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Manager Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Daily operations and staff management</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Status</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard isDark={isDark} label="Total Staff" value={stats.totalStaff} icon={<Users size={18} />} color="bg-blue-500/10 text-blue-500" />
        <StatCard isDark={isDark} label="Present Today" value={stats.presentToday} icon={<CheckCircle size={18} />} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard isDark={isDark} label="Absent Today" value={stats.absentToday} icon={<XCircle size={18} />} color="bg-rose-500/10 text-rose-500" />
        <StatCard isDark={isDark} label="Not Marked" value={stats.notMarkedToday} icon={<Clock size={18} />} color="bg-amber-500/10 text-amber-500" />
        <StatCard isDark={isDark} label="Pending" value={stats.pendingApprovals} icon={<FileText size={18} />} color="bg-purple-500/10 text-purple-500" urgent={stats.urgentApprovals > 0} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/hq/dashboard/manager/staff/attendance', label: 'Mark Attendance', sub: "Today's check-in" },
          { href: '/hq/dashboard/manager/approvals', label: 'View Approvals', sub: 'Pending tasks' },
          { href: '/hq/dashboard/manager/staff', label: 'Staff Roster', sub: 'All employees' },
          { href: '/hq/dashboard/manager/users', label: 'Create Users', sub: 'Add staff accounts' }
        ].map((link, idx) => (
          <Link key={idx} href={link.href}
            className={`flex items-center justify-between px-6 py-5 rounded-[2rem] border transition-all group hover:scale-[1.02] ${
              isDark ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-gray-100 hover:shadow-xl'
            }`}>
            <div>
              <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{link.label}</p>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">{link.sub}</p>
            </div>
            <ArrowRight className={`w-5 h-5 transition-all ${isDark ? 'text-zinc-600 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-900'} group-hover:translate-x-1`} />
          </Link>
        ))}
      </div>

      {pendingList.length > 0 && (
        <div>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-500" /> Recent Pending Approvals
          </h2>
          <div className="space-y-3">
            {pendingList.map(p => (
                <div key={p.id} className={`px-6 py-4 rounded-3xl border flex items-center justify-between transition-all ${
                  isDark ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      p?.type === 'income' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {p?.type || 'N/A'}
                    </span>
                    <div>
                      <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{p?.category || 'General'}</p>
                      <p className="text-gray-500 text-[10px] font-bold">{p?.patientName || p?.studentName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>₨{p?.amount?.toLocaleString() || 0}</p>
                      <p className="text-gray-500 text-[10px] font-bold">{timeAgo(p?.createdAt)}</p>
                    </div>
                    {p.createdAt && (Date.now() - (p.createdAt instanceof Timestamp ? p.createdAt.toMillis() : new Date(p.createdAt).getTime())) > 48 * 60 * 60 * 1000 && (
                      <span className="px-2 py-1 rounded-lg bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest animate-pulse">
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, urgent, isDark }: {
  label: string; value: number; icon: React.ReactNode; color: string; urgent?: boolean; isDark?: boolean;
}) {
  return (
    <div className={`rounded-[2rem] p-5 border transition-all duration-300 shadow-sm ${
      isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100'
    } ${urgent ? 'ring-2 ring-rose-300 shadow-lg shadow-rose-100' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">{label}</p>
    </div>
  );
}