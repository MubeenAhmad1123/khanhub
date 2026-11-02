// apps/web/src/components/upload/UploadingSheetView.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Sparkles, Filter,
  Building2, Layers, AlertCircle, CheckCircle2, Clock, Search, Layers as LayersIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import {
  UploadItemDoc,
  UploadPlatformKey,
  ALL_PLATFORM_KEYS
} from '@/lib/upload/types';
import {
  CANONICAL_DEPARTMENTS,
  CanonicalDeptId
} from '@/lib/upload/departmentRegistry';
import {
  generateUploadSheet,
  syncFromCreation
} from '@/lib/upload/uploadActions';
import { UploadMatrixTable } from './UploadMatrixTable';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { CategoryMappingModal } from './CategoryMappingModal';

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
  const [creationCategories, setCreationCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Load Creation Categories for the mapping modal
  useEffect(() => {
    getDocs(collection(db, 'media_content_categories'))
      .then((snap) => {
        const cats = snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || 'Category' }));
        setCreationCategories(cats);
      })
      .catch((err) => console.warn('Could not fetch categories for mapping:', err));
  }, []);

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
      } else {
        toast.error(res.error || 'Sync failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error syncing calendar');
    } finally {
      setSyncing(false);
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
    let totalTargetTasks = items.length * 6; // 6 platforms per item
    let postedCount = 0;
    let skippedCount = 0;
    let overdueCount = 0;
    let needsDeptCount = 0;

    items.forEach((item) => {
      if (!item.departmentId) needsDeptCount++;
      const isPast = item.date < todayKarachi;

      ALL_PLATFORM_KEYS.forEach((pk) => {
        const st = item.platforms[pk]?.status || 'todo';
        if (st === 'posted') postedCount++;
        else if (st === 'skipped') skippedCount++;
        else if (isPast) overdueCount++;
      });
    });

    const completionRate = totalTargetTasks > 0 ? Math.round((postedCount / totalTargetTasks) * 100) : 0;

    return {
      totalTargetTasks,
      postedCount,
      skippedCount,
      overdueCount,
      needsDeptCount,
      completionRate
    };
  }, [items, todayKarachi]);

  // ── Filtered Items List ───────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Dept filter
      if (deptFilter === 'needs_dept') {
        if (item.departmentId) return false;
      } else if (deptFilter !== 'all') {
        if (item.departmentId !== deptFilter) return false;
      }

      // Content Type filter
      if (typeFilter !== 'all' && item.contentType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const hasPosted = ALL_PLATFORM_KEYS.some((pk) => item.platforms[pk]?.status === 'posted');
        const hasPending = ALL_PLATFORM_KEYS.some((pk) => item.platforms[pk]?.status === 'todo');
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
      {/* ── Top Control Bar: Month Selector & Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
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
            className="p-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMappingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition active:scale-95 shadow-2xs"
            title="Configure category-to-department routing"
          >
            <LayersIcon size={14} className="text-indigo-600" />
            <span>Category Mappings</span>
          </button>

          <button
            type="button"
            onClick={handleSyncCalendar}
            disabled={syncing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition active:scale-95 shadow-2xs disabled:opacity-50"
            title="Sync metadata changes from Creation Calendar without overwriting posted items"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-indigo-600' : 'text-gray-500'} />
            <span>{syncing ? 'Syncing...' : 'Sync Calendar'}</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateSheet}
            disabled={generating || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xs transition active:scale-95 disabled:opacity-50"
            title="Idempotently create upload items for all planned tasks in Creation Calendar"
          >
            <Sparkles size={14} />
            <span>{generating ? 'Generating...' : 'Generate Sheet from Calendar'}</span>
          </button>
        </div>
      </div>

      {/* ── Progress & Operational Metrics Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition underline"
              >
                Assign
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-400 mt-2">Unmapped creation rows</span>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search title, date, caption..."
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

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="all">All Content Types</option>
            <option value="video">Videos Only</option>
            <option value="image">Graphics Only</option>
          </select>

          {/* Status filter */}
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
        </div>
      </div>

      {/* ── Main Matrix Table ── */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-gray-500">Loading upload sheet for {selectedMonth}...</p>
          </div>
        </div>
      ) : (
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
      />

      {/* ── Category Mapping Modal ── */}
      <CategoryMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        categories={creationCategories}
        onSaved={loadMonthItems}
      />
    </div>
  );
}

