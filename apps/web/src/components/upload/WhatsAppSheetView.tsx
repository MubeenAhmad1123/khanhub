// apps/web/src/components/upload/WhatsAppSheetView.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Sparkles, Filter,
  Building2, Layers, AlertCircle, CheckCircle2, Clock, Search,
  Radio, Users, Printer
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { auth } from '@/lib/firebase';
import {
  WhatsAppTargetKey,
  WhatsAppDailyBroadcastDoc,
  DEFAULT_WHATSAPP_TARGETS,
  WhatsAppTargetConfig
} from '@/lib/upload/whatsappTypes';
import {
  getWhatsAppMonthBroadcasts,
  setWhatsAppBroadcastAllDay
} from '@/lib/upload/whatsappActions';
import { WhatsAppMatrixTable } from './WhatsAppMatrixTable';
import { WhatsAppBroadcastDrawer } from './WhatsAppBroadcastDrawer';

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

export function WhatsAppSheetView() {
  const todayKarachi = useMemo(() => getKarachiTodayStr(), []);
  const initialMonth = todayKarachi.slice(0, 7);

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [broadcasts, setBroadcasts] = useState<WhatsAppDailyBroadcastDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Range: 'week' | 'half1' | 'half2' | 'full'
  const [matrixRange, setMatrixRange] = useState<'week' | 'half1' | 'half2' | 'full'>('full');

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'group' | 'channel'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drawer state
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<WhatsAppTargetKey | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Load Month Broadcasts from Firestore
  const loadMonthBroadcasts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getWhatsAppMonthBroadcasts(selectedMonth);
      if (res.success) {
        setBroadcasts(res.data);
      } else {
        toast.error(res.error || 'Failed to load WhatsApp broadcasts.');
      }
    } catch (err: any) {
      console.error('Failed to load broadcasts:', err);
      toast.error('Failed to load WhatsApp sheet for ' + selectedMonth);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadMonthBroadcasts();
  }, [loadMonthBroadcasts]);

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

  const handleCellClick = (date: string, targetKey: WhatsAppTargetKey) => {
    setDrawerDate(date);
    setDrawerTarget(targetKey);
    setIsDrawerOpen(true);
  };

  const handleDayUpdated = (updatedDoc: WhatsAppDailyBroadcastDoc) => {
    setBroadcasts((prev) => {
      const exists = prev.some((d) => d.date === updatedDoc.date);
      if (exists) {
        return prev.map((d) => (d.date === updatedDoc.date ? updatedDoc : d));
      }
      return [...prev, updatedDoc];
    });
  };

  // ── Metrics & Aggregations ────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return { totalBroadcasts: 0, postedCount: 0, skippedCount: 0, overdueCount: 0, completionRate: 0 };

    const daysCount = new Date(y, m, 0).getDate();
    const totalPossible = daysCount * DEFAULT_WHATSAPP_TARGETS.length; // days * 9

    const broadcastMap = new Map<string, WhatsAppDailyBroadcastDoc>();
    broadcasts.forEach((b) => broadcastMap.set(b.date, b));

    let postedCount = 0;
    let skippedCount = 0;
    let overdueCount = 0;

    for (let day = 1; day <= daysCount; day++) {
      const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayDoc = broadcastMap.get(dayStr);
      const isPast = dayStr < todayKarachi;

      DEFAULT_WHATSAPP_TARGETS.forEach((t) => {
        const s = dayDoc?.targets?.[t.key]?.status || 'todo';
        if (s === 'posted') postedCount++;
        else if (s === 'skipped') skippedCount++;
        else if (isPast) overdueCount++;
      });
    }

    const completionRate =
      totalPossible > 0 ? Math.round((postedCount / totalPossible) * 100) : 0;

    return {
      totalBroadcasts: totalPossible,
      postedCount,
      skippedCount,
      overdueCount,
      completionRate
    };
  }, [selectedMonth, broadcasts, todayKarachi]);

  const monthDisplayTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return selectedMonth;
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Drawer broadcast doc
  const currentDrawerDoc = useMemo(() => {
    if (!drawerDate) return undefined;
    return broadcasts.find((b) => b.date === drawerDate);
  }, [broadcasts, drawerDate]);

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Month Selector & Action Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs print:hidden">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-xl transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 font-black text-sm text-gray-900 select-none min-w-[140px] text-center">
              {monthDisplayTitle}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-xl transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedMonth(initialMonth)}
            className="px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition border border-gray-100 cursor-pointer"
          >
            Today
          </button>

          <button
            type="button"
            onClick={loadMonthBroadcasts}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Refresh WhatsApp Sheet"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Header Info */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <FaWhatsapp size={13} className="text-[#25D366]" />
            <span>Broadcasting 8 Groups + 1 Channel</span>
          </span>
        </div>
      </div>

      {/* ── KPI Metrics Cards Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Total Target Broadcasts */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Targets</span>
            <Users size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{metrics.totalBroadcasts}</span>
            <span className="text-xs text-gray-400 font-bold">in {monthDisplayTitle}</span>
          </div>
        </div>

        {/* Posted / Sent */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Posted Broadcasts</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{metrics.postedCount}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {metrics.completionRate}%
            </span>
          </div>
        </div>

        {/* Skipped */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Skipped</span>
            <span className="text-xs font-mono font-bold text-slate-400">—</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-600">{metrics.skippedCount}</span>
            <span className="text-xs text-gray-400 font-bold">targets</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue (Past Days)</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${metrics.overdueCount > 0 ? 'text-rose-600 animate-pulse' : 'text-gray-900'}`}>
              {metrics.overdueCount}
            </span>
            <span className="text-xs text-gray-400 font-bold">pending</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-2xs print:hidden">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search KhanHub groups or channel..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Target Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Filter:</span>
          <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-bold text-gray-600">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'hover:text-gray-900'
              }`}
            >
              All (9)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('group')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'group' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'hover:text-gray-900'
              }`}
            >
              Groups (8)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('channel')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'channel' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'hover:text-gray-900'
              }`}
            >
              Channel (1)
            </button>
          </div>
        </div>
      </div>

      {/* ── WhatsApp Matrix Table Component ── */}
      <WhatsAppMatrixTable
        broadcasts={broadcasts}
        selectedMonth={selectedMonth}
        matrixRange={matrixRange}
        setMatrixRange={setMatrixRange}
        todayKarachi={todayKarachi}
        onCellClick={handleCellClick}
        searchQuery={searchQuery}
        typeFilter={typeFilter}
      />

      {/* ── Slide-out WhatsApp Broadcast Drawer ── */}
      {drawerDate && (
        <WhatsAppBroadcastDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          date={drawerDate}
          focusedTarget={drawerTarget}
          broadcastDoc={currentDrawerDoc}
          onDayUpdated={handleDayUpdated}
        />
      )}
    </div>
  );
}

