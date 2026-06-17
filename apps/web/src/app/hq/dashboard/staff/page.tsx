// src/app/hq/dashboard/staff/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import {
  User, Calendar, Star, TrendingUp, LogOut, Award,
  Clock, CheckCircle, XCircle, AlertCircle, Activity,
  Shield, Phone, Mail, MapPin, CreditCard
} from 'lucide-react';

interface StaffProfile {
  uid: string;
  name: string;
  role: string;
  customId: string;
  employeeId?: string;
  designation?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  department?: string;
  isActive?: boolean;
  monthlySalary?: number;
  joiningDate?: any;
  address?: string;
  cnic?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  leave: number;
}

interface Task {
  id: string;
  description: string;
  status: string;
  assignedByName?: string;
  createdAt: string;
}

export default function HqStaffProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceSummary>({ present: 0, absent: 0, late: 0, leave: 0 });
  const [growthPoints, setGrowthPoints] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('hq_session');
    localStorage.removeItem('hq_login_time');
    signOut(auth).catch(() => {});
    router.push('/hq/login');
  }, [router]);

  useEffect(() => {
    const raw = localStorage.getItem('hq_session');
    if (!raw) {
      router.push('/hq/login');
      return;
    }

    let session: any;
    try {
      session = JSON.parse(raw);
    } catch {
      router.push('/hq/login');
      return;
    }

    const uid = session.uid;
    if (!uid) {
      router.push('/hq/login');
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        // 1. Fetch base profile from hq_users
        const snap = await getDoc(doc(db, 'hq_users', uid));
        if (!snap.exists()) {
          setError('Profile not found. Please contact your administrator.');
          setLoading(false);
          return;
        }
        const data = snap.data() as any;
        setProfile({
          uid,
          name: data.name || data.displayName || session.name || 'Staff',
          role: data.role || session.role || 'staff',
          customId: data.customId || session.customId || '',
          employeeId: data.employeeId,
          designation: data.designation,
          email: data.email,
          phone: data.phone,
          photoUrl: data.photoUrl || data.photoURL,
          department: data.department || 'HQ',
          isActive: data.isActive !== false,
          monthlySalary: data.monthlySalary,
          joiningDate: data.joiningDate || data.createdAt,
          address: data.address,
          cnic: data.cnic,
          dutyStartTime: data.dutyStartTime || '09:00',
          dutyEndTime: data.dutyEndTime || '17:00',
        });

        // 2. Fetch this month's attendance
        const monthKey = new Date().toISOString().slice(0, 7);
        const candidateIds = [uid, data.customId, data.employeeId].filter(Boolean);

        const attDocs: any[] = [];
        for (const cid of candidateIds) {
          const attSnap = await getDocs(
            query(collection(db, 'hq_attendance'), where('staffId', '==', cid))
          ).catch(() => ({ docs: [] as any[] }));
          attDocs.push(...attSnap.docs);
        }

        const seenAtt = new Set<string>();
        const attSummary: AttendanceSummary = { present: 0, absent: 0, late: 0, leave: 0 };
        attDocs.forEach((d: any) => {
          if (seenAtt.has(d.id)) return;
          seenAtt.add(d.id);
          const rd = d.data();
          if (!rd.date || !rd.date.startsWith(monthKey)) return;
          const s = (rd.status || '').toLowerCase();
          if (s === 'present') attSummary.present++;
          else if (s === 'late') { attSummary.late++; attSummary.present++; }
          else if (s === 'absent') attSummary.absent++;
          else if (s.includes('leave')) attSummary.leave++;
        });
        setAttendance(attSummary);

        // 3. Fetch growth points this month
        let gp = 0;
        for (const cid of candidateIds) {
          const contribSnap = await getDocs(
            query(collection(db, 'hq_contributions'), where('staffId', '==', cid))
          ).catch(() => ({ docs: [] as any[] }));
          contribSnap.docs.forEach((d: any) => {
            const rd = d.data();
            if (!rd.date || !rd.date.startsWith(monthKey)) return;
            const s = (rd.status || '').toLowerCase();
            if (s === 'yes' || rd.isApproved === true) gp++;
          });
        }
        setGrowthPoints(gp);

        // 4. Fetch active tasks
        const taskDocs: any[] = [];
        for (const cid of candidateIds) {
          const taskSnap = await getDocs(
            query(collection(db, 'hq_special_tasks'), where('staffId', '==', cid))
          ).catch(() => ({ docs: [] as any[] }));
          taskDocs.push(...taskSnap.docs);
        }
        const seen = new Set<string>();
        const taskList: Task[] = [];
        taskDocs.forEach((d: any) => {
          if (seen.has(d.id)) return;
          seen.add(d.id);
          const rd = d.data();
          taskList.push({
            id: d.id,
            description: rd.description,
            status: rd.status,
            assignedByName: rd.assignedByName,
            createdAt: rd.createdAt,
          });
        });
        setTasks(taskList.sort((a, b) => a.status === 'completed' ? 1 : -1));

      } catch (err: any) {
        console.error('[HqStaffProfile] Error:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [router]);

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    if (val?.toDate) return val.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    try { return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return 'N/A'; }
  };

  const attTotal = attendance.present + attendance.absent + attendance.leave;
  const attPct = attTotal > 0 ? Math.round((attendance.present / attTotal) * 100) : 0;

  const taskStatusBadge = (s: string) => {
    if (s === 'completed') return 'bg-green-50 text-green-700 border-green-100';
    if (s === 'acknowledged') return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };
  const taskStatusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle size={13} className="text-green-600" />;
    if (s === 'acknowledged') return <AlertCircle size={13} className="text-blue-600" />;
    return <Clock size={13} className="text-amber-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100 text-center max-w-md w-full">
          <XCircle size={40} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-semibold text-sm mb-4">{error}</p>
          <button onClick={handleSignOut} className="text-sm text-gray-500 underline">Sign out</button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
            <Shield size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">HQ Staff Portal</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{profile.customId}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-gray-800 to-gray-700" />
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name}
                  className="w-16 h-16 rounded-2xl border-4 border-white shadow-md object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md bg-gray-800 flex items-center justify-center text-2xl font-bold text-white">
                  {profile.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="pb-1">
                <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
                <p className="text-sm text-gray-500">{profile.designation || profile.role}</p>
              </div>
            </div>

            {/* Quick info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <CreditCard size={13} />, label: 'Employee ID', value: profile.employeeId || profile.customId || '—' },
                { icon: <Shield size={13} />, label: 'Department', value: profile.department || 'HQ' },
                { icon: <Clock size={13} />, label: 'Duty Hours', value: `${profile.dutyStartTime} – ${profile.dutyEndTime}` },
                { icon: <Calendar size={13} />, label: 'Joined', value: formatDate(profile.joiningDate) },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">{item.icon}<span className="text-[9px] uppercase tracking-wider font-bold">{item.label}</span></div>
                  <p className="text-sm font-bold text-gray-800 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Present', value: attendance.present, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle size={16} className="text-emerald-500" /> },
            { label: 'Absent', value: attendance.absent, color: 'text-red-600', bg: 'bg-red-50', icon: <XCircle size={16} className="text-red-500" /> },
            { label: 'Late', value: attendance.late, color: 'text-amber-600', bg: 'bg-amber-50', icon: <AlertCircle size={16} className="text-amber-500" /> },
            { label: 'Growth Pts', value: growthPoints, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <Star size={16} className="text-indigo-500" /> },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 flex flex-col gap-2`}>
              {s.icon}
              <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Attendance bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-900">Attendance This Month</h3>
            <span className="ml-auto text-xs font-bold text-gray-500">{attPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${attPct}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-[11px] text-gray-500">
            <span><span className="font-bold text-emerald-600">{attendance.present}</span> Present</span>
            <span><span className="font-bold text-red-500">{attendance.absent}</span> Absent</span>
            <span><span className="font-bold text-amber-500">{attendance.late}</span> Late</span>
            <span><span className="font-bold text-blue-500">{attendance.leave}</span> Leave</span>
          </div>
        </div>

        {/* Tasks */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award size={15} className="text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900">Assigned Tasks</h3>
              <span className="ml-auto text-[10px] font-bold text-gray-400">{tasks.filter(t => t.status !== 'completed').length} active</span>
            </div>
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="mt-0.5">{taskStatusIcon(task.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-gray-800 ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                      {task.description}
                    </p>
                    {task.assignedByName && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Assigned by {task.assignedByName}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${taskStatusBadge(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-900">My Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: <Phone size={13} />, label: 'Phone', value: profile.phone || '—' },
              { icon: <Mail size={13} />, label: 'Email', value: profile.email || '—' },
              { icon: <CreditCard size={13} />, label: 'CNIC', value: profile.cnic || '—' },
              { icon: <MapPin size={13} />, label: 'Address', value: profile.address || '—' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-400 mt-0.5">{item.icon}</div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-800 break-all">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status footer */}
        <div className="pb-4 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${profile.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <p className="text-xs text-gray-400">
            Account is <span className={`font-bold ${profile.isActive ? 'text-emerald-600' : 'text-red-600'}`}>{profile.isActive ? 'Active' : 'Inactive'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
