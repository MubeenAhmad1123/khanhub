'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import {
  Users, CheckCircle, XCircle, Clock, FileText,
  ArrowRight, Loader2, AlertTriangle, TrendingUp,
  ChevronRight, KeyRound, Calendar, Send, Activity
} from 'lucide-react';
import { getDeptCollection, getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const DEPARTMENT_IMAGES = [
  { src: '/logo-circle.webp', alt: 'Khan Hub', duration: 4000 },
  { src: '/images/education-circle.webp', alt: 'Education Department', duration: 2500 },
  { src: '/images/enterprises-circle.webp', alt: 'Enterprises', duration: 2500 },
  { src: '/images/institute-health-sciences-circle.webp', alt: 'Institute of Health Sciences', duration: 2500 },
  { src: '/images/job-circle.webp', alt: 'Job Department', duration: 2500 },
  { src: '/images/marketing-circle.webp', alt: 'Marketing', duration: 2500 },
  { src: '/images/medical-center-circle.webp', alt: 'Medical Center', duration: 2500 },
  { src: '/images/prosthetic-circle.webp', alt: 'Prosthetic Department', duration: 2500 },
  { src: '/images/rehab-circle.webp', alt: 'Rehabilitation', duration: 2500 },
  { src: '/images/residential-circle.webp', alt: 'Residential', duration: 2500 },
  { src: '/images/skill-circle.webp', alt: 'Skill Development', duration: 2500 },
  { src: '/images/sukoon-circle.webp', alt: 'Sukoon', duration: 2500 },
  { src: '/images/surgical-repair-circle.webp', alt: 'Surgical Repair', duration: 2500 },
  { src: '/images/surgical-services-circle.webp', alt: 'Surgical Services', duration: 2500 },
  { src: '/images/transport-circle.webp', alt: 'Transport', duration: 2500 },
  { src: '/images/travel-and-tour-circle.webp', alt: 'Travel and Tour', duration: 2500 },
  { src: '/images/welfare-organization-circle.webp', alt: 'Welfare Organization', duration: 2500 },
];

const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DEPARTMENT_IMAGES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div 
        className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto lg:w-72 lg:h-72 flex-shrink-0 transition-all duration-300 rounded-full overflow-hidden flex items-center justify-center bg-white border border-gray-100 shadow-sm"
        style={{
          transform: 'perspective(1000px) rotateX(10deg) rotateY(-8deg) scale(1.02)',
          transformStyle: 'preserve-3d'
        }}
      >
        {DEPARTMENT_IMAGES.map((img, index) => (
          <div
            key={img.src}
            className={`absolute inset-0 transition-opacity duration-300 rounded-full overflow-hidden flex items-center justify-center ${
              index === currentIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-contain rounded-full"
              sizes="(max-width: 640px) 192px, 256px"
              priority
            />
          </div>
        ))}
      </div>
      
      {/* Pagination Dots */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs mx-auto">
        {DEPARTMENT_IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-4 bg-indigo-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

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

  // Broadcast Modal State
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    dept: 'hq' as StaffDept,
    title: '',
    time: '10:00',
    date: new Date().toISOString().split('T')[0],
    location: 'Main Hall'
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
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
        
        // 1. Fetch Staff & Attendance via Optimized Batched Layer
        const { listStaffCards } = await import('@/lib/hq/superadmin/staff');
        const allStaffDocs = await listStaffCards({
          dept: 'all',
          status: 'active',
          role: 'personnel',
          fullEnrichment: false
        });

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
          
          if (s.isPresentToday) {
            presentCount++;
            if (dStats[dept]) dStats[dept].present++;
            attendanceMap.set(s.id, 'present');
          } else if (s.status === 'inactive') {
            absentCount++;
            if (dStats[dept]) dStats[dept].absent++;
            attendanceMap.set(s.id, 'absent');
          }
        });

        // 3. Fetch Contributions (Limited to save quota)
        const contribSnaps = await Promise.all(
          depts.map(d => getDocs(query(collection(db, `${getDeptPrefix(d)}_contributions`), where('isApproved', '==', false), limit(5))).catch(err => {
            console.warn(`Permission denied for ${d} contributions:`, err);
            return { docs: [] } as any;
          }))
        );

        let allContribs: any[] = [];
        contribSnaps.forEach((snap, i) => {
          const d = depts[i];
          const docs = snap.docs
            .map((docSnap: any) => ({ ...docSnap.data(), _dept: d, id: docSnap.id }))
            .filter((c: any) => c.content && c.content.trim() !== '');
          allContribs = [...allContribs, ...docs];
        });

        const staffMap: Record<string, string> = {};
        allStaffDocs.forEach(s => {
          staffMap[s.id] = s.name || 'Staff Member';
          if (s.staffId) staffMap[s.staffId] = s.name || 'Staff Member';
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

  const handleBroadcastMeeting = async () => {
    if (!broadcastForm.title) return;
    setSendingBroadcast(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      
      // Filter staff for the selected department
      const deptStaff = allStaff.filter(s => s.department === broadcastForm.dept);
      
      const notifications = deptStaff.map(s => addDoc(collection(db, 'staff_notifications'), {
        recipientId: s.id,
        title: `ALL STAFF MEETING: ${broadcastForm.title}`,
        body: `General department meeting for ${broadcastForm.dept} scheduled on ${broadcastForm.date} at ${broadcastForm.time}. Location: ${broadcastForm.location}`,
        type: 'meeting',
        dept: broadcastForm.dept,
        relatedId: 'broadcast',
        isRead: false,
        createdAt: serverTimestamp()
      }));

      await Promise.all(notifications);
      
      // Also add to special tasks for everyone? Maybe too noisy. Just notifications is enough for "ALL STAFF".
      
      alert(`Broadcast sent to ${deptStaff.length} staff members in ${broadcastForm.dept}`);
      setShowBroadcast(false);
      setBroadcastForm({ ...broadcastForm, title: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (sessionLoading || loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 p-4 md:p-8 space-y-8 font-sans">
      {/* Header Section with Carousel */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex-1 space-y-4 text-center lg:text-left order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Activity size={14} />
            <span>Managerial Command Center</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Global Departmental Oversight
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto lg:mx-0">
            Real-time operational metrics and performance intelligence across all institutional divisions.
          </p>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
            <button 
              onClick={() => setShowBroadcast(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-all hover:bg-indigo-700 hover:shadow-md hover:scale-105 active:scale-95"
            >
              <Calendar size={18} /> Broadcast Meeting
            </button>
            <Link 
              href="/hq/dashboard/manager/reports/daily"
              className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all hover:bg-gray-50 hover:shadow-sm hover:border-gray-300"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Connection</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <span className="text-gray-500">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </Link>
          </div>
        </div>

        {/* Carousel implementation like mobile view */}
        <div className="order-1 lg:order-2 flex justify-center w-full lg:w-auto relative z-10">
           <ImageCarousel />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Staff" value={stats.totalStaff} icon={<Users size={20} />} color="bg-indigo-50" textColor="text-indigo-600" onClick={() => setSelectedMetric('total')} />
        <StatCard label="Present" value={stats.presentToday} icon={<CheckCircle size={20} />} color="bg-emerald-50" textColor="text-emerald-600" onClick={() => setSelectedMetric('present')} />
        <StatCard label="Absent" value={stats.absentToday} icon={<XCircle size={20} />} color="bg-rose-50" textColor="text-rose-600" onClick={() => setSelectedMetric('absent')} />
        <StatCard label="On Leave" value={stats.leaveToday} icon={<AlertTriangle size={20} />} color="bg-amber-50" textColor="text-amber-600" onClick={() => setSelectedMetric('leave')} />
        <StatCard label="Unmarked" value={stats.notMarkedToday} icon={<Clock size={20} />} color="bg-gray-100" textColor="text-gray-600" onClick={() => setSelectedMetric('notMarked')} />
        <StatCard label="Approvals" value={stats.pendingApprovals} icon={<FileText size={20} />} color="bg-blue-50" textColor="text-blue-600" urgent={stats.urgentApprovals > 0} onClick={() => setSelectedMetric('pending')} />
      </div>

      {/* Metric Detail View */}
      {selectedMetric && (
        <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900">
                {selectedMetric === 'notMarked' ? 'Registry Variance' : 
                 selectedMetric === 'present' ? 'Verified Personnel' :
                 selectedMetric === 'absent' ? 'Personnel Deficit' :
                 selectedMetric === 'leave' ? 'Authorized Leave' : 'Personnel Registry'}
                <span className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
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
            <button onClick={() => setSelectedMetric(null)} className="text-xs font-semibold px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all">Collapse View</button>
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
              <div key={s.id} className="p-4 rounded-xl border border-gray-100 bg-white flex items-center justify-between group hover:border-indigo-100 hover:shadow-sm transition-all">
                <Link href={`/hq/dashboard/manager/staff/${s.department}_${s.id}`} className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {s.name?.[0] || 'S'}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{s.department}</p>
                  </div>
                </Link>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Department Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Institutional Velocity</h3>
              <p className="text-sm text-gray-500 mt-1">Real-time attendance density by division</p>
            </div>
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
              24H Matrix
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(deptStats).map(([dept, data]) => (
              <div key={dept} className="group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 opacity-50 group-hover:opacity-100 group-hover:scale-125 transition-all" />
                    <span className="text-sm font-semibold text-gray-700 uppercase">{dept}</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <span className="block text-xs font-medium text-gray-400">Verified</span>
                      <span className="text-sm font-bold text-gray-900">{data.present}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-medium text-gray-400">Deficit</span>
                      <span className="text-sm font-bold text-gray-900">{data.absent}</span>
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
                  {data.total > 0 ? (
                    <>
                      <div style={{ width: `${(data.present/data.total)*100}%` }} className="h-full bg-emerald-500 transition-all duration-1000" />
                      <div style={{ width: `${(data.absent/data.total)*100}%` }} className="h-full bg-rose-400 transition-all duration-1000" />
                      <div style={{ width: `${(data.leave/data.total)*100}%` }} className="h-full bg-amber-300 transition-all duration-1000" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-medium">Registry Empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Operations & Pending */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Priority Operations</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { href: '/hq/dashboard/manager/staff/attendance', label: 'Attendance logs', icon: <CheckCircle className="text-indigo-600" /> },
                { href: '/hq/dashboard/manager/approvals', label: 'Contribution desk', icon: <FileText className="text-emerald-600" /> },
                { href: '/hq/dashboard/manager/staff', label: 'Personnel Registry', icon: <Users className="text-blue-600" /> },
                { href: '/hq/dashboard/manager/users', label: 'Identity Provision', icon: <KeyRound className="text-amber-600" /> }
              ].map((op, i) => (
                <Link key={i} href={op.href} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      {op.icon}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{op.label}</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {pendingList.length > 0 && (
            <div className="bg-indigo-950 rounded-3xl p-8 border border-indigo-900 shadow-lg text-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Pending Sync</h3>
                <Link href="/hq/dashboard/manager/approvals" className="text-xs text-indigo-300 hover:text-white transition-colors font-medium">View All</Link>
              </div>
              <div className="space-y-3">
                {pendingList.map(p => (
                  <div key={p.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
                    <div className="truncate pr-4">
                      <p className="text-sm font-semibold text-indigo-50 truncate">{p.title}</p>
                      <p className="text-xs text-indigo-300 mt-1 uppercase tracking-wider">{p.dept} • {p.staffName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-emerald-400">{timeAgo(p.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Broadcast Meeting</h2>
            <p className="text-sm text-gray-500 mb-6">Notify all personnel in a specific division</p>
            
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">Target Department</label>
                <select 
                  value={broadcastForm.dept}
                  onChange={e => setBroadcastForm({ ...broadcastForm, dept: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  {Object.keys(deptStats).map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">Meeting Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Monthly Operational Review"
                  value={broadcastForm.title}
                  onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">Time</label>
                  <input 
                    type="time"
                    value={broadcastForm.time}
                    onChange={e => setBroadcastForm({ ...broadcastForm, time: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">Location</label>
                  <input 
                    type="text"
                    value={broadcastForm.location}
                    onChange={e => setBroadcastForm({ ...broadcastForm, location: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowBroadcast(false)}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBroadcastMeeting}
                  disabled={sendingBroadcast || !broadcastForm.title}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {sendingBroadcast ? 'Sending...' : <><Send size={16} /> Send Signal</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, textColor, urgent, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col p-6 rounded-3xl border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-md bg-white text-left group`}
    >
      <div className={`w-12 h-12 rounded-xl ${color} ${textColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {urgent && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
    </button>
  );
}

