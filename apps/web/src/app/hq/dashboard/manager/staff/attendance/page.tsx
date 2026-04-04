// src/app/hq/dashboard/manager/staff/attendance/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { 
  Loader2, CheckCircle2, XCircle, Clock, 
  Save, Calendar, Users, Search, 
  Filter, CheckSquare, Square, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AttendanceMarkingPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  
  // Local state for changes
  const [records, setRecords] = useState<Record<string, { status: string; arrivalTime: string; departureTime: string }>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // App settings for Dark Mode
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hq_dark_mode');
    if (saved === 'true') setDarkMode(true);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'manager' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;

    const fetchStaffAndAttendance = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch Staff (Unified)
        const [hqStaffSnap, rehabStaffSnap] = await Promise.all([
          getDocs(query(collection(db, 'hq_staff'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'rehab_staff'), where('isActive', '==', true)))
        ]);

        const hqStaff = hqStaffSnap.docs.map(d => ({ 
          id: d.id, ...d.data(), _origin: 'hq', department: d.data().department || 'hq' 
        }));
        const rehabStaff = rehabStaffSnap.docs.map(d => ({ 
          id: d.id, ...d.data(), _origin: 'rehab', department: d.data().department || 'rehab' 
        }));

        const unified = [...hqStaff, ...rehabStaff].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(unified);

        // 2. Fetch Attendance (Unified)
        const [hqAttSnap, rehabAttSnap] = await Promise.all([
          getDocs(query(collection(db, 'hq_attendance'), where('date', '==', today))),
          getDocs(query(collection(db, 'rehab_attendance'), where('date', '==', today)))
        ]);

        const initialRecords: Record<string, any> = {};
        
        // Default all to "not_marked" or keep existing
        unified.forEach(s => {
          initialRecords[s.id] = { status: 'not_marked', arrivalTime: '', departureTime: '' };
        });

        hqAttSnap.docs.forEach(d => {
          const data = d.data();
          if (initialRecords[data.staffId]) {
            initialRecords[data.staffId] = {
              status: data.status,
              arrivalTime: data.arrivalTime || '',
              departureTime: data.departureTime || ''
            };
          }
        });

        rehabAttSnap.docs.forEach(d => {
          const data = d.data();
          if (initialRecords[data.staffId]) {
            initialRecords[data.staffId] = {
              status: data.status,
              arrivalTime: data.arrivalTime || '',
              departureTime: data.departureTime || ''
            };
          }
        });

        setRecords(initialRecords);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load staff data");
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndAttendance();
  }, [session]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || 
                           s.employeeId?.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === 'all' || s.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [staffList, search, deptFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStaff.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStaff.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const bulkMark = (status: string) => {
    if (selectedIds.size === 0) {
      toast.error("Select staff members first");
      return;
    }
    const next = { ...records };
    selectedIds.forEach(id => {
      const staff = staffList.find(s => s.id === id);
      next[id] = { 
        ...next[id], 
        status,
        arrivalTime: status === 'present' ? (staff?.dutyStartTime || '09:00') : ''
      };
    });
    setRecords(next);
    toast.success(`Marked ${selectedIds.size} staff as ${status}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const today = new Date().toISOString().split('T')[0];
      const now = Timestamp.now();

      // Only save modified or explicitly marked records
      for (const s of staffList) {
        const rec = records[s.id];
        if (rec.status === 'not_marked') continue;

        const collectionName = s._origin === 'hq' ? 'hq_attendance' : 'rehab_attendance';
        const docId = `${s.id}_${today}`;
        const docRef = doc(db, collectionName, docId);

        batch.set(docRef, {
          staffId: s.id,
          date: today,
          status: rec.status,
          arrivalTime: rec.arrivalTime || null,
          departureTime: rec.departureTime || null,
          markedBy: session?.customId || 'system',
          updatedAt: now,
          department: s.department
        }, { merge: true });
      }

      await batch.commit();
      toast.success("Attendance saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-teal-500' : 'text-gray-800'}`} />
      </div>
    );
  }

  const markedCount = Object.values(records).filter(r => r.status !== 'not_marked').length;

  return (
    <div className={`min-h-screen pb-24 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#F8FAFC] text-gray-900'}`}>
      {/* Premium Header */}
      <div className={`sticky top-0 z-20 border-b backdrop-blur-md ${darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-xl text-white ${darkMode ? 'bg-teal-600' : 'bg-gray-900'}`}>
                  <Calendar size={24} />
                </div>
                <h1 className="text-2xl font-black tracking-tight">Staff Attendance</h1>
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] ml-11">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center gap-4">
               <div className={`rounded-2xl p-3 flex items-center gap-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Marked</p>
                    <p className="text-lg font-black">{markedCount} / {staffList.length}</p>
                  </div>
                  <div className={`w-px h-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save All
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Bulk Controls */}
        <div className={`rounded-[2.5rem] p-6 mb-8 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex flex-col lg:flex-row gap-6 items-center">
             <div className="flex-1 w-full relative">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                <input 
                  type="text" 
                  placeholder="Search by Name or ID..."
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-none'
                  }`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
             </div>
             
             <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <select 
                  className={`flex-1 lg:flex-none rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'
                  }`}
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  <option value="rehab">Rehab</option>
                  <option value="spims">SPIMS</option>
                  <option value="hq">HQ / Admin</option>
                </select>

                <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 dark:bg-gray-800/50">
                   <button 
                     onClick={() => bulkMark('present')}
                     className="px-4 py-3 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                   >
                     Mark Present
                   </button>
                   <button 
                     onClick={() => bulkMark('absent')}
                     className="px-4 py-3 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                   >
                     Mark Absent
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Staff List */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between px-6 mb-2">
             <button 
               onClick={toggleSelectAll}
               className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-teal-500 transition-colors"
             >
               {selectedIds.size === filteredStaff.length && filteredStaff.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
               {selectedIds.size === filteredStaff.length ? 'Deselect All' : `Select All (${filteredStaff.length})`}
             </button>
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status & Timing</p>
          </div>

          {filteredStaff.map(s => {
            const rec = records[s.id];
            const isSelected = selectedIds.has(s.id);

            return (
              <div 
                key={s.id} 
                className={`group rounded-[2rem] p-4 border transition-all duration-300 flex flex-col md:flex-row md:items-center gap-4 ${
                  isSelected ? 'border-teal-500 bg-teal-50/10 dark:bg-teal-900/10' : 
                  darkMode ? 'bg-gray-900 border-gray-800 hover:border-gray-700' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                }`}
              >
                {/* Profile Info */}
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    onClick={() => toggleSelect(s.id)}
                    className={`transition-colors ${isSelected ? 'text-teal-500' : 'text-gray-300 dark:text-gray-600'}`}
                  >
                    {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                  </button>

                  <div className="relative">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} className="w-12 h-12 rounded-2xl object-cover" />
                    ) : (
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${
                        darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {s.name?.[0]}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                      rec.status === 'present' ? 'bg-green-500' : 
                      rec.status === 'absent' ? 'bg-red-500' : 
                      rec.status === 'leave' ? 'bg-amber-500' : 'bg-gray-300'
                    }`} />
                  </div>

                  <div>
                    <h3 className="font-black text-sm">{s.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.employeeId || 'NO-ID'}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight ${
                        s.department === 'rehab' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        s.department === 'spims' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {s.department}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl md:w-64">
                   {['present', 'absent', 'leave'].map(st => (
                     <button
                       key={st}
                       onClick={() => setRecords(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: st } }))}
                       className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                         rec.status === st
                           ? st === 'present' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 
                             st === 'absent' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 
                             'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                           : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                       }`}
                     >
                       {st}
                     </button>
                   ))}
                </div>

                {/* Timings */}
                <div className="flex items-center gap-2">
                   <div className="relative group/time">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="time" 
                        value={rec.arrivalTime}
                        onChange={e => setRecords(prev => ({ ...prev, [s.id]: { ...prev[s.id], arrivalTime: e.target.value } }))}
                        className={`pl-9 pr-3 py-2.5 rounded-xl text-[10px] font-bold outline-none border transition-all ${
                          darkMode ? 'bg-gray-800 border-gray-700 focus:border-teal-500' : 'bg-white border-gray-100 focus:border-teal-500'
                        }`}
                      />
                      <span className="absolute -top-4 left-2 text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-0 group-hover/time:opacity-100 transition-opacity">Arrival</span>
                   </div>
                   <div className="relative group/time">
                      <ChevronRight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="time" 
                        value={rec.departureTime}
                        onChange={e => setRecords(prev => ({ ...prev, [s.id]: { ...prev[s.id], departureTime: e.target.value } }))}
                        className={`pl-9 pr-3 py-2.5 rounded-xl text-[10px] font-bold outline-none border transition-all ${
                          darkMode ? 'bg-gray-800 border-gray-700 focus:border-teal-500' : 'bg-white border-gray-100 focus:border-teal-500'
                        }`}
                      />
                      <span className="absolute -top-4 left-2 text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-0 group-hover/time:opacity-100 transition-opacity">Departure</span>
                   </div>
                </div>
              </div>
            );
          })}

          {filteredStaff.length === 0 && (
            <div className={`rounded-[3rem] py-24 border-2 border-dashed flex flex-col items-center justify-center text-center ${
              darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
            }`}>
              <Users className="text-gray-300 dark:text-gray-700 mb-4" size={48} />
              <h3 className="text-lg font-black">No Staff Found</h3>
              <p className="text-gray-400 text-sm mt-1">Try a different search or department filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 lg:left-64 z-30 transition-transform ${markedCount > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
         <div className={`max-w-4xl mx-auto rounded-[2rem] p-4 flex items-center justify-between border shadow-2xl ${
           darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
         }`}>
            <div className="px-4">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marked Progress</p>
               <p className="font-black text-teal-500">{markedCount} of {staffList.length} staff members</p>
            </div>
            <button 
               onClick={handleSave}
               disabled={saving}
               className="bg-gray-900 dark:bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
            >
               {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
               Commit Changes
            </button>
         </div>
      </div>
    </div>
  );
}