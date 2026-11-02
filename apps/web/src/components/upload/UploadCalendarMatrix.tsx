// apps/web/src/components/upload/UploadCalendarMatrix.tsx
'use client';

import React, { useMemo } from 'react';
import {
  UploadItemDoc,
  UploadPlatformKey,
  UploadPlatformStatus,
  ALL_PLATFORM_KEYS
} from '@/lib/upload/types';
import {
  Check, CheckSquare, ExternalLink, Clock, AlertTriangle,
  Ban, Layers, Printer, ChevronRight, Video, Image as ImageIcon,
  Edit3, Trash2, Plus
} from 'lucide-react';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaGlobe,
  FaLinkedin
} from 'react-icons/fa';

export interface UploadCategoryRow {
  id: string;
  serialNo: number;
  name: string;
  type?: 'video' | 'graphic' | 'post' | 'custom' | string;
  defaultRole?: 'editor' | 'designer' | 'all' | string;
  departmentId?: string | null;
  enabledPlatforms?: UploadPlatformKey[];
  isCustom?: boolean;
}

interface UploadCalendarMatrixProps {
  categories: UploadCategoryRow[];
  items: UploadItemDoc[];
  selectedMonth: string; // 'YYYY-MM'
  matrixRange: 'week' | 'half1' | 'half2' | 'full';
  setMatrixRange: (range: 'week' | 'half1' | 'half2' | 'full') => void;
  todayKarachi: string; // 'YYYY-MM-DD'
  onCellClick: (item: UploadItemDoc, platform: UploadPlatformKey) => void;
  onEmptyCellClick?: (date: string, category: UploadCategoryRow) => void;
  onEditTask?: (task: UploadCategoryRow) => void;
  onDeleteTask?: (task: UploadCategoryRow) => void;
  onAddTask?: () => void;
  departmentFilter?: string;
  searchQuery?: string;
}

interface PlatformMeta {
  key: UploadPlatformKey;
  label: string;
  subSr: number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const PLATFORM_CONFIGS: PlatformMeta[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    subSr: 1,
    icon: FaFacebook,
    iconColor: 'text-[#1877F2]',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200'
  },
  {
    key: 'instagram',
    label: 'Instagram',
    subSr: 2,
    icon: FaInstagram,
    iconColor: 'text-[#E4405F]',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-700',
    badgeBorder: 'border-pink-200'
  },
  {
    key: 'youtube',
    label: 'YouTube',
    subSr: 3,
    icon: FaYoutube,
    iconColor: 'text-[#FF0000]',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-200'
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    subSr: 4,
    icon: FaTiktok,
    iconColor: 'text-slate-900',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300'
  },
  {
    key: 'website',
    label: 'Website',
    subSr: 5,
    icon: FaGlobe,
    iconColor: 'text-[#0284C7]',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-200'
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    subSr: 6,
    icon: FaLinkedin,
    iconColor: 'text-[#0A66C2]',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-300'
  }
];

export function UploadCalendarMatrix({
  categories,
  items,
  selectedMonth,
  matrixRange,
  setMatrixRange,
  todayKarachi,
  onCellClick,
  onEmptyCellClick,
  onEditTask,
  onDeleteTask,
  onAddTask,
  departmentFilter = 'all',
  searchQuery = ''
}: UploadCalendarMatrixProps) {
  // ── Calculate Month Days ──
  const daysInSelectedMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return [];
    const monthIdx = m - 1;
    const date = new Date(y, monthIdx, 1);
    const days: string[] = [];
    while (date.getMonth() === monthIdx) {
      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      days.push(`${yearStr}-${monthStr}-${dayStr}`);
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedMonth]);

  // 7-day helper around today or first day
  const selectedWeekDays = useMemo(() => {
    const anchor = daysInSelectedMonth.includes(todayKarachi)
      ? todayKarachi
      : (daysInSelectedMonth[0] || todayKarachi);
    const curr = new Date(anchor);
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
  }, [daysInSelectedMonth, todayKarachi]);

  // Matrix Days depending on range
  const matrixDays = useMemo(() => {
    if (matrixRange === 'half1') return daysInSelectedMonth.slice(0, 15);
    if (matrixRange === 'half2') return daysInSelectedMonth.slice(15);
    if (matrixRange === 'week') return selectedWeekDays;
    return daysInSelectedMonth;
  }, [daysInSelectedMonth, matrixRange, selectedWeekDays]);

  // Month Title for heading
  const monthTitle = useMemo(() => {
    try {
      return new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  // Filter Categories
  const filteredCategories = useMemo(() => {
    let list = [...categories];

    // Department filter
    if (departmentFilter !== 'all') {
      list = list.filter((cat) => {
        if (departmentFilter === 'unmapped') return !cat.departmentId;
        return cat.departmentId === departmentFilter;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((cat) => cat.name.toLowerCase().includes(q));
    }

    return list;
  }, [categories, departmentFilter, searchQuery]);

  // Fast item lookup map: `${date}_${catIdOrName}` -> UploadItemDoc
  const itemLookup = useMemo(() => {
    const map = new Map<string, UploadItemDoc>();
    items.forEach((it) => {
      if (it.date) {
        if (it.creationCategoryId) {
          map.set(`${it.date}_${it.creationCategoryId}`, it);
        }
        if (it.title) {
          map.set(`${it.date}_${it.title.toLowerCase().trim()}`, it);
        }
        if (it.creationCategoryName) {
          map.set(`${it.date}_${it.creationCategoryName.toLowerCase().trim()}`, it);
        }
      }
    });
    return map;
  }, [items]);

  const getItemForCell = (dayStr: string, cat: UploadCategoryRow): UploadItemDoc | undefined => {
    if (cat.id) {
      const byId = itemLookup.get(`${dayStr}_${cat.id}`);
      if (byId) return byId;
    }
    const byName = itemLookup.get(`${dayStr}_${cat.name.toLowerCase().trim()}`);
    if (byName) return byName;
    return undefined;
  };

  // Handler for Print / PDF Export — ensures all days are rendered
  const handlePrintSheet = () => {
    setMatrixRange('full');
    setTimeout(() => {
      window.print();
    }, 120);
  };

  return (
    <div className="space-y-4">
      {/* ── Printable CSS Rules for Paper & PDF Export (Pure B&W Landscape A4) ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape A4;
            margin: 5mm;
          }
          
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide UI Chrome, sidebars, navigation, drawers, modals */
          header, footer, nav, aside,
          .print\\:hidden,
          button,
          input,
          select,
          div[class*="fixed"],
          div[class*="sticky"],
          div[class*="toast"],
          div[class*="drawer"],
          div[class*="modal"] {
            display: none !important;
          }

          /* Reset layout wrappers to eliminate sidebar offset (margin-left: 16rem) */
          div[class*="min-h-screen"],
          div[class*="lg\\:ml-"],
          div[class*="max-w-"],
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            position: static !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          .print\\:block {
            display: block !important;
          }
          .print\\:flex {
            display: flex !important;
          }

          /* Table Container with clean 1.5px black border */
          .matrix-table-container {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            border: 1.5px solid #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .matrix-table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 7pt !important;
            table-layout: auto !important;
          }

          .matrix-table th,
          .matrix-table td {
            border: 1px solid #000000 !important;
            padding: 2px 1px !important;
            text-align: center !important;
            color: #000000 !important;
            position: static !important;
            box-shadow: none !important;
            background: #ffffff !important;
            min-width: 0 !important;
          }

          .matrix-table th {
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            font-size: 6.5pt !important;
            color: #000000 !important;
          }

          /* S.No column on paper */
          .print-col-sr {
            width: 26px !important;
            min-width: 26px !important;
            max-width: 26px !important;
            font-weight: 800 !important;
            font-size: 6.5pt !important;
          }

          /* Task & Platform column on paper */
          .print-col-task {
            width: 250px !important;
            min-width: 250px !important;
            max-width: 250px !important;
            text-align: left !important;
            padding: 2px 4px !important;
            font-size: 6.5pt !important;
          }

          /* Square Checkbox Box - "Good boxes" matching Creation sheet */
          .print-checkbox {
            width: 11px !important;
            height: 11px !important;
            min-width: 11px !important;
            min-height: 11px !important;
            border: 1px solid #000000 !important;
            border-radius: 1.5px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-weight: 900 !important;
            font-size: 7.5pt !important;
            line-height: 1 !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── Section Header with Range Switcher & Print Button ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
            <CheckSquare className="text-indigo-600" size={20} />
            Content Upload Matrix ({monthTitle})
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Streamlined serial numbers · 6 platform targets per task row · Tap any cell to view details, add URL, or update status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Range Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] sm:text-xs font-bold overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMatrixRange('week')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                matrixRange === 'week' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              7 Days (Mobile)
            </button>
            <button
              type="button"
              onClick={() => setMatrixRange('half1')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                matrixRange === 'half1' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              1–15
            </button>
            <button
              type="button"
              onClick={() => setMatrixRange('half2')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                matrixRange === 'half2' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              16–{daysInSelectedMonth.length}
            </button>
            <button
              type="button"
              onClick={() => setMatrixRange('full')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                matrixRange === 'full' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Full Month
            </button>
          </div>

          {/* Add Task Row Button */}
          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Add a new custom task row to the upload sheet"
            >
              <Plus size={15} />
              <span>Add Task Row</span>
            </button>
          )}

          {/* Print / Save PDF Button */}
          <button
            type="button"
            onClick={handlePrintSheet}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Print or export all days as black & white PDF with checkbox boxes"
          >
            <Printer size={15} />
            <span>Print / Save PDF (All Days)</span>
          </button>
        </div>
      </div>

      {/* ── Printable Header Banner (Only visible on paper printout) ── */}
      <div className="hidden print:block mb-3 pb-2 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black uppercase tracking-tight text-black">
                KHANHUB — CONTENT UPLOADING SHEET
              </h1>
              <span className="text-[7.5pt] font-black uppercase px-2 py-0.5 bg-black text-white rounded">
                {monthTitle}
              </span>
            </div>
            <p className="text-[7.5pt] font-bold text-gray-800 mt-0.5">
              Monthly Multi-Platform Publishing & Distribution Matrix · Multi-Platform Publishing Matrix
            </p>
          </div>
          <div className="text-right text-[7pt] font-mono font-bold text-black leading-tight">
            <p>Printed: {new Date().toLocaleDateString('en-GB')}</p>
            <p className="mt-0.5">Legend: [ ✓ ] Posted &nbsp; [ — ] Skipped &nbsp; [ &nbsp; ] Pending</p>
          </div>
        </div>
      </div>

      {/* ── Matrix Table Container with Sticky Task Name Column ── */}
      <div className="matrix-table-container overflow-x-auto w-full border border-gray-200 rounded-2xl print:border-black shadow-inner bg-white">
        <table className="matrix-table min-w-full divide-y divide-gray-200 text-xs border-collapse">
          {/* Table Head */}
          <thead className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider print:bg-gray-100 print:text-black">
            <tr>
              <th
                scope="col"
                className="px-2 sm:px-3 py-3 text-center border-r border-slate-700 w-12 sticky left-0 z-20 bg-slate-900 print:border-black print:w-[26px] print:min-w-[26px] print:max-w-[26px] print:bg-slate-100 print:text-black print:static print:p-1"
              >
                S.No
              </th>
              <th
                scope="col"
                className="px-3 sm:px-4 py-3 text-left border-r border-slate-700 min-w-[200px] sm:min-w-[280px] sticky left-12 z-20 bg-slate-900 print:border-black print:w-[250px] print:min-w-[250px] print:max-w-[250px] print:bg-slate-100 print:text-black print:static print:p-1 print-col-task"
              >
                Content Task, Target Platform & Type
              </th>
              {matrixDays.map((dayStr) => {
                const dayNum = parseInt(dayStr.split('-')[2], 10);
                const dayOfWeek = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
                const isToday = dayStr === todayKarachi;
                return (
                  <th
                    key={dayStr}
                    scope="col"
                    className={`px-1.5 py-2 text-center border-r border-slate-700 min-w-[48px] sm:min-w-[56px] print:min-w-0 print:w-auto print:border-black print:bg-slate-100 print:text-black print:p-0.5 ${
                      isToday ? 'bg-indigo-600 text-white font-black ring-2 ring-indigo-400 print:bg-slate-100 print:ring-0' : ''
                    }`}
                  >
                    <div className="leading-tight">
                      <span className="block text-[8px] opacity-75 font-semibold uppercase print:text-[6pt] print:opacity-100">{dayOfWeek}</span>
                      <span className="text-xs sm:text-sm font-bold print:text-[7pt]">{dayNum}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-800 print:divide-black">
            {filteredCategories.length === 0 ? (
              <tr>
                <td
                  colSpan={matrixDays.length + 2}
                  className="py-12 text-center text-slate-400 italic font-semibold"
                >
                  No tasks match the filter criteria.
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat, catIdx) => {
                const catSr = cat.serialNo || catIdx + 1;
                const isEvenCategory = catIdx % 2 === 0;
                const isContentTypeVideo =
                  cat.type === 'video' ||
                  cat.name.toLowerCase().includes('video') ||
                  cat.name.toLowerCase().includes('reel') ||
                  cat.name.toLowerCase().includes('clip');
                const typeLabel = isContentTypeVideo ? 'VIDEO' : 'GRAPHIC';

                const activePlatforms = PLATFORM_CONFIGS.filter((p) => {
                  if (cat.enabledPlatforms && cat.enabledPlatforms.length > 0) {
                    return cat.enabledPlatforms.includes(p.key);
                  }
                  // Standard rows default to the 6 primary targets (LinkedIn is excluded unless explicitly enabled)
                  return p.key !== 'linkedin';
                });

                return (
                  <React.Fragment key={cat.id || cat.name}>
                    {activePlatforms.map((platform, pIdx) => {
                      const isFirstPlatformInGroup = pIdx === 0;
                      const streamlinedSr = `${catSr}.${pIdx + 1}`;
                      const PlatformIcon = platform.icon;

                      return (
                        <tr
                          key={`${cat.id || cat.name}_${platform.key}`}
                          className={`transition-colors hover:bg-slate-50/90 ${
                            isFirstPlatformInGroup ? 'border-t-2 border-slate-300 print:border-t-2 print:border-black' : ''
                          } ${isEvenCategory ? 'bg-white' : 'bg-slate-50/30'}`}
                        >
                          {/* ── Serial Number (Sticky Left 0) ── */}
                          <td
                            className={`px-2 py-2 text-center font-mono font-black text-slate-600 border-r border-gray-200 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:text-black print:static print:shadow-none print:w-[26px] print:min-w-[26px] print:max-w-[26px] print:p-1 print:text-[6.5pt] ${
                              isEvenCategory ? 'bg-white' : 'bg-[#fafafa]'
                            }`}
                          >
                            <span className="text-[11px] font-black print:text-[6.5pt]">{streamlinedSr}</span>
                          </td>

                          {/* ── Task Name + Platform (Sticky Left 12) ── */}
                          <td
                            className={`px-3 py-2 border-r border-gray-200 sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:static print:shadow-none print:w-[250px] print:min-w-[250px] print:max-w-[250px] print:p-1 print-col-task ${
                              isEvenCategory ? 'bg-white' : 'bg-[#fafafa]'
                            }`}
                          >
                            {/* Screen View */}
                            <div className="flex items-center justify-between gap-2 print:hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Platform Logo / Icon */}
                                <div
                                  className={`w-6 h-6 rounded-lg ${platform.badgeBg} border ${platform.badgeBorder} flex items-center justify-center shrink-0 shadow-2xs`}
                                  title={platform.label}
                                >
                                  <PlatformIcon size={13} className={platform.iconColor} />
                                </div>

                                {/* Task and Platform Names */}
                                <div className="min-w-0 leading-tight">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className="font-bold text-gray-900 truncate max-w-[130px] sm:max-w-[190px]"
                                      title={cat.name}
                                    >
                                      {cat.name}
                                    </span>
                                    <span
                                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${platform.badgeBg} ${platform.badgeText} border ${platform.badgeBorder} shrink-0`}
                                    >
                                      {platform.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Content Type Indicator (Video / Graphic badge) */}
                                <span
                                  className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                    isContentTypeVideo
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-purple-50 text-purple-700 border-purple-200'
                                  }`}
                                >
                                  {typeLabel}
                                </span>

                                {/* Edit & Delete Action Buttons (First row of group only) */}
                                {isFirstPlatformInGroup && (onEditTask || onDeleteTask) && (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {onEditTask && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditTask(cat);
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                        title={`Edit "${cat.name}" title, media tag & platforms`}
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                    )}
                                    {onDeleteTask && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteTask(cat);
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title={`Delete "${cat.name}" from upload sheet`}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Paper Print View: [PLATFORM] Task Name [TYPE] */}
                            <div className="hidden print:flex items-center justify-between gap-1 w-full text-black">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {/* Platform Name Badge in bold border */}
                                <span className="font-black text-[6pt] uppercase tracking-wider text-black shrink-0 px-1 py-0.5 border border-black rounded-[2px] bg-slate-100">
                                  {platform.label}
                                </span>
                                {/* Task Name */}
                                <span className="font-bold text-[6.5pt] text-black truncate max-w-[155px]" title={cat.name}>
                                  {cat.name}
                                </span>
                              </div>

                              {/* Content Type Badge: VIDEO or GRAPHIC */}
                              <span className="text-[5.5pt] font-black uppercase px-1 py-0.2 rounded border border-black text-black shrink-0">
                                {typeLabel}
                              </span>
                            </div>
                          </td>

                          {/* ── Daily Platform Status Cells ── */}
                          {matrixDays.map((dayStr) => {
                            const item = getItemForCell(dayStr, cat);
                            const platformData = item?.platforms?.[platform.key];
                            const status: UploadPlatformStatus = platformData?.status || 'todo';
                            const postUrl = platformData?.postUrl;
                            const isOverdue =
                              dayStr < todayKarachi && status !== 'posted' && status !== 'skipped';

                            if (!item) {
                              return (
                                <td
                                  key={dayStr}
                                  className="px-1 py-1 text-center border-r border-gray-200 text-slate-300 print:border-black print:text-black print:p-0.5"
                                >
                                  <span className="text-slate-300 select-none print:hidden">·</span>
                                  {/* Paper Print Empty Square Box */}
                                  <div className="hidden print:flex items-center justify-center py-0.5">
                                    <div className="print-checkbox" />
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={dayStr}
                                className={`px-1 py-1 text-center border-r border-gray-200 transition-colors relative print:border-black print:p-0.5 ${
                                  status === 'posted'
                                    ? 'bg-emerald-50/50 print:bg-transparent'
                                    : status === 'skipped'
                                    ? 'bg-slate-100/50 print:bg-transparent'
                                    : isOverdue
                                    ? 'bg-rose-50/40 print:bg-transparent'
                                    : ''
                                }`}
                              >
                                {/* Screen Interactive Cell */}
                                <div className="flex flex-col items-center justify-center print:hidden">
                                  {status === 'posted' ? (
                                    <button
                                      type="button"
                                      onClick={() => onCellClick(item, platform.key)}
                                      className="group/btn flex flex-col items-center justify-center cursor-pointer p-0.5"
                                      title={`${cat.name} [${platform.label}] (${dayStr}): Posted ✓\n${postUrl ? 'URL: ' + postUrl : 'No Link'}\nClick to view or edit`}
                                    >
                                      <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center shadow-xs group-hover/btn:scale-110 transition-transform">
                                        <Check size={13} className="stroke-[3]" />
                                      </div>
                                      {postUrl && (
                                        <span className="text-[7px] font-black text-emerald-700 mt-0.5 flex items-center gap-0.5">
                                          <ExternalLink size={7} /> URL
                                        </span>
                                      )}
                                    </button>
                                  ) : status === 'skipped' ? (
                                    <button
                                      type="button"
                                      onClick={() => onCellClick(item, platform.key)}
                                      className="group/btn flex flex-col items-center justify-center cursor-pointer p-0.5"
                                      title={`${cat.name} [${platform.label}] (${dayStr}): Skipped\nReason: ${platformData?.skipReason || 'None'}\nClick to view`}
                                    >
                                      <div className="w-6 h-6 rounded-md bg-slate-200 text-slate-500 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                                        <Ban size={11} />
                                      </div>
                                      <span className="text-[6.5px] font-black text-slate-400 uppercase mt-0.5">Skip</span>
                                    </button>
                                  ) : isOverdue ? (
                                    <button
                                      type="button"
                                      onClick={() => onCellClick(item, platform.key)}
                                      className="group/btn flex flex-col items-center justify-center cursor-pointer p-0.5"
                                      title={`${cat.name} [${platform.label}] (${dayStr}): OVERDUE\nClick to upload / mark posted`}
                                    >
                                      <div className="w-6 h-6 rounded-md bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                                        <AlertTriangle size={11} className="stroke-[2.5]" />
                                      </div>
                                      <span className="text-[7px] font-black text-rose-600 mt-0.5">Due</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onCellClick(item, platform.key)}
                                      className="group/btn flex items-center justify-center cursor-pointer p-0.5"
                                      title={`${cat.name} [${platform.label}] (${dayStr}): Pending\nClick to upload / mark posted`}
                                    >
                                      <div className="w-6 h-6 rounded-md border-2 border-dashed border-slate-300 text-slate-300 group-hover/btn:border-indigo-500 group-hover/btn:text-indigo-600 flex items-center justify-center transition-all">
                                        <Clock size={10} />
                                      </div>
                                    </button>
                                  )}
                                </div>

                                {/* Paper Print View Square Checkbox Box */}
                                <div className="hidden print:flex items-center justify-center py-0.5">
                                  <div className="print-checkbox">
                                    {status === 'posted' ? '✓' : status === 'skipped' ? '—' : ''}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
