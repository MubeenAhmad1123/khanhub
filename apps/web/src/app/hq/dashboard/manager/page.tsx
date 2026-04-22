'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, CheckCircle, XCircle, Clock, FileText,
  ArrowRight, Loader2, AlertTriangle, TrendingUp, Sun, Moon,
  ChevronRight, KeyRound
} from 'lucide-react';
import { useTheme } from 'next-themes';
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
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [attMap, setAttMap] = useState<Map<string, string>>(new Map());
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
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

        // 1. Fetch Staff (All 7 Departments)
        const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
        
        const staffQueries: any[] = [];
        depts.forEach(d => {
          staffQueries.push({ dept: d, q: query(collection(db, getDeptCollection(d)), where('isActive', '==', true)) });
        });

        const staffSnaps = await Promise.all(staffQueries.map(sq => getDocs(sq.q)));
        const STAFF_ROLES = ['admin', 'staff', 'cashier', 'manager', 'doctor', 'nurse', 'counselor'];

        let allStaffDocs: any[] = [];
        const seenStaffIds = new Set<string>();
        
        staffSnaps.forEach((s, idx) => {
          const dept = staffQueries[idx].dept;
          s.docs.forEach(doc => {
            const data = doc.data() as any;
            const role = String(data.role || '').toLowerCase();
            
            if (STAFF_ROLES.includes(role) && role !== 'superadmin') {
              const id = doc.id;
              if (!seenStaffIds.has(id)) {
                seenStaffIds.add(id);
                allStaffDocs.push({ 
                  ...data,
                  id, 
                  department: dept
                });
              }
            }
          });
        });

        // 2. Fetch Attendance
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

        // 3. Fetch Contributions
        const contribSnaps = await Promise.all(
          depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('isApproved', '==', false))))
        );

        let allContribs: any[] = [];
        contribSnaps.forEach((snap, i) => {
          const d = depts[i];
          const docs = snap.docs.map((docSnap: any) => ({ ...docSnap.data(), _dept: d, id: docSnap.id }));
          allContribs = [...allContribs, ...docs];
        });

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

        setStats({
          totalStaff,
          presentToday: presentCount,
          absentToday: absentCount,
          leaveToday: leaveCount,
          notMarkedToday: totalStaff - presentCount - absentCount - leaveCount,
          pendingApprovals: allContribs.length,
          urgentApprovals: allContribs.filter(p => (now - ((p.createdAt?.seconds || 0) * 1000)) > 48 * 60 * 60 * 1000).length,
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

  if (sessionLoading || loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF4]">
        <Loader2 className="w-10 h-10 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF4] text-black p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase italic">Managerial Command</h1>
          <p className="text-black/60 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Global Departmental Oversight • Real-time Operational Metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link 
            href="/hq/dashboard/manager/reports/daily"
            className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            <TrendingUp size={18} /> Generate Daily Report
          </Link>
          <div className="flex items-center gap-4 px-6 py-3 bg-white border-2 border-black rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Live Connection</p>
            </div>
            <div className="w-px h-4 bg-black/10" />
            <p className="text-[9px] font-black uppercase tracking-widest text-black/60">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <StatCard label="Total Staff" value={stats.totalStaff} icon={<Users size={20} />} color="bg-blue-50" textColor="text-blue-600" onClick={() => setSelectedMetric('total')} />
        <StatCard label="Present" value={stats.presentToday} icon={<CheckCircle size={20} />} color="bg-emerald-50" textColor="text-emerald-600" onClick={() => setSelectedMetric('present')} />
        <StatCard label="Absent" value={stats.absentToday} icon={<XCircle size={20} />} color="bg-rose-50" textColor="text-rose-600" onClick={() => setSelectedMetric('absent')} />
        <StatCard label="On Leave" value={stats.leaveToday} icon={<AlertTriangle size={20} />} color="bg-amber-50" textColor="text-amber-600" onClick={() => setSelectedMetric('leave')} />
        <StatCard label="Unmarked" value={stats.notMarkedToday} icon={<Clock size={20} />} color="bg-gray-100" textColor="text-gray-600" onClick={() => setSelectedMetric('notMarked')} />
        <StatCard label="Approvals" value={stats.pendingApprovals} icon={<FileText size={20} />} color="bg-purple-50" textColor="text-purple-600" urgent={stats.urgentApprovals > 0} onClick={() => setSelectedMetric('pending')} />
      </div>

      {/* Metric Detail View */}
      {selectedMetric && (
        <div className="p-8 rounded-[3rem] border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-black/5">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4">
                {selectedMetric === 'notMarked' ? 'Registry Variance' : 
                 selectedMetric === 'present' ? 'Verified Personnel' :
                 selectedMetric === 'absent' ? 'Personnel Deficit' :
                 selectedMetric === 'leave' ? 'Authorized Leave' : 'Personnel Registry'}
                <span className="text-[10px] px-3 py-1 bg-black text-white rounded-full font-black uppercase tracking-widest">
                  {allStaff.filter(s => {
                    const status = attMap.get(s.id);
                    if (selectedMetric === 'notMarked') return !status;
                    if (selectedMetric === 'present') return status === 'present';
                    if (selectedMetric === 'absent') return status === 'absent';
                    if (selectedMetric === 'leave') return status?.includes('leave');
                    return true;
                  }).length} Records
                </span>
              </h2>
            </div>
            <button onClick={() => setSelectedMetric(null)} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all">Collapse View</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {allStaff.filter(s => {
              const status = attMap.get(s.id);
              if (selectedMetric === 'notMarked') return !status;
              if (selectedMetric === 'present') return status === 'present';
              if (selectedMetric === 'absent') return status === 'absent';
              if (selectedMetric === 'leave') return status?.includes('leave');
              if (selectedMetric === 'total') return true;
              return false;
            }).map(s => (
              <div key={s.id} className="p-5 rounded-2xl border-2 border-black bg-white flex items-center justify-between group hover:bg-gray-50 transition-all">
                <Link href={`/hq/dashboard/manager/staff/${s.department}_${s.id}`} className="flex items-center gap-4 truncate">
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs">
                    {s.name?.[0] || 'S'}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-black truncate">{s.name}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-black/40">{s.department}</p>
                  </div>
                </Link>
                <ChevronRight size={16} className="text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Department Breakdown */}
        <div className="lg:col-span-7 rounded-[3.5rem] p-10 border-4 border-black bg-white shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tight italic">Institutional Velocity</h3>
              <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.3em] mt-2 italic">Real-time attendance density by division</p>
            </div>
            <div className="px-6 py-2 bg-black text-white rounded-2xl text-[9px] font-black uppercase tracking-widest">
              24H Matrix
            </div>
          </div>

          <div className="space-y-10">
            {Object.entries(deptStats).map(([dept, data]) => (
              <div key={dept} className="group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-black group-hover:scale-150 transition-all" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">{dept}</span>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verified</span>
                      <span className="text-sm font-black">{data.present}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] font-black text-rose-600 uppercase tracking-widest">Deficit</span>
                      <span className="text-sm font-black">{data.absent}</span>
                    </div>
                  </div>
                </div>
                <div className="h-4 w-full rounded-full bg-gray-50 border-2 border-black overflow-hidden flex p-0.5">
                  {data.total > 0 ? (
                    <>
                      <div style={{ width: `${(data.present/data.total)*100}%` }} className="h-full bg-emerald-500 rounded-full mr-0.5 transition-all duration-1000" />
                      <div style={{ width: `${(data.absent/data.total)*100}%` }} className="h-full bg-rose-500 rounded-full mr-0.5 transition-all duration-1000" />
                      <div style={{ width: `${(data.leave/data.total)*100}%` }} className="h-full bg-amber-500 rounded-full transition-all duration-1000" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 italic text-[8px] font-bold opacity-30 uppercase tracking-widest">Registry Empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Operations & Pending */}
        <div className="lg:col-span-5 space-y-8">
          <div className="p-8 rounded-[3rem] border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black uppercase tracking-tight mb-8">Priority Operations</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { href: '/hq/dashboard/manager/staff/attendance', label: 'Attendance logs', icon: <CheckCircle className="text-emerald-500" /> },
                { href: '/hq/dashboard/manager/approvals', label: 'Contribution desk', icon: <FileText className="text-purple-500" /> },
                { href: '/hq/dashboard/manager/staff', label: 'Personnel Registry', icon: <Users className="text-blue-500" /> },
                { href: '/hq/dashboard/manager/users', label: 'Identity Provision', icon: <KeyRound className="text-black" /> }
              ].map((op, i) => (
                <Link key={i} href={op.href} className="flex items-center justify-between p-6 rounded-2xl border-2 border-black hover:bg-black hover:text-white transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-black/5 group-hover:bg-white/10">
                      {op.icon}
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest">{op.label}</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={3} />
                </Link>
              ))}
            </div>
          </div>

          {pendingList.length > 0 && (
            <div className="p-8 rounded-[3rem] border-4 border-black bg-black text-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight italic">Pending Sync</h3>
                <Link href="/hq/dashboard/manager/approvals" className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100">View Grid</Link>
              </div>
              <div className="space-y-4">
                {pendingList.map(p => (
                  <div key={p.id} className="p-5 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-between hover:bg-white/20 transition-all cursor-pointer">
                    <div className="truncate pr-4">
                      <p className="text-sm font-black truncate">{p.title}</p>
                      <p className="text-[9px] font-bold opacity-40 uppercase mt-1">{p.dept} • {p.staffName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black text-emerald-400 italic">{timeAgo(p.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, textColor, urgent, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col p-8 rounded-[2.5rem] border-4 border-black transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-left group`}
    >
      <div className={`w-12 h-12 rounded-2xl ${color} ${textColor} flex items-center justify-center mb-6 border-2 border-black/5 group-hover:scale-110 transition-transform shadow-inner`}>
        {icon}
      </div>
      <p className="text-5xl font-[1000] tracking-tighter mb-2 text-black">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black opacity-40 group-hover:opacity-100 transition-opacity italic">{label}</p>
      {urgent && <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
    </button>
  );
}

