'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, doc, updateDoc, addDoc, getDoc, Timestamp, orderBy, limit
} from 'firebase/firestore';
import {
  Users, Loader2, Sparkles, Check, X, Search, Award, ShieldAlert,
  Calendar, CheckCircle, Clock, AlertCircle, Trash, Plus, DollarSign,
  Shirt, Activity, Send, Mail, Phone, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MediaStaffManagement() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useMediaSession();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Selected Staff's details & logs
  const [activeTab, setActiveTab] = useState<'tasks' | 'fines' | 'compliance' | 'attendance'>('tasks');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [specialTasks, setSpecialTasks] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);

  // Action Form states
  const [taskForm, setTaskForm] = useState({ task: '', points: 10, date: new Date().toISOString().split('T')[0] });
  const [fineForm, setFineForm] = useState({ reason: '', amount: 500, date: new Date().toISOString().split('T')[0] });
  const [dressForm, setDressForm] = useState({ status: 'yes', points: 5, date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !['admin', 'manager', 'superadmin'].includes(user.role)) {
      router.push('/departments/social-media/login');
    }
  }, [sessionLoading, user, router]);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const staffSnap = await getDocs(
        query(collection(db, 'media_users'), where('role', '==', 'staff'))
      );
      const list = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaffList(list);

      // Select first staff by default if available and none selected
      if (list.length > 0 && !selectedStaff) {
        setSelectedStaff(list[0]);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }, [selectedStaff]);

  useEffect(() => {
    if (user) {
      loadStaff();
    }
  }, [user]);

  const loadStaffMetrics = useCallback(async (staffId: string) => {
    try {
      const [attSnap, dutySnap, dressSnap, taskSnap, fineSnap] = await Promise.all([
        getDocs(query(collection(db, 'media_attendance'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(15))),
        getDocs(query(collection(db, 'media_duty_logs'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(15))),
        getDocs(query(collection(db, 'media_dress_logs'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(15))),
        getDocs(query(collection(db, 'media_special_tasks'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(15))),
        getDocs(query(collection(db, 'media_fines'), where('staffId', '==', staffId), orderBy('date', 'desc'), limit(15)))
      ]);

      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDuties(dutySnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDressLogs(dressSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSpecialTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFines(fineSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching staff metrics:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      loadStaffMetrics(selectedStaff.id);
    }
  }, [selectedStaff, loadStaffMetrics]);

  // Create Special Task Action
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !taskForm.task.trim()) return;

    try {
      setActionLoading(true);
      const newTask = {
        staffId: selectedStaff.id,
        staffName: selectedStaff.displayName,
        task: taskForm.task,
        points: Number(taskForm.points),
        date: taskForm.date,
        status: 'pending',
        createdAt: Timestamp.now(),
        createdBy: user?.displayName || 'Admin'
      };

      await addDoc(collection(db, 'media_special_tasks'), newTask);
      toast.success('Special task assigned successfully!');
      setTaskForm({ task: '', points: 10, date: new Date().toISOString().split('T')[0] });
      loadStaffMetrics(selectedStaff.id);
    } catch (error: any) {
      toast.error('Failed to assign task: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Impose Fine Action
  const handleImposeFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !fineForm.reason.trim()) return;

    try {
      setActionLoading(true);
      const newFine = {
        staffId: selectedStaff.id,
        staffName: selectedStaff.displayName,
        reason: fineForm.reason,
        amount: Number(fineForm.amount),
        date: fineForm.date,
        createdAt: Timestamp.now(),
        createdBy: user?.displayName || 'Admin'
      };

      await addDoc(collection(db, 'media_fines'), newFine);
      toast.success('Fine imposed successfully!');
      setFineForm({ reason: '', amount: 500, date: new Date().toISOString().split('T')[0] });
      loadStaffMetrics(selectedStaff.id);
    } catch (error: any) {
      toast.error('Failed to impose fine: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Log Dress Compliance Action
  const handleLogDress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setActionLoading(true);
      const newLog = {
        staffId: selectedStaff.id,
        staffName: selectedStaff.displayName,
        status: dressForm.status,
        points: dressForm.status === 'yes' ? Number(dressForm.points) : 0,
        date: dressForm.date,
        createdAt: Timestamp.now(),
        createdBy: user?.displayName || 'Admin'
      };

      await addDoc(collection(db, 'media_dress_logs'), newLog);

      if (dressForm.status === 'yes') {
        // Increment growth points
        await updateDoc(doc(db, 'media_users', selectedStaff.id), {
          totalGrowthPoints: (selectedStaff.totalGrowthPoints || 0) + Number(dressForm.points)
        });
        setSelectedStaff((prev: any) => ({
          ...prev,
          totalGrowthPoints: (prev.totalGrowthPoints || 0) + Number(dressForm.points)
        }));
      }

      toast.success('Dress compliance logged successfully!');
      loadStaffMetrics(selectedStaff.id);
    } catch (error: any) {
      toast.error('Failed to log dress compliance: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter staff by search query
  const filteredStaff = staffList.filter(s =>
    (s.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Grid...</p>
        </div>
      </div>
    );
  }

  const glassStyle = "bg-white/70 dark:bg-black/20 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 shadow-sm";

  return (
    <div className="space-y-10">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
            Administrative Control Node
          </span>
          <h1 className="text-3xl md:text-5xl font-[1000] text-gray-900 dark:text-white tracking-tighter mt-4 uppercase">
            Staff <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">Management</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-semibold mt-2 leading-relaxed">
            Monitor attendance, evaluate dress compliance, assign special branding tasks, and impose fines.
          </p>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Staff List panel (Left 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 rounded-[2rem] ${glassStyle} space-y-6`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Staff Directories</h2>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase">
                {filteredStaff.length} Creators
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, role..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Staff list */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  No staff members found
                </div>
              ) : (
                filteredStaff.map((staff) => {
                  const isSelected = selectedStaff?.id === staff.id;
                  return (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10 scale-[1.02]'
                          : 'bg-slate-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 border border-white/10">
                          {staff.photoUrl ? (
                            <img src={staff.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-black uppercase text-slate-400">
                              {staff.displayName?.[0] || 'S'}
                            </div>
                          )}
                        </div>
                        <div className="truncate">
                          <p className={`text-xs font-black uppercase truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            {staff.displayName || 'Unknown Name'}
                          </p>
                          <p className={`text-[10px] truncate mt-0.5 font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {staff.designation || 'Content Specialist'}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 flex-shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500'
                      }`}>
                        <Award size={12} />
                        {staff.totalGrowthPoints || 0}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Selected Staff Core Center (Right 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedStaff ? (
            <div className="space-y-6">
              {/* Selected Staff Profile Header */}
              <div className={`p-8 rounded-[2rem] ${glassStyle} relative overflow-hidden flex flex-col md:flex-row items-center md:justify-between gap-6`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/5 to-cyan-500/5 rounded-full blur-3xl" />
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-left">
                  <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-slate-200 border-4 border-white dark:border-white/5 shadow-md flex-shrink-0">
                    {selectedStaff.photoUrl ? (
                      <img src={selectedStaff.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-black uppercase text-slate-400">
                        {selectedStaff.displayName?.[0] || 'S'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedStaff.displayName}</h2>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-wider mt-1">{selectedStaff.designation || 'Content Specialist'}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3 text-slate-400 text-xs">
                      <span className="flex items-center gap-1.5"><Mail size={14} /> {selectedStaff.email}</span>
                      <span className="flex items-center gap-1.5"><Phone size={14} /> {selectedStaff.phone || 'No phone'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                  <div className={`px-6 py-4 rounded-2xl ${glassStyle} text-center min-w-[100px]`}>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Growth points</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{selectedStaff.totalGrowthPoints || 0}</p>
                  </div>
                </div>
              </div>

              {/* Controls Tab switcher */}
              <div className={`p-2 rounded-2xl ${glassStyle} flex overflow-x-auto gap-1 no-scrollbar`}>
                {[
                  { id: 'tasks', label: 'Assign Duties', icon: <Plus size={14} /> },
                  { id: 'fines', label: 'Impose Fines', icon: <DollarSign size={14} /> },
                  { id: 'compliance', label: 'Dress Compliance', icon: <Shirt size={14} /> },
                  { id: 'attendance', label: 'Attendance Logs', icon: <Calendar size={14} /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Action Form & History panel */}
              <div className={`p-8 rounded-[2rem] ${glassStyle} min-h-[420px]`}>
                {activeTab === 'tasks' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase">Assign Branding Duty</h3>
                        <p className="text-xs text-slate-400 mt-1">Submit high priority campaign tasks for this staff member</p>
                      </div>
                    </div>

                    <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Task description</label>
                        <input
                          type="text"
                          required
                          value={taskForm.task}
                          onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                          placeholder="Create 3 high fidelity shorts for rebranding campaign..."
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Reward GP</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={taskForm.points}
                          onChange={(e) => setTaskForm({ ...taskForm, points: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="md:col-span-3 flex items-end">
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Assign
                        </button>
                      </div>
                    </form>

                    <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Assigned Tasks Log</h4>
                      {specialTasks.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold py-6 text-center">No assigned tasks found for this creator.</p>
                      ) : (
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {specialTasks.map((t) => (
                            <div key={t.id} className="p-4 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{t.task}</p>
                                <p className="text-[9px] text-slate-400 mt-1 uppercase font-black">{t.date} • Assigned by {t.createdBy || 'Admin'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                  t.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  {t.status}
                                </span>
                                <span className="text-[10px] font-black text-indigo-500">+{t.points} GP</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'fines' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase">Impose Fine / Deduction</h3>
                        <p className="text-xs text-slate-400 mt-1">Impose a penalty with a valid policy violation reason</p>
                      </div>
                    </div>

                    <form onSubmit={handleImposeFine} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Reason for Penalty</label>
                        <input
                          type="text"
                          required
                          value={fineForm.reason}
                          onChange={(e) => setFineForm({ ...fineForm, reason: e.target.value })}
                          placeholder="Unapproved late absence / Missed daily vlog assignment..."
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Amount (PKR)</label>
                        <input
                          type="number"
                          required
                          min="10"
                          value={fineForm.amount}
                          onChange={(e) => setFineForm({ ...fineForm, amount: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="md:col-span-3 flex items-end">
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                          Impose Fine
                        </button>
                      </div>
                    </form>

                    <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Deduction History</h4>
                      {fines.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold py-6 text-center">Perfect record! No fines or penalties recorded.</p>
                      ) : (
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {fines.map((f) => (
                            <div key={f.id} className="p-4 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">{f.reason}</p>
                                <p className="text-[9px] text-slate-400 mt-1 uppercase font-black">{f.date} • Logged by {f.createdBy || 'Admin'}</p>
                              </div>
                              <span className="text-[10px] font-black text-rose-500">- Rs. {f.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'compliance' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase">Daily Dress & Grooming Compliance</h3>
                        <p className="text-xs text-slate-400 mt-1">Check and record uniform / presentation policy alignment</p>
                      </div>
                    </div>

                    <form onSubmit={handleLogDress} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-5">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Status</label>
                        <select
                          value={dressForm.status}
                          onChange={(e) => setDressForm({ ...dressForm, status: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                        >
                          <option value="yes">Compliant (Add Growth Points)</option>
                          <option value="no">Non-Compliant (0 points awarded)</option>
                        </select>
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">GP Reward (if Compliant)</label>
                        <input
                          type="number"
                          disabled={dressForm.status === 'no'}
                          value={dressForm.status === 'yes' ? dressForm.points : 0}
                          onChange={(e) => setDressForm({ ...dressForm, points: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white disabled:opacity-50"
                        />
                      </div>
                      <div className="md:col-span-3 flex items-end">
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Shirt size={14} />}
                          Log Compliance
                        </button>
                      </div>
                    </form>

                    <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Compliance History Log</h4>
                      {dressLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold py-6 text-center">No daily compliance logs recorded yet.</p>
                      ) : (
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {dressLogs.map((d) => (
                            <div key={d.id} className="p-4 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${d.status === 'yes' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                  <Shirt size={14} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">
                                    {d.status === 'yes' ? 'Compliant' : 'Non-Compliant'}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-black">{d.date} • Evaluated by {d.createdBy || 'Admin'}</p>
                                </div>
                              </div>
                              {d.status === 'yes' && (
                                <span className="text-[10px] font-black text-indigo-500">+{d.points || 5} GP</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-white uppercase">Attendance Log Grid</h3>
                      <p className="text-xs text-slate-400 mt-1">Daily login and session statistics for the past 15 shifts</p>
                    </div>

                    {attendance.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold py-12 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                        No login history logs found for this staff member.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                        {attendance.map((log) => (
                          <div key={log.id} className="p-4 bg-slate-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-black text-gray-900 dark:text-white">{log.date}</p>
                              <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">
                                {log.arrivalTime || '--:--'} - {log.departureTime || '--:--'}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              log.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`p-16 rounded-[2.5rem] ${glassStyle} text-center flex flex-col items-center justify-center min-h-[500px]`}>
              <Users className="w-16 h-16 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-full mb-6 animate-pulse" />
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Select a Creator Profile</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                Click on any staff member from the left directory list to manage duties, compliance, fines, and logs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
