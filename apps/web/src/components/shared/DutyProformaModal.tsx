// apps/web/src/components/shared/DutyProformaModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Printer, Download, X, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, AlertCircle, Calendar, Sparkles
} from 'lucide-react';
import { useDutyProformaData } from '@/hooks/hq/useDutyProformaData';
import { DutyProformaSheet } from './DutyProformaSheet';
import { downloadElementAsPng } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface DutyProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any; // Staff object (HqStaff | StaffCardRow | StaffMember)
  initialYear?: number;
  initialMonth?: number; // 1 to 12
}

export function DutyProformaModal({
  isOpen,
  onClose,
  staff,
  initialYear,
  initialMonth,
}: DutyProformaModalProps) {
  const currentDate = new Date();
  const [year, setYear] = useState<number>(initialYear || currentDate.getFullYear());
  const [month, setMonth] = useState<number>(initialMonth || (currentDate.getMonth() + 1));
  const [activeTab, setActiveTab] = useState<'both' | 'page1' | 'page2'>('both');
  const [downloading, setDownloading] = useState<boolean>(false);

  const { model, loading, error, readCount, reload } = useDutyProformaData(
    isOpen ? staff : null,
    year,
    month
  );

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handlePrint = () => {
    // Switch to 'both' to ensure both pages are printed in sequence
    setActiveTab('both');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadImage = async () => {
    const el = document.getElementById('duty-proforma-print-container');
    if (!el) {
      toast.error('Print container not found.');
      return;
    }
    setDownloading(true);
    try {
      const fileName = `duty-proforma-${(staff?.name || 'staff').toLowerCase().replace(/\s+/g, '-')}-${year}-${String(month).padStart(2, '0')}.png`;
      await downloadElementAsPng(el, fileName);
      toast.success('Proforma exported as PNG.');
    } catch (err) {
      console.error('[DutyProformaModal] Download failed:', err);
      toast.error('Failed to export as image. Please use Print to save as PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const hasNoDuties = model && model.rows.length === 0;

  return (
    <div
      id="duty-proforma-modal-wrapper"
      className="fixed inset-0 z-[200] flex flex-col bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:static print:inset-auto print:bg-white print:overflow-visible print:p-0"
    >
      <style jsx global>{`
        @media print {
          /* Hide non-modal UI */
          body > *:not(#duty-proforma-modal-wrapper) {
            display: none !important;
          }
          #duty-proforma-modal-wrapper {
            position: static !important;
            display: block !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .proforma-no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── STICKY TOP CONTROL BAR (SCREEN ONLY) ─────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-md proforma-no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Staff Profile & Month Navigation */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {staff?.name || 'Staff Proforma'}
                </h2>
                {staff?.designation && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {staff.designation}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Monthly Duty &amp; Performance Proforma · Official Document
              </p>
            </div>
          </div>

          {/* Middle: Month Controls & Page Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Navigator */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={loading}
                className="p-1.5 hover:bg-white rounded-lg text-slate-600 disabled:opacity-40 transition shadow-xs"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 select-none min-w-[110px] text-center">
                {model?.monthName || `Month ${month}`} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={loading}
                className="p-1.5 hover:bg-white rounded-lg text-slate-600 disabled:opacity-40 transition shadow-xs"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Page View Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('both')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  activeTab === 'both' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both Pages
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page1')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  activeTab === 'page1' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Days 1–15
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('page2')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  activeTab === 'page2' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Days 16–end
              </button>
            </div>
          </div>

          {/* Right: Actions (Reload, Print, Export) */}
          <div className="flex items-center gap-2">
            {process.env.NODE_ENV !== 'production' && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                Reads: {readCount}
              </span>
            )}

            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Refresh Records"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={loading || downloading || !model}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !model}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
            >
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL BODY CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 sm:p-6 print:p-0 flex flex-col items-center justify-start">
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-white proforma-no-print">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-3" />
            <p className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Generating Proforma Intelligence...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-xl w-full my-12 bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-800 proforma-no-print shadow-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-extrabold text-base mb-1">Failed to Load Proforma</h3>
                <p className="text-sm leading-relaxed mb-4">{error}</p>
                <button
                  type="button"
                  onClick={reload}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {hasNoDuties && !loading && !error && (
          <div className="max-w-xl w-full my-4 bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 proforma-no-print">
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertCircle size={16} className="text-amber-600" />
              <span>
                Note: No configured duties found for this staff member. Showing a blank 30-row sheet.
              </span>
            </div>
          </div>
        )}

        {model && !loading && !error && (
          <div id="duty-proforma-print-container" className="w-full">
            <DutyProformaSheet
              model={model}
              activeTab={activeTab}
              containerId="duty-proforma-rendered-sheet"
            />
          </div>
        )}
      </div>
    </div>
  );
}
