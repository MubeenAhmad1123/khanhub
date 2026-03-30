'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSpimsSession } from '@/hooks/spims/useSpimsSession';
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AttendanceRecord, StaffContribution, StaffMember } from '@/types/spims';
import {
  Clock, CheckCircle, LogIn, LogOut, Calendar,
  Lightbulb, Send, Star, List, Loader2
} from 'lucide-react';

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

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Find staff profile linked to this login user
      const staffSnap = await getDocs(
        query(collection(db, 'spims_staff'), where('loginUserId', '==', user.uid))
      );
      if (staffSnap.empty) { setLoading(false); return; }
      const staffDoc = staffSnap.docs[0];
      const staffId = staffDoc.id;
      setStaffProfile({ id: staffId, ...staffDoc.data(), joiningDate: staffDoc.data().joiningDate?.toDate?.() || new Date(), duties: staffDoc.data().duties || [] } as StaffMember);

      // Today's attendance
      const attSnap = await getDocs(
        query(collection(db, 'spims_attendance'), where('staffId', '==', staffId), where('date', '==', today))
      );
      setTodayRecord(attSnap.empty ? null : { id: attSnap.docs[0].id, ...attSnap.docs[0].data(), checkInTime: attSnap.docs[0].data().checkInTime?.toDate?.(), checkOutTime: attSnap.docs[0].data().checkOutTime?.toDate?.() } as AttendanceRecord);

      // Contributions (last 7 days)
      const contribSnap = await getDocs(
        query(collection(db, 'spims_contributions'), where('staffId', '==', staffId))
      );
      setContributions(
        contribSnap.docs
          .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() } as StaffContribution))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
        } as AttendanceRecord);

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
        createdAt: Timestamp.now(),
      });
      setContributionText('');
      fetchData();
      showMsg('success', 'Your contribution has been recorded. Thank you!');
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
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-black text-gray-900">
          {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 text-sm font-medium mt-1">
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl font-semibold text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          <CheckCircle size={16} />
          {message.text}
        </div>
      )}

      {/* Check In / Out Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-teal-500" />
            <h2 className="font-black text-gray-900">Today's Attendance</h2>
          </div>
          {staffProfile && (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
               Duty: {staffProfile.dutyStartTime} — {staffProfile.dutyEndTime}
            </p>
          )}
        </div>

        {isOverridden && (
          <div className="mb-4 px-4 py-3 bg-orange-50 rounded-2xl text-xs text-orange-600 font-bold">
            ⚠️ Your attendance was marked by admin today.
          </div>
        )}

        {/* Time display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-2xl text-center ${checkedIn ? 'bg-green-50' : 'bg-gray-50'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Check In</p>
            <p className={`font-black text-xl ${checkedIn ? 'text-green-600' : 'text-gray-300'}`}>
              {todayRecord?.checkInTime
                ? new Date(todayRecord.checkInTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
                : '--:--'
              }
            </p>
            {todayRecord?.isLate && (
              <p className="text-[10px] text-orange-500 font-bold mt-1">
                ⚠️ Late by {todayRecord.lateByMinutes} mins — PKR 200 fine applied
              </p>
            )}
          </div>
          <div className={`p-4 rounded-2xl text-center ${checkedOut ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Check Out</p>
            <p className={`font-black text-xl ${checkedOut ? 'text-blue-600' : 'text-gray-300'}`}>
              {todayRecord?.checkOutTime
                ? new Date(todayRecord.checkOutTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
                : '--:--'
              }
            </p>
          </div>
        </div>

        {/* Action Button */}
        {checkedOut || isOverridden ? (
          <div className="w-full py-4 bg-gray-100 rounded-2xl text-center text-gray-400 font-black text-sm uppercase tracking-wide">
            {isOverridden ? 'Attendance marked by admin' : 'Shift complete for today ✓'}
          </div>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={checkLoading}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              !checkedIn
                ? 'bg-teal-500 text-white shadow-teal-200 hover:bg-teal-600'
                : 'bg-blue-500 text-white shadow-blue-200 hover:bg-blue-600'
            }`}
          >
            {checkLoading
              ? <Loader2 size={18} className="animate-spin" />
              : !checkedIn ? <LogIn size={18} /> : <LogOut size={18} />
            }
            {checkLoading ? 'Processing...' : !checkedIn ? 'Check In Now' : 'Check Out Now'}
          </button>
        )}
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Calendar size={18} className="text-teal-500" />
          <h2 className="font-black text-gray-900">Monthly Summary</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-green-600">{monthlySummary.present}</p>
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-wide mt-1">Present</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-red-500">{monthlySummary.absent}</p>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mt-1">Absent</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-blue-600">{monthlySummary.leave}</p>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mt-1">Leave</p>
          </div>
        </div>
      </div>

      {/* Duties */}
      {(staffProfile?.duties?.length ?? 0) > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <List size={18} className="text-teal-500" />
            <h2 className="font-black text-gray-900">Your Duties</h2>
          </div>
          <ol className="space-y-2">
            {staffProfile?.duties?.map((d, i) => (
              <li key={d.id || i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="w-5 h-5 rounded-lg bg-teal-100 text-teal-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-gray-700 text-sm leading-snug">{d.description || String(d)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Daily Contribution */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={18} className="text-amber-400" />
          <h2 className="font-black text-gray-900">Your Contribution Today</h2>
        </div>
        <p className="text-gray-400 text-xs mb-4">Share what you accomplished, any feedback, or ideas for improving the spims center.</p>
        <textarea
          rows={3}
          placeholder="e.g. Completed morning rounds, cleaned all patient rooms, suggested new shift handover system..."
          className="w-full bg-gray-50 rounded-2xl px-4 py-3 font-medium text-gray-700 outline-none focus:ring-2 focus:ring-amber-200 text-sm border-none resize-none"
          value={contributionText}
          onChange={e => setContributionText(e.target.value)}
        />
        <button
          onClick={handleContribution}
          disabled={contribLoading || !contributionText.trim()}
          className="mt-3 flex items-center gap-2 bg-amber-400 text-white px-5 py-3 rounded-2xl font-black text-sm hover:bg-amber-500 transition-all disabled:opacity-40"
        >
          {contribLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Submit
        </button>
      </div>

      {/* Past Contributions */}
      {contributions.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star size={18} className="text-amber-300" />
            <h2 className="font-black text-gray-900">Recent Contributions</h2>
          </div>
          <div className="space-y-3">
            {contributions.map(c => (
              <div key={c.id} className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-gray-700 text-sm leading-relaxed">{c.content}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-2">{c.date} — {c.createdAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

