'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp
} from 'firebase/firestore';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Plus, Trash2, Video,
  Image as ImageIcon, Upload, Sparkles, TrendingUp, Filter, ChevronLeft, ChevronRight,
  Loader2, User, Layers, CheckSquare, BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface MediaCalendarTask {
  id: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  type: 'video_create' | 'video_upload' | 'graphic_create' | 'graphic_upload' | 'custom';
  assignedRole: 'editor' | 'designer' | 'all';
  assignedStaffId?: string;
  assignedStaffName?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  note?: string;
  createdAt: string;
}

const TASK_PRESETS = [
  { type: 'video_create', label: 'Create Video', role: 'editor', icon: Video, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { type: 'video_upload', label: 'Upload Video', role: 'editor', icon: Upload, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  { type: 'graphic_create', label: 'Create Graphic Post', role: 'designer', icon: ImageIcon, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { type: 'graphic_upload', label: 'Upload Graphic Post', role: 'designer', icon: Upload, color: 'bg-pink-50 text-pink-600 border-pink-200' },
] as const;

export default function SocialMediaCalendarPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useMediaSession();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MediaCalendarTask[]>([]);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10)); // 'YYYY-MM-DD'

  // Task Creation Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<MediaCalendarTask['type']>('video_create');
  const [newTaskRole, setNewTaskRole] = useState<'editor' | 'designer' | 'all'>('editor');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.push('/departments/social-media/login');
    }
  }, [sessionLoading, user, router]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'media_calendar_tasks'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MediaCalendarTask));
      setTasks(list);
    } catch (err) {
      console.error('Error loading media calendar tasks:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  // Calendar Helpers
  const currentYearMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return { year: y || new Date().getFullYear(), month: (m || 1) - 1 };
  }, [selectedMonth]);

  const daysInSelectedMonth = useMemo(() => {
    const { year, month } = currentYearMonth;
    const date = new Date(year, month, 1);
    const days: string[] = [];
    while (date.getMonth() === month) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentYearMonth]);

  const calendarGridCells = useMemo(() => {
    const { year, month } = currentYearMonth;
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0
    const cells: (string | null)[] = [];
    for (let i = 0; i < adjustedFirstDay; i++) cells.push(null);
    daysInSelectedMonth.forEach((d) => cells.push(d));
    return cells;
  }, [currentYearMonth, daysInSelectedMonth]);

  // Week Days Helper for Weekly View
  const selectedWeekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMon);

    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      week.push(`${yyyy}-${mm}-${dd}`);
    }
    return week;
  }, [selectedDate]);

  // Analytics & Scores
  const monthlyTasks = useMemo(() => {
    return tasks.filter((t) => t.date && t.date.startsWith(selectedMonth));
  }, [tasks, selectedMonth]);

  const analytics = useMemo(() => {
    const total = monthlyTasks.length;
    const completed = monthlyTasks.filter((t) => t.isCompleted).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const videoCreate = monthlyTasks.filter((t) => t.type === 'video_create');
    const videoUpload = monthlyTasks.filter((t) => t.type === 'video_upload');
    const graphicCreate = monthlyTasks.filter((t) => t.type === 'graphic_create');
    const graphicUpload = monthlyTasks.filter((t) => t.type === 'graphic_upload');

    return {
      total,
      completed,
      pending,
      completionRate,
      videoCreateTotal: videoCreate.length,
      videoCreateDone: videoCreate.filter((t) => t.isCompleted).length,
      videoUploadTotal: videoUpload.length,
      videoUploadDone: videoUpload.filter((t) => t.isCompleted).length,
      graphicCreateTotal: graphicCreate.length,
      graphicCreateDone: graphicCreate.filter((t) => t.isCompleted).length,
      graphicUploadTotal: graphicUpload.length,
      graphicUploadDone: graphicUpload.filter((t) => t.isCompleted).length,
    };
  }, [monthlyTasks]);

  // Actions
  const handleAddTask = async (presetType?: MediaCalendarTask['type'], presetTitle?: string, presetRole?: 'editor' | 'designer' | 'all') => {
    const title = (presetTitle || newTaskTitle).trim();
    if (!title) {
      toast.error('Please enter a task title');
      return;
    }
    const type = presetType || newTaskType;
    const role = presetRole || newTaskRole;

    try {
      setAddingTask(true);
      const payload: Omit<MediaCalendarTask, 'id'> = {
        date: selectedDate,
        title,
        type,
        assignedRole: role,
        isCompleted: false,
        note: newTaskNote.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'media_calendar_tasks'), payload);
      setTasks((prev) => [...prev, { id: docRef.id, ...payload }]);
      setNewTaskTitle('');
      setNewTaskNote('');
      toast.success('Daily task added successfully!');
    } catch (err: any) {
      toast.error('Failed to add task: ' + err.message);
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTaskComplete = async (task: MediaCalendarTask) => {
    try {
      const updatedComplete = !task.isCompleted;
      const ref = doc(db, 'media_calendar_tasks', task.id);
      await updateDoc(ref, {
        isCompleted: updatedComplete,
        completedAt: updatedComplete ? new Date().toISOString() : null,
        completedBy: updatedComplete ? user?.displayName || 'User' : null,
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isCompleted: updatedComplete } : t))
      );
      toast.success(updatedComplete ? 'Task marked as completed! ✓' : 'Task marked as pending');
    } catch (err: any) {
      toast.error('Update failed: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this planned task?')) return;
    try {
      await deleteDoc(doc(db, 'media_calendar_tasks', taskId));
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task removed');
    } catch (err: any) {
      toast.error('Failed to delete task');
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Calendar Node...</p>
        </div>
      </div>
    );
  }

  const tasksForSelectedDate = tasks.filter((t) => t.date === selectedDate);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
              Department Workflow
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30">
              Editor & Designer Hub
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-[1000] uppercase tracking-tight mt-3">
            Social Media <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Task Calendar</span>
          </h1>
          <p className="text-indigo-200/70 text-xs md:text-sm font-medium mt-1">
            Schedule daily video creations, video uploads, graphic designs, and track progress scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month picker */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white/10 border border-white/20 text-white font-bold text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400/50"
          />

          {/* View Mode Toggle */}
          <div className="flex bg-white/10 p-1 rounded-xl border border-white/20">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'monthly' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'weekly' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              Weekly View
            </button>
          </div>
        </div>
      </div>

      {/* Analytics & Score Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Progress Score</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-indigo-600">{analytics.completionRate}%</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{analytics.completed} of {analytics.total} Tasks Completed</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Videos Created</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-blue-600">{analytics.videoCreateDone} / {analytics.videoCreateTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Editor Workload</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Videos Uploaded</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-indigo-600">{analytics.videoUploadDone} / {analytics.videoUploadTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Published Content</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Graphics Created</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-purple-600">{analytics.graphicCreateDone} / {analytics.graphicCreateTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Designer Workload</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center col-span-2 lg:col-span-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Graphics Uploaded</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-pink-600">{analytics.graphicUploadDone} / {analytics.graphicUploadTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Published Posts</p>
        </div>
      </div>

      {/* Main Grid: Calendar View + Selected Date Task Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Calendar Grid (Monthly or Weekly) */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="text-cyan-600" size={20} />
              {viewMode === 'monthly' ? `Month Calendar (${selectedMonth})` : `Weekly View (Week of ${selectedDate})`}
            </h2>
            <span className="text-xs font-semibold text-slate-400">Click any day to view or schedule tasks</span>
          </div>

          {viewMode === 'monthly' ? (
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
                <div key={w} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                  {w}
                </div>
              ))}

              {calendarGridCells.map((dateStr, idx) => {
                if (!dateStr) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/50 rounded-2xl" />;
                }

                const dayNum = parseInt(dateStr.split('-')[2], 10);
                const dayTasks = tasks.filter((t) => t.date === dateStr);
                const completedCount = dayTasks.filter((t) => t.isCompleted).length;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-2xl p-2 flex flex-col justify-between text-left transition-all border relative ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/40 ring-2 ring-cyan-500/30 scale-105 z-10 shadow-md'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-800">{dayNum}</span>
                    {dayTasks.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex gap-0.5">
                          {dayTasks.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className={`w-2 h-2 rounded-full ${
                                t.isCompleted ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                            />
                          ))}
                          {dayTasks.length > 3 && <span className="text-[8px] font-bold text-slate-400">+</span>}
                        </div>
                        <p className="text-[9px] font-extrabold text-cyan-700 truncate">{completedCount}/{dayTasks.length} Done</p>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300 font-semibold">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Weekly View */
            <div className="space-y-3">
              {selectedWeekDays.map((dateStr) => {
                const dayTasks = tasks.filter((t) => t.date === dateStr);
                const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
                const isSelected = selectedDate === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected ? 'border-cyan-500 bg-cyan-50/40 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center font-bold text-gray-800">
                        <span className="text-[10px] uppercase text-slate-400">{dayName}</span>
                        <span className="text-sm leading-none">{dateStr.split('-')[2]}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{dateStr}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {dayTasks.length} Tasks Scheduled ({dayTasks.filter((t) => t.isCompleted).length} Completed)
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {dayTasks.length > 0 ? (
                        dayTasks.map((t) => (
                          <span
                            key={t.id}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                              t.isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {t.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic">No tasks planned</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Tasks & Add Task Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Daily Tasks</h3>
                <p className="text-xs font-semibold text-cyan-600 mt-0.5">Selected Date: {selectedDate}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                {tasksForSelectedDate.filter((t) => t.isCompleted).length} / {tasksForSelectedDate.length} Done
              </span>
            </div>

            {/* Quick Add Presets */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Quick Schedule Preset</p>
              <div className="grid grid-cols-2 gap-2">
                {TASK_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => handleAddTask(preset.type, preset.label, preset.role)}
                      disabled={addingTask}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 hover:scale-[1.02] transition-all font-bold text-xs ${preset.color}`}
                    >
                      <Icon size={14} />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Task Text Input Form */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Custom Daily Task</p>
              <input
                type="text"
                placeholder="Enter task details (e.g., Edit Promo Video, Design Reel Cover)..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
                >
                  <option value="video_create">Create Video</option>
                  <option value="video_upload">Upload Video</option>
                  <option value="graphic_create">Create Graphic Post</option>
                  <option value="graphic_upload">Upload Graphic Post</option>
                  <option value="custom">Custom Task</option>
                </select>

                <select
                  value={newTaskRole}
                  onChange={(e) => setNewTaskRole(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="designer">Graphic Designer</option>
                  <option value="all">All / Team</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleAddTask()}
                disabled={addingTask}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                {addingTask ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                Add Task to Calendar
              </button>
            </div>

            {/* List of Tasks for Selected Date */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled Tasks ({tasksForSelectedDate.length})</p>

              {tasksForSelectedDate.length > 0 ? (
                tasksForSelectedDate.map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 border rounded-2xl flex items-center justify-between gap-3 transition-all ${
                      t.isCompleted ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskComplete(t)}
                        className={`p-1 rounded-lg transition-colors ${
                          t.isCompleted ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-300 hover:text-slate-500'
                        }`}
                      >
                        {t.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs text-gray-900 truncate ${t.isCompleted ? 'line-through opacity-60' : ''}`}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            Role: {t.assignedRole}
                          </span>
                          {t.isCompleted && t.completedBy && (
                            <span className="text-[9px] font-bold text-emerald-600">
                              • Done by {t.completedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center border border-dashed border-gray-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-semibold">
                  No tasks scheduled for {selectedDate}. Use presets or input above to add.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
