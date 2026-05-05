'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useJobCenterSession } from '@/hooks/job-center/useJobCenterSession';
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, getDoc, Timestamp, orderBy, limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY, toDate } from '@/lib/utils';
import {
  Clock, CheckCircle, LogIn, LogOut, Calendar,
  Lightbulb, Send, Star, List, Loader2, AlertCircle,
  Trophy, TrendingUp, User as UserIcon, Sparkles, Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StaffSelfPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useJobCenterSession();

  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [contributionText, setContributionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [contribLoading, setContribLoading] = useState(false);
  const [specialTasks, setSpecialTasks] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState({ present: 0, absent: 0, leave: 0 });
  const [hasContributedToday, setHasContributedToday] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch Staff Profile
      const staffRef = doc(db, 'jobcenter_users', user.uid);
      let staffSnap = await getDoc(staffRef);
      
      if (!staffSnap.exists()) {
        const fallbackSnap = await getDocs(query(collection(db, 'jobcenter_staff'), where('loginUserId', '==', user.uid)));
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
          collection(db, 'jobcenter_attendance'), 
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
          collection(db, 'jobcenter_contributions'), 
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
          collection(db, 'jobcenter_attendance'),
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
          collection(db, 'jobcenter_special_tasks'), 
          where('staffId', '==', staffId),
          where('status', '!=', 'completed')
        )
      );
      setSpecialTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || user.role !== 'staff') {
      router.push('/departments/job-center/login');
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

        await addDoc(collection(db, 'jobcenter_attendance'), {
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
          await addDoc(collection(db, 'jobcenter_fines'), {
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
        await updateDoc(doc(db, 'jobcenter_attendance', todayRecord.id), {
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
      await addDoc(collection(db, 'jobcenter_contributions'), {
        staffId: staffProfile.id,
        staffName: staffProfile.name || user?.displayName,
        date: today,
        content: contributionText.trim(),
        isApproved: false,
        createdAt: Timestamp.now(),
        dept: 'job-center'
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
      await updateDoc(doc(db, 'jobcenter_special_tasks', taskId), {
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
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-gray-400">Loading Portal...</p>
        </div>
      </div>
    );
  }

  // --- Styles (Cream/Black Brutalist) ---
  const glassStyle = "bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all";

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-black pb-24 overflow-x-hidden font-bold">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-[1000] tracking-tighter text-black uppercase">
              {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
              <span className="block text-indigo-600">{user?.displayName?.split(' ')[0]}</span>
            </h1>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-2">
              {formatDateDMY(new Date())}
            </p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-indigo-600 ${glassStyle}`}>
            <UserIcon size={24} strokeWidth={2.5} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Trophy size={16} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Growth Points</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{staffProfile?.totalGrowthPoints || 0}</p>
          </div>
          <div className={`p-5 ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <Activity size={16} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{monthlySummary.present}</p>
          </div>
        </div>

        {/* Special Tasks Override Card */}
        {specialTasks.length > 0 && (
          <div className={`p-8 rounded-[2.5rem] border-2 border-indigo-100 bg-indigo-50/30 ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Sparkles size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Special Tasks</h2>
            </div>
            <div className="space-y-4">
              {specialTasks.map(task => (
                <div key={task.id} className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 group-hover:rotate-45 transition-all">
                    <Sparkles size={40} />
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-4">{task.description}</p>
                  <div className="flex gap-2">
                    {task.status === 'assigned' ? (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'acknowledged')}
                        className="flex-1 py-3 rounded-xl bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'completed')}
                        className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={12} /> Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Contribution Section */}
        <div className={`p-8 border-4 border-black ${glassStyle}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Lightbulb size={20} />
            </div>
            <h2 className="text-xl font-black text-gray-900">Record Contribution</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Submit daily achievements for growth points</p>
          
          <div className="space-y-4">
            <div className="p-2 border-2 border-black bg-white">
              <textarea
                value={contributionText}
                onChange={(e) => setContributionText(e.target.value)}
                placeholder="What did you achieve or contribute today?"
                rows={4}
                className="w-full bg-transparent p-6 text-sm font-bold text-black outline-none resize-none placeholder:text-slate-400"
              />
            </div>
            
            <button
              onClick={handleContribution}
              disabled={contribLoading || hasContributedToday || !contributionText.trim()}
              className="w-full py-5 bg-black text-white font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {contribLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {hasContributedToday ? 'Submitted for Today' : 'Submit for Approval'}
            </button>
          </div>
        </div>

        {/* Recent Contributions List */}
        {contributions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Contributions</h3>
            </div>
            <div className="space-y-4">
              {contributions.map((c) => (
                <div key={c.id} className={`p-6 rounded-[2rem] border-2 border-white ${glassStyle}`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{c.content}</p>
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${
                      c.isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {c.isApproved ? 'Approved' : 'Pending'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar size={10} />
                    {c.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duties Section */}
        {staffProfile?.duties?.length > 0 && (
          <div className={`p-8 border-4 border-black ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                <List size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Daily Duties</h2>
            </div>
            <div className="space-y-3">
              {staffProfile.duties.map((duty: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-white">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-black">
                    {idx + 1}
                  </div>
                  <p className="text-sm font-bold text-slate-700">{duty.description || duty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
