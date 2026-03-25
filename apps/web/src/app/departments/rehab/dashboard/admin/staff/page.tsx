'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { overrideAttendance } from '@/lib/rehab/attendance';
import type { StaffMember, AttendanceRecord } from '@/types/rehab';

export default function AdminStaffPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRehabSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const staffSnap = await getDocs(collection(db, 'rehab_staff'));
      const staffList = staffSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        joiningDate: doc.data().joiningDate.toDate() 
      } as StaffMember));
      setStaff(staffList);

      const today = new Date().toISOString().split('T')[0];
      const attendanceSnap = await getDocs(collection(db, 'rehab_attendance'));
      const attendanceMap: Record<string, AttendanceRecord> = {};
      attendanceSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.date === today) {
          attendanceMap[data.staffId] = { id: doc.id, ...data } as AttendanceRecord;
        }
      });
      setAttendance(attendanceMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }
    fetchData();
  }, [router, user, sessionLoading]);

  const handleOverride = async (staffId: string, status: 'present' | 'absent' | 'leave') => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      await overrideAttendance(staffId, today, status, user.uid);
      fetchData();
    } catch (err) {
      alert('Error overriding attendance');
    }
  };

  if (sessionLoading || loading) return <div className="space-y-8 animate-pulse"><div className="h-16 bg-gray-100 rounded-2xl" /><div className="h-96 bg-gray-100 rounded-3xl" /></div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Staff Operations</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Attendance & Roster Management</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Staff Member</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Role</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Today's Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff.map((s) => {
              const record = attendance[s.id];
              return (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 shadow-sm">
                        {s.photoUrl ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold uppercase text-sm">{s.name.charAt(0)}</div>}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 leading-tight">{s.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Joined {s.joiningDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-[#1D9E75] bg-[#1D9E75]/10 px-3 py-1.5 rounded-lg uppercase tracking-widest">{s.role}</span>
                  </td>
                  <td className="px-8 py-6">
                    {record ? (
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full ${
                        record.status === 'present' ? 'bg-green-100 text-green-600' :
                        record.status === 'absent' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {record.status} {record.overriddenBy && '• OVERRIDDEN'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-400">Not Marked</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOverride(s.id, 'present')} className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all text-xs font-black shadow-sm">P</button>
                      <button onClick={() => handleOverride(s.id, 'absent')} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all text-xs font-black shadow-sm">A</button>
                      <button onClick={() => handleOverride(s.id, 'leave')} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-xs font-black shadow-sm">L</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
