// apps/web/src/components/upload/WhatsAppMatrixTable.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Check, CheckSquare, Clock, AlertTriangle, Printer, Radio,
  Sparkles, ExternalLink, Plus, Users
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import {
  WhatsAppTargetKey,
  WhatsAppTargetStatus,
  WhatsAppDailyBroadcastDoc,
  WhatsAppTargetConfig,
  DEFAULT_WHATSAPP_TARGETS
} from '@/lib/upload/whatsappTypes';

interface WhatsAppMatrixTableProps {
  targets?: WhatsAppTargetConfig[];
  broadcasts: WhatsAppDailyBroadcastDoc[];
  selectedMonth: string; // 'YYYY-MM'
  matrixRange: 'week' | 'half1' | 'half2' | 'full';
  setMatrixRange: (range: 'week' | 'half1' | 'half2' | 'full') => void;
  todayKarachi: string; // 'YYYY-MM-DD'
  onCellClick: (date: string, targetKey: WhatsAppTargetKey) => void;
  onBroadcastAllDay?: (date: string) => void;
  searchQuery?: string;
  typeFilter?: 'all' | 'group' | 'channel';
}

export function WhatsAppMatrixTable({
  targets = DEFAULT_WHATSAPP_TARGETS,
  broadcasts,
  selectedMonth,
  matrixRange,
  setMatrixRange,
  todayKarachi,
  onCellClick,
  onBroadcastAllDay,
  searchQuery = '',
  typeFilter = 'all'
}: WhatsAppMatrixTableProps) {
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
      : daysInSelectedMonth[0] || '';
    if (!anchor) return [];
    const anchorIdx = daysInSelectedMonth.indexOf(anchor);
    const startIdx = Math.max(0, Math.min(anchorIdx - 3, daysInSelectedMonth.length - 7));
    return daysInSelectedMonth.slice(startIdx, startIdx + 7);
  }, [daysInSelectedMonth, todayKarachi]);

  // Determine active days slice based on matrixRange
  const matrixDays = useMemo(() => {
    if (matrixRange === 'week') return selectedWeekDays;
    if (matrixRange === 'half1') return daysInSelectedMonth.slice(0, 15);
    if (matrixRange === 'half2') return daysInSelectedMonth.slice(15);
    return daysInSelectedMonth; // 'full'
  }, [matrixRange, daysInSelectedMonth, selectedWeekDays]);

  // Map of broadcasts by date
  const broadcastMap = useMemo(() => {
    const map = new Map<string, WhatsAppDailyBroadcastDoc>();
    broadcasts.forEach((b) => map.set(b.date, b));
    return map;
  }, [broadcasts]);

  // Filter targets by search and type
  const filteredTargets = useMemo(() => {
    return targets.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [targets, typeFilter, searchQuery]);

  // Month Title format: e.g. "NOVEMBER 2026"
  const monthTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return selectedMonth;
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [selectedMonth]);

  // Handler for Print / PDF Export
  const handlePrintSheet = () => {
    setMatrixRange('full');
    setTimeout(() => {
      window.print();
    }, 120);
  };

  return (
    <div className="space-y-4">
      {/* ── Printable CSS Rules for Pure B&W Landscape A4 ── */}
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

          /* Hide navigation, headers, modals */
          header, footer, nav, aside,
          .print\\:hidden,
          button,
          input,
          select,
          div[class*="fixed"],
          div[class*="sticky"],
          div[class*="drawer"] {
            display: none !important;
          }

          /* Reset layout margins */
          div[class*="min-h-screen"],
          div[class*="lg\\:ml-"],
          div[class*="max-w-"],
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }

          .matrix-table-container {
            overflow: visible !important;
            width: 100% !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            page-break-inside: auto !important;
          }

          .matrix-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 7pt !important;
          }

          .matrix-table th,
          .matrix-table td {
            border: 1px solid #000000 !important;
            padding: 2px 1px !important;
            text-align: center !important;
            color: #000000 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }

          .matrix-table th {
            font-weight: 900 !important;
            text-transform: uppercase !important;
            font-size: 6.5pt !important;
            background: #f0f0f0 !important;
          }

          .print-col-target {
            width: 220px !important;
            min-width: 220px !important;
            max-width: 220px !important;
            text-align: left !important;
            padding: 2px 4px !important;
          }

          .print-checkbox {
            display: inline-flex !important;
            width: 12px !important;
            height: 12px !important;
            border: 1.2px solid #000000 !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 8pt !important;
            font-weight: 900 !important;
            line-height: 1 !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* ── Screen Control Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-2xs print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <FaWhatsapp size={18} className="text-[#25D366]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <span>WhatsApp Distribution Matrix</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                8 Groups + 1 Channel
              </span>
            </h2>
            <p className="text-[11px] text-gray-500">
              Broadcasting the day&apos;s generated content across all 8 KhanHub Groups + Muhammad Khan Channel
            </p>
          </div>
        </div>

        {/* Range Selector & Print Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setMatrixRange('week')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                matrixRange === 'week' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setMatrixRange('half1')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                matrixRange === 'half1' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              Day 1–15
            </button>
            <button
              type="button"
              onClick={() => setMatrixRange('half2')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                matrixRange === 'half2' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              Day 16–31
            </button>
            <button
              type="button"
              onClick={() => setMatrixRange('full')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                matrixRange === 'full' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              Full Month (31 Days)
            </button>
          </div>

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
                KHANHUB — WHATSAPP BROADCAST &amp; DISTRIBUTION SHEET
              </h1>
              <span className="text-[7.5pt] font-black uppercase px-2 py-0.5 bg-black text-white rounded">
                {monthTitle}
              </span>
            </div>
            <p className="text-[7.5pt] font-bold text-gray-800 mt-0.5">
              Monthly Publishing Matrix · 8 Community Groups (KhanHub 1–8) + 1 Official Channel (Muhammad Khan)
            </p>
          </div>
          <div className="text-right text-[7pt] font-mono font-bold text-black leading-tight">
            <p>Printed: {new Date().toLocaleDateString('en-GB')}</p>
            <p className="mt-0.5">Legend: [ ✓ ] Posted &nbsp; [ — ] Skipped &nbsp; [ &nbsp; ] Pending</p>
          </div>
        </div>
      </div>

      {/* ── Matrix Table Container with Sticky Column ── */}
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
                className="px-3 sm:px-4 py-3 text-left border-r border-slate-700 min-w-[220px] sticky left-12 z-20 bg-slate-900 print:border-black print:w-[220px] print:min-w-[220px] print:max-w-[220px] print:bg-slate-100 print:text-black print:static print:p-1 print-col-target"
              >
                WhatsApp Target (Group / Channel)
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
                      isToday ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-400 print:bg-slate-100 print:ring-0' : ''
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
            {filteredTargets.map((target, idx) => {
              const isChannel = target.type === 'channel';
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={target.key}
                  className={`transition-colors hover:bg-emerald-50/40 ${
                    isChannel ? 'bg-amber-50/30 font-bold border-t-2 border-amber-300' : isEven ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  {/* S.No Sticky Left 0 */}
                  <td
                    className={`px-2 py-2.5 text-center font-mono font-black text-slate-600 border-r border-gray-200 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:text-black print:static print:shadow-none print:w-[26px] print:min-w-[26px] print:max-w-[26px] print:p-1 print:text-[6.5pt] ${
                      isChannel ? 'bg-amber-50/70' : isEven ? 'bg-white' : 'bg-[#fafafa]'
                    }`}
                  >
                    <span className="text-[11px] font-black print:text-[6.5pt]">{target.serialNo}</span>
                  </td>

                  {/* WhatsApp Target Name Sticky Left 12 */}
                  <td
                    className={`px-3 py-2.5 border-r border-gray-200 sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] print:border-black print:static print:shadow-none print:w-[220px] print:min-w-[220px] print:max-w-[220px] print:p-1 print-col-target ${
                      isChannel ? 'bg-amber-50/70' : isEven ? 'bg-white' : 'bg-[#fafafa]'
                    }`}
                  >
                    {/* Screen View */}
                    <div className="flex items-center justify-between gap-2 print:hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                            isChannel
                              ? 'bg-amber-50 text-amber-600 border-amber-300'
                              : 'bg-emerald-50 text-[#25D366] border-emerald-200'
                          }`}
                        >
                          {isChannel ? <Radio size={13} /> : <FaWhatsapp size={13} className="text-[#25D366]" />}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <span className="font-bold text-gray-900 block truncate" title={target.name}>
                            {target.name}
                          </span>
                          <span className="text-[9.5px] text-gray-400 truncate block">
                            {target.description}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                          isChannel
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {target.type}
                      </span>
                    </div>

                    {/* Paper Print View */}
                    <div className="hidden print:flex items-center justify-between gap-1 w-full text-black">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-[6pt] uppercase tracking-wider text-black shrink-0 px-1 py-0.5 border border-black rounded-[2px] bg-slate-100">
                          {target.type}
                        </span>
                        <span className="font-bold text-[6.5pt] text-black truncate max-w-[155px]">
                          {target.name}
                        </span>
                      </div>
                      <span className="text-[5.5pt] font-mono text-gray-600 truncate max-w-[50px]">
                        {target.description}
                      </span>
                    </div>
                  </td>

                  {/* Daily Status Cells */}
                  {matrixDays.map((dayStr) => {
                    const dayDoc = broadcastMap.get(dayStr);
                    const targetState = dayDoc?.targets?.[target.key];
                    const status: WhatsAppTargetStatus = targetState?.status || 'todo';
                    const isOverdue = dayStr < todayKarachi && status !== 'posted' && status !== 'skipped';

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
                              onClick={() => onCellClick(dayStr, target.key)}
                              className="group/btn flex flex-col items-center justify-center cursor-pointer p-0.5"
                              title={`${target.name} (${dayStr}): Posted ✓\nClick to view / manage`}
                            >
                              <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center shadow-xs group-hover/btn:scale-110 transition-transform">
                                <Check size={13} className="stroke-[3]" />
                              </div>
                            </button>
                          ) : status === 'skipped' ? (
                            <button
                              type="button"
                              onClick={() => onCellClick(dayStr, target.key)}
                              className="group/btn flex items-center justify-center cursor-pointer p-0.5"
                              title={`${target.name} (${dayStr}): Skipped\nClick to edit`}
                            >
                              <div className="w-6 h-6 rounded-md bg-slate-200 text-slate-500 flex items-center justify-center group-hover/btn:scale-110 transition-transform font-black text-xs">
                                —
                              </div>
                            </button>
                          ) : isOverdue ? (
                            <button
                              type="button"
                              onClick={() => onCellClick(dayStr, target.key)}
                              className="group/btn flex flex-col items-center justify-center cursor-pointer p-0.5 animate-pulse"
                              title={`${target.name} (${dayStr}): Overdue ⚠\nClick to broadcast now`}
                            >
                              <div className="w-6 h-6 rounded-md bg-rose-500 text-white flex items-center justify-center shadow-xs">
                                <AlertTriangle size={11} className="stroke-[2.5]" />
                              </div>
                              <span className="text-[7px] font-black text-rose-600 mt-0.5">Due</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onCellClick(dayStr, target.key)}
                              className="group/btn flex items-center justify-center cursor-pointer p-0.5"
                              title={`${target.name} (${dayStr}): Pending\nClick to broadcast`}
                            >
                              <div className="w-6 h-6 rounded-md border-2 border-dashed border-slate-300 text-slate-300 group-hover/btn:border-emerald-500 group-hover/btn:text-emerald-600 flex items-center justify-center transition-all">
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
          </tbody>

          {/* Table Footer: Daily Broadcast Completion */}
          <tfoot className="bg-slate-50 border-t-2 border-slate-300 text-slate-700 font-bold text-[10px] print:bg-white print:border-black">
            <tr>
              <td
                colSpan={2}
                className="px-3 py-2 text-left sticky left-0 z-10 bg-slate-50 font-black uppercase tracking-wider text-slate-600 print:border-black print:text-black print:static print:p-1"
              >
                Daily Broadcast Status (Sent/Total)
              </td>
              {matrixDays.map((dayStr) => {
                const dayDoc = broadcastMap.get(dayStr);
                const countPosted = targets.filter(
                  (t) => dayDoc?.targets?.[t.key]?.status === 'posted'
                ).length;
                const isAllPosted = countPosted === targets.length;

                return (
                  <td
                    key={`foot_${dayStr}`}
                    className={`px-1 py-1 text-center font-mono font-black border-r border-gray-200 print:border-black print:p-0.5 ${
                      isAllPosted
                        ? 'text-emerald-700 bg-emerald-50/70 font-black'
                        : countPosted > 0
                        ? 'text-amber-700'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] print:text-[6.5pt]">
                      {countPosted}/{targets.length}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

