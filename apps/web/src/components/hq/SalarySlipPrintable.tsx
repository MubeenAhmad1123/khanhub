'use client';

import React from 'react';
import type { SalarySlip } from '@/types/hq';
import { Printer, Download } from 'lucide-react';
import { toDate } from '@/lib/utils';

interface Props {
  slip: SalarySlip;
  showActionControls?: boolean;
}

export function SalarySlipPrintable({ slip, showActionControls = false }: Props) {
  // Computed values calculated at top of component
  const grossPay = slip.basicSalary || 0;
  const incentive = slip.incentive || 0;
  const otherPay = slip.otherEarnings || 0;
  const totalPay = grossPay + incentive + otherPay;

  const absentee = slip.absentDeduction || 0;
  const fines = slip.fine || 0;
  const otherDed = (slip.otherDeductions || 0) + (slip.advance || 0);
  const totalDed = absentee + fines + otherDed;

  const netPay = slip.netSalary || 0;

  // Month label: slip.month is "YYYY-MM" → "June- 2024"
  const monthLabel = (() => {
    if (!slip.month || !slip.month.includes('-')) return '—';
    const [yyyy, mm] = slip.month.split('-');
    const monthName = new Date(`${yyyy}-${mm}-01`).toLocaleString('en-US', { month: 'long' });
    return `${monthName}- ${yyyy}`;
  })();

  // Salary period: "01/M/YYYY To DD/M/YYYY"
  const salaryPeriod = (() => {
    if (!slip.month || !slip.month.includes('-')) return '—';
    const [yyyy, mm] = slip.month.split('-');
    const daysInMonth = new Date(Number(yyyy), Number(mm), 0).getDate();
    return `01/${Number(mm)}/${yyyy} To ${daysInMonth}/${Number(mm)}/${yyyy}`;
  })();

  // Paid date: prefer slip.paidAt, fallback slip.approvedAt, else '—'
  // Format as "10-Jul-2024"
  const paidDateStr = (() => {
    const d = slip.paidAt || slip.approvedAt;
    if (!d) return '—';
    try {
      const dateObj = toDate(d as unknown);
      if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '—';
      return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    } catch (e) {
      return '—';
    }
  })();

  // Number formatter: always 2 decimal places
  const fmt = (n: number) => n.toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const el = document.getElementById('salary-slip-root');
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const link = document.createElement('a');
    link.download = `salary-slip-${slip.staffName || 'employee'}-${slip.month || 'month'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="w-full max-w-[780px] mx-auto bg-white">
      {/* ACTION CONTROLS */}
      {showActionControls && (
        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl mb-6 print:hidden">
          <span className="text-xs font-black uppercase tracking-wider text-gray-500">
            Salary Slip Controls
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} /> Download PNG
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
      )}

      {/* ROOT ELEMENT */}
      <div
        id="salary-slip-root"
        className="bg-white text-black font-sans w-full max-w-[780px] mx-auto p-6 text-sm"
      >
        {/* ROW 1 — LETTERHEAD */}
        <div className="flex items-center justify-between">
          {/* Left Logo */}
          <div className="w-[20%] flex justify-start">
            <img
              src="/logo.webp"
              alt="Khan Hub Logo"
              className="w-28 h-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          {/* Center Brand Text */}
          <div className="w-[55%] text-center">
            <p className="text-2xl font-extrabold leading-tight">KHAN HUB (PVT.) LTD.</p>
            <p className="text-lg font-bold">Group of Companies</p>
            <p className="text-sm text-gray-600">(SECP REGD. No. 0209901)</p>
          </div>
          {/* Right Certificate Logo */}
          <div className="w-[20%] flex justify-end">
            <img
              src="/images/certificats/PHC_RegistrationCertificate.webp"
              alt="SECP"
              className="w-20 h-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* ROW 2 — SLIP TITLE */}
        <div className="w-full border border-black text-center font-bold text-lg py-2 mt-4">
          Salary Slips For The Month Of ({monthLabel})
        </div>

        {/* ROWS 4–6 — EMPLOYEE INFO TABLE */}
        <table className="w-full border-collapse mt-4 text-xs">
          <tbody>
            <tr>
              <td className="font-bold border border-black px-3 py-2 w-[25%]">Employe Name :</td>
              <td className="border border-black px-3 py-2 w-[25%]">{slip.staffName || '—'}</td>
              <td className="border border-black w-[2%]"></td>
              <td className="font-bold border border-black px-3 py-2 w-[23%]">Designation :</td>
              <td className="border border-black px-3 py-2 w-[25%]">{slip.department || '—'}</td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2">Employe Code :</td>
              <td className="border border-black px-3 py-2">{slip.employeeId || '—'}</td>
              <td className="border border-black"></td>
              <td className="font-bold border border-black px-3 py-2">Department :</td>
              <td className="border border-black px-3 py-2">{slip.department || '—'}</td>
            </tr>
            <tr>
              <td className="font-bold border border-black px-3 py-2">Joing Date :</td>
              <td className="border border-black px-3 py-2">—</td>
              <td className="border border-black"></td>
              <td className="font-bold border border-black px-3 py-2">Salary Period :</td>
              <td className="border border-black px-3 py-2">{salaryPeriod}</td>
            </tr>
          </tbody>
        </table>

        {/* ROWS 8-15 — PAY & DEDUCTION TABLE */}
        <table className="w-full border-collapse mt-4 text-xs">
          <thead>
            <tr>
              <th colSpan={2} className="font-bold text-center border border-black py-2 w-[50%]">
                Pay & Allowance(s)
              </th>
              <th className="border border-black w-[2%]"></th>
              <th colSpan={2} className="font-bold text-center border border-black py-2 w-[48%]">
                Deduction(s)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* ROW 10 */}
            <tr>
              <td className="font-bold border border-black px-3 py-2 w-[25%]">Gross Pay :</td>
              <td className="border border-black px-3 py-2 text-right w-[25%]">{fmt(grossPay)}</td>
              <td className="border border-black"></td>
              <td className="font-bold border border-black px-3 py-2 w-[23%]">Absentee :</td>
              <td className="border border-black px-3 py-2 text-right w-[25%]">{fmt(absentee)}</td>
            </tr>
            {/* ROW 11 */}
            <tr>
              <td className="font-bold border border-black px-3 py-2">Incentiv :</td>
              <td className="border border-black px-3 py-2 text-right">{fmt(incentive)}</td>
              <td className="border border-black"></td>
              <td className="font-bold border border-black px-3 py-2">Fines :</td>
              <td className="border border-black px-3 py-2 text-right">{fmt(fines)}</td>
            </tr>
            {/* ROW 12 */}
            <tr>
              <td className="font-bold border border-black px-3 py-2">Others :</td>
              <td className="border border-black px-3 py-2 text-right">{fmt(otherPay)}</td>
              <td className="border border-black"></td>
              <td className="font-bold border border-black px-3 py-2">Others :</td>
              <td className="border border-black px-3 py-2 text-right">{fmt(otherDed)}</td>
            </tr>
            {/* ROW 13 */}
            <tr className="font-bold">
              <td className="border border-black px-3 py-2">Total Pay & Allowance(s) :</td>
              <td className="border border-black px-3 py-2 text-right">{fmt(totalPay)}</td>
              <td className="border border-black"></td>
              <td className="border border-black px-3 py-2">Total Deduction(s) :</td>
              <td className="border border-black px-3 py-2 text-right">{fmt(totalDed)}</td>
            </tr>
            {/* ROW 15 — NET PAY ROW */}
            <tr className="font-bold text-base">
              <td className="border border-black px-3 py-2">Net Pay :</td>
              <td className="border border-black px-3 py-2 text-right">{fmt(netPay)}</td>
              <td className="border border-black"></td>
              <td className="border border-black px-3 py-2">Paid Date :</td>
              <td className="border border-black px-3 py-2 text-right">{paidDateStr}</td>
            </tr>
          </tbody>
        </table>

        {/* ROW 17 — CONFIDENTIALITY FOOTER TEXT */}
        <div className="flex justify-between items-center mt-3">
          <p className="italic text-xs text-gray-700">Salary Slip is Private & Confidential</p>
          <p className="italic text-xs text-right text-gray-700">
            For Any Query, Please feel free to contact at : 067-3364220
          </p>
        </div>

        {/* ROW 20 — SIGNATURE LINES */}
        <div className="flex justify-between items-end mt-8">
          <div className="w-[35%] text-center">
            <hr className="border-t-2 border-black mb-2" />
            <p className="font-bold text-sm">Employee Signature</p>
          </div>

          <div className="w-[35%] text-center">
            <hr className="border-t-2 border-black mb-2" />
            <p className="font-bold text-sm">Executive Officer</p>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { margin: 0; size: A4 portrait; }
              body { margin: 0.8cm !important; background: white !important; }
              .print-hidden { display: none !important; }
            }
          `,
        }}
      />
    </div>
  );
}
