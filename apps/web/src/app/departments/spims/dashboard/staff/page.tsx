'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSpimsSession } from '@/hooks/spims/useSpimsSession';
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDateDMY } from '@/lib/utils';
import type { AttendanceRecord, StaffContribution, StaffMember } from '@/types/rehab';
import {
  Clock, CheckCircle, LogIn, LogOut, Calendar,
  Lightbulb, Send, Star, List, Loader2
} from 'lucide-react';

// Helper for robust timestamp handling
const toDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts === 'string') return new Date(ts);
  return null;
};

export default function StaffSelfPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useSpimsSession();

  const [staffProfile, setStaffProfile] = useState<StaffMember | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [contributions, setContributions] = useState<StaffContribution[]>([]);
  const [contributionText, setContributionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [contribLoading, setContribLoading] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState({ present: 0, absent: 0, leave: 0 });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Find staff profile linked to this login user
      const staffSnap = await getDocs(
        query(collection(db, 'spims_users'), where('loginUserId', '==', user.uid))
      );
      if (staffSnap.empty) { setLoading(false); return; }
      const staffDoc = staffSnap.docs[0];
      const staffId = staffDoc.id;
      const staffData = staffDoc.data();
      setStaffProfile({ 
        id: staffId, 
        ...staffData, 
        joiningDate: toDate(staffData.joiningDate) || new Date(), 
        duties: staffData.duties || [] 
      } as unknown as StaffMember);

      const today = new Date().toISOString().split('T')[0];
      const attSnap = await getDocs(
        query(collection(db, 'spims_attendance'), where('staffId', '==', staffId), where('date', '==', today))
      );

      // Today's attendance
      const attDoc = attSnap.empty ? null : attSnap.docs[0];
      if (attDoc) {
        const d = attDoc.data();
        setTodayRecord({ 
          id: attDoc.id, 
          ...d, 
          checkInTime: toDate(d.checkInTime), 
          checkOutTime: toDate(d.checkOutTime) 
        } as AttendanceRecord);
      } else {
        setTodayRecord(null);
      }

      // Contributions (last 7 days)
      const contribSnap = await getDocs(
        query(collection(db, 'spims_contributions'), where('staffId', '==', staffId))
      );
      setContributions(
        contribSnap.docs
          .map(d => ({ 
            id: d.id, 
            ...d.data(), 
            createdAt: toDate(d.data().createdAt) || new Date() 
          } as StaffContribution))
          .sort((a, b) => {
            const dateA = toDate(a.createdAt)?.getTime() || 0;
            const dateB = toDate(b.createdAt)?.getTime() || 0;
            return dateB - dateA;
          })
          .slice(0, 10)
      );

      // Monthly attendance summary
      const firstDay = new Date();
      firstDay.setDate(1);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      const monthlySnap = await getDocs(
        query(
          collection(db, 'spims_attendance'),
          where('staffId', '==', staffId),
          where('date', '>=', firstDayStr),
          where('date', '<=', todayStr)
        )
      );
      const presentCount = monthlySnap.docs.filter(d => d.data().status === 'present').length;
      const absentCount  = monthlySnap.docs.filter(d => d.data().status === 'absent').length;
      const leaveCount   = monthlySnap.docs.filter(d => d.data().status === 'leave').length;

      setMonthlySummary({ present: presentCount, absent: absentCount, leave: leaveCount });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || user.role !== 'staff') { router.push('/departments/spims/login'); return; }
    fetchData();
  }, [sessionLoading, user, fetchData, router]);

  const showMsg = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleCheckIn = async () => {
    console.log('Check-in clicked, staffProfile:', staffProfile?.id, 'today:', today);
    if (!staffProfile) {
      showMsg('error', 'Staff profile not found. Contact admin.');
      return;
    }

    setCheckLoading(true);
    try {
      if (!todayRecord) {
        // No record yet — create with check-in
        const now = new Date();
        const [dutyHour, dutyMin] = (staffProfile.dutyStartTime || '08:00').split(':').map(Number);
        const dutyStart = new Date();
        dutyStart.setHours(dutyHour, dutyMin, 0, 0);

        const lateByMs = now.getTime() - dutyStart.getTime();
        const lateByMinutes = Math.floor(lateByMs / 60000);
        const isLate = lateByMinutes > 0;

        await addDoc(collection(db, 'spims_attendance'), {
          staffId: staffProfile.id,
          date: today,
          status: 'present',
          checkInTime: Timestamp.now(),
          checkOutTime: null,
          isLate,
          lateByMinutes: isLate ? lateByMinutes : 0,
          autoFineApplied: isLate,
        });

        showMsg('success', 'Checked in! ✓');
        // optimistic update
        setTodayRecord({
          id: 'temp-' + Date.now(),
          staffId: staffProfile.id,
          date: today,
          status: 'present',
          checkInTime: new Date(),
          isLate,
          lateByMinutes: isLate ? lateByMinutes : 0,
          autoFineApplied: isLate,
        } as unknown as AttendanceRecord);

        if (isLate) {
          const currentMonth = today.substring(0, 7);
          await addDoc(collection(db, 'spims_fines'), {
            staffId: staffProfile.id,
            amount: 200,
            reason: `Late arrival — ${lateByMinutes} minutes late (duty start: ${staffProfile.dutyStartTime})`,
            date: currentMonth,
            recordedBy: 'system_auto',
            createdAt: Timestamp.now(),
          });
          showMsg('success', `Checked in. Note: You are ${lateByMinutes} minutes late. PKR 200 fine applied. ⚠️`);
        }
      } else if (!todayRecord.checkOutTime) {
        // Already checked in — check out
        await updateDoc(doc(db, 'spims_attendance', todayRecord.id), {
          checkOutTime: Timestamp.now(),
        });
        showMsg('success', 'Checked out. Great work today! ✓');
        setTodayRecord(prev => prev ? { ...prev, checkOutTime: new Date() } : prev);
      }
      fetchData();
    } catch (err: any) {
      console.error('Attendance error:', err);
      showMsg('error', `Failed: ${err?.message || 'Unknown error'}`);
    }
    setCheckLoading(false);
  };

  const handleContribution = async () => {
    if (!contributionText.trim() || !staffProfile) return;
    setContribLoading(true);
    try {
      await addDoc(collection(db, 'spims_contributions'), {
        staffId: staffProfile.id,
        date: today,
        content: contributionText.trim(),
        isApproved: false,
        createdAt: Timestamp.now(),
      });
      setContributionText('');
      fetchData();
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    } catch {
      showMsg('error', 'Failed to save. Try again.');
    }
    setContribLoading(false);
  };

  const checkedIn    = !!todayRecord?.checkInTime;
  const checkedOut   = !!todayRecord?.checkOutTime;
  const isOverridden = !!todayRecord?.overriddenBy;

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-3xl" />
        <div className="h-32 bg-gray-100 rounded-3xl" />
        <div className="h-48 bg-gray-100 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden w-full max-w-full pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.displayName?.split(' ')[0]}
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            {formatDateDMY(new Date())}
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl font-semibold text-sm ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <CheckCircle size={16} />
            {message.text}
          </div>
        )}

        {/* Check In / Out Card */}
        <div className={`rounded-2xl p-4 border-l-4 ${checkedIn || checkedOut ? 'border-teal-500 bg-white/5' : 'border-amber-500 bg-white/5'}`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-teal-400" />
              <h2 className="font-black text-white">Today's Attendance</h2>
            </div>
            {staffProfile && (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                 Duty: {staffProfile.dutyStartTime} — {staffProfile.dutyEndTime}
              </p>
            )}
          </div>

          {isOverridden && (
            <div className="mb-4 px-4 py-3 bg-amber-500/10 rounded-2xl text-xs text-amber-400 font-bold border border-amber-500/20">
              ⚠️ Your attendance was marked by admin today.
            </div>
          )}

          {/* Time display */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`p-4 rounded-2xl text-center ${checkedIn ? 'bg-teal-500/10' : 'bg-white/5'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Check In</p>
              <p className={`font-mono text-2xl font-black ${checkedIn ? 'text-teal-400' : 'opacity-30'}`}>
                {todayRecord?.checkInTime
                  ? toDate(todayRecord.checkInTime)?.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'
                }
              </p>
              {todayRecord?.isLate && (
                <p className="text-[10px] text-amber-400 font-bold mt-1">
                  ⚠️ Late by {todayRecord.lateByMinutes} mins — PKR 200 fine
                </p>
              )}
            </div>
            <div className={`p-4 rounded-2xl text-center ${checkedOut ? 'bg-blue-500/10' : 'bg-white/5'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Check Out</p>
              <p className={`font-mono text-2xl font-black ${checkedOut ? 'text-blue-400' : 'opacity-30'}`}>
                {todayRecord?.checkOutTime
                  ? toDate(todayRecord.checkOutTime)?.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'
                }
              </p>
            </div>
          </div>

          {/* Action Button OR Badge */}
          {checkedOut || isOverridden ? (
            <div className="w-full py-4 bg-white/5 rounded-2xl text-center text-slate-400 font-black text-sm uppercase tracking-wide">
              {isOverridden ? 'Attendance marked by admin' : 'Shift complete for today ✓'}
            </div>
          ) : checkedIn ? (
            <div className="w-full py-4 rounded-2xl bg-emerald-500/10 text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-500/20">
              <CheckCircle size={14} /> Checked In
            </div>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={checkLoading}
              className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed bg-teal-500 text-white animate-pulse"
            >
              {checkLoading
                ? <Loader2 size={18} className="animate-spin" />
                : <LogIn size={18} />
              }
              {checkLoading ? 'Processing...' : 'Check In Now'}
            </button>
          )}
        </div>

        {/* Monthly Summary Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-teal-400" />
            <h2 className="font-black text-white">Monthly Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{monthlySummary.present}</p>
              <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wide mt-1">Present</p>
            </div>
            <div className="bg-red-500/10 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-red-400">{monthlySummary.absent}</p>
              <p className="text-[9px] font-bold text-red-400/60 uppercase tracking-wide mt-1">Absent</p>
            </div>
            <div className="bg-blue-500/10 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-400">{monthlySummary.leave}</p>
              <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-wide mt-1">Leave</p>
            </div>
          </div>
          {/* Progress bar */}
          {((monthlySummary.present + monthlySummary.absent + monthlySummary.leave) > 0) && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${(monthlySummary.present / (monthlySummary.present + monthlySummary.absent + monthlySummary.leave)) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Duties */}
        {(staffProfile?.duties?.length ?? 0) > 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-4">
              <List size={18} className="text-teal-400" />
              <h2 className="font-black text-white">Your Duties</h2>
            </div>
            <ol className="space-y-2">
              {staffProfile?.duties?.map((d: any, i: number) => (
                <li key={d.id || i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="w-5 h-5 rounded-lg bg-teal-500/10 text-teal-400 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-slate-300 text-sm leading-snug">{d.description || String(d)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Daily Contribution */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={18} className="text-amber-400" />
            <h2 className="font-black text-white">Your Contribution Today</h2>
          </div>
          <p className="text-slate-400 text-xs mb-4">Share what you accomplished, any feedback, or ideas for improving the rehab center.</p>
          <textarea
            rows={3}
            placeholder="e.g. Completed morning rounds, cleaned all patient rooms, suggested new shift handover system..."
            className="w-full min-h-[100px] rounded-2xl resize-none p-4 bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-teal-500/50 transition-all"
            value={contributionText}
            onChange={e => setContributionText(e.target.value)}
          />
          <button
            onClick={handleContribution}
            disabled={contribLoading || !contributionText.trim()}
            className="w-full py-3 mt-3 rounded-2xl bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
          >
            {submitted ? '✓ Submitted' : contribLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        {/* Past Contributions */}
        {contributions.length > 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Star size={18} className="text-amber-300" />
              <h2 className="font-black text-white">Recent Contributions</h2>
            </div>
            <div className="space-y-3">
                {contributions.map(c => (
                  <div key={c.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-slate-300 text-sm leading-relaxed">{c.content || c.contributionDescription || ''}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-2">{c.date} — {toDate(c.createdAt)?.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
