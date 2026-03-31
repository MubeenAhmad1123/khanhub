'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import Link from 'next/link';
import { Loader2, ArrowLeft, Calendar, Clock, DollarSign, Shield, CheckCircle, XCircle, MinusCircle, Award, Target } from 'lucide-react';

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;
  const { session, loading: sessionLoading } = useHqSession();
  const [staff, setStaff] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);
  const [dutyLogs, setDutyLogs] = useState<any[]>([]);
  const [dressCode, setDressCode] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'manager' || !staffId) return;

    const fetchData = async () => {
      try {
        const staffDoc = await getDoc(doc(db, 'hq_staff', staffId));
        if (!staffDoc.exists()) {
          router.back();
          return;
        }
        setStaff({ id: staffDoc.id, ...staffDoc.data() } as any);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const today = now.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [attSnap, dutiesSnap, logsSnap, dressSnap, targetsSnap, salarySnap] = await Promise.all([
          getDocs(query(collection(db, 'hq_attendance'), where('staffId', '==', staffId))),
          getDocs(query(collection(db, 'hq_duties'), where('staffId', '==', staffId))),
          getDocs(query(collection(db, 'hq_duty_logs'), where('staffId', '==', staffId))),
          getDocs(query(collection(db, 'hq_dress_code'), where('staffId', '==', staffId))),
          getDocs(query(collection(db, 'hq_targets'), where('staffId', '==', staffId))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, 'hq_salary_records'), where('staffId', '==', staffId))).catch(() => ({ docs: [] })),
        ]);

        const attList = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        attList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setAttendance(attList);

        setDuties(dutiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        const logsList = logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        logsList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setDutyLogs(logsList.slice(0, 30));

        const dressList = dressSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        dressList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setDressCode(dressList.slice(0, 1));

        setTargets(targetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        const salaryList = salarySnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        salaryList.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
        setSalaryRecords(salaryList.slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, staffId, router]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!staff) return null;

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.find(a => a.date === today);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthAtt = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const absentDays = monthAtt.filter(a => a.status === 'absent').length;
  const finesTotal = monthAtt.reduce((sum, a) => sum + (a.fine || 0), 0);
  const dailyRate = staff.monthlySalary ? Math.round(staff.monthlySalary / 26) : 0;
  const deductions = finesTotal;
  const netSalary = (staff.monthlySalary || 0) - deductions;

  const calendarDays = [];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const att = attendance.find(a => a.date === dateStr);
    calendarDays.push({ day: i, date: dateStr, status: att?.status || null });
  }

  const todayDutyLogs = dutyLogs.filter(l => l.date === today);
  const latestDressCode = dressCode[0];

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <Link href="/hq/dashboard/manager/staff"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold transition-colors">
        <ArrowLeft size={16} /> Back to Staff
      </Link>

      {/* Section 1: Identity Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-black text-3xl flex-shrink-0">
            {staff.photoUrl ? (
              <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover rounded-3xl" />
            ) : (
              (staff.name || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</p><p className="font-bold text-gray-900">{staff.name}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Father's Name</p><p className="font-bold text-gray-900">{staff.fatherName || '—'}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee ID</p><p className="font-mono font-bold text-gray-700">{staff.employeeId}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Designation</p><p className="font-bold text-gray-900">{staff.designation}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</p>
              <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                staff.department === 'rehab' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                staff.department === 'spims' ? 'bg-green-50 text-green-600 border-green-100' :
                'bg-gray-50 text-gray-600 border-gray-100'
              }`}>{staff.department}</span>
            </div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CNIC</p><p className="font-bold text-gray-900">{staff.cnic || '—'}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p><p className="font-bold text-gray-900">{staff.phone || '—'}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joining Date</p><p className="font-bold text-gray-900">{formatDate(staff.joiningDate)}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duty Time</p><p className="font-bold text-gray-900">{staff.dutyStart || '—'} — {staff.dutyEnd || '—'}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Salary</p><p className="font-bold text-green-600">₨{staff.monthlySalary?.toLocaleString() || '0'}</p></div>
            <div className="sm:col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</p><p className="font-bold text-gray-900">{staff.address || '—'}</p></div>
          </div>
        </div>
      </div>

      {/* Section 2: Today's Attendance */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Clock size={18} /> Today's Attendance</h2>
        {todayAttendance ? (
          <div className="flex flex-wrap gap-6">
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
              <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                todayAttendance.status === 'present' ? 'bg-green-50 text-green-600' :
                todayAttendance.status === 'absent' ? 'bg-red-50 text-red-600' :
                'bg-yellow-50 text-yellow-600'
              }`}>{todayAttendance.status}</span>
            </div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arrival</p><p className="font-bold">{todayAttendance.arrivalTime || '—'}</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departure</p><p className="font-bold">{todayAttendance.departureTime || '—'}</p></div>
            {todayAttendance.isLate && <span className="px-3 py-1 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest self-center">Late</span>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 font-bold">Not marked yet</p>
            <Link href="/hq/dashboard/manager/staff/attendance" className="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-700 transition-all">Mark Attendance</Link>
          </div>
        )}
      </div>

      {/* Section 3: Monthly Calendar */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Calendar size={18} /> {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <div className="grid grid-cols-7 gap-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-[9px] font-black text-gray-400 uppercase tracking-widest py-2">{d}</div>
          ))}
          {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {calendarDays.map(d => (
            <div key={d.day} className={`text-center py-2 rounded-lg text-xs font-bold ${
              d.status === 'present' ? 'bg-green-100 text-green-700' :
              d.status === 'absent' ? 'bg-red-100 text-red-700' :
              d.status === 'leave' ? 'bg-yellow-100 text-yellow-700' :
              'text-gray-400'
            }`}>
              {d.day}
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-[10px] font-black uppercase tracking-widest">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-100" /> Present</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-100" /> Absent</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-100" /> Leave</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100" /> Not Marked</span>
        </div>
      </div>

      {/* Section 4: Dress Code */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Shield size={18} /> Dress Code {latestDressCode ? `(${latestDressCode.date})` : ''}</h2>
        {latestDressCode && latestDressCode.items ? (
          <div className="space-y-2">
            {latestDressCode.items.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-bold text-gray-700">{item.name}</span>
                <span className={`text-xs font-black uppercase ${
                  item.status === 'wearing' ? 'text-green-600' :
                  item.status === 'not_wearing' ? 'text-red-500' :
                  'text-gray-400'
                }`}>
                  {item.status === 'wearing' ? <CheckCircle size={14} className="inline" /> :
                   item.status === 'not_wearing' ? <XCircle size={14} className="inline" /> :
                   <MinusCircle size={14} className="inline" />} {item.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No dress code records found</p>
        )}
      </div>

      {/* Section 5: Assigned Duties */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Award size={18} /> Assigned Duties</h2>
        {duties.length === 0 ? (
          <p className="text-gray-400 text-sm">No duties assigned</p>
        ) : (
          <div className="space-y-2">
            {duties.map(d => {
              const todayLog = todayDutyLogs.find(l => l.dutyId === d.id);
              return (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-gray-700">{d.name}</p>
                    {d.description && <p className="text-[10px] text-gray-400">{d.description}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    todayLog?.status === 'done' ? 'bg-green-50 text-green-600' :
                    todayLog?.status === 'not_done' ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {todayLog?.status?.replace('_', ' ') || 'Not Available'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 6: Daily Contribution Timeline */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Target size={18} /> Recent Activity</h2>
        {dutyLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">No activity records</p>
        ) : (
          <div className="space-y-3">
            {dutyLogs.slice(0, 7).map((log, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-700">{log.dutyName || 'Duty'} — <span className={`text-[10px] font-black uppercase ${
                    log.status === 'done' ? 'text-green-600' : log.status === 'not_done' ? 'text-red-500' : 'text-gray-400'
                  }`}>{log.status?.replace('_', ' ')}</span></p>
                  <p className="text-[10px] text-gray-400">{formatDate(log.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 7: Monthly Targets */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Target size={18} /> Monthly Targets</h2>
        {targets.length === 0 ? (
          <p className="text-gray-400 text-sm">No targets set</p>
        ) : (
          <div className="space-y-3">
            {targets.map((t: any, i: number) => (
              <div key={i} className="py-2 border-b border-gray-50 last:border-0">
                <div className="flex justify-between">
                  <p className="text-sm font-bold text-gray-700">{t.name || 'Target'}</p>
                  <p className="text-xs font-bold text-gray-500">{t.progress || 0}%</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                  <div className="bg-gray-800 h-2 rounded-full transition-all" style={{ width: `${t.progress || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 8: Salary Info */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><DollarSign size={18} /> Salary Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly</p>
            <p className="font-black text-gray-900">₨{staff.monthlySalary?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Rate</p>
            <p className="font-black text-gray-900">₨{dailyRate.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Absent Days</p>
            <p className="font-black text-gray-900">{absentDays}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fines</p>
            <p className="font-black text-red-500">₨{finesTotal.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-gray-800 text-white p-6 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Net Salary</p>
            <p className="text-2xl font-black">₨{netSalary.toLocaleString()}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Deductions: ₨{deductions.toLocaleString()}</p>
          </div>
        </div>
        {salaryRecords.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Payment History</h3>
            {salaryRecords.map((sr: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-bold text-gray-700">{sr.month || '—'}</span>
                <span className="font-black text-gray-900">₨{sr.amount?.toLocaleString() || '0'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}