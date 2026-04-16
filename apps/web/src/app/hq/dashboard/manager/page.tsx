'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, CheckCircle, XCircle, Clock, FileText,
  ArrowRight, Loader2, AlertTriangle
} from 'lucide-react';
import { getDeptCollection, getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';

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
    leaveToday: 0,
    notMarkedToday: 0,
    pendingApprovals: 0,
    urgentApprovals: 0,
  });
  const [deptStats, setDeptStats] = useState<Record<string, { present: number, absent: number, leave: number, total: number }>>({});
  const [activities, setActivities] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [attMap, setAttMap] = useState<Map<string, string>>(new Map());
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getMs = (dateInput: any): number => {
    if (!dateInput) return 0;
    if (dateInput?.seconds) return dateInput.seconds * 1000;
    if (dateInput instanceof Date) return dateInput.getTime();
    const parsed = new Date(dateInput).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

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

        // 1. Fetch Staff (All 7 Departments) - Handle diverse collection schemas
        const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];
        
        const staffQueries: any[] = [];
        
        depts.forEach(d => {
          // Main staff collection
          staffQueries.push({ dept: d, q: query(collection(db, getDeptCollection(d)), where('isActive', '==', true)) });
          
          // Legacy check for _staff collections where they exist (mostly for hospital/sukoon data compatibility)
          const prefix = getDeptPrefix(d);
          if (prefix !== 'hq') {
             staffQueries.push({ dept: d, q: query(collection(db, `${prefix}_staff`), where('isActive', '==', true)) });
          }
        });

        const staffSnaps = await Promise.all(staffQueries.map(sq => getDocs(sq.q)));
        const STAFF_ROLES = ['admin', 'staff', 'cashier', 'manager', 'superadmin', 'doctor', 'nurse', 'counselor'];

        let allStaffDocs: any[] = [];
        const seenStaffIds = new Set<string>();
        
        staffSnaps.forEach((s, idx) => {
          const dept = staffQueries[idx].dept;
          s.docs.forEach(doc => {
            const data = doc.data() as any;
            const role = String(data.role || '').toLowerCase();
            
            // Only include legitimate staff roles
            if (STAFF_ROLES.includes(role)) {
              const id = doc.id;
              if (!seenStaffIds.has(id)) {
                seenStaffIds.add(id);
                allStaffDocs.push({ 
                  id, 
                  department: dept,
                  ...data
                });
              }
            }
          });
        });

        // 2. Fetch Attendance (All 7 Departments)
        const attSnaps = await Promise.all(
          depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_attendance`), where('date', '==', today))))
        );

        const attendanceMap = new Map<string, string>();
        let presentCount = 0;
        let absentCount = 0;
        let leaveCount = 0;
        const totalStaff = allStaffDocs.length;
        
        const dStats: Record<string, { present: number, absent: number, leave: number, total: number }> = {};
        depts.forEach(d => {
          dStats[d] = { present: 0, absent: 0, leave: 0, total: 0 };
        });

        // Count staff per department
        allStaffDocs.forEach(s => {
          const dept = (s.dept as string) || 'hq';
          if (dStats[dept]) dStats[dept].total++;
        });

        attSnaps.forEach((snap, i) => {
          const dept = depts[i];
          snap.docs.forEach(d => {
            const data = d.data();
            const key = data.staffId || d.id;
            attendanceMap.set(key, data.status);
            
            if (data.status === 'present') {
              presentCount++;
              if (dStats[dept]) dStats[dept].present++;
            } else if (data.status === 'absent') {
              absentCount++;
              if (dStats[dept]) dStats[dept].absent++;
            } else if (data.status && (data.status.includes('leave'))) {
              leaveCount++;
              if (dStats[dept]) dStats[dept].leave++;
            }
          });
        });

        setDeptStats(dStats);

        // 3. Fetch Contributions (Pending)
        const contribSnaps = await Promise.all(
          depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('isApproved', '==', false))))
        );

        let allContribs: any[] = [];
        contribSnaps.forEach((snap, i) => {
          const dept = depts[i];
          const docs = snap.docs.map(docSnap => ({ 
            id: docSnap.id, 
            ...docSnap.data(), 
            dept 
          }));
          allContribs = [...allContribs, ...docs];
        });

        // Fetch Recent Audit Log for activities
        const auditSnap = await getDocs(query(collection(db, 'hq_audit'), limit(10)));
        const auditActivities = auditSnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
          type: 'audit'
        }));

        setActivities(auditActivities.sort((a: any, b: any) => getMs(b.createdAt || b.timestamp || b.at) - getMs(a.createdAt || a.timestamp || a.at)));

        // Fetch Staff Names for the recent list
        const staffMap: Record<string, string> = {};
        allStaffDocs.forEach(s => {
          staffMap[s.id] = s.name || s.displayName || 'Staff Member';
          if (s.loginUserId) staffMap[s.loginUserId] = s.name || s.displayName || 'Staff Member';
        });

        const recentContribs = allContribs.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        }).slice(0, 5);

        const enrichedList = recentContribs.map(c => ({
          ...c,
          staffName: staffMap[c.staffId] || staffMap[c.userId] || 'Staff'
        }));

        const pendingCount = allContribs.length;
        const urgent = allContribs.filter(p => {
          if (!p.createdAt?.seconds) return false;
          return (now - (p.createdAt.seconds * 1000)) > 48 * 60 * 60 * 1000;
        });

        setStats({
          totalStaff,
          presentToday: presentCount,
          absentToday: absentCount,
          leaveToday: leaveCount,
          notMarkedToday: totalStaff - presentCount - absentCount - leaveCount,
          pendingApprovals: pendingCount,
          urgentApprovals: urgent.length,
        });

        setAllStaff(allStaffDocs);
        setAttMap(attendanceMap);
        setDeptStats(dStats);
        setPendingList(enrichedList);
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
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-[#F8FAFC]'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 md:space-y-8 pb-12 p-4 md:p-8 min-h-screen transition-colors duration-300 w-full overflow-x-hidden ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-[1000] tracking-tight bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">Manager Overview</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Global Departmental Oversight & Real-time Metrics</p>
        </div>
        <div className={`flex items-center gap-4 px-4 py-2 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic">Connected Live</p>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard isDark={isDark} label="Total Staff" value={stats.totalStaff} icon={<Users size={18} />} color="bg-blue-500/10 text-blue-500" onClick={() => setSelectedMetric('total')} />
        <StatCard isDark={isDark} label="Present" value={stats.presentToday} icon={<CheckCircle size={18} />} color="bg-emerald-500/10 text-emerald-500" onClick={() => setSelectedMetric('present')} />
        <StatCard isDark={isDark} label="Absent" value={stats.absentToday} icon={<XCircle size={18} />} color="bg-rose-500/10 text-rose-500" onClick={() => setSelectedMetric('absent')} />
        <StatCard isDark={isDark} label="On Leave" value={stats.leaveToday} icon={<AlertTriangle size={18} />} color="bg-amber-500/10 text-amber-500" onClick={() => setSelectedMetric('leave')} />
        <StatCard isDark={isDark} label="Not Marked" value={stats.notMarkedToday} icon={<Clock size={18} />} color="bg-zinc-500/10 text-zinc-500" onClick={() => setSelectedMetric('notMarked')} />
        <StatCard isDark={isDark} label="Pending Tasks" value={stats.pendingApprovals} icon={<FileText size={18} />} color="bg-purple-500/10 text-purple-500" urgent={stats.urgentApprovals > 0} onClick={() => setSelectedMetric('pending')} />
      </div>

      {/* Metric Detail View */}
      {selectedMetric && (
        <div className={`animate-in slide-in-from-top duration-500 p-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-gray-100 shadow-xl'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                {selectedMetric === 'notMarked' ? 'Unmarked Attendance' : 
                 selectedMetric === 'present' ? 'Present Staff' :
                 selectedMetric === 'absent' ? 'Absent Staff' :
                 selectedMetric === 'leave' ? 'Staff on Leave' : 'Staff List'}
                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>
                  {allStaff.filter(s => {
                    const status = attMap.get(s.id);
                    if (selectedMetric === 'notMarked') return !status;
                    if (selectedMetric === 'present') return status === 'present';
                    if (selectedMetric === 'absent') return status === 'absent';
                    if (selectedMetric === 'leave') return status?.includes('leave');
                    return true;
                  }).length} Total
                </span>
              </h2>
            </div>
            <button onClick={() => setSelectedMetric(null)} className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-rose-500 transition-colors">Close List</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allStaff.filter(s => {
              const status = attMap.get(s.id);
              if (selectedMetric === 'notMarked') return !status;
              if (selectedMetric === 'present') return status === 'present';
              if (selectedMetric === 'absent') return status === 'absent';
              if (selectedMetric === 'leave') return status?.includes('leave');
              if (selectedMetric === 'total') return true;
              return false;
            }).map(s => (
              <div key={s.id} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${isDark ? 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800' : 'bg-gray-50/50 border-gray-100 hover:bg-white hover:shadow-lg'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs uppercase
                    ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-white text-gray-400 shadow-sm'}`}>
                    {s.name?.[0] || 'S'}
                  </div>
                  <div>
                    <p className="text-sm font-black">{s.name}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{s.department}</p>
                  </div>
                </div>
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(!attMap.get(s.id)) && (
                    <div className="flex gap-1">
                      <button 
                        onClick={async () => {
                          try {
                            setActionLoading(s.id);
                            const prefix = getDeptPrefix(s.department as any);
                            const today = new Date().toISOString().split('T')[0];
                            const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
                            await setDoc(doc(db, `${prefix}_attendance`, `${s.id}_${today}`), {
                              staffId: s.id,
                              status: 'present',
                              date: today,
                              timestamp: serverTimestamp(),
                              markedBy: session?.name || 'HQ Manager'
                            }, { merge: true });
                            const newMap = new Map(attMap);
                            newMap.set(s.id, 'present');
                            setAttMap(newMap);
                            setStats(prev => ({ ...prev, presentToday: prev.presentToday + 1, notMarkedToday: prev.notMarkedToday - 1 }));
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading === s.id}
                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        {actionLoading === s.id ? '...' : 'Present'}
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            setActionLoading(s.id);
                            const prefix = getDeptPrefix(s.department as any);
                            const today = new Date().toISOString().split('T')[0];
                            const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
                            await setDoc(doc(db, `${prefix}_attendance`, `${s.id}_${today}`), {
                              staffId: s.id,
                              status: 'absent',
                              date: today,
                              timestamp: serverTimestamp(),
                              markedBy: session?.name || 'HQ Manager'
                            }, { merge: true });
                            const newMap = new Map(attMap);
                            newMap.set(s.id, 'absent');
                            setAttMap(newMap);
                            setStats(prev => ({ ...prev, absentToday: prev.absentToday + 1, notMarkedToday: prev.notMarkedToday - 1 }));
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading === s.id}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        {actionLoading === s.id ? '...' : 'Absent'}
                      </button>
                    </div>
                  )}
                  {attMap.get(s.id) && (
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${attMap.get(s.id) === 'present' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {attMap.get(s.id)}
                    </span>
                  )}
                  <Link href={`/hq/dashboard/manager/staff/${s.id}?dept=${s.department}`} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics & Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Department Breakdown Report */}
        <div className={`lg:col-span-2 rounded-[2.5rem] p-8 border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800 shadow-2xl shadow-black/40' : 'bg-white border-gray-100 shadow-xl shadow-blue-900/5'}`}>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Institutional Status Breakdown</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Real-time attendance velocity by department</p>
            </div>
            <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-50 text-gray-400'}`}>
              Today Snapshot
            </div>
          </div>

          <div className="space-y-8">
            {Object.entries(deptStats).map(([dept, data]) => (
              <div key={dept} className="group">
                <div className="flex items-center justify-between px-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-blue-500 transition-colors">{dept}</span>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest leading-none mb-1">Present</span>
                      <span className="text-sm font-black text-emerald-500">{data.present}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest leading-none mb-1">Absent</span>
                      <span className="text-sm font-black text-rose-500">{data.absent}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest leading-none mb-1">Leave</span>
                      <span className="text-sm font-black text-amber-500">{data.leave}</span>
                    </div>
                  </div>
                </div>
                <div className={`h-3 w-full rounded-2xl flex overflow-hidden p-0.5 ${isDark ? 'bg-zinc-800/50' : 'bg-gray-100/50'}`}>
                  {data.total > 0 ? (
                    <>
                      <div style={{ width: `${(data.present/data.total)*100}%` }} className="h-full bg-emerald-500 rounded-full mr-0.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000" />
                      <div style={{ width: `${(data.absent/data.total)*100}%` }} className="h-full bg-rose-500 rounded-full mr-0.5 shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all duration-1000" />
                      <div style={{ width: `${(data.leave/data.total)*100}%` }} className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all duration-1000" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                       <span className="text-[8px] font-bold text-gray-400 uppercase italic">No active staff registered</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Left Column: Quick Actions & Pending List */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Actions */}
          <section>
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quick Operations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { href: '/hq/dashboard/manager/staff/attendance', label: 'Mark Attendance', sub: "Daily check-in logs", icon: <CheckCircle className="text-emerald-500" /> },
                { href: '/hq/dashboard/manager/approvals', label: 'Handle Approvals', sub: 'Contributions & Requests', icon: <FileText className="text-purple-500" /> },
                { href: '/hq/dashboard/manager/staff', label: 'Global Staff Roster', sub: 'Manage all departments', icon: <Users className="text-blue-500" /> },
                { href: '/hq/dashboard/manager/users', label: 'User Provisioning', sub: 'Create staff accounts', icon: <ArrowRight className="text-zinc-400" /> }
              ].map((link, idx) => (
                <Link key={idx} href={link.href}
                  className={`flex items-center gap-4 p-5 rounded-3xl border transition-all group hover:shadow-2xl hover:-translate-y-1 ${
                    isDark ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800' : 'bg-white border-gray-100/80 hover:border-blue-100 shadow-sm'
                  }`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    {link.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{link.label}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">{link.sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </Link>
              ))}
            </div>
          </section>

          {/* Pending Items */}
          {pendingList.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" /> Critical Pending Items
                </h2>
                <Link href="/hq/dashboard/manager/approvals" className="text-[10px] font-black text-blue-500 hover:underline uppercase tracking-widest">View All</Link>
              </div>
              <div className="space-y-3">
                {pendingList.map(p => (
                    <div key={p.id} className={`p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                      isDark ? 'bg-zinc-900/20 border-zinc-800/40' : 'bg-white border-gray-100/60 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 bg-gradient-to-br from-purple-500 to-blue-600 text-white uppercase`}>
                           {p.dept?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-black text-sm md:text-base truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase">{p.dept}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <p className="text-gray-500 text-[10px] font-bold truncate">By {p.staffName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-black text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>+1 Unit</p>
                        <p className="text-gray-400 text-[10px] font-bold mt-0.5 italic">{timeAgo(p.createdAt)}</p>
                      </div>
                    </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Recent Activity Log */}
        <div className="space-y-8">
          <section>
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">System Activity</h2>
            <div className={`rounded-[2.5rem] border overflow-hidden ${isDark ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-gray-100 shadow-xl'}`}>
              <div className="p-6 space-y-6">
                {activities.length > 0 ? activities.map((act, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        act.action === 'approval' ? 'bg-emerald-500/10 text-emerald-500' : 
                        act.action === 'user_created' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {act.action === 'approval' ? <CheckCircle size={14} /> : 
                         act.action === 'user_created' ? <Users size={14} /> : <Clock size={14} />}
                      </div>
                      {idx !== activities.length - 1 && <div className="w-px h-full bg-gray-100 dark:bg-zinc-800 mt-2" />}
                    </div>
                    <div className="pb-4">
                      <p className={`text-xs font-black uppercase tracking-wider mb-0.5 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {act.action?.replace('_', ' ')}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                        {act.details?.name || act.details?.customId || 'System task'} processed by {act.performedBy?.split('@')[0] || 'Admin'}
                      </p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-2 bg-gray-100 dark:bg-zinc-800/50 inline-block px-2 py-0.5 rounded-lg">
                        {timeAgo(act.createdAt)}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-xs font-black italic">No recent activity found</p>
                  </div>
                )}
              </div>
              <div className={`p-4 bg-gray-50 dark:bg-zinc-800/50 border-t ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
                 <Link href="/hq/dashboard/audit" className="block text-center text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-blue-500 transition-colors">
                    View Full Audit Trail
                 </Link>
              </div>
            </div>
          </section>

          {/* Quick Tip / Status */}
          <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20">
            <h3 className="font-black text-sm mb-2">Manager Insight</h3>
            <p className="text-[11px] leading-relaxed opacity-90 font-medium italic">
              "Total staff visibility is now optimized across all 7 departments. Ensure all staff members have their unique User IDs for the new Universal Sign-In system."
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, urgent, isDark, onClick }: {
  label: string; value: number; icon: React.ReactNode; color: string; urgent?: boolean; isDark?: boolean; onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-3xl p-5 border transition-all duration-500 relative overflow-hidden group cursor-pointer ${
      isDark ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/80 shadow-2xl shadow-black/50' : 'bg-white border-gray-100/80 hover:shadow-2xl shadow-sm'
    } ${urgent ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-zinc-950 shadow-rose-900/20' : ''} active:scale-95`}>
      <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-8 -mt-8 ${color.split(' ')[0]}`} />
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-inner ${color}`}>
        {icon}
      </div>
      <p className={`text-4xl font-[1000] tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
      {urgent && <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
    </div>
  );
}