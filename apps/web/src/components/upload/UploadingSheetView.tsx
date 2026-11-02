// apps/web/src/components/upload/UploadingSheetView.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Sparkles, Filter,
  Building2, Layers, AlertCircle, CheckCircle2, Clock, Search,
  Layers as LayersIcon, LayoutGrid, List, CheckSquare, Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import {
  UploadItemDoc,
  UploadPlatformKey,
  DEFAULT_PLATFORM_KEYS,
  ALL_PLATFORM_KEYS
} from '@/lib/upload/types';
import {
  CANONICAL_DEPARTMENTS,
  CanonicalDeptId,
  resolveCanonicalDept
} from '@/lib/upload/departmentRegistry';
import {
  generateUploadSheet,
  syncFromCreation,
  deleteUploadTaskRow
} from '@/lib/upload/uploadActions';
import { EditUploadTaskModal } from './EditUploadTaskModal';
import { UploadMatrixTable } from './UploadMatrixTable';
import {
  UploadCalendarMatrix,
  UploadCategoryRow
} from './UploadCalendarMatrix';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { CategoryMappingModal } from './CategoryMappingModal';

const DEFAULT_CATEGORIES: Omit<UploadCategoryRow, 'id'>[] = [
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

// Helper to get today's date in Asia/Karachi (YYYY-MM-DD)
function getKarachiTodayStr(): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value || '';
  const m = parts.find((p) => p.type === 'month')?.value || '';
  const d = parts.find((p) => p.type === 'day')?.value || '';
  return `${y}-${m}-${d}`;
}

export function UploadingSheetView() {
  const todayKarachi = useMemo(() => getKarachiTodayStr(), []);
  const initialMonth = todayKarachi.slice(0, 7);

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [items, setItems] = useState<UploadItemDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  // View Mode: 'matrix' (30-day grid with 6 platform rows per task) or 'list' (item rows)
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [matrixRange, setMatrixRange] = useState<'week' | 'half1' | 'half2' | 'full'>('full');

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drawer & Modals state
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<UploadItemDoc | null>(null);
  const [focusedPlatform, setFocusedPlatform] = useState<UploadPlatformKey>('facebook');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [categories, setCategories] = useState<UploadCategoryRow[]>([]);
  const [editingTaskRow, setEditingTaskRow] = useState<UploadCategoryRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [deletedSet, setDeletedSet] = useState<Set<string>>(new Set());

  // Load Categories, Overrides, Custom Tasks & Deleted Filters from Firestore
  const loadCategories = useCallback(async () => {
    try {
      let savedMapping: Record<string, string> = {};
      let taskOverrides: Record<string, any> = {};
      let monthDeletedSet = new Set<string>();
      let customRows: any[] = [];

      try {
        const settingsSnap = await getDoc(doc(db, 'upload_settings', 'config_vehari'));
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data() as any;
          savedMapping = sData.categoryDepartmentMap || {};
          taskOverrides = sData.taskRowOverrides || {};
          const monthDeleted = sData.deletedTaskRowIdsByMonth?.[selectedMonth] || [];
          monthDeletedSet = new Set(monthDeleted.map((s: string) => s.toLowerCase().trim()));
          customRows = sData.customTaskRows || [];
        }
      } catch (err) {
        console.warn('Could not load upload_settings:', err);
      }

      setDeletedSet(monthDeletedSet);

      // Fetch media_content_categories
      const catSnap = await getDocs(collection(db, 'media_content_categories')).catch(() => ({ docs: [] } as any));
      let loadedCats: UploadCategoryRow[] = catSnap.docs.map((d: any) => {
        const data = d.data();
        const override = taskOverrides[d.id] || taskOverrides[data.name] || {};
        const title = override.title || data.name || 'Untitled Task';
        const type = override.contentType || data.type || 'post';
        const mappedDept = override.departmentId !== undefined
          ? override.departmentId
          : (savedMapping[d.id] || resolveCanonicalDept(title || ''));
        const enabledPlatforms = override.enabledPlatforms;

        return {
          id: d.id,
          serialNo: data.serialNo || 0,
          name: title,
          type: type,
          defaultRole: data.defaultRole || 'all',
          departmentId: mappedDept,
          enabledPlatforms
        };
      });

      // Fallback to default categories if none exist in creation
      if (loadedCats.length === 0) {
        loadedCats = DEFAULT_CATEGORIES.map((def, idx) => {
          const override = taskOverrides[`default_${idx + 1}`] || taskOverrides[def.name] || {};
          const title = override.title || def.name;
          const type = override.contentType || def.type;
          const mappedDept = override.departmentId !== undefined
            ? override.departmentId
            : resolveCanonicalDept(title);
          return {
            id: `default_${idx + 1}`,
            serialNo: def.serialNo,
            name: title,
            type: type,
            defaultRole: def.defaultRole,
            departmentId: mappedDept,
            enabledPlatforms: override.enabledPlatforms
          };
        });
      }

      // Append custom upload task rows
      customRows.forEach((cr: any) => {
        const override = taskOverrides[cr.id] || taskOverrides[cr.name] || {};
        loadedCats.push({
          id: cr.id,
          serialNo: cr.serialNo || loadedCats.length + 1,
          name: override.title || cr.name,
          type: override.contentType || cr.type || 'graphic',
          departmentId: override.departmentId !== undefined ? override.departmentId : cr.departmentId,
          enabledPlatforms: override.enabledPlatforms || cr.enabledPlatforms,
          isCustom: true
        });
      });

      // Filter out rows deleted for this month
      loadedCats = loadedCats.filter(
        (c) => !monthDeletedSet.has(c.id.toLowerCase()) && !monthDeletedSet.has(c.name.toLowerCase().trim())
      );

      loadedCats.sort((a, b) => (a.serialNo || 0) - (b.serialNo || 0));
      setCategories(loadedCats);
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Fetch upload_items for selectedMonth (1 single query per month load)
  const loadMonthItems = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'upload_items'), where('month', '==', selectedMonth));
      const snap = await getDocs(q);

      const loadedItems: UploadItemDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any)
      }));

      // Sort client-side by date ASC
      loadedItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[UploadSheet] Loaded ${loadedItems.length} items for ${selectedMonth} (1 Firestore query).`);
      }

      setItems(loadedItems);
    } catch (err: any) {
      console.error('Failed to load upload items:', err);
      toast.error('Failed to load upload sheet for ' + selectedMonth);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadMonthItems();
  }, [loadMonthItems]);

  // Combine categories with any ad-hoc/custom tasks found in items
  const combinedCategories = useMemo(() => {
    const list = [...categories];
    const knownNames = new Set(list.map((c) => c.name.toLowerCase().trim()));
    let nextSr = list.length > 0 ? Math.max(...list.map((c) => c.serialNo || 0)) + 1 : 1;

    items.forEach((it) => {
      const taskName = (it.title || it.creationCategoryName || '').trim();
      const isDeleted =
        (it.creationCategoryId && deletedSet.has(it.creationCategoryId.toLowerCase())) ||
        deletedSet.has(taskName.toLowerCase());
      if (taskName && !isDeleted && !knownNames.has(taskName.toLowerCase())) {
        knownNames.add(taskName.toLowerCase());
        list.push({
          id: it.creationCategoryId || `item_cat_${taskName}`,
          serialNo: nextSr++,
          name: taskName,
          type: it.contentType === 'video' ? 'video' : 'graphic',
          departmentId: it.departmentId || resolveCanonicalDept(taskName)
        });
      }
    });

    return list;
  }, [categories, items]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const py = prevDate.getFullYear();
    const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${py}-${pm}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const ny = nextDate.getFullYear();
    const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${ny}-${nm}`);
  };

  const handleGenerateSheet = async () => {
    if (!window.confirm(`Generate Upload Sheet from Creation Calendar for ${selectedMonth}?`)) return;
    try {
      setGenerating(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await generateUploadSheet(selectedMonth, idToken);

      if (res.success) {
        toast.success(
          `Sheet generated! ${res.countCreated} items created, ${res.countExisting} already existed.`
        );
        await loadMonthItems();
        await loadCategories();
      } else {
        toast.error(res.error || 'Failed to generate sheet');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error generating sheet');
    } finally {
      setGenerating(false);
    }
  };

  const handleSyncCalendar = async () => {
    try {
      setSyncing(true);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await syncFromCreation(selectedMonth, idToken);

      if (res.success) {
        toast.success(`Sync complete! ${res.updatedCount} items updated, ${res.orphanedCount} orphaned.`);
        await loadMonthItems();
        await loadCategories();
      } else {
        toast.error(res.error || 'Sync failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error syncing calendar');
    } finally {
      setSyncing(false);
    }
  };

  const handleEditTask = (task: UploadCategoryRow) => {
    setEditingTaskRow(task);
    setIsEditModalOpen(true);
  };

  const handleAddTask = () => {
    setEditingTaskRow(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteTask = async (task: UploadCategoryRow) => {
    if (
      !window.confirm(
        `Delete "${task.name}" and all its upload items from the ${selectedMonth} upload sheet?\n\nThis will remove the task rows from this month's matrix.`
      )
    ) {
      return;
    }
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await deleteUploadTaskRow(selectedMonth, task.id, task.name, idToken);
      if (res.success) {
        toast.success(`Task "${task.name}" deleted from Upload Sheet.`);
        await loadCategories();
        await loadMonthItems();
      } else {
        toast.error(res.error || 'Failed to delete task.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting task.');
    }
  };

  const handleCellClick = (item: UploadItemDoc, platform: UploadPlatformKey) => {
    setSelectedDrawerItem(item);
    setFocusedPlatform(platform);
    setIsDrawerOpen(true);
  };

  const handleItemUpdated = (updatedItem: UploadItemDoc) => {
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
    if (selectedDrawerItem?.id === updatedItem.id) {
      setSelectedDrawerItem(updatedItem);
    }
  };

  // ── Metrics & Aggregations ────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalTargetTasks = 0; // items * 6 (or custom per task)
    let postedCount = 0;
    let skippedCount = 0;
    let overdueCount = 0;
    let needsDeptCount = 0;

    // Build lookup for active platforms per task
    const categoryPlatformMap = new Map<string, UploadPlatformKey[]>();
    combinedCategories.forEach((c) => {
      if (c.enabledPlatforms && c.enabledPlatforms.length > 0) {
        categoryPlatformMap.set(c.id, c.enabledPlatforms);
        categoryPlatformMap.set(c.name.toLowerCase().trim(), c.enabledPlatforms);
      }
    });

    items.forEach((it) => {
      if (it.syncStatus === 'needs_department' || !it.departmentId) {
        needsDeptCount++;
      }

      const activeKeys =
        categoryPlatformMap.get(it.creationCategoryId || '') ||
        categoryPlatformMap.get((it.title || '').toLowerCase().trim()) ||
        DEFAULT_PLATFORM_KEYS;

      activeKeys.forEach((p) => {
        totalTargetTasks++;
        const pStatus = it.platforms?.[p]?.status || 'todo';
        if (pStatus === 'posted') postedCount++;
        else if (pStatus === 'skipped') skippedCount++;
        else if (it.date < todayKarachi) overdueCount++;
      });
    });

    const completionRate =
      totalTargetTasks > 0 ? Math.round((postedCount / totalTargetTasks) * 100) : 0;

    return {
      totalTargetTasks,
      postedCount,
      skippedCount,
      overdueCount,
      needsDeptCount,
      completionRate
    };
  }, [items, combinedCategories, todayKarachi]);

  // ── Filtered Items for List View ──────────────────────────────────────────
  const filteredItems = useMemo(() => {
    // Build lookup for active platforms per task
    const categoryPlatformMap = new Map<string, UploadPlatformKey[]>();
    combinedCategories.forEach((c) => {
      if (c.enabledPlatforms && c.enabledPlatforms.length > 0) {
        categoryPlatformMap.set(c.id, c.enabledPlatforms);
        categoryPlatformMap.set(c.name.toLowerCase().trim(), c.enabledPlatforms);
      }
    });

    return items.filter((item) => {
      // Department
      if (deptFilter !== 'all') {
        if (deptFilter === 'needs_dept') {
          if (item.syncStatus !== 'needs_department' && item.departmentId) return false;
        } else if (item.departmentId !== deptFilter) {
          return false;
        }
      }

      // Content Type
      if (typeFilter !== 'all' && item.contentType !== typeFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'all') {
        const activeKeys =
          categoryPlatformMap.get(item.creationCategoryId || '') ||
          categoryPlatformMap.get((item.title || '').toLowerCase().trim()) ||
          DEFAULT_PLATFORM_KEYS;
        const platformStatuses = activeKeys.map((p) => item.platforms?.[p]?.status || 'todo');
        const hasPosted = platformStatuses.includes('posted');
        const hasPending = platformStatuses.some((s) => s === 'todo' || s === 'ready' || s === 'scheduled');
        const hasOverdue = item.date < todayKarachi && hasPending;

        if (statusFilter === 'posted' && !hasPosted) return false;
        if (statusFilter === 'pending' && !hasPending) return false;
        if (statusFilter === 'overdue' && !hasOverdue) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = item.title.toLowerCase().includes(q);
        const inCaption = item.caption.toLowerCase().includes(q);
        const inDate = item.date.includes(q);
        if (!inTitle && !inCaption && !inDate) return false;
      }

      return true;
    });
  }, [items, deptFilter, statusFilter, typeFilter, searchQuery, todayKarachi]);

  return (
    <div className="space-y-6">
      {/* ── Top Control Bar: Month Selector, View Switcher & Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs print:hidden">
        {/* Month Selector & View Switcher */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Month Stepper */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Upload Sheet</span>
              <span className="text-base font-black text-gray-900 font-mono">{selectedMonth}</span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={14} />
              <span>30-Day Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List size={14} />
              <span>Item List</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMappingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition active:scale-95 shadow-2xs cursor-pointer"
            title="Configure category-to-department routing"
          >
            <LayersIcon size={14} className="text-indigo-600" />
            <span>Category Mappings</span>
          </button>

          <button
            type="button"
            onClick={handleSyncCalendar}
            disabled={syncing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition active:scale-95 shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Sync metadata changes from Creation Calendar without overwriting posted items"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-indigo-600' : 'text-gray-500'} />
            <span>{syncing ? 'Syncing...' : 'Sync Calendar'}</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateSheet}
            disabled={generating || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Idempotently create upload items for all planned tasks in Creation Calendar"
          >
            <Sparkles size={14} />
            <span>{generating ? 'Generating...' : 'Generate Sheet from Calendar'}</span>
          </button>
        </div>
      </div>

      {/* ── Progress & Operational Metrics Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        {/* Total Progress */}
        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-1">
            <span>Overall Posted</span>
            <span className="text-emerald-600">{metrics.completionRate}%</span>
          </div>
          <div className="text-xl font-black text-gray-900 font-mono">
            {metrics.postedCount} <span className="text-xs text-gray-400 font-normal">/ {metrics.totalTargetTasks}</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>

        {/* Content Items Count */}
        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-bold mb-1">Content Items</span>
          <div className="text-xl font-black text-gray-900 font-mono">
            {items.length} <span className="text-xs text-gray-400 font-normal">Items</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2">× 6 Targets = {metrics.totalTargetTasks} Tasks</span>
        </div>

        {/* Overdue Flag */}
        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-bold mb-1">Overdue Tasks</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-rose-600 font-mono">{metrics.overdueCount}</span>
            {metrics.overdueCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Action Req.
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 mt-2">Past planned date</span>
        </div>

        {/* Needs Department Alert */}
        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-bold mb-1">Needs Dept</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-amber-600 font-mono">{metrics.needsDeptCount}</span>
            {metrics.needsDeptCount > 0 && (
              <button
                type="button"
                onClick={() => setIsMappingModalOpen(true)}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition underline cursor-pointer"
              >
                Assign
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-400 mt-2">Unmapped creation rows</span>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search task, platform, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Dept filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="all">All Departments</option>
            <option value="needs_dept">⚠ Needs Department Only</option>
            {Object.values(CANONICAL_DEPARTMENTS).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name.replace('KhanHub ', '')}
              </option>
            ))}
          </select>

          {/* Type filter (List view only) */}
          {viewMode === 'list' && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
            >
              <option value="all">All Content Types</option>
              <option value="video">Videos Only</option>
              <option value="image">Graphics Only</option>
            </select>
          )}

          {/* Status filter (List view only) */}
          {viewMode === 'list' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Has Pending Targets</option>
              <option value="posted">Has Posted Targets</option>
              <option value="overdue">Overdue Items Only</option>
            </select>
          )}
        </div>
      </div>

      {/* ── Main View: Matrix Grid (Default) vs Item List ── */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-gray-500">Loading upload sheet for {selectedMonth}...</p>
          </div>
        </div>
      ) : viewMode === 'matrix' ? (
        /* ── 30-Day Calendar Matrix with 6 Platform Rows per Task ── */
        <UploadCalendarMatrix
          categories={combinedCategories}
          items={items}
          selectedMonth={selectedMonth}
          matrixRange={matrixRange}
          setMatrixRange={setMatrixRange}
          todayKarachi={todayKarachi}
          onCellClick={handleCellClick}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onAddTask={handleAddTask}
          departmentFilter={deptFilter}
          searchQuery={searchQuery}
        />
      ) : (
        /* ── Item List Table View ── */
        <UploadMatrixTable
          items={filteredItems}
          onCellClick={handleCellClick}
          todayKarachi={todayKarachi}
        />
      )}

      {/* ── Task Detail Slide-out Drawer ── */}
      <TaskDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={selectedDrawerItem}
        focusedPlatform={focusedPlatform}
        onItemUpdated={handleItemUpdated}
        enabledPlatforms={
          selectedDrawerItem
            ? combinedCategories.find(
                (c) =>
                  c.id === selectedDrawerItem.creationCategoryId ||
                  c.name.toLowerCase().trim() === (selectedDrawerItem.title || '').toLowerCase().trim()
              )?.enabledPlatforms
            : undefined
        }
      />

      {/* ── Edit Upload Task Modal ── */}
      <EditUploadTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={editingTaskRow}
        month={selectedMonth}
        onSaved={async () => {
          await loadCategories();
          await loadMonthItems();
        }}
      />

      {/* ── Category Mapping Modal ── */}
      <CategoryMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        categories={combinedCategories}
        onSaved={async () => {
          await loadCategories();
          await loadMonthItems();
        }}
      />
    </div>
  );
}
