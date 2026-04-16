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
      const depts: StaffDept[] = ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center'];
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
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
          <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em]">Synchronizing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-100">
                  <Calendar size={20} />
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Staff Attendance</h1>
              </div>
              <p className="text-gray-400 text-sm font-medium">Manage and monitor headquarter employee presence</p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100 shadow-sm">
              <button 
                onClick={() => changeDate(-1)}
                className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-6 flex flex-col items-center min-w-[200px]">
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest leading-none mb-1">Entry Date</span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-gray-900 focus:ring-0 p-0 text-center uppercase"
                />
              </div>
              <button 
                onClick={() => changeDate(1)}
                className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-teal-50/50 border border-teal-100/50 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-2xl font-black text-teal-700">{stats.present}</span>
              <span className="text-[10px] font-black text-teal-600/60 uppercase tracking-wider">Present</span>
            </div>
            <div className="bg-red-50/50 border border-red-100/50 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-2xl font-black text-red-700">{stats.absent}</span>
              <span className="text-[10px] font-black text-red-600/60 uppercase tracking-wider">Absent</span>
            </div>
            <div className="bg-gray-50/50 border border-gray-200/50 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-2xl font-black text-gray-600">{stats.unmarked}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Unmarked</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search employee by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-teal-50 outline-none transition-all placeholder:text-gray-300"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-white border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-teal-50 outline-none transition-all appearance-none min-w-[160px]"
            >
              <option value="all">All Depts</option>
              <option value="hq">HQ Administration</option>
              <option value="rehab">Rehab Center</option>
              <option value="spims">SPIMS College</option>
            </select>
            <button className="bg-white border-gray-100 rounded-2xl px-4 py-4 shadow-sm hover:bg-gray-50 transition-all text-gray-500">
              <FileSpreadsheet size={20} />
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <div className="table-responsive">

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Department</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStaff.map((s, idx) => {
                const att = attendance[s.id];
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-gray-500 font-black text-sm shadow-inner group-hover:scale-105 transition-transform">
                          {s.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-black text-gray-900 group-hover:text-teal-600 transition-colors">{s.name}</div>
                          <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">{s.employeeId || 'No ID'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 hidden md:table-cell">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200/50">
                        {s.department || 'General'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {!att ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                          <Clock size={10} /> Unmarked
                        </span>
                      ) : att.status === 'present' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-600 border border-teal-100">
                          <CheckCircle2 size={10} /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                          <XCircle size={10} /> Absent
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleAttendance(s.id, att?.status)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            att?.status === 'present' 
                              ? "bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600"
                              : "bg-teal-500 text-white shadow-lg shadow-teal-100 hover:bg-teal-600"
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
                      <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No staff found matching filters</p>
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
