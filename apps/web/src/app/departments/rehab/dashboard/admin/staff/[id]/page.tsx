'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import {
  doc, getDoc, collection, getDocs, query, where,
  addDoc, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StaffMember, AttendanceRecord, StaffFine, LeaveRecord } from '@/types/rehab';
import {
  ArrowLeft, User, Phone, Calendar, List, DollarSign,
  AlertTriangle, CalendarOff, Plus, X, Loader2, CheckCircle
} from 'lucide-react';

const WORKING_DAYS = 26;

export default function StaffDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { session: user, loading: sessionLoading } = useRehabSession();

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [fines, setFines] = useState<StaffFine[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'fines' | 'leaves'>('overview');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fine form
  const [fineForm, setFineForm] = useState({ amount: '', reason: '', date: new Date().toISOString().slice(0, 7) });
  const [fineLoading, setFineLoading] = useState(false);

  // Leave form
  const [leaveForm, setLeaveForm] = useState({ fromDate: '', toDate: '', reason: '', type: 'paid' as 'paid' | 'unpaid' });
  const [leaveLoading, setLeaveLoading] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchData = useCallback(async () => {
    try {
      const staffDoc = await getDoc(doc(db, 'rehab_staff', id));
      if (!staffDoc.exists()) { router.back(); return; }
      const data = staffDoc.data();
      setStaff({
        id: staffDoc.id,
        ...data,
        joiningDate: data.joiningDate?.toDate?.() || new Date(data.joiningDate || Date.now()),
        duties: data.duties || [],
      } as StaffMember);

      const [attSnap, fineSnap, leaveSnap] = await Promise.all([
        getDocs(query(collection(db, 'rehab_attendance'), where('staffId', '==', id))),
        getDocs(query(collection(db, 'rehab_fines'), where('staffId', '==', id))),
        getDocs(query(collection(db, 'rehab_leaves'), where('staffId', '==', id))),
      ]);

      // Step 3: Filter client-side for this month (robustly)
      const now = new Date()
      const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const lastDayStr = lastDay.toISOString().split('T')[0]

      const attendanceData = attSnap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
        } as AttendanceRecord))
        .filter(a => a.date >= firstDayStr && a.date <= lastDayStr)

      setAttendance(attendanceData);

      setFines(fineSnap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date(d.data().createdAt || Date.now()),
        } as StaffFine))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );

      setLeaves(leaveSnap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date(d.data().createdAt || Date.now()),
        } as LeaveRecord))
        .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
      );
    } catch (err: any) {
      console.error('Fetch staff data error:', err?.message)
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }
    fetchData();
  }, [sessionLoading, user, fetchData, router]);

  const showMsg = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const handleAddFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineForm.amount || !fineForm.reason) return;
    setFineLoading(true);
    try {
      await addDoc(collection(db, 'rehab_fines'), {
        staffId: id,
        amount: Number(fineForm.amount),
        reason: fineForm.reason,
        date: fineForm.date,
        recordedBy: user!.uid,
        createdAt: Timestamp.now(),
      });
      setFineForm({ amount: '', reason: '', date: new Date().toISOString().slice(0, 7) });
      fetchData();
      showMsg('success', 'Fine recorded successfully');
    } catch {
      showMsg('error', 'Failed to record fine');
    }
    setFineLoading(false);
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) return;
    const from = new Date(leaveForm.fromDate);
    const to = new Date(leaveForm.toDate);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days < 1) { showMsg('error', 'Invalid date range'); return; }
    setLeaveLoading(true);
    try {
      await addDoc(collection(db, 'rehab_leaves'), {
        staffId: id,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        days,
        reason: leaveForm.reason,
        type: leaveForm.type,
        recordedBy: user!.uid,
        createdAt: Timestamp.now(),
      });
      setLeaveForm({ fromDate: '', toDate: '', reason: '', type: 'paid' });
      fetchData();
      showMsg('success', `Leave of ${days} day(s) recorded`);
    } catch {
      showMsg('error', 'Failed to record leave');
    }
    setLeaveLoading(false);
  };

  // Salary calculation for current month (robust version)
  const salaryVal = Number(staff?.salary || 0);
  const thisMonthAtt = attendance; // Already filtered in fetchData now
  const presentDays = thisMonthAtt.filter(a => a.status === 'present').length;
  const absentDays = thisMonthAtt.filter(a => a.status === 'absent').length;
  const leaveDays = thisMonthAtt.filter(a => a.status === 'leave').length;

  const thisMonthFines = fines
    .filter(f => f.date === currentMonth)
    .reduce((s, f) => s + Number(f.amount || 0), 0);

  const dailyRate = Math.round(salaryVal / WORKING_DAYS);
  const deduction = (absentDays * dailyRate) + thisMonthFines;
  const netSalary = Math.max(0, salaryVal - deduction);

  const tabs = [
    { key: 'overview', label: 'Profile' },
    { key: 'salary',   label: 'Salary' },
    { key: 'fines',    label: `Fines (${fines.length})` },
    { key: 'leaves',   label: `Leaves (${leaves.length})` },
  ];

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-2xl w-1/4" />
        <div className="h-48 bg-gray-100 rounded-3xl" />
        <div className="h-64 bg-gray-100 rounded-3xl" />
      </div>
    );
  }

  if (!staff) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm font-semibold transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Staff
      </button>

      {/* Staff Header Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-teal-600 font-black text-2xl shadow-sm flex-shrink-0">
            {staff.photoUrl
              ? <img src={staff.photoUrl} className="w-full h-full object-cover rounded-2xl" alt={staff.name} />
              : staff.name.charAt(0)
            }
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-900">{staff.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">{staff.role}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase capitalize">{staff.gender}</span>
              {staff.phone && (
                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Phone size={10} /> {staff.phone}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                <Calendar size={10} /> Joined {staff.joiningDate 
                  ? new Date(staff.joiningDate).toLocaleDateString('en-PK')
                  : '—'
                }
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black text-gray-900">₨{staff.salary.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Monthly Salary</p>
            <p className="text-xs text-gray-400 mt-0.5">₨{dailyRate.toLocaleString()}/day</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl font-semibold text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Overview / Profile */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Duties */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <List size={18} className="text-teal-500" />
              <h2 className="font-black text-gray-900">Assigned Duties</h2>
            </div>
            {staff.duties?.length > 0 ? (
              <ul className="space-y-2">
                {staff.duties.map((d, i) => (
                  <li key={d.id || i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="w-5 h-5 rounded-lg bg-teal-100 text-teal-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-gray-700 text-sm leading-snug">
                      {d.description}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-300 text-sm">No duties assigned yet.</p>
            )}
          </div>

          {/* This month attendance summary */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4">This Month — {currentMonth}</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-green-600">{presentDays}</p>
                <p className="text-[10px] font-bold text-green-400 uppercase mt-1">Present</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-red-500">{absentDays}</p>
                <p className="text-[10px] font-bold text-red-400 uppercase mt-1">Absent</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-blue-500">{leaveDays}</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase mt-1">Leave</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Salary */}
      {activeTab === 'salary' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-teal-500" />
            <h2 className="font-black text-gray-900">Salary Breakdown — {currentMonth}</h2>
          </div>
          <div className="space-y-3">
            <Row label="Gross Salary" value={`₨${staff.salary.toLocaleString()}`} />
            <Row label={`Daily Rate (÷${WORKING_DAYS} days)`} value={`₨${dailyRate.toLocaleString()}/day`} muted />
            <Row label={`Absent Deduction (${absentDays} days × ₨${dailyRate.toLocaleString()})`} value={`- ₨${(absentDays * dailyRate).toLocaleString()}`} red />
            <Row label={`Fines This Month`} value={`- ₨${thisMonthFines.toLocaleString()}`} red />
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center p-4 bg-teal-50 rounded-2xl">
              <span className="font-black text-teal-700 text-sm uppercase tracking-wide">Net Payable</span>
              <span className="font-black text-teal-700 text-2xl">₨{Math.round(netSalary).toLocaleString('en-PK')}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Fines */}
      {activeTab === 'fines' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-400" />
              Record Fine / Deduction
            </h2>
            <form onSubmit={handleAddFine} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount (PKR) *</label>
                  <input required type="number" placeholder="e.g. 500" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 text-sm border-none" value={fineForm.amount} onChange={e => setFineForm({ ...fineForm, amount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Month *</label>
                  <input type="month" required className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 text-sm border-none" value={fineForm.date} onChange={e => setFineForm({ ...fineForm, date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason *</label>
                <input required placeholder="e.g. Late arrival 3 times" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 text-sm border-none" value={fineForm.reason} onChange={e => setFineForm({ ...fineForm, reason: e.target.value })} />
              </div>
              <button type="submit" disabled={fineLoading} className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-orange-600 transition-all disabled:opacity-50">
                {fineLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Record Fine
              </button>
            </form>
          </div>

          {fines.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-black text-gray-900">Fine History</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {fines.map(f => (
                  <div key={f.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{f.reason}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{f.date}</p>
                    </div>
                    <span className="font-black text-red-500 text-sm">- ₨{Number(f.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Leaves */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <CalendarOff size={18} className="text-blue-400" />
              Record Leave Application
            </h2>
            <form onSubmit={handleAddLeave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From Date *</label>
                  <input required type="date" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm border-none" value={leaveForm.fromDate} onChange={e => setLeaveForm({ ...leaveForm, fromDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To Date *</label>
                  <input required type="date" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm border-none" value={leaveForm.toDate} onChange={e => setLeaveForm({ ...leaveForm, toDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Leave Type *</label>
                  <select required className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm border-none" value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}>
                    <option value="paid">Paid Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason *</label>
                  <input required placeholder="e.g. Medical, Family emergency" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm border-none" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                </div>
              </div>
              <button type="submit" disabled={leaveLoading} className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all disabled:opacity-50">
                {leaveLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Record Leave
              </button>
            </form>
          </div>

          {leaves.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-black text-gray-900">Leave History</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {leaves.map(l => (
                  <div key={l.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{l.reason}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{l.fromDate} → {l.toDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-500 text-sm">{l.days} day{Number(l.days) > 1 ? 's' : ''}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${l.type === 'paid' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>{l.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, red, muted }: { label: string; value: string; red?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className={`text-sm ${muted ? 'text-gray-400' : 'text-gray-600'} font-medium`}>{label}</span>
      <span className={`font-black text-sm ${red ? 'text-red-500' : muted ? 'text-gray-400' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}
