'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSpimsSession } from '@/hooks/spims/useSpimsSession';
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, getDoc, Timestamp, orderBy, limit, setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY, toDate } from '@/lib/utils';
import {
  Clock, CheckCircle, LogIn, LogOut, Calendar,
  Lightbulb, Send, Star, List, Loader2, AlertCircle,
  Trophy, TrendingUp, User as UserIcon, Shield, Activity,
  CheckCircle2, Circle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useVisibleSections } from '@/hooks/useVisibleSections';

export default function StaffSelfPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useSpimsSession();

  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [contributionText, setContributionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [contribLoading, setContribLoading] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState({ present: 0, absent: 0, leave: 0 });
  const [hasContributedToday, setHasContributedToday] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const { sections, loading: visibilityLoading } = useVisibleSections('spims', 'staff', user?.uid || '');

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch Staff Profile
      const staffRef = doc(db, 'spims_users', user.uid);
      const staffSnap = await getDoc(staffRef);
      
      if (!staffSnap.exists()) {
        console.error('Staff profile not found for UID:', user.uid);
        setLoading(false);
        return;
      }

      const staffData = staffSnap.data();
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
          collection(db, 'spims_attendance'), 
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
          collection(db, 'spims_contributions'), 
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
          collection(db, 'spims_attendance'),
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
        else if (['leave', 'paid_leave', 'unpaid_leave'].includes(status)) summary.leave++;
      });

      setMonthlySummary(summary);

      // 5. Fetch Today's Duty Log for real-time status
      const dutyLogSnap = await getDocs(
        query(
          collection(db, 'spims_duty_logs'),
          where('staffId', '==', staffId),
          where('date', '==', today)
        )
      );
      
      if (!dutyLogSnap.empty) {
        const logData = dutyLogSnap.docs[0].data();
        if (logData.duties) {
          setStaffProfile((prev: any) => ({
            ...(prev || {}),
            duties: logData.duties
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || user.role !== 'staff') {
      router.push('/departments/spims/login');
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

        const ref = doc(db, 'spims_attendance', `${staffProfile.id}_${today}`);
        await setDoc(ref, {
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
          await addDoc(collection(db, 'spims_fines'), {
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
        await updateDoc(doc(db, 'spims_attendance', todayRecord.id), {
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
      await addDoc(collection(db, 'spims_contributions'), {
        staffId: staffProfile.id,
        staffName: staffProfile.name || user?.displayName,
        date: today,
        content: contributionText.trim(),
        isApproved: false,
        createdAt: Timestamp.now(),
        dept: 'spims'
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

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-450 animate-pulse">Loading Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-24 overflow-x-hidden font-sans">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'},
              <span className="block text-indigo-600 font-black">{user?.displayName?.split?.(' ')?.[0] || 'User'}</span>
            </h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-[0.2em] mt-2">
              {formatDateDMY(new Date())}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shadow-sm">
            <UserIcon size={20} strokeWidth={2} />
          </div>
        </div>

        {/* Quick Stats */}
        {((sections.growthPoints !== false) || (sections.attendance !== false)) && (
          <div className={`grid gap-4 ${
            (sections.growthPoints !== false) && (sections.attendance !== false) ? 'grid-cols-2' : 'grid-cols-1'
          }`}>
            {sections.growthPoints !== false && (
              <div className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50/50 rounded-xl text-indigo-600">
                    <Trophy size={16} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-455">Growth Points</p>
                </div>
                <p className="text-3xl font-extrabold text-slate-905">{staffProfile?.totalGrowthPoints || 0}</p>
              </div>
            )}
            {sections.attendance !== false && (
              <div className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50/50 rounded-xl text-emerald-600">
                    <Activity size={16} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-455">Attendance</p>
                </div>
                <p className="text-3xl font-extrabold text-slate-905">{monthlySummary.present}</p>
              </div>
            )}
          </div>
        )}

        {/* Contribution Section */}
        {sections.reports !== false && (
          <div className="p-8 bg-white border border-slate-100 shadow-sm rounded-3xl hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Lightbulb size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Record Contribution</h2>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Submit daily achievements for growth points</p>
            
            <div className="space-y-4">
              <textarea
                value={contributionText}
                onChange={(e) => setContributionText(e.target.value)}
                placeholder="What did you achieve or contribute today?"
                rows={4}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-800 outline-none resize-none placeholder:text-slate-400 focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              
              <button
                onClick={handleContribution}
                disabled={contribLoading || hasContributedToday || !contributionText.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-3 shadow-md shadow-indigo-600/10 hover:shadow-lg"
              >
                {contribLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {hasContributedToday ? 'Submitted for Today' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}

        {/* Recent Contributions List */}
        {sections.reports !== false && contributions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Contributions</h3>
            </div>
            <div className="space-y-4">
              {contributions.map((c) => (
                <div key={c.id} className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl hover:shadow-md transition-all duration-300">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{c.content}</p>
                    <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest whitespace-nowrap ${
                      c.isApproved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {c.isApproved ? 'Approved' : 'Pending'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <Calendar size={10} />
                    {c.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duties Section */}
        {sections.duties !== false && staffProfile?.duties?.length > 0 && (
          <div className="p-8 bg-white border border-slate-100 shadow-sm rounded-3xl hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <List size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Daily Duties</h2>
            </div>
            <div className="space-y-3">
              {staffProfile.duties.map((duty: any, idx: number) => {
                const label = duty.label || duty.description || (typeof duty === 'string' ? duty : 'Unknown Duty');
                const isDone = duty.status === 'done';
                return (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDone ? 'bg-emerald-50/50 border-emerald-100/30' : 'bg-slate-50/30 border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {idx + 1}
                      </div>
                      <p className={`text-sm font-medium ${isDone ? 'text-emerald-955' : 'text-slate-700'}`}>{label}</p>
                    </div>
                    {isDone ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100/50 text-emerald-700 rounded-full text-[9px] font-bold uppercase tracking-widest border border-emerald-100">
                        <CheckCircle2 size={12} />
                        Completed
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-bold uppercase tracking-widest">
                        <Circle size={12} />
                        Pending
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

