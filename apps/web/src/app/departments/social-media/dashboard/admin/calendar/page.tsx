'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc
} from 'firebase/firestore';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Plus, Trash2, Video,
  Image as ImageIcon, Upload, Sparkles, TrendingUp, Filter, ChevronLeft, ChevronRight,
  Loader2, User, Layers, CheckSquare, BarChart3, Users, Printer, Square, Edit3, Save, X, FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface MediaContentCategory {
  id: string;
  serialNo: number;
  name: string;
  type?: 'video' | 'graphic' | 'post' | 'custom';
  defaultRole?: 'editor' | 'designer' | 'all';
}

export interface MediaCalendarTask {
  id: string;
  date: string; // 'YYYY-MM-DD'
  categoryId?: string;
  categoryName?: string;
  title: string;
  type: 'video_create' | 'video_upload' | 'graphic_create' | 'graphic_upload' | 'custom';
  assignedRole: 'editor' | 'designer' | 'all';
  assignedStaffId?: string;
  assignedStaffName?: string;
  isCreated?: boolean;
  isUploaded?: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  note?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  displayName?: string;
  designation?: string;
  role?: string;
}

const DEFAULT_CATEGORIES: Omit<MediaContentCategory, 'id'>[] = [
  { serialNo: 1, name: 'Rehab Video', type: 'video', defaultRole: 'editor' },
  { serialNo: 2, name: 'Rehab Graphics Post', type: 'graphic', defaultRole: 'designer' },
  { serialNo: 3, name: 'Job Center Video', type: 'video', defaultRole: 'editor' },
  { serialNo: 4, name: 'Job Center Graphics Post', type: 'graphic', defaultRole: 'designer' },
  { serialNo: 5, name: 'SPIMS College Post', type: 'graphic', defaultRole: 'designer' },
  { serialNo: 6, name: 'Hospital Video', type: 'video', defaultRole: 'editor' },
  { serialNo: 7, name: 'Hospital Graphics Post', type: 'graphic', defaultRole: 'designer' },
  { serialNo: 8, name: 'Surgical Post', type: 'graphic', defaultRole: 'designer' },
  { serialNo: 9, name: 'Welfare Post', type: 'graphic', defaultRole: 'designer' },
  { serialNo: 10, name: 'General Media Content', type: 'custom', defaultRole: 'all' },
];

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
  const [categories, setCategories] = useState<MediaContentCategory[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  
  // View Modes: 'matrix' (Serial numbered Printable Checksheet Matrix), 'monthly', 'weekly'
  const [viewMode, setViewMode] = useState<'matrix' | 'monthly' | 'weekly'>('matrix');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10)); // 'YYYY-MM-DD'
  const [matrixRange, setMatrixRange] = useState<'full' | 'half1' | 'half2'>('full');

  // Category Creation Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryRole, setNewCategoryRole] = useState<'editor' | 'designer' | 'all'>('all');
  const [addingCategory, setAddingCategory] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  // Single Task Creation Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<MediaCalendarTask['type']>('video_create');
  const [newTaskRole, setNewTaskRole] = useState<'editor' | 'designer' | 'all'>('editor');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.push('/departments/social-media/login');
    }
  }, [sessionLoading, user, router]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Categories (Task Rows)
      const catSnap = await getDocs(collection(db, 'media_content_categories')).catch(() => ({ docs: [] } as any));
      let loadedCats: MediaContentCategory[] = catSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MediaContentCategory));

      // Seed Default Categories if none exist
      if (loadedCats.length === 0) {
        const seeded: MediaContentCategory[] = [];
        for (const def of DEFAULT_CATEGORIES) {
          const ref = await addDoc(collection(db, 'media_content_categories'), def);
          seeded.push({ id: ref.id, ...def });
        }
        loadedCats = seeded;
      }

      loadedCats.sort((a, b) => (a.serialNo || 0) - (b.serialNo || 0));
      setCategories(loadedCats);

      // 2. Fetch Calendar Tasks
      const tasksSnap = await getDocs(collection(db, 'media_calendar_tasks'));
      const tasksData = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MediaCalendarTask));
      setTasks(tasksData);

      // 3. Fetch Active Social Media Department Staff
      const [mediaStaffSnap, hqStaffSnap] = await Promise.all([
        getDocs(collection(db, 'media_users')).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, 'hq_users'), where('department', '==', 'social-media'))).catch(() => ({ docs: [] } as any)),
      ]);

      const staffMap = new Map<string, StaffMember>();

      mediaStaffSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.isActive !== false && data.status !== 'inactive') {
          staffMap.set(d.id, {
            id: d.id,
            name: data.displayName || data.name || 'Staff Member',
            designation: data.designation || data.role || 'Social Media Staff',
            role: data.role,
          });
        }
      });

      hqStaffSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (!staffMap.has(d.id) && data.isActive !== false) {
          staffMap.set(d.id, {
            id: d.id,
            name: data.name || data.displayName || 'Staff Member',
            designation: data.designation || 'Social Media Staff',
            role: data.role,
          });
        }
      });

      setStaffList(Array.from(staffMap.values()));
    } catch (err) {
      console.error('Error loading media calendar data:', err);
      toast.error('Failed to load matrix tasks or staff list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

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

  // Matrix Filtered Days
  const matrixDays = useMemo(() => {
    if (matrixRange === 'half1') return daysInSelectedMonth.slice(0, 15);
    if (matrixRange === 'half2') return daysInSelectedMonth.slice(15);
    return daysInSelectedMonth;
  }, [daysInSelectedMonth, matrixRange]);

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

  // Add Custom Category / Task Row
  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error('Please enter a task category name');
      return;
    }

    try {
      setAddingCategory(true);
      const nextSerial = categories.length > 0 ? Math.max(...categories.map(c => c.serialNo || 0)) + 1 : 1;
      const payload = {
        serialNo: nextSerial,
        name,
        type: name.toLowerCase().includes('video') ? 'video' : 'graphic',
        defaultRole: newCategoryRole
      };

      const ref = await addDoc(collection(db, 'media_content_categories'), payload);
      const newCat: MediaContentCategory = { id: ref.id, ...payload as any };

      setCategories(prev => [...prev, newCat].sort((a, b) => a.serialNo - b.serialNo));
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      toast.success(`Task Row "${name}" added to Checklist Sheet!`);
    } catch (err: any) {
      toast.error('Failed to add task category: ' + err.message);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`Delete "${catName}" row from matrix?`)) return;
    try {
      await deleteDoc(doc(db, 'media_content_categories', catId));
      setCategories(prev => prev.filter(c => c.id !== catId));
      toast.success('Task category removed');
    } catch (err: any) {
      toast.error('Failed to delete category');
    }
  };

  // Matrix Checkbox Toggle (Created / Uploaded / Completed)
  const handleToggleMatrixCheckbox = async (
    dateStr: string,
    cat: MediaContentCategory,
    field: 'isCreated' | 'isUploaded' | 'isCompleted'
  ) => {
    try {
      const existingTask = tasks.find(
        (t) => t.date === dateStr && (t.categoryId === cat.id || t.title === cat.name)
      );

      const userName = user?.displayName || user?.name || 'Staff User';

      if (existingTask) {
        const ref = doc(db, 'media_calendar_tasks', existingTask.id);
        const currentVal = !!(existingTask as any)[field];
        const newVal = !currentVal;

        const updateData: Record<string, any> = {
          [field]: newVal,
        };

        // Auto evaluate overall completed state
        if (field === 'isCompleted') {
          updateData.isCompleted = newVal;
        } else {
          const nextCreated = field === 'isCreated' ? newVal : !!existingTask.isCreated;
          const nextUploaded = field === 'isUploaded' ? newVal : !!existingTask.isUploaded;
          updateData.isCompleted = nextCreated && nextUploaded;
        }

        if (newVal) {
          updateData.completedAt = new Date().toISOString();
          updateData.completedBy = userName;
        }

        await updateDoc(ref, updateData);

        setTasks((prev) =>
          prev.map((t) => (t.id === existingTask.id ? { ...t, ...updateData } : t))
        );
        toast.success(`${cat.name} [${dateStr}]: updated ✓`);
      } else {
        // Create new task doc for this matrix cell
        const payload: Record<string, any> = {
          date: dateStr,
          categoryId: cat.id,
          categoryName: cat.name,
          title: cat.name,
          type: cat.type === 'video' ? 'video_create' : 'graphic_create',
          assignedRole: cat.defaultRole || 'all',
          isCreated: field === 'isCreated',
          isUploaded: field === 'isUploaded',
          isCompleted: field === 'isCompleted' || (field === 'isCreated' && cat.type === 'graphic'),
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedBy: userName,
        };

        const docRef = await addDoc(collection(db, 'media_calendar_tasks'), payload);
        setTasks((prev) => [...prev, { id: docRef.id, ...payload } as MediaCalendarTask]);
        toast.success(`${cat.name} marked for ${dateStr} ✓`);
      }
    } catch (err: any) {
      console.error('Failed to toggle matrix checkbox:', err);
      toast.error('Failed to update task check state');
    }
  };

  // Actions for Single Task Creation
  const handleAddTask = async (
    presetType?: MediaCalendarTask['type'],
    presetTitle?: string,
    presetRole?: 'editor' | 'designer' | 'all'
  ) => {
    const title = (presetTitle || newTaskTitle).trim();
    if (!title) {
      toast.error('Please enter a task title');
      return;
    }
    const type = presetType || newTaskType;
    const role = presetRole || newTaskRole;

    const assignedStaff = staffList.find((s) => s.id === selectedStaffId);

    try {
      setAddingTask(true);

      const payload: Record<string, any> = {
        date: selectedDate,
        title,
        type,
        assignedRole: role,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      if (assignedStaff) {
        payload.assignedStaffId = assignedStaff.id;
        payload.assignedStaffName = assignedStaff.name;
      }
      const trimmedNote = newTaskNote.trim();
      if (trimmedNote) {
        payload.note = trimmedNote;
      }

      const docRef = await addDoc(collection(db, 'media_calendar_tasks'), payload);
      setTasks((prev) => [...prev, { id: docRef.id, ...payload } as MediaCalendarTask]);
      setNewTaskTitle('');
      setNewTaskNote('');
      setSelectedStaffId('');
      toast.success('Task added successfully!');
    } catch (err: any) {
      console.error('Failed to add task error:', err);
      toast.error('Failed to add task: ' + err.message);
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTaskComplete = async (task: MediaCalendarTask) => {
    try {
      const updatedComplete = !task.isCompleted;
      const ref = doc(db, 'media_calendar_tasks', task.id);
      
      const updateData: Record<string, any> = {
        isCompleted: updatedComplete,
      };

      if (updatedComplete) {
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = user?.displayName || user?.name || 'User';
      }

      await updateDoc(ref, updateData);

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isCompleted: updatedComplete, ...(updatedComplete ? { completedAt: updateData.completedAt, completedBy: updateData.completedBy } : {}) } : t))
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
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Matrix Calendar Node...</p>
        </div>
      </div>
    );
  }

  const tasksForSelectedDate = tasks.filter((t) => t.date === selectedDate);

  return (
    <div className="space-y-8 pb-12 print:p-0 print:space-y-4">
      {/* Printable CSS Rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:w-full {
            width: 100% !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-black {
            border-color: #000 !important;
          }
          .matrix-table-container {
            overflow: visible !important;
          }
          .matrix-table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 8px !important;
          }
          .matrix-table th, .matrix-table td {
            border: 1px solid #000 !important;
            padding: 3px 2px !important;
            text-align: center !important;
            color: #000 !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-xl text-white print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
              Media Department Matrix
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30">
              Printable Checklist Sheet
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-[1000] uppercase tracking-tight mt-3">
            Social Media <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Task Matrix Sheet</span>
          </h1>
          <p className="text-indigo-200/70 text-xs md:text-sm font-medium mt-1">
            Serial numbered content list (Rehab Video, Job Center Graphics, SPIMS Post) with daily checkboxes & A4 print design.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month picker */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white/10 border border-white/20 text-white font-bold text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
          />

          {/* View Mode Switcher */}
          <div className="flex bg-white/10 p-1 rounded-xl border border-white/20">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <CheckSquare size={14} /> Matrix Sheet
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'monthly' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              Monthly Grid
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'weekly' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={15} /> Print Sheet
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist Progress</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-indigo-600">{analytics.completionRate}%</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{analytics.completed} of {analytics.total} Done</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Videos Created</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-blue-600">{analytics.videoCreateDone} / {analytics.videoCreateTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Editor Workload</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Videos Uploaded</p>
          <p className="text-2xl sm:text-3xl font-[1000] text-indigo-600">{analytics.videoUploadDone} / {analytics.videoUploadTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Published Videos</p>
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

      {/* MATRIX CHECKSHEET VIEW (Serial Numbered Printable Grid) */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          
          {/* Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare className="text-cyan-600" size={20} />
                Content Task Matrix Sheet ({new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Serial numbered task checklist across all days. Click boxes to mark Created (C) or Uploaded (U).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Range Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMatrixRange('full')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${matrixRange === 'full' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500'}`}
                >
                  Full Month (1-{daysInSelectedMonth.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixRange('half1')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${matrixRange === 'half1' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500'}`}
                >
                  1st Half (1-15)
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixRange('half2')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${matrixRange === 'half2' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500'}`}
                >
                  2nd Half (16-{daysInSelectedMonth.length})
                </button>
              </div>

              {/* Add Custom Row Button */}
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} /> Add Content Task Row
              </button>
            </div>
          </div>

          {/* Printable Header Banner (Only visible on paper printout) */}
          <div className="hidden print:block mb-4 pb-2 border-b-2 border-black">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">KHANHUB — SOCIAL MEDIA TASK CHECKLIST SHEET</h1>
                <p className="text-xs font-bold text-gray-700 mt-0.5">
                  Month/Cycle: {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · Daily Production & Publishing Register
                </p>
              </div>
              <div className="text-right text-xs font-mono font-bold">
                <p>Generated: {new Date().toLocaleDateString('en-GB')}</p>
                <p>Status: Active Sheet</p>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="matrix-table-container overflow-x-auto w-full border border-gray-200 rounded-2xl print:border-black">
            <table className="matrix-table min-w-full divide-y divide-gray-200 text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider print:bg-gray-100 print:text-black">
                <tr>
                  <th scope="col" className="px-3 py-3 text-center border-r border-slate-700 w-12 print:border-black print:w-8">
                    S.No
                  </th>
                  <th scope="col" className="px-4 py-3 text-left border-r border-slate-700 min-w-[220px] print:border-black print:min-w-[150px]">
                    Content Task / Channel
                  </th>
                  {matrixDays.map((dayStr) => {
                    const dayNum = parseInt(dayStr.split('-')[2], 10);
                    const dayOfWeek = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
                    const isToday = dayStr === new Date().toISOString().slice(0, 10);
                    return (
                      <th
                        key={dayStr}
                        scope="col"
                        className={`px-1.5 py-2 text-center border-r border-slate-700 min-w-[42px] ${
                          isToday ? 'bg-cyan-600 text-white font-black' : ''
                        } print:border-black print:min-w-[24px]`}
                      >
                        <div className="leading-tight">
                          <span className="block text-[8px] opacity-75 font-semibold uppercase">{dayOfWeek}</span>
                          <span className="text-xs font-bold">{dayNum}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th scope="col" className="px-3 py-3 text-center w-16 print:border-black print:hidden">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-800 print:divide-black">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={matrixDays.length + 3} className="py-12 text-center text-slate-400 italic font-semibold">
                      No task categories found. Click "Add Content Task Row" to create custom post tasks.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat, idx) => {
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Serial Number */}
                        <td className="px-2 py-2.5 text-center font-black text-slate-500 border-r border-gray-200 print:border-black print:text-black">
                          {cat.serialNo || idx + 1}
                        </td>

                        {/* Category / Task Title */}
                        <td className="px-4 py-2.5 font-bold text-gray-900 border-r border-gray-200 print:border-black">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{cat.name}</span>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 print:hidden shrink-0">
                              {cat.defaultRole || 'all'}
                            </span>
                          </div>
                        </td>

                        {/* Daily Status Cells */}
                        {matrixDays.map((dayStr) => {
                          const task = tasks.find(
                            (t) => t.date === dayStr && (t.categoryId === cat.id || t.title === cat.name)
                          );
                          const isCreated = !!task?.isCreated;
                          const isUploaded = !!task?.isUploaded;
                          const isCompleted = !!task?.isCompleted;

                          return (
                            <td
                              key={dayStr}
                              className={`px-1 py-1.5 text-center border-r border-gray-200 transition-colors relative print:border-black ${
                                isCompleted ? 'bg-emerald-50/50 print:bg-transparent' : isCreated ? 'bg-blue-50/30 print:bg-transparent' : ''
                              }`}
                            >
                              {/* Screen View Interactive Checkboxes */}
                              <div className="flex flex-col items-center justify-center gap-1 print:hidden">
                                <div className="flex items-center gap-1">
                                  {/* C: Created Checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMatrixCheckbox(dayStr, cat, 'isCreated')}
                                    className={`w-5 h-5 rounded flex items-center justify-center font-black text-[9px] border transition-all cursor-pointer ${
                                      isCreated
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                        : 'bg-white text-slate-400 border-gray-300 hover:border-blue-400'
                                    }`}
                                    title={`Toggle Created for ${cat.name} on ${dayStr}`}
                                  >
                                    C
                                  </button>

                                  {/* U: Uploaded Checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMatrixCheckbox(dayStr, cat, 'isUploaded')}
                                    className={`w-5 h-5 rounded flex items-center justify-center font-black text-[9px] border transition-all cursor-pointer ${
                                      isUploaded
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                        : 'bg-white text-slate-400 border-gray-300 hover:border-emerald-400'
                                    }`}
                                    title={`Toggle Uploaded for ${cat.name} on ${dayStr}`}
                                  >
                                    U
                                  </button>
                                </div>

                                {task?.completedBy && (
                                  <span className="text-[7px] font-bold text-slate-400 truncate max-w-[36px]" title={`Done by ${task.completedBy}`}>
                                    {task.completedBy.split(' ')[0]}
                                  </span>
                                )}
                              </div>

                              {/* Paper Print View Checkbox Indicator */}
                              <div className="hidden print:flex items-center justify-center font-mono font-bold text-xs">
                                {isCompleted ? '[✓]' : isCreated ? '[C]' : '[ ]'}
                              </div>
                            </td>
                          );
                        })}

                        {/* Actions (Delete Row) */}
                        <td className="px-2 py-2 text-center border-gray-200 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Printable Signature & Authorization Footer (Visible on paper printout) */}
          <div className="hidden print:block mt-8 pt-4 border-t border-black text-xs font-bold text-black">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="mb-8">Prepared By (Editor / Designer):</p>
                <p className="border-b border-black w-48"></p>
                <p className="text-[10px] text-gray-600 mt-1">Signature & Date</p>
              </div>
              <div>
                <p className="mb-8">Verified By (Social Media Manager):</p>
                <p className="border-b border-black w-48"></p>
                <p className="text-[10px] text-gray-600 mt-1">Signature & Date</p>
              </div>
              <div>
                <p className="mb-8">Approved By (Director / HQ):</p>
                <p className="border-b border-black w-48"></p>
                <p className="text-[10px] text-gray-600 mt-1">Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY GRID VIEW (Standard Calendar Layout) */}
      {viewMode === 'monthly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          <div className="lg:col-span-7 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="text-cyan-600" size={20} />
                Month Grid Calendar ({selectedMonth})
              </h2>
              <span className="text-xs font-semibold text-slate-400">Click any day to view or schedule tasks</span>
            </div>

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
                    className={`aspect-square rounded-2xl p-2 flex flex-col justify-between text-left transition-all border relative cursor-pointer ${
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
          </div>

          {/* Side Panel for Single Date Tasks */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Daily Scheduled Tasks</h3>
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
                        className={`p-3 rounded-xl border text-left flex items-center gap-2 hover:scale-[1.02] transition-all font-bold text-xs cursor-pointer ${preset.color}`}
                      >
                        <Icon size={14} />
                        <span className="truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Task Input Form */}
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
                    <option value="editor">Editor Role</option>
                    <option value="designer">Graphic Designer Role</option>
                    <option value="all">All / Team</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    Assign Staff Member (Optional)
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">-- Select Active Staff Member --</option>
                    {staffList.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Optional Note or Instructions..."
                  value={newTaskNote}
                  onChange={(e) => setNewTaskNote(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-medium text-gray-800 outline-none"
                />

                <button
                  type="button"
                  onClick={() => handleAddTask()}
                  disabled={addingTask}
                  className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {addingTask ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Add Task to Calendar
                </button>
              </div>

              {/* Task List */}
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
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            t.isCompleted ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-300 hover:text-slate-500'
                          }`}
                        >
                          {t.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                        <div className="min-w-0">
                          <p className={`font-bold text-xs text-gray-900 truncate ${t.isCompleted ? 'line-through opacity-60' : ''}`}>
                            {t.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              Role: {t.assignedRole}
                            </span>
                            {t.assignedStaffName && (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                Assigned to: {t.assignedStaffName}
                              </span>
                            )}
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
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
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
      )}

      {/* WEEKLY VIEW */}
      {viewMode === 'weekly' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 print:hidden">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-cyan-600" size={20} />
              Weekly Task View (Week of {selectedDate})
            </h2>
            <span className="text-xs font-semibold text-slate-400">Click any day to select</span>
          </div>

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
                          {t.title} {t.assignedStaffName ? `(${t.assignedStaffName})` : ''}
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
        </div>
      )}

      {/* Add Custom Category Row Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" /> Add Content Task Row
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Task / Channel Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rehab Video, Job Center Graphics, Tiktok Reel..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Default Role Assigned
                </label>
                <select
                  value={newCategoryRole}
                  onChange={(e) => setNewCategoryRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="editor">Video Editor</option>
                  <option value="designer">Graphic Designer</option>
                  <option value="all">All Roles / General</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={addingCategory}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {addingCategory ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Save Task Row
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
