// src/app/hq/dashboard/manager/attendance/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, getDocs, query, where, doc, setDoc, Timestamp, orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { 
  Loader2, Calendar, Users, Search, CheckCircle2, XCircle, 
  Clock, Filter, ChevronLeft, ChevronRight, UserPlus, FileSpreadsheet
} from 'lucide-react';
import { toDate, cn } from '@/lib/utils';
import { getDeptCollection, getDeptPrefix, type StaffDept } from '@/lib/hq/superadmin/staff';

export default function ManagerAttendancePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [staff, setStaff] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [stats, setStats] = useState({ present: 0, absent: 0, unmarked: 0 });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'manager') return;
    fetchData();
  }, [session, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'];
      const targetDepts = deptFilter === 'all' ? depts : [deptFilter as StaffDept];
      
      // 1. Fetch staff from target departments
      const staffPromises = targetDepts.map(async (d) => {
        const col = getDeptCollection(d);
        const snap = await getDocs(query(collection(db, col), where('isActive', '==', true))).catch(() => ({ docs: [] } as any));
        return snap.docs.map((docSnap: any) => ({ 
          id: docSnap.id, 
          department: d,
          ...docSnap.data() 
        }));
      });
      
      const results = await Promise.all(staffPromises);
      const STAFF_ROLES = ['admin', 'staff', 'cashier', 'manager', 'superadmin', 'doctor', 'nurse', 'counselor'];
      
      const staffList = results.flat().filter(s => {
        const role = String(s.role || '').toLowerCase();
        return STAFF_ROLES.includes(role);
      });
      
      setStaff(staffList);

      // 2. Fetch attendance for selected date across target departments
      const attendancePromises = targetDepts.map(async (d) => {
        const col = `${getDeptPrefix(d)}_attendance`;
        const snap = await getDocs(query(collection(db, col), where('date', '==', selectedDate))).catch(() => ({ docs: [] } as any));
        return snap.docs.map((docSnap: any) => ({ 
          id: docSnap.id, 
          ...docSnap.data() 
        }));
      });
      
      const attendanceResults = await Promise.all(attendancePromises);
      const attendanceList = attendanceResults.flat();
      
      const attendanceMap: Record<string, any> = {};
      attendanceList.forEach(item => {
        attendanceMap[item.staffId] = item;
      });
      setAttendance(attendanceMap);

      // 3. Calculate stats
      let p = 0, a = 0;
      staffList.forEach(s => {
        if (attendanceMap[s.id]?.status === 'present') p++;
        else if (attendanceMap[s.id]?.status === 'absent') a++;
      });
      setStats({ present: p, absent: a, unmarked: staffList.length - (p + a) });

    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (staffId: string, currentStatus: string | undefined) => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return;
    
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    const attendanceId = `${selectedDate}_${staffId}`;
    const deptPrefix = getDeptPrefix(staffMember.department as StaffDept);
    
    try {
      await setDoc(doc(db, `${deptPrefix}_attendance`, attendanceId), {
        staffId,
        date: selectedDate,
        status: newStatus,
        markedBy: session?.uid,
        markedByName: session?.displayName || session?.name || 'Manager',
        updatedAt: Timestamp.now()
      }, { merge: true });

      // Update local state for instant feedback
      setAttendance(prev => ({
        ...prev,
        [staffId]: { status: newStatus }
      }));

      // Re-calculate stats locally
      setStats(prev => {
        const wasPresent = currentStatus === 'present';
        const wasAbsent = currentStatus === 'absent';
        
        return {
          present: newStatus === 'present' ? prev.present + 1 : (wasPresent ? prev.present - 1 : prev.present),
          absent: newStatus === 'absent' ? prev.absent + 1 : (wasAbsent ? prev.absent - 1 : prev.absent),
          unmarked: currentStatus === undefined ? prev.unmarked - 1 : prev.unmarked
        };
      });

    } catch (err) {
      console.error('Error updating attendance:', err);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'all' || s.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  if (sessionLoading || (loading && staff.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-black" />
          <p className="text-black text-[10px] font-black uppercase tracking-[0.3em]">Calibrating</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] pb-32 text-black">
      {/* Header Section */}
      <div className="bg-white border-b-4 border-black sticky top-0 z-30 px-4 md:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-2xl">
                  <Calendar size={24} />
                </div>
                <h1 className="text-3xl font-black text-black tracking-tight uppercase">Attendance Register</h1>
              </div>
              <p className="text-black text-xs font-black uppercase tracking-[0.2em] opacity-40">Administrative Personnel Oversight</p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center bg-black/5 rounded-3xl p-1.5 border-2 border-black/10 transition-all hover:border-black">
              <button 
                onClick={() => changeDate(-1)}
                className="p-4 hover:bg-black hover:text-white rounded-2xl transition-all text-black active:scale-90"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="px-8 flex flex-col items-center min-w-[220px]">
                <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] opacity-40 mb-1">Operational Date</span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-black text-black focus:ring-0 p-0 text-center uppercase tracking-widest cursor-pointer"
                />
              </div>
              <button 
                onClick={() => changeDate(1)}
                className="p-4 hover:bg-black hover:text-white rounded-2xl transition-all text-black active:scale-90"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-6 mt-10">
            <div className="bg-white border-2 border-black rounded-[2rem] p-6 flex flex-col items-center shadow-xl shadow-black/5">
              <span className="text-3xl font-black text-black">{stats.present}</span>
              <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] mt-1">Confirmed Present</span>
            </div>
            <div className="bg-white border-2 border-black rounded-[2rem] p-6 flex flex-col items-center shadow-xl shadow-black/5">
              <span className="text-3xl font-black text-black">{stats.absent}</span>
              <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] mt-1">Noted Absent</span>
            </div>
            <div className="bg-black border-2 border-black rounded-[2rem] p-6 flex flex-col items-center shadow-2xl shadow-black/20">
              <span className="text-3xl font-black text-white">{stats.unmarked}</span>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] mt-1">Pending Entry</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-black w-5 h-5 transition-transform group-focus-within:scale-110" />
            <input 
              type="text" 
              placeholder="Query operative by identity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-black/10 rounded-2xl pl-16 pr-6 py-5 text-sm font-black shadow-xl shadow-black/5 focus:border-black outline-none transition-all placeholder:text-black/30 placeholder:uppercase placeholder:tracking-widest"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-white border-2 border-black/10 rounded-2xl px-8 py-5 text-sm font-black shadow-xl shadow-black/5 focus:border-black outline-none transition-all appearance-none min-w-[200px] uppercase tracking-widest cursor-pointer"
            >
              <option value="all">Global Fleet</option>
              <option value="hq">HQ Admin</option>
              <option value="rehab">Rehab Fleet</option>
              <option value="spims">SPIMS Fleet</option>
            </select>
            <button className="bg-black text-white border-2 border-black rounded-2xl px-6 py-5 shadow-2xl hover:bg-white hover:text-black transition-all active:scale-95">
              <FileSpreadsheet size={24} />
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <div className="table-responsive">

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-widest">Employee</th>
                <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-widest hidden md:table-cell">Department</th>
                <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStaff.map((s, idx) => {
                const att = attendance[s.id];
                return (
                  <tr key={s.id} className="hover:bg-white/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-black font-black text-sm shadow-inner group-hover:scale-105 transition-transform">
                          {s.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-black text-gray-900 group-hover:text-teal-600 transition-colors">{s.name}</div>
                          <div className="text-[10px] font-mono text-black font-bold uppercase tracking-wider">{s.employeeId || 'No ID'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 hidden md:table-cell">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-black border border-gray-200/50">
                        {s.department || 'General'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {!att ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] bg-black/5 text-black border border-black/10">
                          <Clock size={10} /> Pending
                        </span>
                      ) : att.status === 'present' ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] bg-black text-white border border-black shadow-lg shadow-black/10">
                          <CheckCircle2 size={10} /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] bg-white text-black border-2 border-black">
                          <XCircle size={10} /> Absentee
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => toggleAttendance(s.id, att?.status)}
                          className={cn(
                            "px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border-2",
                            att?.status === 'present' 
                              ? "bg-white text-black border-black hover:bg-black hover:text-white"
                              : "bg-black text-white border-black hover:bg-white hover:text-black shadow-xl shadow-black/10"
                          )}
                        >
                          {att?.status === 'present' ? 'Mark Absent' : 'Mark Present'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-12 h-12 text-gray-100" />
                      <p className="text-black font-bold text-sm uppercase tracking-widest">No staff found matching filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
              </div>
        </div>
      </div>
    </div>
  );
}
