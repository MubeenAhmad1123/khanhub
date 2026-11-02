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
  Ban, Layers, Printer, ChevronRight, Video, Image as ImageIcon
} from 'lucide-react';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaWhatsapp,
  FaGlobe
} from 'react-icons/fa';

export interface UploadCategoryRow {
  id: string;
  serialNo: number;
  name: string;
  type?: 'video' | 'graphic' | 'post' | 'custom' | string;
  defaultRole?: 'editor' | 'designer' | 'all' | string;
  departmentId?: string | null;
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
    key: 'whatsapp',
    label: 'WhatsApp',
    subSr: 5,
    icon: FaWhatsapp,
    iconColor: 'text-[#25D366]',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200'
  },
  {
    key: 'website',
    label: 'Website',
    subSr: 6,
    icon: FaGlobe,
    iconColor: 'text-[#0284C7]',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-200'
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

  return (
    <div className="space-y-4">
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

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print or export as PDF"
          >
            <Printer size={14} />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* ── Printable Header Banner (Only visible on paper printout) ── */}
      <div className="hidden print:block mb-4 pb-2 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">KHANHUB — SOCIAL MEDIA CONTENT UPLOADING SHEET</h1>
            <p className="text-xs font-bold text-gray-700 mt-0.5">
              Month/Cycle: {monthTitle} · Multi-Platform Social & Web Publishing Matrix (6 Channels / Task)
            </p>
          </div>
          <div className="text-right text-xs font-mono font-bold">
            <p>Generated: {new Date().toLocaleDateString('en-GB')}</p>
            <p>Status: Active Publishing Sheet</p>
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
                className="px-2 sm:px-3 py-3 text-center border-r border-slate-700 w-12 sticky left-0 z-20 bg-slate-900 print:border-black print:w-10 print:static"
              >
                S.No
              </th>
              <th
                scope="col"
                className="px-3 sm:px-4 py-3 text-left border-r border-slate-700 min-w-[200px] sm:min-w-[280px] sticky left-12 z-20 bg-slate-900 print:border-black print:min-w-[160px] print:static"
              >
                Content Task & Target Platform
              </th>
              {matrixDays.map((dayStr) => {
                const dayNum = parseInt(dayStr.split('-')[2], 10);
                const dayOfWeek = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
                const isToday = dayStr === todayKarachi;
                return (
                  <th
                    key={dayStr}
                    scope="col"
                    className={`px-1.5 py-2 text-center border-r border-slate-700 min-w-[48px] sm:min-w-[56px] ${
                      isToday ? 'bg-indigo-600 text-white font-black ring-2 ring-indigo-400' : ''
                    } print:border-black print:min-w-[24px]`}
                  >
                    <div className="leading-tight">
                      <span className="block text-[8px] opacity-75 font-semibold uppercase">{dayOfWeek}</span>
                      <span className="text-xs sm:text-sm font-bold">{dayNum}</span>
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

                return (
                  <React.Fragment key={cat.id || cat.name}>
                    {PLATFORM_CONFIGS.map((platform, pIdx) => {
                      const isFirstPlatformInGroup = pIdx === 0;
                      const isLastPlatformInGroup = pIdx === PLATFORM_CONFIGS.length - 1;
                      const streamlinedSr = `${catSr}.${platform.subSr}`;
                      const PlatformIcon = platform.icon;

                      return (
                        <tr
                          key={`${cat.id || cat.name}_${platform.key}`}
                          className={`transition-colors hover:bg-slate-50/90 ${
                            isFirstPlatformInGroup ? 'border-t-2 border-slate-300' : ''
                          } ${isEvenCategory ? 'bg-white' : 'bg-slate-50/30'}`}
                        >
                          {/* ── Serial Number (Sticky Left 0) ── */}
                          <td
                            className={`px-2 py-2 text-center font-mono font-black text-slate-600 border-r border-gray-200 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:text-black print:static print:shadow-none ${
                              isEvenCategory ? 'bg-white' : 'bg-[#fafafa]'
                            }`}
                          >
                            <span className="text-[11px] font-black">{streamlinedSr}</span>
                          </td>

                          {/* ── Task Name + Platform (Sticky Left 12) ── */}
                          <td
                            className={`px-3 py-2 border-r border-gray-200 sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:static print:shadow-none ${
                              isEvenCategory ? 'bg-white' : 'bg-[#fafafa]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
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

                              {/* Content Type Indicator on first row of category */}
                              {isFirstPlatformInGroup && (
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0 print:hidden">
                                  {cat.type || 'task'}
                                </span>
                              )}
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

                            // Print representation
                            const printIcon = status === 'posted' ? '✓' : status === 'skipped' ? '—' : ' ';

                            if (!item) {
                              return (
                                <td
                                  key={dayStr}
                                  className="px-1 py-1.5 text-center border-r border-gray-200 text-slate-300 print:border-black print:text-black"
                                >
                                  <span className="text-slate-300 select-none print:hidden">·</span>
                                  <span className="hidden print:inline font-mono"> </span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={dayStr}
                                className={`px-1 py-1.5 text-center border-r border-gray-200 transition-colors relative print:border-black ${
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

                                {/* Paper Print View */}
                                <div className="hidden print:block font-mono text-center font-black">
                                  {printIcon}
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
