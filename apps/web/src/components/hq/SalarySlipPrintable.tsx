'use client';

import React, { useState, useEffect } from 'react';
import type { SalarySlip } from '@/types/hq';
import { Printer, Download, Edit3, Check, RotateCcw } from 'lucide-react';
import { toDate, downloadElementAsPng } from '@/lib/utils';

export const OFFICIAL_DEPT_LEGAL_NAMES: Record<string, string> = {
  hospital: 'Khan Medical and Maternity Home',
  rehab: 'KhanHub Rehabilitation Center',
  spims: 'South Punjab Institute of Medical Sciences (SPIMS)',
  sukoon: 'Sukoon Psychiatric & Care Center',
  welfare: 'KhanHub Welfare Organization',
  'job-center': 'KhanHub Job Center',
  jobcenter: 'KhanHub Job Center',
  'social-media': 'KhanHub Media & Digital Services',
  media: 'KhanHub Media & Digital Services',
  it: 'KhanHub IT & Software Solutions',
  hq: 'KhanHub Headquarters',
};

export interface SalaryRowData {
  id: string;
  name: string;
  designation: string;
  dept: string;
  employeeCode?: string;
  joiningDate?: string;
  gross: number;
  dailyRate: number;
  payableDays: number;
  earnings: number;
  absentDays: number;
  weeklyOffDaysCount?: number;
  holidayDaysCount?: number;
  weeklyOffDay?: string;
  totalAbsentDeduction: number;
  staffFines?: any[];
  totalFines: number;
  totalAdvance: number;
  staffAdvanceTxns?: any[];
  customAdj?: any;
  remainingBalance: number;
  bonus: number;
  allowance: number;
  customAdditionsList?: Array<{ label: string; amount: number }>;
  totalCustomAdditions: number;
  securityFee: number;
  customDeductionsList?: Array<{ label: string; amount: number }>;
  totalCustomDeductions: number;
  notes?: string;
  deductions: number;
  netPayable: number;
  breakdownItems?: any[];
}

interface Props {
  slip?: SalarySlip | null;
  row?: SalaryRowData | null;
  showActionControls?: boolean;
  staff?: {
    designation?: string;
    joiningDate?: any;
    employeeId?: string;
    monthlySalary?: number;
  } | null;
  monthLabel?: string;
  selectedMonth?: string; // YYYY-MM
  selectedYear?: number;
  paidDate?: string; // YYYY-MM-DD or formatted date string
  weeklyOffDaysCount?: number;
  holidayDaysCount?: number;
}

export function SalarySlipPrintable({
  slip = null,
  row = null,
  showActionControls = false,
  staff = null,
  monthLabel: propMonthLabel,
  selectedMonth: propSelectedMonth,
  selectedYear: propSelectedYear,
  paidDate: propPaidDate,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  // Initial values computation
  let initialEmpName = '—';
  let initialDesignation = '—';
  let initialEmpCode = '—';
  let initialDeptName = '—';
  let initialJoiningDateStr = '—';
  let monthStr = propSelectedMonth || slip?.month || '';
  let computedMonthLabel = propMonthLabel || '—';

  let initialGrossPay = 0;
  let initialIncentive = 0;
  let initialOtherPay = 0;
  let initialAbsentee = 0;
  let initialFines = 0;
  let initialAdvancePay = 0;
  let initialOtherDed = 0;

  if (row) {
    initialEmpName = row.name || '—';
    initialDesignation = row.designation || '—';
    initialEmpCode = row.employeeCode || row.id || '—';
    const deptKey = String(row.dept || '').toLowerCase();
    initialDeptName = OFFICIAL_DEPT_LEGAL_NAMES[deptKey] || row.dept || 'KhanHub Platform';

    if (row.joiningDate) {
      try {
        const dObj = toDate(row.joiningDate);
        if (dObj) {
          const y = dObj.getFullYear();
          const m = String(dObj.getMonth() + 1).padStart(2, '0');
          const d = String(dObj.getDate()).padStart(2, '0');
          initialJoiningDateStr = `${d}/${m}/${y}`;
        } else {
          initialJoiningDateStr = String(row.joiningDate);
        }
      } catch (e) {
        initialJoiningDateStr = String(row.joiningDate);
      }
    }

    initialGrossPay = Number(row.gross) || 0;
    initialIncentive = Number(row.bonus) || 0;
    const addTotal = Number(row.totalCustomAdditions) || 0;
    initialOtherPay = Math.max(0, addTotal - initialIncentive);

    initialAbsentee = Number(row.totalAbsentDeduction) || 0;
    initialFines = Number(row.totalFines) || 0;
    initialAdvancePay = Number(row.totalAdvance) || 0;
    initialOtherDed = Number(row.totalCustomDeductions) || 0;
  } else if (slip) {
    initialEmpName = slip.staffName || '—';
    initialDesignation = staff?.designation || slip.department || '—';
    initialEmpCode = staff?.employeeId || slip.employeeId || slip.staffId || '—';
    const deptKey = String(slip.department || '').toLowerCase();
    initialDeptName = OFFICIAL_DEPT_LEGAL_NAMES[deptKey] || slip.department || 'KhanHub Platform';

    if (staff?.joiningDate) {
      try {
        const dateObj = toDate(staff.joiningDate);
        if (dateObj && !isNaN(dateObj.getTime())) {
          initialJoiningDateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch (e) {}
    }

    const hasFullSlip = typeof slip.netSalary === 'number' && slip.netSalary !== 0;

    if (hasFullSlip) {
      initialGrossPay = slip.basicSalary || 0;
      initialIncentive = slip.incentive || slip.bonus || 0;
      initialOtherPay = slip.otherEarnings || 0;
      initialAbsentee = slip.absentDeduction || 0;
      initialFines = slip.fine || 0;
      initialAdvancePay = slip.advance || 0;
      initialOtherDed = slip.otherDeductions || 0;
    } else {
      const net = (slip as any).amount || 0;
      const baseWage = staff?.monthlySalary || net;
      initialGrossPay = baseWage;
      if (net > baseWage) {
        initialIncentive = net - baseWage;
      } else if (net < baseWage) {
        initialOtherDed = baseWage - net;
      }
    }
  }

  // Month Label Format: "August 2026"
  if (!computedMonthLabel || computedMonthLabel === '—') {
    if (monthStr && monthStr.includes('-')) {
      const [yyyy, mm] = monthStr.split('-');
      const monthName = new Date(`${yyyy}-${mm}-01`).toLocaleString('en-US', { month: 'long' });
      computedMonthLabel = `${monthName} ${yyyy}`;
    }
  }

  // Salary Period: "01/MM/YYYY To DD/MM/YYYY"
  const initialSalaryPeriod = (() => {
    if (!monthStr || !monthStr.includes('-')) return '—';
    const [yyyy, mm] = monthStr.split('-').map(Number);
    if (!yyyy || !mm) return '—';
    const daysInMonth = new Date(yyyy, mm, 0).getDate();
    const mmStr = String(mm).padStart(2, '0');

    let startDayStr = `01/${mmStr}/${yyyy}`;
    if (initialJoiningDateStr && initialJoiningDateStr !== '—' && initialJoiningDateStr.endsWith(`/${yyyy}`)) {
      const parts = initialJoiningDateStr.split('/');
      if (parts.length === 3 && parts[1] === mmStr) {
        startDayStr = initialJoiningDateStr;
      }
    }
    return `${startDayStr} To ${String(daysInMonth).padStart(2, '0')}/${mmStr}/${yyyy}`;
  })();

  // Paid Date string
  const initialPaidDateStr = (() => {
    if (propPaidDate) {
      try {
        const dObj = toDate(propPaidDate);
        if (dObj && !isNaN(dObj.getTime())) {
          return dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
        }
        return propPaidDate;
      } catch (e) {
        return propPaidDate;
      }
    }
    const d = slip?.paidAt || slip?.approvedAt;
    if (!d) {
      const today = new Date();
      return today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    }
    try {
      const dateObj = toDate(d as unknown);
      if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '—';
      return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    } catch (e) {
      return '—';
    }
  })();

  // Editable Form State
  const [fields, setFields] = useState({
    companyTitle: 'KHAN HUB (PVT.) LTD.',
    companySubtitle: 'Group of Companies',
    secpReg: '(SECP REGD. No. 0209901)',
    monthLabel: computedMonthLabel,
    empName: initialEmpName,
    designation: initialDesignation,
    empCode: initialEmpCode,
    deptName: initialDeptName,
    joiningDateStr: initialJoiningDateStr,
    salaryPeriod: initialSalaryPeriod,
    grossPay: initialGrossPay,
    incentive: initialIncentive,
    otherPay: initialOtherPay,
    absentee: initialAbsentee,
    fines: initialFines,
    advancePay: initialAdvancePay,
    otherDed: initialOtherDed,
    paidDateStr: initialPaidDateStr,
    queryPhone: '067-3364220',
  });

  // Keep state updated if props change
  useEffect(() => {
    setFields({
      companyTitle: 'KHAN HUB (PVT.) LTD.',
      companySubtitle: 'Group of Companies',
      secpReg: '(SECP REGD. No. 0209901)',
      monthLabel: computedMonthLabel,
      empName: initialEmpName,
      designation: initialDesignation,
      empCode: initialEmpCode,
      deptName: initialDeptName,
      joiningDateStr: initialJoiningDateStr,
      salaryPeriod: initialSalaryPeriod,
      grossPay: initialGrossPay,
      incentive: initialIncentive,
      otherPay: initialOtherPay,
      absentee: initialAbsentee,
      fines: initialFines,
      advancePay: initialAdvancePay,
      otherDed: initialOtherDed,
      paidDateStr: initialPaidDateStr,
      queryPhone: '067-3364220',
    });
  }, [
    row, slip, propMonthLabel, propSelectedMonth, propPaidDate,
    initialEmpName, initialDesignation, initialEmpCode, initialDeptName,
    initialJoiningDateStr, initialSalaryPeriod, initialGrossPay, initialIncentive,
    initialOtherPay, initialAbsentee, initialFines, initialAdvancePay, initialOtherDed,
    initialPaidDateStr, computedMonthLabel
  ]);

  const handleReset = () => {
    setFields({
      companyTitle: 'KHAN HUB (PVT.) LTD.',
      companySubtitle: 'Group of Companies',
      secpReg: '(SECP REGD. No. 0209901)',
      monthLabel: computedMonthLabel,
      empName: initialEmpName,
      designation: initialDesignation,
      empCode: initialEmpCode,
      deptName: initialDeptName,
      joiningDateStr: initialJoiningDateStr,
      salaryPeriod: initialSalaryPeriod,
      grossPay: initialGrossPay,
      incentive: initialIncentive,
      otherPay: initialOtherPay,
      absentee: initialAbsentee,
      fines: initialFines,
      advancePay: initialAdvancePay,
      otherDed: initialOtherDed,
      paidDateStr: initialPaidDateStr,
      queryPhone: '067-3364220',
    });
  };

  const totalPay = (Number(fields.grossPay) || 0) + (Number(fields.incentive) || 0) + (Number(fields.otherPay) || 0);
  const totalDed = (Number(fields.absentee) || 0) + (Number(fields.fines) || 0) + (Number(fields.advancePay) || 0) + (Number(fields.otherDed) || 0);
  const netPay = totalPay - totalDed;

  // Format to 2 decimal places
  const fmt = (n: number) => (Number(n) || 0).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const el = document.getElementById('salary-slip-print-root') || document.getElementById('salary-slip-root');
    if (!el) return;
    const safeName = (fields.empName || 'employee').replace(/\s+/g, '-');
    const safeMonth = monthStr || 'payroll';
    await downloadElementAsPng(el, `salary-slip-${safeName}-${safeMonth}.png`, { scale: 2, backgroundColor: '#ffffff' });
  };

  return (
    <div className="w-full max-w-[780px] mx-auto bg-white text-black font-sans">
      {/* ACTION CONTROLS & EDIT MODE TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 no-print print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
              isEditing
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
            {isEditing ? 'Done Editing' : 'Customize Slip Text'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Reset to calculated values"
            >
              <RotateCcw size={13} /> Reset Defaults
            </button>
          )}

          {isEditing && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
              ✏️ Click any field directly on slip to edit!
            </span>
          )}
        </div>

        {showActionControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download size={14} /> Download PNG
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        )}
      </div>

      {/* ROOT ELEMENT (OFFICIAL LETTERHEAD SLIP) */}
      <div
        id="salary-slip-print-root"
        className="bg-white text-black font-sans w-full max-w-[780px] mx-auto p-6 text-sm border border-slate-300 relative"
      >
        {/* ROW 1 — LETTERHEAD HEADER */}
        <div className="flex items-center justify-between border border-black p-3">
          {/* Left Logo Cell */}
          <div className="w-[22%] flex items-center justify-center p-1 border-r border-black">
            <img
              src="/icons/favicon.webp"
              alt="Khan Hub Logo"
              className="max-h-20 w-auto object-contain"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.includes('logo.webp')) {
                  img.src = '/logo.webp';
                }
              }}
            />
          </div>

          {/* Center Brand Text */}
          <div className="w-[56%] text-center px-2">
            {isEditing ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={fields.companyTitle}
                  onChange={(e) => setFields({ ...fields, companyTitle: e.target.value })}
                  className="w-full text-center text-xl font-black uppercase border border-amber-400 bg-amber-50 rounded px-1"
                />
                <input
                  type="text"
                  value={fields.companySubtitle}
                  onChange={(e) => setFields({ ...fields, companySubtitle: e.target.value })}
                  className="w-full text-center text-sm font-extrabold uppercase border border-amber-400 bg-amber-50 rounded px-1"
                />
                <input
                  type="text"
                  value={fields.secpReg}
                  onChange={(e) => setFields({ ...fields, secpReg: e.target.value })}
                  className="w-full text-center text-xs font-bold border border-amber-400 bg-amber-50 rounded px-1"
                />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black leading-tight uppercase tracking-tight">{fields.companyTitle}</h1>
                <p className="text-sm font-extrabold uppercase tracking-wide">{fields.companySubtitle}</p>
                <p className="text-xs font-bold text-gray-700 mt-0.5">{fields.secpReg}</p>
              </>
            )}
          </div>

          {/* Right SECP Logo Cell */}
          <div className="w-[22%] flex items-center justify-center p-1 border-l border-black">
            <img
              src="/secplogo.webp"
              alt="SECP Emblem"
              className="max-h-20 w-auto object-contain"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.includes('secplog.webp')) {
                  img.src = '/secplog.webp';
                } else {
                  img.src = '/images/certificats/PHC_RegistrationCertificate.webp';
                }
              }}
            />
          </div>
        </div>

        {/* ROW 2 — TITLE BAR */}
        <div className="w-full border-x border-b border-black text-center font-black text-base py-2 bg-gray-50 uppercase tracking-wide">
          {isEditing ? (
            <div className="flex items-center justify-center gap-1">
              <span>Salary Slips For The Month Of (</span>
              <input
                type="text"
                value={fields.monthLabel}
                onChange={(e) => setFields({ ...fields, monthLabel: e.target.value })}
                className="text-center font-black border border-amber-400 bg-amber-50 rounded px-2 text-base"
              />
              <span>)</span>
            </div>
          ) : (
            `Salary Slips For The Month Of (${fields.monthLabel})`
          )}
        </div>

        {/* ROWS 3 — EMPLOYEE INFO TABLE */}
        <table className="w-full border-collapse mt-3 text-xs">
          <tbody>
            <tr>
              <td className="font-bold border border-black px-3 py-1.5 w-[22%] bg-gray-50">Employe Name :</td>
              <td className="border border-black px-3 py-1.5 w-[28%] font-semibold">
                {isEditing ? (
                  <input
                    type="text"
                    value={fields.empName}
                    onChange={(e) => setFields({ ...fields, empName: e.target.value })}
                    className="w-full font-semibold border border-amber-400 bg-amber-50 rounded px-1.5 py-0.5"
                  />
                ) : (
                  fields.empName
                )}
              </td>
              <td className="border border-black w-[2%] bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-1.5 w-[22%] bg-gray-50">Designation :</td>
              <td className="border border-black px-3 py-1.5 w-[26%] font-semibold">
                {isEditing ? (
                  <input
                    type="text"
                    value={fields.designation}
                    onChange={(e) => setFields({ ...fields, designation: e.target.value })}
                    className="w-full font-semibold border border-amber-400 bg-amber-50 rounded px-1.5 py-0.5"
                  />
                ) : (
                  fields.designation
                )}
              </td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Employe Code :</td>
              <td className="border border-black px-3 py-1.5 font-semibold font-mono">
                {isEditing ? (
                  <input
                    type="text"
                    value={fields.empCode}
                    onChange={(e) => setFields({ ...fields, empCode: e.target.value })}
                    className="w-full font-semibold font-mono border border-amber-400 bg-amber-50 rounded px-1.5 py-0.5"
                  />
                ) : (
                  fields.empCode
                )}
              </td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Department :</td>
              <td className="border border-black px-3 py-1.5 font-semibold">
                {isEditing ? (
                  <input
                    type="text"
                    value={fields.deptName}
                    onChange={(e) => setFields({ ...fields, deptName: e.target.value })}
                    className="w-full font-semibold border border-amber-400 bg-amber-50 rounded px-1.5 py-0.5"
                  />
                ) : (
                  fields.deptName
                )}
              </td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Joing Date :</td>
              <td className="border border-black px-3 py-1.5 font-semibold">
                {isEditing ? (
                  <input
                    type="text"
                    value={fields.joiningDateStr}
                    onChange={(e) => setFields({ ...fields, joiningDateStr: e.target.value })}
                    className="w-full font-semibold border border-amber-400 bg-amber-50 rounded px-1.5 py-0.5"
                  />
                ) : (
                  fields.joiningDateStr
                )}
              </td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Salary Period :</td>
              <td className="border border-black px-3 py-1.5 font-semibold">
                {isEditing ? (
                  <input
                    type="text"
                    value={fields.salaryPeriod}
                    onChange={(e) => setFields({ ...fields, salaryPeriod: e.target.value })}
                    className="w-full font-semibold border border-amber-400 bg-amber-50 rounded px-1.5 py-0.5"
                  />
                ) : (
                  fields.salaryPeriod
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ROWS 4 — PAY & DEDUCTION TABLE */}
        <table className="w-full border-collapse mt-3 text-xs">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th colSpan={2} className="text-center border border-black py-2 w-[49%] font-black uppercase">
                Pay & Allowance(s)
              </th>
              <th className="border border-black w-[2%] bg-gray-200"></th>
              <th colSpan={2} className="text-center border border-black py-2 w-[49%] font-black uppercase">
                Deduction(s)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold border border-black px-3 py-2 w-[27%]">Gross Pay :</td>
              <td className="border border-black px-3 py-2 text-right w-[22%] font-mono font-semibold">
                {isEditing ? (
                  <input
                    type="number"
                    value={fields.grossPay}
                    onChange={(e) => setFields({ ...fields, grossPay: Number(e.target.value) || 0 })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fmt(fields.grossPay)
                )}
              </td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2 w-[27%]">Absentee :</td>
              <td className="border border-black px-3 py-2 text-right w-[22%] font-mono font-semibold">
                {isEditing ? (
                  <input
                    type="number"
                    value={fields.absentee}
                    onChange={(e) => setFields({ ...fields, absentee: Number(e.target.value) || 0 })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fmt(fields.absentee)
                )}
              </td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2">Incentiv :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">
                {isEditing ? (
                  <input
                    type="number"
                    value={fields.incentive}
                    onChange={(e) => setFields({ ...fields, incentive: Number(e.target.value) || 0 })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fmt(fields.incentive)
                )}
              </td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2">Fines :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">
                {isEditing ? (
                  <input
                    type="number"
                    value={fields.fines}
                    onChange={(e) => setFields({ ...fields, fines: Number(e.target.value) || 0 })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fmt(fields.fines)
                )}
              </td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2">Others :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">
                {isEditing ? (
                  <input
                    type="number"
                    value={fields.otherPay}
                    onChange={(e) => setFields({ ...fields, otherPay: Number(e.target.value) || 0 })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fmt(fields.otherPay)
                )}
              </td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2">Advance Taken :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">
                {isEditing ? (
                  <input
                    type="number"
                    value={fields.advancePay}
                    onChange={(e) => setFields({ ...fields, advancePay: Number(e.target.value) || 0 })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fmt(fields.advancePay)
                )}
              </td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2 bg-gray-50"></td>
              <td className="border border-black px-3 py-2 text-right bg-gray-50"></td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2">Other Deductions :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">
                {isEditing ? (
                  <input
                    type="number"
                    value={fields.otherDed}
                    onChange={(e) => setFields({ ...fields, otherDed: Number(e.target.value) || 0 })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fmt(fields.otherDed)
                )}
              </td>
            </tr>
            <tr className="font-black bg-gray-50">
              <td className="border border-black px-3 py-2 uppercase">Total Pay & Allowance(s) :</td>
              <td className="border border-black px-3 py-2 text-right font-mono">{fmt(totalPay)}</td>
              <td className="border border-black bg-gray-200"></td>
              <td className="border border-black px-3 py-2 uppercase">Total Deduction(s) :</td>
              <td className="border border-black px-3 py-2 text-right font-mono">{fmt(totalDed)}</td>
            </tr>

            {/* NET PAY ROW */}
            <tr className="font-black text-sm bg-gray-100">
              <td className="border border-black px-3 py-2.5 uppercase">Net Pay :</td>
              <td className={`border border-black px-3 py-2.5 text-right font-mono ${netPay < 0 ? 'text-red-700' : ''}`}>
                {netPay < 0 ? `-Rs. ${fmt(Math.abs(netPay))} (Advance Debt)` : `Rs. ${fmt(netPay)}`}
              </td>
              <td className="border border-black bg-gray-300"></td>
              <td className="border border-black px-3 py-2.5 uppercase">Paid Date :</td>
              <td className="border border-black px-3 py-2.5 text-right font-mono">
                {isEditing ? (
                  <input
                    type="text"
                    value={fields.paidDateStr}
                    onChange={(e) => setFields({ ...fields, paidDateStr: e.target.value })}
                    className="w-full text-right font-mono font-semibold border border-amber-400 bg-amber-50 rounded px-1 py-0.5"
                  />
                ) : (
                  fields.paidDateStr
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* CONFIDENTIALITY FOOTER TEXT */}
        <div className="flex justify-between items-center mt-3 pt-1 border-t border-gray-300 text-[11px] font-semibold text-gray-700 italic">
          <p>Salary Slip is Private & Confidential</p>
          <div className="flex items-center gap-1">
            <span>For Any Query, Please feel free to contact at :</span>
            {isEditing ? (
              <input
                type="text"
                value={fields.queryPhone}
                onChange={(e) => setFields({ ...fields, queryPhone: e.target.value })}
                className="font-semibold border border-amber-400 bg-amber-50 rounded px-1 not-italic"
              />
            ) : (
              <span>{fields.queryPhone}</span>
            )}
          </div>
        </div>

        {/* SIGNATURE LINES */}
        <div className="flex justify-between items-end mt-10">
          <div className="w-[38%] text-center">
            <hr className="border-t border-black mb-1.5" />
            <p className="font-bold text-xs uppercase tracking-wider">Employee Signature</p>
          </div>

          <div className="w-[38%] text-center">
            <hr className="border-t border-black mb-1.5" />
            <p className="font-bold text-xs uppercase tracking-wider">Executive Officer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
