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
  }, [session, selectedDate, deptFilter]);

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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-500 text-xs font-semibold">Loading Attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 text-gray-900 font-sans">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 py-6 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm">
                  <Calendar size={20} />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Attendance Register</h1>
              </div>
              <p className="text-gray-500 text-xs font-medium">Daily attendance records & operational oversight</p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100 transition-all hover:border-gray-200">
              <button 
                onClick={() => changeDate(-1)}
                className="p-3 hover:bg-white hover:shadow-sm hover:text-gray-900 rounded-xl transition-all text-gray-600 active:scale-90"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-5 flex flex-col items-center min-w-[160px]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Selected Date</span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-gray-800 focus:ring-0 p-0 text-center cursor-pointer outline-none"
                />
              </div>
              <button 
                onClick={() => changeDate(1)}
                className="p-3 hover:bg-white hover:shadow-sm hover:text-gray-900 rounded-xl transition-all text-gray-600 active:scale-90"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-6 mt-6">
            <div className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-300">
              <span className="text-2xl md:text-3xl font-bold text-emerald-600 leading-none mb-1">{stats.present}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Present</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-300">
              <span className="text-2xl md:text-3xl font-bold text-rose-600 leading-none mb-1">{stats.absent}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Absent</span>
            </div>
            <div className="bg-white border border-indigo-50 rounded-3xl p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-300">
              <span className="text-2xl md:text-3xl font-bold text-indigo-600 leading-none mb-1">{stats.unmarked}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unmarked</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-indigo-600" />
            <input 
              type="text" 
              placeholder="Search by name or Employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-gray-300"
            />
          </div>
          <div className="flex gap-3">
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-white border border-gray-100 rounded-2xl px-5 py-3 text-xs font-bold shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer min-w-[160px]"
            >
              <option value="all">Global Fleet</option>
              <option value="hq">HQ Admin</option>
              <option value="rehab">Rehab Center</option>
              <option value="spims">SPIMS Academy</option>
              <option value="hospital">Khan Hospital</option>
              <option value="sukoon">Sukoon Center</option>
              <option value="welfare">Khan Welfare</option>
              <option value="job-center">Job Center</option>
              <option value="social-media">Social Media</option>
              <option value="it">IT Department</option>
            </select>
            <button className="bg-gray-900 text-white hover:bg-black border border-gray-800 rounded-2xl px-4 py-3 shadow-sm transition-all active:scale-95 flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
          <div className="table-responsive">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStaff.map((s, idx) => {
                  const att = attendance[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xs group-hover:scale-105 transition-transform">
                            {s.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{s.name}</div>
                            <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">{s.employeeId || 'No ID'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-100">
                          {s.department || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!att ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-100">
                            <Clock size={12} /> Unmarked
                          </span>
                        ) : att.status === 'present' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 size={12} /> Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100">
                            <XCircle size={12} /> Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => toggleAttendance(s.id, att?.status)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border",
                              att?.status === 'present' 
                                ? "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm"
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
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-gray-200 mb-1" />
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">No staff found matching filters</p>
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
