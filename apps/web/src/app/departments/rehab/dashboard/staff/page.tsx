'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMonthlyAttendance } from '@/lib/rehab/attendance';
import AttendanceMarker from '@/components/rehab/AttendanceMarker';
import type { StaffMember, AttendanceRecord, RehabUser } from '@/types/rehab';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<RehabUser | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const raw = localStorage.getItem('rehab_session');
      if (!raw) return;
      const user = JSON.parse(raw) as RehabUser;
      setSession(user);

      if (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'superadmin') {
        router.push('/departments/rehab/login');
        return;
      }

      try {
        // Fetch staff profile from rehab_staff (using customId or uid as link)
        const snap = await getDoc(doc(db, 'rehab_staff', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setStaff({ 
            id: snap.id, 
            ...data, 
            joiningDate: data.joiningDate.toDate() 
          } as StaffMember);
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const attData = await getMonthlyAttendance(user.uid, currentMonth);
        setAttendance(attData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) return <div className="space-y-8 animate-pulse"><div className="h-48 bg-gray-100 rounded-3xl" /><div className="h-96 bg-gray-100 rounded-3xl" /></div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Portal</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Attendance & Profile</p>
        </div>
        {staff && (
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${staff.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {staff.isActive ? 'Active Duty' : 'Inactive'}
          </div>
        )}
      </div>

      {staff && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-10">
          <div className="w-32 h-32 rounded-3xl bg-gray-50 overflow-hidden border-4 border-gray-50 shadow-inner">
            {staff.photoUrl ? (
              <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-4xl uppercase">
                {staff.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 mb-1">{staff.name}</h2>
            <p className="text-[#1D9E75] font-black uppercase text-xs tracking-widest mb-4">{staff.role}</p>
            <div className="grid grid-cols-2 gap-8 max-w-sm">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joining Date</p>
                    <p className="text-sm font-bold text-gray-700">{staff.joiningDate.toLocaleDateString()}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System ID</p>
                    <p className="text-sm font-bold text-gray-700">{session?.customId}</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {session && <AttendanceMarker staffId={session.uid} />}

      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-sm font-bold text-blue-500">🗓</span>
          Monthly Attendance Log
        </h2>
        
        <div className="grid grid-cols-7 gap-3">
          {/* Simple visualization of days */}
          {Array.from({ length: 31 }, (_, i) => {
            const day = (i + 1).toString().padStart(2, '0');
            const dateStr = `${new Date().toISOString().slice(0, 8)}${day}`;
            const record = attendance.find(a => a.date === dateStr);
            
            return (
              <div key={i} className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                record?.status === 'present' ? 'bg-green-50 border-green-100 shadow-sm shadow-green-100' :
                record?.status === 'absent' ? 'bg-red-50 border-red-100' :
                record?.status === 'leave' ? 'bg-blue-50 border-blue-100' :
                'bg-gray-50 border-gray-100'
              }`}>
                <span className="text-[10px] font-black text-gray-400">{i + 1}</span>
                {record && (
                  <div className={`w-3 h-3 rounded-full ${
                    record.status === 'present' ? 'bg-green-500 shadow-lg shadow-green-500/50' :
                    record.status === 'absent' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                )}
                {record?.checkInTime && (
                  <span className="text-[9px] font-bold text-gray-500">{new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
