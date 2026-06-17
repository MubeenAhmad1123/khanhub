// src/app/departments/welfare/dashboard/staff/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWelfareSession } from '@/hooks/welfare/useWelfareSession';
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, getDoc, Timestamp, orderBy, limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY, toDate } from '@/lib/utils';
import {
  Clock, CheckCircle, LogIn, LogOut, Calendar,
  Lightbulb, Send, Star, List, Loader2, AlertCircle,
  Trophy, User as UserIcon, Sparkles, Activity, Shirt
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useVisibleSections } from '@/hooks/useVisibleSections';

export default function StaffSelfPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useWelfareSession();

  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [todayDressLog, setTodayDressLog] = useState<any>(null);
  const [todayDutyLog, setTodayDutyLog] = useState<any>(null);
  const [approvedContribToday, setApprovedContribToday] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [contributionText, setContributionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [contribLoading, setContribLoading] = useState(false);
  const [specialTasks, setSpecialTasks] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState({ present: 0, absent: 0, leave: 0 });
  const [hasContributedToday, setHasContributedToday] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const { sections, loading: visibilityLoading } = useVisibleSections('welfare', 'staff', user?.uid || '');

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch Staff Profile
      const staffRef = doc(db, 'welfare_users', user.uid);
      let staffSnap = await getDoc(staffRef);
      
      if (!staffSnap.exists()) {
        const fallbackSnap = await getDocs(query(collection(db, 'welfare_staff'), where('loginUserId', '==', user.uid)));
        if (!fallbackSnap.empty) {
            staffSnap = fallbackSnap.docs[0] as any;
        }
      }

      if (!staffSnap.exists()) {
        console.error('Staff profile not found for UID:', user.uid);
        setLoading(false);
        return;
      }

      const staffData = staffSnap.data() as any;
      const staffId = staffSnap.id;
      
      setStaffProfile({ 
        id: staffId, 
        ...staffData, 
        joiningDate: toDate(staffData.joiningDate) || new Date(), 
        duties: staffData.duties || [] 
      });

      // 2. Today's attendance
      const attSnap = await getDocs(
        query(
          collection(db, 'welfare_attendance'), 
          where('staffId', '==', staffId), 
          where('date', '==', today)
        )
      );

      if (!attSnap.empty) {
        const d = attSnap.docs[0].data();
        setTodayRecord({ 
          id: attSnap.docs[0].id, 
          ...d, 
          checkInTime: toDate(d.checkInTime), 
          checkOutTime: toDate(d.checkOutTime) 
        });
      } else {
        setTodayRecord(null);
      }

      // 3. Contributions (Recent)
      const contribSnap = await getDocs(
        query(
          collection(db, 'welfare_contributions'), 
          where('staffId', '==', staffId),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
      );
      
      const contribDocs = contribSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        createdAt: toDate(d.data().createdAt) || new Date() 
      } as any));

      setHasContributedToday(contribDocs.some(d => d.date === today));
      setContributions(contribDocs);

      // 4. Monthly attendance summary
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayStr = firstDay.toISOString().split('T')[0];

      const monthlySnap = await getDocs(
        query(
          collection(db, 'welfare_attendance'),
          where('staffId', '==', staffId),
          where('date', '>=', firstDayStr),
          where('date', '<=', today)
        )
      );
      
      const summary = { present: 0, absent: 0, leave: 0 };
      monthlySnap.docs.forEach(d => {
        const status = d.data().status;
        if (status === 'present') summary.present++;
        else if (status === 'absent') summary.absent++;
        else if (status === 'leave') summary.leave++;
      });

      setMonthlySummary(summary);

      // 5. Special Tasks
      const tasksSnap = await getDocs(
        query(
          collection(db, 'welfare_special_tasks'), 
          where('staffId', '==', staffId),
          where('status', '!=', 'completed')
        )
      );
      setSpecialTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 6. Fetch Manager Evaluation (Dress Code + Duties) for today
      const dressLogRef = doc(db, 'welfare_dress_logs', `${staffId}_${today}`);
      const dutyLogRef = doc(db, 'welfare_duty_logs', `${staffId}_${today}`);
      
      const [dressSnap, dutySnap] = await Promise.all([
        getDoc(dressLogRef).catch(() => null),
        getDoc(dutyLogRef).catch(() => null)
      ]);

      if (dressSnap && dressSnap.exists()) {
        setTodayDressLog(dressSnap.data());
      } else {
        setTodayDressLog(null);
      }

      if (dutySnap && dutySnap.exists()) {
        setTodayDutyLog(dutySnap.data());
      } else {
        setTodayDutyLog(null);
      }

      // Extract approved contributions for today
      const approvedToday = contribDocs.filter((d: any) => d.date === today && d.isApproved);
      setApprovedContribToday(approvedToday);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  // 4-Point Score Calculation
  const computedTodayScore = useMemo(() => {
    if (!staffProfile) return { attendance: 0, dress: 0, duty: 0, contribution: 0, total: 0 };
    
    // 1. Attendance point: present/late or checked in today
    const hasAtt = todayRecord?.status === 'present' || todayRecord?.isLate || !!todayRecord?.checkInTime;
    const attPoint = hasAtt ? 1 : 0;

    // 2. Dress Compliance point
    const dressConfig = staffProfile.dressCodeConfig || [];
    const dressItems = todayDressLog?.items || [];
    const missingDress = dressConfig.filter((c: any) => {
      const item = dressItems.find((i: any) => i.key === c.key);
      return !item || item.status === 'no';
    });
    const dressPoint = (dressConfig.length > 0 && missingDress.length === 0) ? 1 : 0;

    // 3. Duty Compliance point
    const dutyConfig = staffProfile.dutyConfig || [];
    const loggedDuties = todayDutyLog?.duties || [];
    const pendingDuties = dutyConfig.filter((c: any) => {
      const item = loggedDuties.find((d: any) => d.key === c.key);
      return !item || item.status === 'not_done';
    });
    const dutyPoint = (dutyConfig.length > 0 && pendingDuties.length === 0) ? 1 : 0;

    // 4. Contribution point
    const contribPoint = approvedContribToday.length > 0 ? 1 : 0;

    return {
      attendance: attPoint,
      dress: dressPoint,
      duty: dutyPoint,
      contribution: contribPoint,
      total: attPoint + dressPoint + dutyPoint + contribPoint
    };
  }, [staffProfile, todayRecord, todayDressLog, todayDutyLog, approvedContribToday]);

  useEffect(() => {
    if (sessionLoading) return;
    
    const rawRole = String(user?.role || '').toLowerCase();
    const isStaff = rawRole === 'staff' || rawRole.includes('staff') || rawRole.includes('contract') || rawRole.includes('internee');

    if (!user || !isStaff) {
      router.push('/departments/welfare/login');
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
        const isLate = lateByMinutes > 15; 

        await addDoc(collection(db, 'welfare_attendance'), {
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
          await addDoc(collection(db, 'welfare_fines'), {
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
        await updateDoc(doc(db, 'welfare_attendance', todayRecord.id), {
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
      await addDoc(collection(db, 'welfare_contributions'), {
        staffId: staffProfile.id,
        staffName: staffProfile.name || user?.displayName,
        date: today,
        content: contributionText.trim(),
        isApproved: false,
        createdAt: Timestamp.now(),
        dept: 'welfare'
      });
      setContributionText('');
      setHasContributedToday(true);
      toast.success('Contribution submitted!');
      fetchData();
    } catch (err: any) {
      toast.error('Submission failed: ' + err.message);
    } finally {
      setContribLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'welfare_special_tasks', taskId), {
        status: newStatus,
        ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
      });
      toast.success(newStatus === 'completed' ? 'Task Completed!' : 'Task Acknowledged');
      fetchData();
    } catch (err: any) {
      toast.error('Task update failed');
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
          <p className="text-xs font-medium text-slate-400">Syncing...</p>
        </div>
      </div>
    );
  }

  // --- Clean Minimalist Styling variables ---
  const cardStyle = "bg-white border border-slate-100 shadow-sm rounded-2xl p-6";

  return (
    <div className="min-h-screen bg-transparent text-slate-900 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{formatDateDMY(new Date())}</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Hi, {user?.displayName?.split?.(' ')?.[0] || 'Staff'} 👋
            </h1>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm">
            <UserIcon size={18} />
          </div>
        </div>

        {/* Attendance Action Header */}
        <div className={`${cardStyle} flex items-center justify-between bg-slate-900 text-white border-none relative overflow-hidden`}>
          <div className="relative z-10">
             <p className="text-xs font-medium text-slate-400">Daily Clocking</p>
             <h3 className="text-lg font-bold mt-0.5">
               {todayRecord?.checkInTime ? 'Active Working Session' : 'Awaiting Check In'}
             </h3>
             {todayRecord?.checkInTime && (
                <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                   In at: {new Date(todayRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
             )}
          </div>
          
          <button
             onClick={handleCheckIn}
             disabled={checkLoading || (!!todayRecord?.checkInTime && !!todayRecord?.checkOutTime)}
             className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all z-10 ${
               !todayRecord
                 ? 'bg-white text-slate-900 shadow-md hover:scale-105'
                 : !todayRecord.checkOutTime
                 ? 'bg-rose-500 text-white hover:bg-rose-600'
                 : 'bg-slate-800 text-slate-500 cursor-not-allowed'
             }`}
          >
            {checkLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : !todayRecord ? (
              <LogIn size={14} />
            ) : (
              <LogOut size={14} />
            )}
            {!todayRecord ? 'Check In' : !todayRecord.checkOutTime ? 'Check Out' : 'Completed'}
          </button>

          <Clock size={90} className="absolute right-[-15px] bottom-[-15px] text-white/5 select-none pointer-events-none rotate-12" />
        </div>

        {/* 4-Point Daily Performance Card */}
        <div className={`${cardStyle}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">Today's Track Score</h2>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold tracking-wide uppercase">
              {computedTodayScore.total} / 4 Points
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Attendance */}
            <div className={`p-3 rounded-xl border text-center ${computedTodayScore.attendance === 1 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 ${computedTodayScore.attendance === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <Clock size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Attendance</p>
              <p className={`text-[10px] font-medium mt-0.5 ${computedTodayScore.attendance === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {computedTodayScore.attendance === 1 ? 'Scored' : 'Pending'}
              </p>
            </div>

            {/* Dress */}
            <div className={`p-3 rounded-xl border text-center ${computedTodayScore.dress === 1 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 ${computedTodayScore.dress === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <Shirt size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Dress Code</p>
              <p className={`text-[10px] font-medium mt-0.5 ${computedTodayScore.dress === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {computedTodayScore.dress === 1 ? 'Compliant' : !todayDressLog ? 'Awaiting Audit' : 'Deficient'}
              </p>
            </div>

            {/* Duty */}
            <div className={`p-3 rounded-xl border text-center ${computedTodayScore.duty === 1 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 ${computedTodayScore.duty === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <List size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Work Duties</p>
              <p className={`text-[10px] font-medium mt-0.5 ${computedTodayScore.duty === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {computedTodayScore.duty === 1 ? 'Complete' : !todayDutyLog ? 'Awaiting Audit' : 'Incomplete'}
              </p>
            </div>

            {/* Contribution */}
            <div className={`p-3 rounded-xl border text-center ${computedTodayScore.contribution === 1 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2 ${computedTodayScore.contribution === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <Trophy size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Bonus Extra</p>
              <p className={`text-[10px] font-medium mt-0.5 ${computedTodayScore.contribution === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {computedTodayScore.contribution === 1 ? 'Approved' : 'None approved'}
              </p>
            </div>
          </div>

          {/* Alert for non-compliant audit values */}
          {(todayDressLog || todayDutyLog) && (computedTodayScore.dress === 0 || computedTodayScore.duty === 0) && (
            <div className="mt-3 p-3 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
              <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-amber-900">Compliance Audit Feedback:</p>
                <ul className="list-disc list-inside mt-1 text-amber-800 space-y-0.5 font-medium">
                  {computedTodayScore.dress === 0 && todayDressLog?.items?.filter((i: any) => i.status === 'no').map((i: any) => (
                    <li key={i.key}>Uniform issue: {i.label} checked "No"</li>
                  ))}
                  {computedTodayScore.duty === 0 && todayDutyLog?.duties?.filter((d: any) => d.status === 'not_done').map((d: any) => (
                    <li key={d.key}>Duty issue: {d.label} not complete</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Stat Tracker Rows */}
        {((sections.growthPoints !== false) || (sections.attendance !== false)) && (
          <div className={`grid gap-4 ${
            (sections.growthPoints !== false) && (sections.attendance !== false) ? 'grid-cols-2' : 'grid-cols-1'
          }`}>
            {sections.growthPoints !== false && (
              <div className={`${cardStyle} flex flex-col items-start relative`}>
                 <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 mb-3">
                    <Trophy size={16} />
                 </div>
                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Score</p>
                 <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{staffProfile?.totalGrowthPoints || 0} PTS</h4>
              </div>
            )}
            {sections.attendance !== false && (
              <div className={`${cardStyle} flex flex-col items-start relative`}>
                 <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3">
                    <Activity size={16} />
                 </div>
                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Present</p>
                 <h4 className="text-2xl font-bold text-slate-900 mt-0.5">{monthlySummary.present} / Month</h4>
              </div>
            )}
          </div>
        )}

        {/* Active Special Task Row */}
        {sections.reports !== false && specialTasks.length > 0 && (
          <div className={`${cardStyle} bg-slate-50 border-slate-100`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200/40">
              <Sparkles size={16} className="text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800">Pending Actions</h2>
            </div>
            <div className="space-y-2.5">
              {specialTasks.map(task => (
                <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-700 flex-1 leading-relaxed">{task.description}</p>
                  <div className="flex gap-1.5 self-end sm:self-auto">
                    {task.status === 'assigned' ? (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'acknowledged')}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'completed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle size={10} /> Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contributions Submissions Card */}
        {sections.reports !== false && (
          <div className={`${cardStyle} relative overflow-hidden`}>
            <div className="flex items-center gap-2.5 mb-2">
              <Lightbulb size={18} className="text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Record Contribution</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Describe your custom achievements today to gain extra growth scores</p>
            
            <div className="space-y-3">
              <textarea
                value={contributionText}
                onChange={(e) => setContributionText(e.target.value)}
                placeholder="Ex: Solved system delay issue, completed pending donor inquiries..."
                rows={3}
                className="w-full p-4 text-sm bg-slate-50 border border-slate-100 rounded-xl text-slate-800 outline-none focus:border-slate-300 focus:bg-white transition-all placeholder:text-slate-400 resize-none"
              />
              
              <button
                onClick={handleContribution}
                disabled={contribLoading || hasContributedToday || !contributionText.trim()}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {contribLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {hasContributedToday ? 'Submitted Today' : 'Publish Contribution'}
              </button>
            </div>
          </div>
        )}

        {/* Recent Logs list */}
        {sections.reports !== false && contributions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Logs</h3>
            </div>
            <div className="space-y-2">
              {contributions.map((c) => (
                <div key={c.id} className="bg-white p-4 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-2 shadow-sm">
                  <div className="space-y-1 flex-1">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{c.content}</p>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                      <Calendar size={10} />
                      <span>{c.date}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase whitespace-nowrap self-start sm:self-auto border ${
                    c.isApproved 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {c.isApproved ? 'Validated' : 'Pending Review'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Standard Responsibilities list */}
        {sections.duties !== false && staffProfile?.duties?.length > 0 && (
          <div className={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <List size={16} className="text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">Fixed Standard Responsibilities</h2>
            </div>
            <div className="space-y-2">
              {staffProfile.duties.map((duty: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50/60 border border-slate-100 rounded-xl">
                  <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">{duty.description || duty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
