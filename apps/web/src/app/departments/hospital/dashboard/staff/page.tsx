'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useHospitalSession } from '@/hooks/hospital/useHospitalSession';
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY, toDate } from '@/lib/utils';
import {
  Clock, CheckCircle, Calendar,
  Lightbulb, Send, Star, List, Loader2, AlertCircle,
  Trophy, Sparkles, Activity, CheckCircle2, Circle, Shirt, LogOut, ArrowRight, UserCheck, ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useVisibleSections } from '@/hooks/useVisibleSections';

export default function StaffSelfPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useHospitalSession();

  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [todayDressRecord, setTodayDressRecord] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [contributionText, setContributionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [contribLoading, setContribLoading] = useState(false);
  const [specialTasks, setSpecialTasks] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState({ present: 0, absent: 0, leave: 0 });
  const [hasContributedToday, setHasContributedToday] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const { sections, loading: visibilityLoading } = useVisibleSections('hospital', 'staff', user?.uid || '');

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // 1. Fetch Staff Profile (Dual resolve & Merge)
      let staffData: any = {};
      let staffId = user.uid;

      const [userSnap, staffSnap] = await Promise.all([
        getDoc(doc(db, 'hospital_users', user.uid)).catch(() => null),
        getDocs(query(collection(db, 'hospital_staff'), where('loginUserId', '==', user.uid))).catch(() => null)
      ]);

      if (userSnap && userSnap.exists()) {
        staffData = { ...userSnap.data() };
      }
      if (staffSnap && !staffSnap.empty) {
        const docSnap = staffSnap.docs[0];
        staffData = { ...docSnap.data(), ...staffData };
        staffId = docSnap.id;
      }

      if (!staffData.name && !staffData.displayName) {
        console.error('Staff profile not found for UID:', user.uid);
        setLoading(false);
        return;
      }

      const rawId = staffId.startsWith('hospital_') ? staffId.replace('hospital_', '') : staffId;
      const prefixedId = staffId.startsWith('hospital_') ? staffId : `hospital_${staffId}`;

      // 2. Fetch all attendance logs for index-free client-side filters
      const [attSnap1, attSnap2] = await Promise.all([
        getDocs(query(collection(db, 'hospital_attendance'), where('staffId', '==', rawId))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'hospital_attendance'), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] }))
      ]);
      const attDocs = [...attSnap1.docs, ...attSnap2.docs];

      // Extract today's attendance record client-side
      const todayAtt = attDocs.find(d => d.data().date === today);
      if (todayAtt) {
        const d = todayAtt.data();
        setTodayRecord({ 
          id: todayAtt.id, 
          ...d, 
          checkInTime: toDate(d.checkInTime), 
          checkOutTime: toDate(d.checkOutTime) 
        });
      } else {
        setTodayRecord(null);
      }

      // Aggregate monthly stats client-side
      const currentMonth = today.substring(0, 7);
      const uniqueMonthly = Array.from(new Map(attDocs.map(d => [d.id, d.data()])).values())
        .filter((d: any) => d.date && d.date.substring(0, 7) === currentMonth);

      const summary = { present: 0, absent: 0, leave: 0 };
      uniqueMonthly.forEach((d: any) => {
        const status = d.status;
        if (status === 'present') summary.present++;
        else if (status === 'absent') summary.absent++;
        else if (['leave', 'paid_leave', 'unpaid_leave'].includes(status)) summary.leave++;
      });
      setMonthlySummary(summary);

      // 3. Fetch all growth points for index-free client-side summation
      const [gpSnap1, gpSnap2] = await Promise.all([
        getDocs(query(collection(db, 'hospital_growth_points'), where('staffId', '==', rawId))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'hospital_growth_points'), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] }))
      ]);
      const gpDocs = [...gpSnap1.docs, ...gpSnap2.docs];
      const uniqueGps = Array.from(new Map(gpDocs.map(d => [d.id, d.data()])).values());
      const totalGP = uniqueGps.reduce((sum: number, item: any) => sum + (Number(item.points) || 0), 0);

      // 4. Fetch all contributions for client-side sorting & mapping
      const [contribSnap1, contribSnap2] = await Promise.all([
        getDocs(query(collection(db, 'hospital_contributions'), where('staffId', '==', rawId))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'hospital_contributions'), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] }))
      ]);
      const contribDocs = [...contribSnap1.docs, ...contribSnap2.docs];
      const contribCombinedDocs = contribDocs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        createdAt: toDate(d.data().createdAt) || new Date() 
      } as any));

      const uniqueContribs = Array.from(new Map(contribCombinedDocs.map(c => [c.id, c])).values())
        .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

      setHasContributedToday(uniqueContribs.some((d: any) => d.date === today));
      setContributions(uniqueContribs.slice(0, 5));

      // 5. Fetch all special tasks, filter client-side
      const [tasksSnap1, tasksSnap2] = await Promise.all([
        getDocs(query(collection(db, 'hospital_special_tasks'), where('staffId', '==', rawId))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'hospital_special_tasks'), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] }))
      ]);
      const specialTasksCombined = [...tasksSnap1.docs, ...tasksSnap2.docs].map(d => ({ id: d.id, ...d.data() }));
      const uniqueSpecialTasks = Array.from(new Map(specialTasksCombined.map(t => [t.id, t])).values())
        .filter((t: any) => t.status !== 'completed');
      setSpecialTasks(uniqueSpecialTasks);

      // 6. Fetch Duty Log for today client-side
      const [dutyLogSnap1, dutyLogSnap2] = await Promise.all([
        getDocs(query(collection(db, 'hospital_duty_logs'), where('staffId', '==', rawId))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'hospital_duty_logs'), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] }))
      ]);
      const dutyDocs = [...dutyLogSnap1.docs, ...dutyLogSnap2.docs];
      const todayDutyLog = dutyDocs.find(d => d.data().date === today);

      // 7. Fetch Today's Apparel Log client-side
      const [dressLogSnap1, dressLogSnap2] = await Promise.all([
        getDocs(query(collection(db, 'hospital_dress_logs'), where('staffId', '==', rawId))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'hospital_dress_logs'), where('staffId', '==', prefixedId))).catch(() => ({ docs: [] }))
      ]);
      const dressDocs = [...dressLogSnap1.docs, ...dressLogSnap2.docs];
      const todayDressLog = dressDocs.find(d => d.data().date === today);
      if (todayDressLog) {
        setTodayDressRecord(todayDressLog.data());
      } else {
        setTodayDressRecord(null);
      }

      let todayDuties = [];
      if (todayDutyLog && todayDutyLog.data().duties) {
        todayDuties = todayDutyLog.data().duties;
      } else if (staffData.dutyConfig && staffData.dutyConfig.length > 0) {
        todayDuties = staffData.dutyConfig.map((d: any) => ({
          key: d.key,
          label: d.label,
          status: 'pending'
        }));
      } else {
        todayDuties = [
          { key: 'morning', label: 'Morning Duty', status: 'pending' },
          { key: 'afternoon', label: 'Afternoon Duty', status: 'pending' },
          { key: 'evening', label: 'Evening Duty', status: 'pending' }
        ];
      }

      setStaffProfile({ 
        id: staffId, 
        ...staffData,
        totalGrowthPoints: totalGP || staffData.totalGrowthPoints || 0,
        phone: staffData.phone || staffData.phoneNumber || staffData.mobile || (user as any)?.phone || (user as any)?.phoneNumber || '',
        joiningDate: toDate(staffData.joiningDate) || new Date(), 
        duties: todayDuties 
      });

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || user.role !== 'staff') {
      router.push('/departments/hospital/login');
      return;
    }
    fetchData();
  }, [sessionLoading, user, fetchData, router]);

  const handleCheckIn = async () => {
    if (!staffProfile) return;
    setCheckLoading(true);
    try {
      if (!todayRecord) {
        const now = new Date();
        const [dutyHour, dutyMin] = (staffProfile.dutyStartTime || '08:00').split(':').map(Number);
        const dutyStart = new Date();
        dutyStart.setHours(dutyHour, dutyMin, 0, 0);

        const lateByMs = now.getTime() - dutyStart.getTime();
        const lateByMinutes = Math.floor(lateByMs / 60000);
        const isLate = lateByMinutes > 15; // 15 min grace period

        await addDoc(collection(db, 'hospital_attendance'), {
          staffId: staffProfile.id,
          date: today,
          status: 'present',
          checkInTime: Timestamp.now(),
          checkOutTime: null,
          isLate,
          lateByMinutes: isLate ? lateByMinutes : 0,
          autoFineApplied: isLate,
        });

        if (isLate) {
          const currentMonth = today.substring(0, 7);
          await addDoc(collection(db, 'hospital_fines'), {
            staffId: staffProfile.id,
            amount: 200,
            reason: `Late arrival (${lateByMinutes} mins) - Auto-generated`,
            date: currentMonth,
            recordedBy: 'System',
            createdAt: Timestamp.now(),
          });
          toast.success('Checked in. Note: Late arrival fine applied.');
        } else {
          toast.success('Checked in successfully!');
        }
      } else if (!todayRecord.checkOutTime) {
        await updateDoc(doc(db, 'hospital_attendance', todayRecord.id), {
          checkOutTime: Timestamp.now(),
        });
        toast.success('Checked out successfully!');
      }
      fetchData();
    } catch (err: any) {
      toast.error('Attendance failed: ' + err.message);
    } finally {
      setCheckLoading(false);
    }
  };

  const handleContribution = async () => {
    if (!contributionText.trim()) {
      toast.error('Contribution cannot be empty!');
      return;
    }
    if (!staffProfile) return;
    setContribLoading(true);
    try {
      await addDoc(collection(db, 'hospital_contributions'), {
        staffId: staffProfile.id,
        staffName: staffProfile.name || user?.displayName,
        date: today,
        content: contributionText.trim(),
        isApproved: false,
        createdAt: Timestamp.now(),
        dept: 'hospital'
      });
      setContributionText('');
      setHasContributedToday(true);
      toast.success('Contribution submitted for manager approval! ✓');
      fetchData();
    } catch (err: any) {
      toast.error('Submission failed: ' + err.message);
    } finally {
      setContribLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'hospital_special_tasks', taskId), {
        status: newStatus,
        ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
      });
      toast.success(newStatus === 'completed' ? 'Task Completed!' : 'Task Acknowledged');
      fetchData();
    } catch (err: any) {
      toast.error('Task update failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hospital_session');
    router.push('/departments/hospital/login');
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Loading Gateway...</p>
        </div>
      </div>
    );
  }

  // --- Dynamic Color Accents (Hospital Theme: Gorgeous Teal/Emerald) ---
  const accentColor = "#1D9E75";
  const cardStyle = "bg-white border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] rounded-3xl p-6 transition-all hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] hover:scale-[1.005] duration-300";

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 pb-24 font-sans selection:bg-[#1D9E75]/10">
      
      {/* Top Premium Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center text-[#1D9E75]">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 leading-tight">Hospital Portal</h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Staff Gateway</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
               {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, 
              <span className="text-[#1D9E75]">{staffProfile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0]}</span>
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400" />
              {formatDateDMY(new Date())}
            </p>
          </div>
          {sections.designation !== false && (
            <span className="self-start sm:self-center px-4 py-1.5 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/10 text-[#1D9E75] text-[10px] font-bold uppercase tracking-wider">
              {staffProfile?.designation || staffProfile?.role || 'Healthcare Staff'}
            </span>
          )}
        </div>

        {/* Attendance Marking Slider Panel */}
        {sections.attendance !== false && (
          <div className={`${cardStyle} relative overflow-hidden bg-gradient-to-r from-white to-gray-50/50`}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1D9E75]"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-[#1D9E75]" />
                  Daily Presence Logger
                </h3>
                <p className="text-xs text-gray-400 font-medium">Record check-in and check-out timing securely.</p>
              </div>
              
              <div className="flex items-center gap-4">
                {todayRecord?.checkInTime && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Checked In</p>
                    <p className="text-xs font-bold text-gray-700">{todayRecord.checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                <button
                  onClick={handleCheckIn}
                  disabled={checkLoading || (todayRecord?.checkInTime && todayRecord?.checkOutTime)}
                  className={`px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2.5 transition-all duration-300 active:scale-[0.97]
                    ${todayRecord?.checkInTime && !todayRecord?.checkOutTime
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10'
                      : todayRecord?.checkInTime && todayRecord?.checkOutTime
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        : 'bg-gray-900 hover:bg-black text-white shadow-md shadow-gray-900/10'
                    }`}
                >
                  {checkLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : todayRecord?.checkInTime && !todayRecord?.checkOutTime ? (
                    <>Check Out <ArrowRight size={14} /></>
                  ) : todayRecord?.checkInTime && todayRecord?.checkOutTime ? (
                    <>Attendance Completed <UserCheck size={14} /></>
                  ) : (
                    <>Check In <UserCheck size={14} /></>
                  )}
                </button>
              </div>
            </div>
            {todayRecord?.checkInTime && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Shift</span>
                <span className="text-gray-400">Shift Start: {staffProfile?.dutyStartTime || '08:00'}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats Matrix */}
        {((sections.growthPoints !== false) || (sections.attendance !== false)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sections.growthPoints !== false && (
              <div className={cardStyle}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Growth Ledger</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Trophy size={16} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{staffProfile?.totalGrowthPoints || 0}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Growth Points Accumulated</p>
              </div>
            )}

            {sections.attendance !== false && (
              <div className={cardStyle}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Punctuality Score</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Activity size={16} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{monthlySummary.present}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Present Days This Month</p>
              </div>
            )}
          </div>
        )}

        {/* Special Tasks Override Alerts */}
        {sections.reports !== false && specialTasks.length > 0 && (
          <div className="p-6 rounded-3xl border border-red-100 bg-red-50/20 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert size={18} className="animate-bounce" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Urgent Actions Pending</h3>
            </div>
            <div className="space-y-3">
              {specialTasks.map(task => (
                <div key={task.id} className="bg-white p-5 rounded-2xl border border-red-50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Special Directive</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{task.description}</p>
                  </div>
                  <button 
                    onClick={() => handleTaskUpdate(task.id, task.status === 'assigned' ? 'acknowledged' : 'completed')}
                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all self-start sm:self-center"
                  >
                    {task.status === 'assigned' ? 'Acknowledge' : 'Complete Task'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redesigned Premium Pretty Contribution Card */}
        {sections.reports !== false && (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 text-[#1D9E75]">
              <Sparkles size={120} />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Lightbulb size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Share Today's Impact</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Submit your daily achievements for Growth Points</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative rounded-2xl border border-gray-100 bg-gray-50/30 transition-all focus-within:border-[#1D9E75]/30 focus-within:ring-4 focus-within:ring-[#1D9E75]/5 focus-within:bg-white p-3">
                <textarea
                  value={contributionText}
                  onChange={(e) => setContributionText(e.target.value)}
                  placeholder="What did you achieve or contribute today? E.g., resolved patient query, completed clinical documentation, supported emergency round..."
                  rows={3}
                  className="w-full bg-transparent p-3 text-sm font-semibold text-gray-800 outline-none resize-none placeholder:text-gray-300"
                />
                <div className="flex items-center justify-between px-3 pt-2 border-t border-gray-50 text-[10px] font-bold text-gray-400">
                  <span>Hospital Core Ledger</span>
                  <span>{contributionText.length} characters</span>
                </div>
              </div>

              <button
                onClick={handleContribution}
                disabled={contribLoading || hasContributedToday || !contributionText.trim()}
                className="w-full py-4 rounded-2xl bg-[#1D9E75] hover:bg-[#188864] disabled:bg-gray-100 disabled:text-gray-400 font-extrabold text-xs uppercase tracking-widest text-white transition-all shadow-[0_4px_15px_-3px_rgba(29,158,117,0.3)] hover:shadow-[0_6px_20px_-3px_rgba(29,158,117,0.4)] hover:scale-[1.005] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {contribLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : hasContributedToday ? (
                  <>Achievement Shared for Today ✓</>
                ) : (
                  <>Submit Achievement <Send size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Timeline of Recent Contributions */}
        {sections.reports !== false && contributions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Impact History</h4>
            </div>
            <div className="space-y-3">
              {contributions.map((c) => (
                <div key={c.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:border-gray-200 transition-colors duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-bold text-gray-700 leading-relaxed">{c.content}</p>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border
                      ${c.isApproved 
                        ? 'bg-emerald-50 border-emerald-100/60 text-emerald-700' 
                        : 'bg-amber-50 border-amber-100/60 text-amber-700'
                      }`}>
                      {c.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                    <Clock size={11} />
                    <span>{c.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dress Code & Routines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Duty Checklist */}
          {sections.duties !== false && (
            <div className={cardStyle}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center text-white">
                  <List size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Duties Checklist</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Today's assigned schedule</p>
                </div>
              </div>
              
              {staffProfile?.duties && staffProfile.duties.length > 0 ? (
                <div className="space-y-2.5">
                  {staffProfile.duties.map((duty: any, idx: number) => {
                    const isDone = duty.status === 'done';
                    const label = duty.label || duty.description || 'Duty item';
                    return (
                      <div key={idx} className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition-all duration-200
                        ${isDone 
                          ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900' 
                          : 'bg-gray-50/50 border-gray-100 text-gray-700 hover:border-gray-200'
                        }`}>
                        <span className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold
                            ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                            {idx + 1}
                          </span>
                          <span>{label}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider
                          ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200/60 text-gray-500'}`}>
                          {isDone ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">No duties configured for today</p>
                </div>
              )}
            </div>
          )}

          {/* Dress compliance status */}
          {sections.uniform !== false && (
            <div className={cardStyle}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Shirt size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Uniform Compliance</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Today's appearance audit</p>
                </div>
              </div>

              {todayDressRecord ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/50 border border-gray-100">
                    <span className="text-xs font-bold text-gray-700">Audit Status</span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border
                      ${todayDressRecord.status === 'yes'
                        ? 'bg-emerald-50 border-emerald-100/60 text-emerald-700'
                        : todayDressRecord.status === 'no'
                          ? 'bg-red-50 border-red-100/60 text-red-700'
                          : 'bg-amber-50 border-amber-100/60 text-amber-700'
                      }`}>
                      {todayDressRecord.status === 'yes' ? 'Compliant' : todayDressRecord.status === 'no' ? 'Non-Compliant' : 'Incomplete'}
                    </span>
                  </div>

                  {todayDressRecord.items && todayDressRecord.items.length > 0 && (
                    <div className="space-y-2">
                      {todayDressRecord.items.map((item: any, idx: number) => {
                        const isYes = item.status === 'yes';
                        return (
                          <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold
                            ${isYes ? 'bg-blue-50/20 border-blue-100/40 text-blue-900' : 'bg-orange-50/20 border-orange-100/40 text-orange-950'}`}>
                            <span>{item.label}</span>
                            <span className={isYes ? 'text-blue-600 font-extrabold' : 'text-orange-600 font-extrabold'}>
                              {isYes ? '✓ Compliant' : '✗ Missing'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Audit pending for today</p>
                  {staffProfile?.dressCodeConfig && staffProfile.dressCodeConfig.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4 justify-center px-4">
                      {staffProfile.dressCodeConfig.map((item: any, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 bg-white border border-gray-100 rounded-lg text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                          {item.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}  </div>

      </main>
    </div>
  );
}
