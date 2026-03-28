'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { overrideAttendance } from '@/lib/rehab/attendance';
import { createStaffMemberServer } from '../../../actions/createRehabUser';
import EyePasswordInput from '@/components/rehab/EyePasswordInput';
import type { StaffMember, AttendanceRecord, StaffDuty } from '@/types/rehab';
import {
  UserCog, Plus, X, CheckCircle, XCircle, Clock,
  Phone, Calendar, BadgeCheck, Loader2, AlertCircle,
  ChevronRight, List, Camera
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

export default function AdminStaffPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useRehabSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [dutyInput, setDutyInput] = useState('');
  const [form, setForm] = useState({
    name: '',
    gender: 'male' as 'male' | 'female' | 'other',
    customId: 'REHAB-STF-001',
    password: '',
    staffRole: '',
    phone: '',
    salary: '',
    duties: [] as StaffDuty[],
  });
  const [dutyStartTime, setDutyStartTime] = useState('08:00');
  const [dutyEndTime, setDutyEndTime] = useState('17:00');

  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const staffSnap = await getDocs(collection(db, 'rehab_staff'));
      const staffList = staffSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        joiningDate: doc.data().joiningDate?.toDate?.() || new Date(),
        duties: doc.data().duties || [],
      } as StaffMember));
      setStaff(staffList.filter(s => s.isActive));

      const today = new Date().toISOString().split('T')[0];
      const attendanceSnap = await getDocs(collection(db, 'rehab_attendance'));
      const attendanceMap: Record<string, AttendanceRecord> = {};
      attendanceSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.date === today) {
          attendanceMap[data.staffId] = {
            id: doc.id,
            ...data,
            checkInTime: data.checkInTime?.toDate?.(),
            checkOutTime: data.checkOutTime?.toDate?.(),
          } as AttendanceRecord;
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
    } catch {
      alert('Error overriding attendance');
    }
  };

  const handleBulkAttendance = async () => {
    if (!user || selectedStaffIds.length === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedStaffIds.map(sid => overrideAttendance(sid, bulkDate, 'present', user.uid))
      );
      setMessage({ type: 'success', text: `Attendance marked for ${selectedStaffIds.length} staff members!` });
      setShowBulkModal(false);
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Failed to mark bulk attendance' });
    }
    setBulkLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const addDuty = () => {
    const trimmed = dutyInput.trim();
    if (!trimmed) return;
    const newDuty: StaffDuty = { id: Date.now().toString(), description: trimmed };
    setForm(f => ({ ...f, duties: [...f.duties, newDuty] }));
    setDutyInput('');
  };

  const removeDuty = (id: string) => {
    setForm(f => ({ ...f, duties: f.duties.filter(d => d.id !== id) }));
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.customId || !form.password || !form.staffRole) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }
    setFormLoading(true);

    let photoUrl = undefined;
    if (photoFile) {
      try {
        photoUrl = await uploadToCloudinary(photoFile, 'khanhub/rehab/staff');
      } catch (err) {
        console.error("Staff photo upload failed", err);
      }
    }

    const res = await createStaffMemberServer(
      form.customId,
      form.password,
      form.name,
      form.staffRole,
      form.phone || undefined,
      form.salary ? Number(form.salary) : undefined,
      form.gender,
      form.duties,
      dutyStartTime,
      dutyEndTime,
      photoUrl
    );
    if (res.success) {
      setMessage({ type: 'success', text: `Staff member "${form.name}" created successfully!` });
      setShowModal(false);
      setForm({ name: '', gender: 'male', customId: 'REHAB-STF-001', password: '', staffRole: '', phone: '', salary: '', duties: [] });
      setDutyStartTime('08:00');
      setDutyEndTime('17:00');
      setPhotoFile(null);
      setPhotoPreview('');
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create staff member' });
    }
    setFormLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const todayPresent = Object.values(attendance).filter(a => a.status === 'present').length;
  const todayAbsent  = Object.values(attendance).filter(a => a.status === 'absent').length;
  const notMarked    = staff.length - Object.keys(attendance).length;

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-gray-100 rounded-2xl w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="h-96 bg-gray-100 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
              <UserCog size={20} className="text-teal-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Operations</h1>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest ml-1">
            Attendance & Roster — {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              setSelectedStaffIds(staff.map(s => s.id));
              setShowBulkModal(true);
            }}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-black transition-all hover:scale-105 shadow-lg shadow-gray-200"
          >
            <CheckCircle size={16} />
            Bulk Attendance
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-teal-500 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-teal-600 transition-all hover:scale-105 shadow-lg shadow-teal-200"
          >
            <Plus size={16} />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl font-semibold text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Today Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-green-600">{todayPresent}</p>
          <p className="text-xs font-bold text-green-500 uppercase tracking-wide mt-1">Present</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-red-500">{todayAbsent}</p>
          <p className="text-xs font-bold text-red-400 uppercase tracking-wide mt-1">Absent</p>
        </div>
        <div className="bg-gray-100 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-gray-500">{notMarked}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Unmarked</p>
        </div>
      </div>

      {/* Staff Table */}
      {staff.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
          <UserCog size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold">No staff members yet.</p>
          <p className="text-gray-300 text-sm mt-1">Click "Add Staff Member" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile View: Cards */}
          <div className="lg:hidden space-y-4">
            {staff.map((s) => {
              const record = attendance[s.id];
              return (
                <div key={s.id} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm space-y-4 transition-all active:scale-[0.99]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner flex-shrink-0">
                        {s.photoUrl 
                          ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                          : <span className="text-gray-400 font-black text-xs">{s.name.charAt(0)}</span>
                        }
                      </div>
                      <div>
                        <p className="font-black text-gray-900 leading-tight uppercase text-sm">{s.name}</p>
                        <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mt-0.5">{s.role}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                       {record ? (
                         <span className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                           record.status === 'present' ? 'bg-green-50 text-green-600 border-green-100' :
                           record.status === 'absent'  ? 'bg-red-50 text-red-500 border-red-100'    : 'bg-blue-50 text-blue-600 border-blue-100'
                         }`}>
                           <div className={`w-1 h-1 rounded-full ${record.status === 'present' ? 'bg-green-500' : record.status === 'absent' ? 'bg-red-500' : 'bg-blue-500'}`} />
                           {record.status}
                         </span>
                       ) : (
                         <span className="px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-50 text-gray-300 border border-gray-100">Unmarked</span>
                       )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Check-in</p>
                      <p className="text-xs font-black text-gray-700">
                        {record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Check-out</p>
                      <p className="text-xs font-black text-gray-700">
                        {record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex gap-1.5 flex-1">
                      <button onClick={() => handleOverride(s.id, 'present')} className="flex-1 py-3 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-green-600 hover:text-white">P</button>
                      <button onClick={() => handleOverride(s.id, 'absent')} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-red-500 hover:text-white">A</button>
                      <button onClick={() => handleOverride(s.id, 'leave')} className="flex-1 py-3 bg-blue-50 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-blue-500 hover:text-white">L</button>
                    </div>
                    <button 
                      onClick={() => router.push(`/departments/rehab/dashboard/admin/staff/${s.id}`)}
                      className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-gray-200"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden lg:block bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[680px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff Member</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Today</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-in / Out</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Override / View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staff.map((s) => {
                    const record = attendance[s.id];
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden border border-gray-100 shadow-sm flex-shrink-0">
                              {s.photoUrl
                                ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-sm">{s.name.charAt(0)}</div>
                              }
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 capitalize">{s.gender}</span>
                                {s.phone && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Phone size={9} /> {s.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg uppercase tracking-widest block w-fit">
                              {s.role}
                            </span>
                            {s.duties?.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <List size={9} /> {s.duties.length} duties
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {record ? (
                            <div className="flex items-center gap-2">
                              <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full ${
                                record.status === 'present' ? 'bg-green-100 text-green-600' :
                                record.status === 'absent'  ? 'bg-red-100 text-red-500'    : 'bg-blue-100 text-blue-600'
                              }`}>
                                {record.status === 'present' ? <CheckCircle size={10} /> : record.status === 'absent' ? <XCircle size={10} /> : <Clock size={10} />}
                                {record.status}
                              </span>
                              {record.overriddenBy && (
                                <span className="text-[9px] text-orange-400 font-bold uppercase flex items-center gap-0.5">
                                  <BadgeCheck size={9} /> Override
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-400">Not Marked</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          {record?.checkInTime || record?.checkOutTime ? (
                            <div className="space-y-0.5">
                              {record.checkInTime && (
                                <p className="text-[10px] text-gray-500 font-bold">
                                  In: {new Date(record.checkInTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                              {record.checkOutTime && (
                                <p className="text-[10px] text-gray-400 font-bold">
                                  Out: {new Date(record.checkOutTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <button onClick={() => handleOverride(s.id, 'present')} title="Present" className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-500 hover:text-white transition-all text-xs font-black">P</button>
                            <button onClick={() => handleOverride(s.id, 'absent')}  title="Absent"  className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xs font-black">A</button>
                            <button onClick={() => handleOverride(s.id, 'leave')}   title="Leave"   className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all text-xs font-black">L</button>
                            <button
                              onClick={() => router.push(`/departments/rehab/dashboard/admin/staff/${s.id}`)}
                              title="View Profile"
                              className="w-8 h-8 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-800 hover:text-white transition-all"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900">Add Staff Member</h2>
                <p className="text-gray-400 text-xs mt-0.5">Creates login + roster entry</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name *</label>
                <input required placeholder="e.g. Muhammad Ali" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              {/* Gender + Role */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gender *</label>
                  <select required className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as any })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dept. Role *</label>
                  <select required className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={form.staffRole} onChange={e => setForm({ ...form, staffRole: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="Counselor">Counselor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Security">Security</option>
                    <option value="Cook">Cook</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Driver">Driver</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Login ID + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Login ID *</label>
                  <input required className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={form.customId} onChange={e => setForm({ ...form, customId: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password *</label>
                  <EyePasswordInput 
                    required 
                    placeholder="Min 6 chars" 
                    className="bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none shadow-none" 
                    value={form.password} 
                    onChange={e => setForm({ ...form, password: e.target.value })} 
                  />
                </div>
              </div>

              {/* Phone + Salary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                  <input placeholder="03XX-XXXXXXX" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Salary (PKR)</label>
                  <input type="number" placeholder="e.g. 25000" className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
                </div>
              </div>

              {/* Duty Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duty Start Time *</label>
                  <input type="time" required className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={dutyStartTime} onChange={e => setDutyStartTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duty End Time *</label>
                  <input type="time" required className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" value={dutyEndTime} onChange={e => setDutyEndTime(e.target.value)} />
                </div>
              </div>

              {/* Duties */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Duties</label>
                <div className="flex gap-2">
                  <input
                    placeholder="e.g. Clean all rooms before 8am"
                    className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none"
                    value={dutyInput}
                    onChange={e => setDutyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDuty(); }}}
                  />
                  <button type="button" onClick={addDuty} className="px-4 py-3 bg-teal-50 text-teal-600 rounded-xl font-black text-sm hover:bg-teal-500 hover:text-white transition-all">
                    <Plus size={16} />
                  </button>
                </div>
                {form.duties.length > 0 && (
                  <ul className="space-y-2 mt-2">
                    {form.duties.map((d, i) => (
                      <li key={d.id} className="flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                        <span className="text-teal-400 font-black text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <span className="text-gray-700 text-sm flex-1 leading-snug">{d.description}</span>
                        <button type="button" onClick={() => removeDuty(d.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-[10px] text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                Staff logs in at <span className="font-mono font-bold">/departments/rehab/login</span> using their ID + password.
              </p>

              <button type="submit" disabled={formLoading} className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-teal-600 transition-all disabled:opacity-50">
                {formLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {formLoading ? 'Creating...' : 'Create Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Attendance Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">Bulk Attendance</h2>
                <p className="text-gray-400 text-xs mt-0.5">Quickly mark multiple staff as present</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance Date</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-teal-300 text-sm border-none" 
                  value={bulkDate}
                  onChange={e => setBulkDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Staff ({selectedStaffIds.length})</label>
                  <button 
                    onClick={() => setSelectedStaffIds(selectedStaffIds.length === staff.length ? [] : staff.map(s => s.id))}
                    className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline"
                  >
                    {selectedStaffIds.length === staff.length ? 'Unselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {staff.map(s => (
                    <label key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 uppercase">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700">{s.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.role}</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg border-gray-200 text-teal-500 focus:ring-teal-300 cursor-pointer"
                        checked={selectedStaffIds.includes(s.id)}
                        onChange={() => {
                          setSelectedStaffIds(prev => 
                            prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id]
                          );
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleBulkAttendance}
                disabled={bulkLoading || selectedStaffIds.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-teal-600 transition-all disabled:opacity-50 shadow-lg shadow-teal-200 disabled:shadow-none"
              >
                {bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {bulkLoading ? 'Processing...' : `Mark ${selectedStaffIds.length} Staff as Present`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

