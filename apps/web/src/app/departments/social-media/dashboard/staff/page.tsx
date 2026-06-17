'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
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
import { useVisibleSections } from '@/hooks/useVisibleSections';

export default function StaffSelfPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useMediaSession();

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
  const { sections, loading: visibilityLoading } = useVisibleSections('social-media', 'staff', user?.uid || '');

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch Staff Profile
      const staffRef = doc(db, 'media_users', user.uid);
      let staffSnap = await getDoc(staffRef);
      
      if (!staffSnap.exists()) {
        const fallbackSnap = await getDocs(query(collection(db, 'media_staff'), where('loginUserId', '==', user.uid)));
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
          collection(db, 'media_attendance'), 
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
          collection(db, 'media_contributions'), 
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
          collection(db, 'media_attendance'),
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
          collection(db, 'media_special_tasks'), 
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
    const role = (user?.role || '').toLowerCase();
    const isStaff = role === 'staff' || role.includes('staff') || role.includes('contract') || role.includes('internee');
    if (!user || !isStaff) {
      router.push('/departments/social-media/login');
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

        await addDoc(collection(db, 'media_attendance'), {
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
          await addDoc(collection(db, 'media_fines'), {
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
        await updateDoc(doc(db, 'media_attendance', todayRecord.id), {
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
      await addDoc(collection(db, 'media_contributions'), {
        staffId: staffProfile.id,
        staffName: staffProfile.name || user?.displayName,
        date: today,
        content: contributionText.trim(),
        isApproved: false,
        createdAt: Timestamp.now(),
        dept: 'social-media'
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
      await updateDoc(doc(db, 'media_special_tasks', taskId), {
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

  // --- Styles (Minimalist Cream/White) ---
  const glassStyle = "bg-white border border-gray-100 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-2xl transition-all hover:shadow-md hover:border-gray-200/80";

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-gray-900 pb-24 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span className="text-indigo-600">{user?.displayName?.split?.(' ')?.[0] || 'User'}</span>
            </h1>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mt-1.5">
              {formatDateDMY(new Date())}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-500 bg-white border border-gray-100 shadow-sm">
            <UserIcon size={20} />
          </div>
        </div>

        {/* Quick Stats */}
        {((sections.growthPoints !== false) || (sections.attendance !== false)) && (
          <div className={`grid gap-4 ${
            (sections.growthPoints !== false) && (sections.attendance !== false) ? 'grid-cols-2' : 'grid-cols-1'
          }`}>
            {sections.growthPoints !== false && (
              <div className={`p-6 ${glassStyle}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Trophy size={15} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Growth Points</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{staffProfile?.totalGrowthPoints || 0}</p>
              </div>
            )}
            {sections.attendance !== false && (
              <div className={`p-6 ${glassStyle}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Activity size={15} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attendance</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{monthlySummary.present} days</p>
              </div>
            )}
          </div>
        )}

        {/* Special Tasks Override Card */}
        {sections.reports !== false && specialTasks.length > 0 && (
          <div className={`p-6 ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles size={16} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Special Tasks</h2>
            </div>
            <div className="space-y-3">
              {specialTasks.map(task => (
                <div key={task.id} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group">
                  <p className="text-sm text-gray-700 mb-3">{task.description}</p>
                  <div className="flex gap-2">
                    {task.status === 'assigned' ? (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'acknowledged')}
                        className="flex-1 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-all"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'completed')}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={13} /> Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contribution Section */}
        {sections.reports !== false && (
          <div className={`p-6 ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Lightbulb size={16} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Record Contribution</h2>
            </div>
            <p className="text-xs text-gray-400 font-medium mb-5">Submit daily achievements for growth points</p>
            
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:bg-white focus-within:border-indigo-500/30 transition-all overflow-hidden">
                <textarea
                  value={contributionText}
                  onChange={(e) => setContributionText(e.target.value)}
                  placeholder="What did you achieve or contribute today?"
                  rows={4}
                  className="w-full bg-transparent px-4 py-3.5 text-sm font-medium text-gray-800 outline-none resize-none placeholder:text-gray-400"
                />
              </div>
              
              <button
                onClick={handleContribution}
                disabled={contribLoading || hasContributedToday || !contributionText.trim()}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {contribLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                {hasContributedToday ? 'Submitted for Today' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}

        {/* Recent Contributions List */}
        {sections.reports !== false && contributions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recent Contributions</h3>
            </div>
            <div className="space-y-3">
              {contributions.map((c) => (
                <div key={c.id} className={`p-5 ${glassStyle}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">{c.content}</p>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide whitespace-nowrap ${
                      c.isApproved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {c.isApproved ? 'Approved' : 'Pending'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <Calendar size={12} />
                    {c.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duties Section */}
        {sections.duties !== false && staffProfile?.duties?.length > 0 && (
          <div className={`p-6 ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white">
                <List size={16} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Daily Duties</h2>
            </div>
            <div className="space-y-2.5">
              {staffProfile.duties.map((duty: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{duty.description || duty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
