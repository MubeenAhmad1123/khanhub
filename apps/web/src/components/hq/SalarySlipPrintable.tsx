'use client';

import React from 'react';
import type { SalarySlip } from '@/types/hq';
import { Printer, Download } from 'lucide-react';
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

  let empName = '—';
  let designation = '—';
  let empCode = '—';
  let deptName = '—';
  let joiningDateStr = '—';
  let monthStr = propSelectedMonth || slip?.month || '';
  let computedMonthLabel = propMonthLabel || '—';

  let grossPay = 0;
  let incentive = 0;
  let otherPay = 0;
  let absentee = 0;
  let fines = 0;
  let advancePay = 0;
  let otherDed = 0;
  let netPay = 0;

  if (row) {
    empName = row.name || '—';
    designation = row.designation || '—';
    empCode = row.employeeCode || row.id || '—';
    const deptKey = String(row.dept || '').toLowerCase();
    deptName = OFFICIAL_DEPT_LEGAL_NAMES[deptKey] || row.dept || 'KhanHub Platform';

    if (row.joiningDate) {
      try {
        const dObj = toDate(row.joiningDate);
        if (dObj) {
          const y = dObj.getFullYear();
          const m = String(dObj.getMonth() + 1).padStart(2, '0');
          const d = String(dObj.getDate()).padStart(2, '0');
          joiningDateStr = `${d}/${m}/${y}`;
        } else {
          joiningDateStr = String(row.joiningDate);
        }
      } catch (e) {
        joiningDateStr = String(row.joiningDate);
      }
    }

    grossPay = Number(row.gross) || 0;
    incentive = Number(row.bonus) || 0;
    const addTotal = Number(row.totalCustomAdditions) || 0;
    otherPay = Math.max(0, addTotal - incentive);

    absentee = Number(row.totalAbsentDeduction) || 0;
    fines = Number(row.totalFines) || 0;
    advancePay = Number(row.totalAdvance) || 0;
    otherDed = Number(row.totalCustomDeductions) || 0;

    const calcTotalPay = grossPay + incentive + otherPay;
    const calcTotalDed = absentee + fines + advancePay + otherDed;
    netPay = calcTotalPay - calcTotalDed;
  } else if (slip) {
    empName = slip.staffName || '—';
    designation = staff?.designation || slip.department || '—';
    empCode = staff?.employeeId || slip.employeeId || slip.staffId || '—';
    const deptKey = String(slip.department || '').toLowerCase();
    deptName = OFFICIAL_DEPT_LEGAL_NAMES[deptKey] || slip.department || 'KhanHub Platform';

    if (staff?.joiningDate) {
      try {
        const dateObj = toDate(staff.joiningDate);
        if (dateObj && !isNaN(dateObj.getTime())) {
          joiningDateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch (e) {}
    }

    const hasFullSlip = typeof slip.netSalary === 'number' && slip.netSalary !== 0;

    if (hasFullSlip) {
      grossPay = slip.basicSalary || 0;
      incentive = slip.incentive || slip.bonus || 0;
      otherPay = slip.otherEarnings || 0;
      absentee = slip.absentDeduction || 0;
      fines = slip.fine || 0;
      advancePay = slip.advance || 0;
      otherDed = slip.otherDeductions || 0;
      netPay = slip.netSalary || 0;
    } else {
      netPay = (slip as any).amount || 0;
      const baseWage = staff?.monthlySalary || netPay;
      grossPay = baseWage;
      if (netPay > baseWage) {
        incentive = netPay - baseWage;
      } else if (netPay < baseWage) {
        otherDed = baseWage - netPay;
      }
    }
  }

  const totalPay = grossPay + incentive + otherPay;
  const totalDed = absentee + fines + advancePay + otherDed;

  // Month Label Format: "August 2026"
  if (!computedMonthLabel || computedMonthLabel === '—') {
    if (monthStr && monthStr.includes('-')) {
      const [yyyy, mm] = monthStr.split('-');
      const monthName = new Date(`${yyyy}-${mm}-01`).toLocaleString('en-US', { month: 'long' });
      computedMonthLabel = `${monthName} ${yyyy}`;
    }
  }

  // Salary Period: "01/MM/YYYY To DD/MM/YYYY"
  const salaryPeriod = (() => {
    if (!monthStr || !monthStr.includes('-')) return '—';
    const [yyyy, mm] = monthStr.split('-').map(Number);
    if (!yyyy || !mm) return '—';
    const daysInMonth = new Date(yyyy, mm, 0).getDate();
    const mmStr = String(mm).padStart(2, '0');

    let startDayStr = `01/${mmStr}/${yyyy}`;
    if (joiningDateStr && joiningDateStr !== '—' && joiningDateStr.endsWith(`/${yyyy}`)) {
      const parts = joiningDateStr.split('/');
      if (parts.length === 3 && parts[1] === mmStr) {
        startDayStr = joiningDateStr;
      }
    }
    return `${startDayStr} To ${String(daysInMonth).padStart(2, '0')}/${mmStr}/${yyyy}`;
  })();

  // Paid Date string
  const paidDateStr = (() => {
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

  // Format to 2 decimal places
  const fmt = (n: number) => (Number(n) || 0).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const el = document.getElementById('salary-slip-print-root') || document.getElementById('salary-slip-root');
    if (!el) return;
    const safeName = (empName || 'employee').replace(/\s+/g, '-');
    const safeMonth = monthStr || 'payroll';
    await downloadElementAsPng(el, `salary-slip-${safeName}-${safeMonth}.png`, { scale: 2, backgroundColor: '#ffffff' });
  };

  return (
    <div className="w-full max-w-[780px] mx-auto bg-white text-black font-sans">
      {/* ACTION CONTROLS */}
      {showActionControls && (
        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl mb-6 print:hidden">
          <span className="text-xs font-black uppercase tracking-wider text-gray-500">
            Salary Slip Controls
          </span>
          <div className="flex items-center gap-3">
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
        </div>
      )}

      {/* ROOT ELEMENT (OFFICIAL LETTERHEAD SLIP) */}
      <div
        id="salary-slip-print-root"
        className="bg-white text-black font-sans w-full max-w-[780px] mx-auto p-6 text-sm border border-slate-300"
      >
        {/* ROW 1 — LETTERHEAD HEADER */}
        <div className="flex items-center justify-between border border-black p-3">
          {/* Left Logo Cell */}
          <div className="w-[22%] flex items-center justify-center p-1 border-r border-black">
            <img
              src="/logo.webp"
              alt="Khan Hub Logo"
              className="max-h-20 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Center Brand Text */}
          <div className="w-[56%] text-center px-2">
            <h1 className="text-xl font-black leading-tight uppercase tracking-tight">KHAN HUB (PVT.) LTD.</h1>
            <p className="text-sm font-extrabold uppercase tracking-wide">Group of Companies</p>
            <p className="text-xs font-bold text-gray-700 mt-0.5">(SECP REGD. No. 0209901)</p>
          </div>

          {/* Right SECP Logo Cell */}
          <div className="w-[22%] flex items-center justify-center p-1 border-l border-black">
            <img
              src="/secplogo.webp"
              alt="SECP Emblem"
              className="max-h-20 w-auto object-contain"
              onError={(e) => {
                // Fallback to PHC registration certificate image if secplogo fails
                (e.currentTarget as HTMLImageElement).src = '/images/certificats/PHC_RegistrationCertificate.webp';
              }}
            />
          </div>
        </div>

        {/* ROW 2 — TITLE BAR */}
        <div className="w-full border-x border-b border-black text-center font-black text-base py-2 bg-gray-50 uppercase tracking-wide">
          Salary Slips For The Month Of ({computedMonthLabel})
        </div>

        {/* ROWS 3 — EMPLOYEE INFO TABLE */}
        <table className="w-full border-collapse mt-3 text-xs">
          <tbody>
            <tr>
              <td className="font-bold border border-black px-3 py-1.5 w-[22%] bg-gray-50">Employe Name :</td>
              <td className="border border-black px-3 py-1.5 w-[28%] font-semibold">{empName}</td>
              <td className="border border-black w-[2%] bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-1.5 w-[22%] bg-gray-50">Designation :</td>
              <td className="border border-black px-3 py-1.5 w-[26%] font-semibold">{designation}</td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Employe Code :</td>
              <td className="border border-black px-3 py-1.5 font-semibold font-mono">{empCode}</td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Department :</td>
              <td className="border border-black px-3 py-1.5 font-semibold">{deptName}</td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Joing Date :</td>
              <td className="border border-black px-3 py-1.5 font-semibold">{joiningDateStr}</td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-1.5 bg-gray-50">Salary Period :</td>
              <td className="border border-black px-3 py-1.5 font-semibold">{salaryPeriod}</td>
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
              <td className="border border-black px-3 py-2 text-right w-[22%] font-mono font-semibold">{fmt(grossPay)}</td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2 w-[27%]">Absentee :</td>
              <td className="border border-black px-3 py-2 text-right w-[22%] font-mono font-semibold">{fmt(absentee)}</td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2">Incentiv :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">{fmt(incentive)}</td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2">Fines :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">{fmt(fines)}</td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2">Others :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">{fmt(otherPay)}</td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2">Advance Taken :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">{fmt(advancePay)}</td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2 bg-gray-50"></td>
              <td className="border border-black px-3 py-2 text-right bg-gray-50"></td>
              <td className="border border-black bg-gray-100"></td>
              <td className="font-bold border border-black px-3 py-2">Other Deductions :</td>
              <td className="border border-black px-3 py-2 text-right font-mono font-semibold">{fmt(otherDed)}</td>
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
              <td className="border border-black px-3 py-2.5 text-right font-mono">{paidDateStr}</td>
            </tr>
          </tbody>
        </table>

        {/* CONFIDENTIALITY FOOTER TEXT */}
        <div className="flex justify-between items-center mt-3 pt-1 border-t border-gray-300">
          <p className="italic text-[11px] font-semibold text-gray-700">Salary Slip is Private & Confidential</p>
          <p className="italic text-[11px] font-semibold text-right text-gray-700">
            For Any Query, Please feel free to contact at : 067-3364220
          </p>
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
