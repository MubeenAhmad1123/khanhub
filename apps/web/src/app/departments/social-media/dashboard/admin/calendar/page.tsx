'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSession } from '@/hooks/social-media/useMediaSession';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where
} from 'firebase/firestore';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Plus, Trash2, Video,
  Image as ImageIcon, Upload, Sparkles, TrendingUp, Filter, ChevronLeft, ChevronRight,
  Loader2, User, Layers, CheckSquare, BarChart3, Users, Printer, Edit3, Save, X, FileText,
  Smartphone, Monitor, ListChecks, Check
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

/**
 * Animated Checkbox Component with Tick (✓) & Cross (✕) animations
 */
function AnimatedTickCrossCheckbox({
  checked,
  onToggle,
  size = 'md',
  disabled = false,
  title,
  label,
  subLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  title?: string;
  label?: string;
  subLabel?: string;
}) {
  const [animatingState, setAnimatingState] = useState<'tick' | 'cross' | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const nextState = checked ? 'cross' : 'tick';
    setAnimatingState(nextState);
    onToggle();
    setTimeout(() => setAnimatingState(null), 450);
  };

  const boxSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={title || (checked ? 'Click to mark Incomplete (Cross ✕)' : 'Click to complete (Tick ✓)')}
      className={`group relative flex items-center gap-2 rounded-xl transition-all duration-200 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-90 hover:scale-105'
      }`}
    >
      <div
        className={`${boxSizes} rounded-xl flex items-center justify-center font-black transition-all duration-300 border ${
          checked
            ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/30'
            : 'bg-white text-rose-500 border-slate-300 hover:border-rose-400 hover:bg-rose-50/60 shadow-xs'
        } ${animatingState === 'tick' ? 'animate-bounce ring-4 ring-emerald-300/50 scale-110' : ''} ${
          animatingState === 'cross' ? 'animate-pulse ring-4 ring-rose-300/50 scale-95' : ''
        }`}
      >
        {checked ? (
          <svg
            className={`w-[60%] h-[60%] text-white transition-all duration-300 ${
              animatingState === 'tick' ? 'scale-125 rotate-6' : 'scale-100'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className={`w-[55%] h-[55%] text-slate-300 group-hover:text-rose-500 transition-all duration-300 ${
              animatingState === 'cross' ? 'scale-125 -rotate-12 text-rose-600' : 'scale-90 opacity-60 group-hover:opacity-100'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {(label || subLabel) && (
        <div className="text-left leading-tight min-w-0">
          {label && (
            <p className={`font-bold text-xs sm:text-sm truncate transition-colors ${checked ? 'line-through text-slate-400' : 'text-gray-900'}`}>
              {label}
            </p>
          )}
          {subLabel && <p className="text-[10px] text-slate-400 font-semibold truncate">{subLabel}</p>}
        </div>
      )}
    </button>
  );
}

export default function SocialMediaCalendarPage() {
  const router = useRouter();
  const { session: user, loading: sessionLoading } = useMediaSession();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MediaCalendarTask[]>([]);
  const [categories, setCategories] = useState<MediaContentCategory[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  
  // View Modes: 'matrix' (Printable Sheet), 'mobile_cards' (Mobile Friendly List), 'monthly', 'weekly'
  const [viewMode, setViewMode] = useState<'matrix' | 'mobile_cards' | 'monthly' | 'weekly'>('matrix');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10)); // 'YYYY-MM-DD'
  const [matrixRange, setMatrixRange] = useState<'full' | 'half1' | 'half2' | 'week'>('full');

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

  // Week Days Helper around selected date
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

  // Matrix Filtered Days
  const matrixDays = useMemo(() => {
    if (matrixRange === 'half1') return daysInSelectedMonth.slice(0, 15);
    if (matrixRange === 'half2') return daysInSelectedMonth.slice(15);
    if (matrixRange === 'week') return selectedWeekDays;
    return daysInSelectedMonth;
  }, [daysInSelectedMonth, matrixRange, selectedWeekDays]);

  const calendarGridCells = useMemo(() => {
    const { year, month } = currentYearMonth;
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0
    const cells: (string | null)[] = [];
    for (let i = 0; i < adjustedFirstDay; i++) cells.push(null);
    daysInSelectedMonth.forEach((d) => cells.push(d));
    return cells;
  }, [currentYearMonth, daysInSelectedMonth]);

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

  // Matrix Checkbox Toggle (Primary Animated Tick / Cross Checkbox)
  const handleToggleMatrixTask = async (dateStr: string, cat: MediaContentCategory) => {
    try {
      const existingTask = tasks.find(
        (t) => t.date === dateStr && (t.categoryId === cat.id || t.title === cat.name)
      );

      const userName = user?.displayName || (user as any)?.name || 'Staff User';

      if (existingTask) {
        const nextState = !existingTask.isCompleted;
        const ref = doc(db, 'media_calendar_tasks', existingTask.id);

        const updateData: Record<string, any> = {
          isCompleted: nextState,
          isCreated: nextState,
          isUploaded: nextState,
        };

        if (nextState) {
          updateData.completedAt = new Date().toISOString();
          updateData.completedBy = userName;
        }

        await updateDoc(ref, updateData);

        setTasks((prev) =>
          prev.map((t) => (t.id === existingTask.id ? { ...t, ...updateData } : t))
        );
        toast.success(`${cat.name} [${dateStr}]: ${nextState ? 'Completed ✓' : 'Marked Incomplete ✕'}`);
      } else {
        // Create new completed task doc for this cell
        const payload: Record<string, any> = {
          date: dateStr,
          categoryId: cat.id,
          categoryName: cat.name,
          title: cat.name,
          type: cat.type === 'video' ? 'video_create' : 'graphic_create',
          assignedRole: cat.defaultRole || 'all',
          isCreated: true,
          isUploaded: true,
          isCompleted: true,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completedBy: userName,
        };

        const docRef = await addDoc(collection(db, 'media_calendar_tasks'), payload);
        setTasks((prev) => [...prev, { id: docRef.id, ...payload } as MediaCalendarTask]);
        toast.success(`${cat.name} marked Completed ✓ for ${dateStr}`);
      }
    } catch (err: any) {
      console.error('Failed to toggle matrix task:', err);
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
        isCreated: updatedComplete,
        isUploaded: updatedComplete,
      };

      if (updatedComplete) {
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = user?.displayName || (user as any)?.name || 'User';
      }

      await updateDoc(ref, updateData);

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...updateData } : t))
      );
      toast.success(updatedComplete ? 'Task marked completed ✓' : 'Task marked incomplete ✕');
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
          <Loader2 className="w-10 h-10 text-cyan-600 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Task Matrix & Animated Checkboxes...</p>
        </div>
      </div>
    );
  }

  const tasksForSelectedDate = tasks.filter((t) => t.date === selectedDate);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 print:p-0 print:space-y-4">
      {/* Printable CSS Rules for A4 Paper Output */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
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
            border: 1px solid #000 !important;
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
          .print-checkbox {
            width: 12px !important;
            height: 12px !important;
            border: 1px solid #000 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-weight: bold !important;
            font-size: 9px !important;
            margin: 0 auto !important;
            border-radius: 1px !important;
          }
        }
      `}</style>

      {/* Header Banner - Responsive for Mobile & Desktop */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-4 sm:p-6 lg:p-8 rounded-3xl sm:rounded-[2.5rem] border border-indigo-500/20 shadow-2xl text-white print:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
              Interactive Media Calendar
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
              <Check size={12} /> Tick & Cross Animation Enabled
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-[1000] uppercase tracking-tight mt-3">
            Social Media <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300">Task Matrix Calendar</span>
          </h1>
          <p className="text-indigo-200/70 text-xs sm:text-sm font-medium mt-1">
            Fully responsive on mobile & laptop. Track video creation, graphic posts, and social media releases with animated checkboxes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Month picker */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto bg-white/10 border border-white/20 text-white font-bold text-xs rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
          />

          {/* View Mode Switcher */}
          <div className="w-full sm:w-auto flex bg-white/10 p-1 rounded-xl border border-white/20 overflow-x-auto">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                viewMode === 'matrix' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <CheckSquare size={14} /> Matrix Sheet
            </button>
            <button
              onClick={() => setViewMode('mobile_cards')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                viewMode === 'mobile_cards' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <Smartphone size={14} /> Mobile Cards
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                viewMode === 'monthly' ? 'bg-cyan-500 text-white shadow-md' : 'text-indigo-200 hover:text-white'
              }`}
            >
              Monthly Grid
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
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
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={15} /> Print Sheet
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards - Fully Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 print:hidden">
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist Rate</p>
          <p className="text-xl sm:text-3xl font-[1000] text-indigo-600">{analytics.completionRate}%</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{analytics.completed} of {analytics.total} Done</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Videos Created</p>
          <p className="text-xl sm:text-3xl font-[1000] text-blue-600">{analytics.videoCreateDone} / {analytics.videoCreateTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Editor Workload</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Videos Uploaded</p>
          <p className="text-xl sm:text-3xl font-[1000] text-indigo-600">{analytics.videoUploadDone} / {analytics.videoUploadTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Published Videos</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Graphics Created</p>
          <p className="text-xl sm:text-3xl font-[1000] text-purple-600">{analytics.graphicCreateDone} / {analytics.graphicCreateTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Designer Workload</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm text-center col-span-2 sm:col-span-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Graphics Uploaded</p>
          <p className="text-xl sm:text-3xl font-[1000] text-pink-600">{analytics.graphicUploadDone} / {analytics.graphicUploadTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Published Posts</p>
        </div>
      </div>

      {/* MATRIX CHECKSHEET VIEW (Sticky Columns for Mobile & Laptop + Printable Empty/Ticked Checkboxes) */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6 print:border-none print:shadow-none print:p-0">
          
          {/* Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                <CheckSquare className="text-cyan-600" size={20} />
                Content Task Matrix ({new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Sticky task column on mobile. Tap any checkbox to toggle Tick (✓) or Cross (✕) animation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Range Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] sm:text-xs font-bold overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setMatrixRange('week')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${matrixRange === 'week' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500'}`}
                >
                  7 Days (Mobile)
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixRange('half1')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${matrixRange === 'half1' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500'}`}
                >
                  1-15
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixRange('half2')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${matrixRange === 'half2' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500'}`}
                >
                  16-{daysInSelectedMonth.length}
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixRange('full')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${matrixRange === 'full' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500'}`}
                >
                  Full Month
                </button>
              </div>

              {/* Add Custom Row Button */}
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
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

          {/* Table Container with Sticky Task Name Column */}
          <div className="matrix-table-container overflow-x-auto w-full border border-gray-200 rounded-2xl print:border-black shadow-inner">
            <table className="matrix-table min-w-full divide-y divide-gray-200 text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider print:bg-gray-100 print:text-black">
                <tr>
                  <th scope="col" className="px-2 sm:px-3 py-3 text-center border-r border-slate-700 w-10 sticky left-0 z-20 bg-slate-900 print:border-black print:w-8 print:static">
                    S.No
                  </th>
                  <th scope="col" className="px-3 sm:px-4 py-3 text-left border-r border-slate-700 min-w-[160px] sm:min-w-[220px] sticky left-10 z-20 bg-slate-900 print:border-black print:min-w-[140px] print:static">
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
                        className={`px-2 py-2 text-center border-r border-slate-700 min-w-[50px] sm:min-w-[60px] ${
                          isToday ? 'bg-cyan-600 text-white font-black ring-2 ring-cyan-400' : ''
                        } print:border-black print:min-w-[24px]`}
                      >
                        <div className="leading-tight">
                          <span className="block text-[8px] opacity-75 font-semibold uppercase">{dayOfWeek}</span>
                          <span className="text-xs sm:text-sm font-bold">{dayNum}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th scope="col" className="px-3 py-3 text-center w-14 print:border-black print:hidden">
                    Del
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
                        {/* Serial Number (Sticky Left) */}
                        <td className="px-2 py-3 text-center font-black text-slate-500 border-r border-gray-200 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:text-black print:static print:shadow-none">
                          {cat.serialNo || idx + 1}
                        </td>

                        {/* Category / Task Title (Sticky Left) */}
                        <td className="px-3 sm:px-4 py-3 font-bold text-gray-900 border-r border-gray-200 sticky left-10 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:static print:shadow-none">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate max-w-[130px] sm:max-w-[180px]">{cat.name}</span>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 print:hidden shrink-0">
                              {cat.defaultRole || 'all'}
                            </span>
                          </div>
                        </td>

                        {/* Daily Status Cells with Animated Checkbox for Screen & Printable Boxes for Paper */}
                        {matrixDays.map((dayStr) => {
                          const task = tasks.find(
                            (t) => t.date === dayStr && (t.categoryId === cat.id || t.title === cat.name)
                          );
                          const isCompleted = !!task?.isCompleted;

                          return (
                            <td
                              key={dayStr}
                              className={`px-1.5 py-2 text-center border-r border-gray-200 transition-colors relative print:border-black ${
                                isCompleted ? 'bg-emerald-50/40 print:bg-transparent' : ''
                              }`}
                            >
                              {/* Screen View Interactive Animated Checkbox */}
                              <div className="flex flex-col items-center justify-center gap-1 print:hidden">
                                <AnimatedTickCrossCheckbox
                                  checked={isCompleted}
                                  onToggle={() => handleToggleMatrixTask(dayStr, cat)}
                                  size="md"
                                  title={`${cat.name} (${dayStr}): ${isCompleted ? 'Completed ✓ (Click to uncheck)' : 'Incomplete ✕ (Click to tick)'}`}
                                />

                                {task?.completedBy && (
                                  <span className="text-[7px] font-bold text-emerald-700 bg-emerald-100/60 px-1 py-0.2 rounded truncate max-w-[42px]" title={`Completed by ${task.completedBy}`}>
                                    {task.completedBy.split(' ')[0]}
                                  </span>
                                )}
                              </div>

                              {/* Paper Print View Checkbox Box (Empty Square or Ticked Square) */}
                              <div className="hidden print:flex items-center justify-center">
                                <div className="print-checkbox">
                                  {isCompleted ? '✓' : ''}
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        {/* Actions (Delete Row) */}
                        <td className="px-2 py-2 text-center border-gray-200 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
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

      {/* MOBILE CARDS CHECKLIST VIEW (Ultra Touch Friendly for Mobile Phones) */}
      {viewMode === 'mobile_cards' && (
        <div className="space-y-6 print:hidden">
          <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Smartphone className="text-cyan-600" size={20} />
                  Mobile Card Checklist ({selectedDate})
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Large touch targets designed specifically for smartphone screens.
                </p>
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Content Categories Cards for Selected Date */}
            <div className="space-y-3">
              {categories.map((cat, idx) => {
                const task = tasks.find(
                  (t) => t.date === selectedDate && (t.categoryId === cat.id || t.title === cat.name)
                );
                const isCompleted = !!task?.isCompleted;

                return (
                  <div
                    key={cat.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isCompleted
                        ? 'bg-emerald-50/60 border-emerald-200 shadow-xs'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 shrink-0">
                        #{cat.serialNo || idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm text-gray-900 truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>
                          {cat.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Role: {cat.defaultRole || 'all'}
                          </span>
                          {task?.completedBy && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Done by {task.completedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <AnimatedTickCrossCheckbox
                        checked={isCompleted}
                        onToggle={() => handleToggleMatrixTask(selectedDate, cat)}
                        size="lg"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY GRID VIEW (Standard Calendar Layout) */}
      {viewMode === 'monthly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 print:hidden">
          <div className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="text-cyan-600" size={20} />
                Month Grid Calendar ({selectedMonth})
              </h2>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Click any day to view or schedule tasks</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
                <div key={w} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                  {w}
                </div>
              ))}

              {calendarGridCells.map((dateStr, idx) => {
                if (!dateStr) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/50 rounded-xl sm:rounded-2xl" />;
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
                    className={`aspect-square rounded-xl sm:rounded-2xl p-1.5 sm:p-2 flex flex-col justify-between text-left transition-all border relative cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/40 ring-2 ring-cyan-500/30 scale-105 z-10 shadow-md'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-800">{dayNum}</span>
                    {dayTasks.length > 0 ? (
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex gap-0.5">
                          {dayTasks.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                t.isCompleted ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                            />
                          ))}
                          {dayTasks.length > 3 && <span className="text-[8px] font-bold text-slate-400">+</span>}
                        </div>
                        <p className="text-[8px] sm:text-[9px] font-extrabold text-cyan-700 truncate">{completedCount}/{dayTasks.length} Done</p>
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
            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Daily Scheduled Tasks</h3>
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
                      <AnimatedTickCrossCheckbox
                        checked={t.isCompleted}
                        onToggle={() => handleToggleTaskComplete(t)}
                        label={t.title}
                        subLabel={`Role: ${t.assignedRole}${t.assignedStaffName ? ` • ${t.assignedStaffName}` : ''}`}
                      />

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
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
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm space-y-6 print:hidden">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-cyan-600" size={20} />
              Weekly Task View (Week of {selectedDate})
            </h2>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Click any day to select</span>
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
