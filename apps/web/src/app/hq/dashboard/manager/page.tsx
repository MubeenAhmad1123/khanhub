'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, CheckCircle, XCircle, Clock, FileText,
  ArrowRight, Loader2, AlertTriangle
} from 'lucide-react';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
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
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        const urgent = pending.filter(p => {
          if (!p.createdAt) return false;
          return (now - new Date(p.createdAt).getTime()) > 48 * 60 * 60 * 1000;
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
        console.error(err);
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
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Manager Overview</h1>
        <p className="text-gray-400 text-sm mt-1">Daily operations and staff management</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Staff" value={stats.totalStaff} icon={<Users size={18} />} color="bg-blue-50 text-blue-600" />
        <StatCard label="Present Today" value={stats.presentToday} icon={<CheckCircle size={18} />} color="bg-green-50 text-green-600" />
        <StatCard label="Absent Today" value={stats.absentToday} icon={<XCircle size={18} />} color="bg-red-50 text-red-600" />
        <StatCard label="Not Marked" value={stats.notMarkedToday} icon={<Clock size={18} />} color="bg-amber-50 text-amber-600" />
        <StatCard label="Pending" value={stats.pendingApprovals} icon={<FileText size={18} />} color="bg-purple-50 text-purple-600" urgent={stats.urgentApprovals > 0} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/hq/dashboard/manager/staff/attendance"
          className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl border border-gray-100 hover:shadow-lg transition-all group">
          <div>
            <p className="font-black text-gray-900 text-sm">Mark Attendance</p>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Today's staff check-in</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link href="/hq/dashboard/manager/approvals"
          className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl border border-gray-100 hover:shadow-lg transition-all group">
          <div>
            <p className="font-black text-gray-900 text-sm">View Approvals</p>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Pending transactions</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link href="/hq/dashboard/manager/staff"
          className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl border border-gray-100 hover:shadow-lg transition-all group">
          <div>
            <p className="font-black text-gray-900 text-sm">Staff Roster</p>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">All employees</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link href="/hq/dashboard/manager/users"
          className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl border border-gray-100 hover:shadow-lg transition-all group">
          <div>
            <p className="font-black text-gray-900 text-sm">Create Users</p>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Add staff accounts</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {pendingList.length > 0 && (
        <div>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-500" /> Recent Pending Approvals
          </h2>
          <div className="space-y-3">
            {pendingList.map(p => {
              const isUrgent = p.createdAt && (Date.now() - new Date(p.createdAt).getTime()) > 48 * 60 * 60 * 1000;
              return (
                <div key={p.id} className="bg-white px-6 py-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      p.type === 'income' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {p.type}
                    </span>
                    <div>
                      <p className="font-black text-gray-900 text-sm">{p.category}</p>
                      <p className="text-gray-400 text-[10px]">{p.patientName || p.studentName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-black text-gray-900">₨{p.amount?.toLocaleString()}</p>
                      <p className="text-gray-400 text-[10px]">{timeAgo(p.createdAt)}</p>
                    </div>
                    {isUrgent && (
                      <span className="px-2 py-1 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest">
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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