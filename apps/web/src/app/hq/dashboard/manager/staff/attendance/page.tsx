'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, CheckCircle, XCircle, MinusCircle, Save, Calendar } from 'lucide-react';

const MALE_ITEMS = ['Dress Pant', 'Dress Shirt', 'Tie', 'Shoes', 'Employee Card'];
const FEMALE_ITEMS = ['OT Kit', 'White Overall', 'Shoes', 'Employee Card'];
const DRESS_OPTIONS = ['wearing', 'not_wearing', 'na'] as const;
const DUTY_OPTIONS = ['done', 'not_done', 'na'] as const;

export default function AttendanceMarkingPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [dutiesMap, setDutiesMap] = useState<Record<string, any[]>>({});
  const [existingAttendance, setExistingAttendance] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [records, setRecords] = useState<Record<string, any>>({});

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'manager') return;

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [staffSnap, attSnap, dutiesSnap] = await Promise.all([
          getDocs(query(collection(db, 'hq_staff'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'hq_attendance'), where('date', '==', today))),
          getDocs(collection(db, 'hq_duties')),
        ]);

        const staff = staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        staff.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(staff);

        const attMap: Record<string, any> = {};
        attSnap.docs.forEach(d => {
          const data = d.data();
          attMap[data.staffId] = { ...data, id: d.id };
        });
        setExistingAttendance(attMap);

        const dutiesByStaff: Record<string, any[]> = {};
        dutiesSnap.docs.forEach(d => {
          const data = d.data();
          if (!dutiesByStaff[data.staffId]) dutiesByStaff[data.staffId] = [];
          dutiesByStaff[data.staffId].push({ id: d.id, ...data });
        });
        setDutiesMap(dutiesByStaff);

        const initialRecords: Record<string, any> = {};
        staff.forEach(s => {
          const existing = attMap[s.id];
          const gender = s.gender || 'male';
          const dressItems = gender === 'female' ? FEMALE_ITEMS : MALE_ITEMS;
          initialRecords[s.id] = {
            staffId: s.id,
            status: existing?.status || 'present',
            arrivalTime: existing?.arrivalTime || '',
            departureTime: existing?.departureTime || '',
            dressCode: dressItems.map((name: string) => ({
              name,
              status: existing?.dressCode?.find((dc: any) => dc.name === name)?.status || 'na',
            })),
            dutyLogs: (dutiesByStaff[s.id] || []).map((duty: any) => ({
              dutyId: duty.id,
              dutyName: duty.name,
              status: 'na',
            })),
          };
        });
        setRecords(initialRecords);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const updateRecord = (staffId: string, field: string, value: any) => {
    setRecords(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], [field]: value },
    }));
  };

  const updateDressCode = (staffId: string, index: number, status: string) => {
    setRecords(prev => {
      const rec = { ...prev[staffId] };
      rec.dressCode = [...rec.dressCode];
      rec.dressCode[index] = { ...rec.dressCode[index], status };
      return { ...prev, [staffId]: rec };
    });
  };

  const updateDutyLog = (staffId: string, index: number, status: string) => {
    setRecords(prev => {
      const rec = { ...prev[staffId] };
      rec.dutyLogs = [...rec.dutyLogs];
      rec.dutyLogs[index] = { ...rec.dutyLogs[index], status };
      return { ...prev, [staffId]: rec };
    });
  };

  const markedCount = Object.values(records).filter((r: any) =>
    r.status === 'absent' || r.status === 'leave' || (r.status === 'present' && r.arrivalTime)
  ).length;

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      for (const staffId of Object.keys(records)) {
        const rec = records[staffId];
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) continue;

        let isLate = false;
        let fine = 0;
        if (rec.status === 'present' && rec.arrivalTime && staff.dutyStart) {
          const [arrH, arrM] = rec.arrivalTime.split(':').map(Number);
          const [dutyH, dutyM] = staff.dutyStart.split(':').map(Number);
          const arrMin = arrH * 60 + arrM;
          const dutyMin = dutyH * 60 + dutyM;
          if (arrMin > dutyMin + 15) {
            isLate = true;
            fine = 200;
          }
        }

        await setDoc(doc(db, 'hq_attendance', `${staffId}_${today}`), {
          staffId,
          date: today,
          arrivalTime: rec.arrivalTime || null,
          departureTime: rec.departureTime || null,
          status: rec.status,
          isLate,
          fine,
          markedBy: session?.customId || 'manager',
          createdAt: now,
        }, { merge: true });

        if (rec.dressCode?.length) {
          await setDoc(doc(db, 'hq_dress_code', `${staffId}_${today}`), {
            staffId,
            date: today,
            items: rec.dressCode,
            markedBy: session?.customId || 'manager',
            createdAt: now,
          }, { merge: true });
        }

        for (const dutyLog of rec.dutyLogs || []) {
          await setDoc(doc(db, 'hq_duty_logs', `${staffId}_${dutyLog.dutyId}_${today}`), {
            staffId,
            dutyId: dutyLog.dutyId,
            dutyName: dutyLog.dutyName,
            date: today,
            status: dutyLog.status,
            markedBy: session?.customId || 'manager',
            createdAt: now,
          }, { merge: true });
        }
      }

      setMessage({ type: 'success', text: `Attendance saved for ${markedCount} staff members!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-gray-800" />
            Mark Attendance
          </h1>
          <p className="text-gray-400 text-sm mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</p>
            <p className="font-black text-gray-900">{markedCount} / {staffList.length}</p>
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-3">
            <div className="bg-gray-800 h-3 rounded-full transition-all" style={{ width: `${staffList.length ? (markedCount / staffList.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`p-6 rounded-3xl border font-bold ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {staffList.map(s => {
          const rec = records[s.id] || {};
          const gender = s.gender || 'male';
          const dressItems = gender === 'female' ? FEMALE_ITEMS : MALE_ITEMS;
          const duties = dutiesMap[s.id] || [];
          const existing = existingAttendance[s.id];

          return (
            <div key={s.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-gray-900">{s.name}</p>
                  <p className="text-[10px] font-mono text-gray-400">{s.employeeId}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                  s.department === 'rehab' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  s.department === 'spims' ? 'bg-green-50 text-green-600 border-green-100' :
                  'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                  {s.department}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Status</label>
                  <select
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"
                    value={rec.status || 'present'}
                    onChange={e => updateRecord(s.id, 'status', e.target.value)}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
                {rec.status === 'present' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Arrival</label>
                      <input type="time"
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"
                        value={rec.arrivalTime || ''}
                        onChange={e => updateRecord(s.id, 'arrivalTime', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Departure</label>
                      <input type="time"
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"
                        value={rec.departureTime || ''}
                        onChange={e => updateRecord(s.id, 'departureTime', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {rec.status === 'present' && rec.arrivalTime && s.dutyStart && (() => {
                const [arrH, arrM] = rec.arrivalTime.split(':').map(Number);
                const [dutyH, dutyM] = s.dutyStart.split(':').map(Number);
                const isLate = (arrH * 60 + arrM) > (dutyH * 60 + dutyM + 15);
                return isLate ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest">
                    <XCircle size={12} /> Late — ₨200 fine
                  </span>
                ) : null;
              })()}

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dress Code</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rec.dressCode?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                      <span className="text-xs font-bold text-gray-700">{item.name}</span>
                      <div className="flex gap-1">
                        {DRESS_OPTIONS.map(opt => (
                          <button key={opt}
                            onClick={() => updateDressCode(s.id, idx, opt)}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                              item.status === opt
                                ? opt === 'wearing' ? 'bg-green-500 text-white' : opt === 'not_wearing' ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-700'
                                : 'bg-white text-gray-400 border border-gray-100'
                            }`}
                          >
                            {opt === 'na' ? 'N/A' : opt === 'wearing' ? '✓' : '✗'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {duties.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duties</p>
                  <div className="space-y-2">
                    {rec.dutyLogs?.map((log: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                        <span className="text-xs font-bold text-gray-700">{log.dutyName}</span>
                        <div className="flex gap-1">
                          {DUTY_OPTIONS.map(opt => (
                            <button key={opt}
                              onClick={() => updateDutyLog(s.id, idx, opt)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                log.status === opt
                                  ? opt === 'done' ? 'bg-green-500 text-white' : opt === 'not_done' ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-700'
                                  : 'bg-white text-gray-400 border border-gray-100'
                              }`}
                            >
                              {opt === 'na' ? 'N/A' : opt === 'done' ? 'Done' : 'Missed'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSaveAll}
        disabled={saving}
        className="w-full bg-gray-800 text-white py-5 rounded-2xl font-black shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
        Save All ({markedCount}/{staffList.length})
      </button>
    </div>
  );
}