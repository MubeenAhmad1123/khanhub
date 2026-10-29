// apps/web/src/components/shared/DutyProformaSheet.tsx
'use client';

import React from 'react';
import type { ProformaModel, ProformaDay, ProformaDutyRow } from '@/lib/hq/dutyProforma';

interface DutyProformaSheetProps {
  model: ProformaModel;
  activeTab?: 'page1' | 'page2' | 'both';
  containerId?: string;
}

export function DutyProformaSheet({
  model,
  activeTab = 'both',
  containerId = 'duty-proforma-sheet-root',
}: DutyProformaSheetProps) {
  const { year, monthName, days, page1Days, page2Days, rows, summary, staff } = model;
  const daysInMonth = days.length;

  const showPage1 = activeTab === 'page1' || activeTab === 'both';
  const showPage2 = activeTab === 'page2' || activeTab === 'both';

  return (
    <div id={containerId} className="w-full bg-slate-200/50 print:bg-white py-4 print:py-0 font-sans text-black">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          body, html {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .proforma-screen-only {
            display: none !important;
          }
          .proforma-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 194mm !important;
            height: 280mm !important;
            padding: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .proforma-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {showPage1 && (
        <ProformaSinglePage
          pageNumber={1}
          dayRangeLabel={`Days 1–15`}
          pageDays={page1Days}
          allRows={rows}
          monthName={monthName}
          year={year}
          staff={staff}
          summary={summary}
        />
      )}

      {showPage2 && (
        <ProformaSinglePage
          pageNumber={2}
          dayRangeLabel={`Days 16–${daysInMonth}`}
          pageDays={page2Days}
          allRows={rows}
          monthName={monthName}
          year={year}
          staff={staff}
          summary={summary}
        />
      )}
    </div>
  );
}

interface SinglePageProps {
  pageNumber: number;
  dayRangeLabel: string;
  pageDays: ProformaDay[];
  allRows: ProformaDutyRow[];
  monthName: string;
  year: number;
  staff: ProformaModel['staff'];
  summary: ProformaModel['summary'];
}

function ProformaSinglePage({
  pageNumber,
  dayRangeLabel,
  pageDays,
  allRows,
  monthName,
  year,
  staff,
  summary,
}: SinglePageProps) {
  // Always exactly 30 numbered rows
  const TOTAL_ROWS = 30;
  const rowsArray = Array.from({ length: TOTAL_ROWS }, (_, i) => allRows[i] || null);

  return (
    <div className="proforma-page bg-white mx-auto my-4 print:my-0 shadow-lg border border-slate-300 print:border-none p-5 sm:p-6 print:p-0 max-w-[200mm] min-h-[275mm] flex flex-col justify-between box-border">
      {/* ── TOP SECTION: HEADER & DETAILS ────────────────────────────────────────── */}
      <div>
        {/* 1. Header Row: Logo, Title, SECP Seal */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-double border-black">
          {/* Left: Khan Hub Logo */}
          <div className="w-16 h-16 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Khan Hub Logo"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                // Fallback to circle logo if logo.webp is missing
                (e.currentTarget as HTMLImageElement).src = '/logo-circle.webp';
              }}
            />
          </div>

          {/* Center: Organization & SECP Header */}
          <div className="text-center flex-1 px-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase font-sans">
              KHAN HUB (PVT.) LTD.
            </h1>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-slate-700">
              Group of Companies
            </p>
            <p className="text-[9px] sm:text-[10px] font-extrabold text-black tracking-wider mt-0.5">
              (SECP REGD. No. 0209901)
            </p>
          </div>

          {/* Right: SECP Seal */}
          <div className="w-16 h-16 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/secplogo.webp"
              alt="SECP Seal"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        {/* 2. Sub-row: Title & Date Range */}
        <div className="flex items-center justify-between py-1.5 px-0.5 border-b border-black text-[11px] leading-tight">
          <span className="font-extrabold uppercase tracking-wide">
            MONTHLY DUTY &amp; PERFORMANCE PROFORMA
          </span>
          <span className="font-bold text-slate-900">
            {monthName} {year} · {dayRangeLabel}
          </span>
        </div>

        {/* 3. Role Row */}
        <div className="flex flex-wrap items-center justify-between gap-1 py-1.5 px-0.5 border-b-2 border-black text-[10px] sm:text-[11px] leading-tight">
          <div className="font-black uppercase tracking-tight text-black text-xs sm:text-sm">
            {staff.designation}
          </div>
          <div className="text-[9.5px] sm:text-[10px] font-semibold text-slate-800 flex flex-wrap items-center gap-1.5">
            <span>
              <strong className="font-bold">Name:</strong> {staff.name}
            </span>
            <span className="text-slate-400">|</span>
            <span>
              <strong className="font-bold">Dept:</strong> {staff.department}
            </span>
            <span className="text-slate-400">|</span>
            <span>
              <strong className="font-bold">Timing:</strong> {staff.dutyTiming}
            </span>
          </div>
        </div>

        {/* 4. Table */}
        <div className="w-full mt-1.5 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-black table-fixed text-[8pt]">
            <thead>
              {/* Header Row: Black background, white bold text */}
              <tr className="bg-black text-white leading-tight font-bold text-[7pt]">
                <th
                  style={{ width: '26px' }}
                  className="border border-black py-1 px-0.5 text-center font-bold"
                >
                  S.NO
                </th>
                <th className="border border-black py-1 px-1.5 text-left font-bold">
                  DUTY / RESPONSIBILITY
                </th>
                {pageDays.map((d) => (
                  <th
                    key={d.date}
                    style={{ width: `${100 / (pageDays.length + 8)}%` }}
                    className={`border border-black py-0.5 px-0.5 text-center font-bold ${
                      d.isSunday ? 'bg-slate-900' : 'bg-black'
                    }`}
                  >
                    <div className="text-[6.5pt] uppercase leading-none opacity-90">{d.weekday}</div>
                    <div className="text-[7.5pt] leading-tight mt-0.5">{d.dayNumber}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsArray.map((duty, idx) => {
                const sNo = idx + 1;
                const isEven = sNo % 2 === 0;

                return (
                  <tr
                    key={sNo}
                    style={{ height: '19px' }}
                    className={`${isEven ? 'bg-[#f2f2f2]' : 'bg-white'} leading-tight`}
                  >
                    {/* S.NO */}
                    <td className="border border-black text-center font-bold text-[7.5pt] px-0.5 py-0.5">
                      {sNo}
                    </td>

                    {/* Duty Text */}
                    <td className="border border-black px-1.5 py-0.5 text-[7.5pt] font-medium truncate">
                      {duty ? (
                        duty.isPriority ? (
                          <span className="font-extrabold border border-black px-1 py-0.5 inline-block rounded-xs">
                            {duty.name}
                          </span>
                        ) : (
                          <span>{duty.name}</span>
                        )
                      ) : null}
                    </td>

                    {/* Day Cells */}
                    {pageDays.map((d) => {
                      const cellVal = duty ? duty.cells[d.date] || '' : '';
                      const isSunday = d.isSunday;

                      return (
                        <td
                          key={d.date}
                          className={`border border-black text-center text-[8pt] font-bold px-0 py-0.5 ${
                            isSunday ? 'bg-[#e5e5e5]' : ''
                          }`}
                        >
                          {renderCellSymbol(cellVal)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. Table Footer Status Guide & Note */}
        <div className="flex items-center justify-between text-[8pt] pt-1 px-0.5 text-slate-800 leading-tight">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold">Status:</span>
            <span>
              <strong className="font-black text-emerald-800">✓</strong> Completed
            </span>
            <span>
              <strong className="font-black text-rose-800">✗</strong> Not Completed
            </span>
            <span>
              <strong className="font-black text-slate-700">—</strong> Not Applicable
            </span>
          </div>
          <div className="italic text-[7.5pt] text-slate-600">
            Khaali rows mein nayi duties pen / pencil se likhein.
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: SUMMARY & SIGNATURES ──────────────────────────────────── */}
      <div className="mt-2 pt-2 border-t-2 border-black">
        {/* Performance Summary */}
        <div className="p-2 border border-black bg-slate-50 text-[8pt] leading-tight">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-1.5">
            <span className="font-black uppercase tracking-wider text-[8.5pt]">
              Monthly Performance Summary:
            </span>
            <div className="flex items-center gap-4 text-[8pt]">
              <span>
                Total Duties: <strong className="font-bold text-black underline">{summary.totalDuties}</strong>
              </span>
              <span>
                Completed: <strong className="font-bold text-black underline">{summary.completedDuties}</strong>
              </span>
              <span>
                Pending: <strong className="font-bold text-black underline">{summary.pendingDuties}</strong>
              </span>
              {summary.totalDuties > 0 && (
                <span className="font-extrabold text-black">
                  ({summary.completionPercentage}%)
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
            <span className="font-bold text-[8pt]">Overall Performance:</span>
            <div className="flex flex-wrap items-center gap-3 text-[8pt]">
              <PerformanceCheckbox
                label="Excellent"
                checked={summary.overallPerformance === 'excellent'}
              />
              <PerformanceCheckbox
                label="Good"
                checked={summary.overallPerformance === 'good'}
              />
              <PerformanceCheckbox
                label="Satisfactory"
                checked={summary.overallPerformance === 'satisfactory'}
              />
              <PerformanceCheckbox
                label="Needs Improvement"
                checked={summary.overallPerformance === 'needs_improvement'}
              />
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-[8pt] text-black">
          <div className="text-left border-t border-black pt-1">
            <p className="font-bold">Employee Signature ({staff.name})</p>
          </div>
          <div className="text-right border-t border-black pt-1">
            <p className="font-bold">Managing Director Signature — Khan Hub Pvt. Ltd.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderCellSymbol(value: string) {
  if (value === 'done') {
    return <span className="font-extrabold text-emerald-800">✓</span>;
  }
  if (value === 'notdone') {
    return <span className="font-extrabold text-rose-800">✗</span>;
  }
  if (value === 'na') {
    return <span className="font-extrabold text-slate-700">—</span>;
  }
  return '';
}

function PerformanceCheckbox({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold">
      <span
        className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[7.5pt] font-black ${
          checked ? 'bg-black text-white' : 'bg-white text-transparent'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </span>
  );
}
