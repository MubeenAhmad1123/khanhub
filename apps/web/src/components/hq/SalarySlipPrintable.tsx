'use client';

import type { SalarySlip } from '@/types/hq';
import { Printer } from 'lucide-react';

interface Props {
  slip: SalarySlip;
  showActionControls?: boolean;
}

export function SalarySlipPrintable({ slip, showActionControls = false }: Props) {
  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Optional control header, visible on screen but hidden in print */}
      {showActionControls && (
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 mb-8 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600">System Verified Document</span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all"
          >
            <Printer size={14} />
            Print Salary Slip
          </button>
        </div>
      )}

      {/* The Actual Print Content */}
      <div 
        id="salary-slip-print-area"
        className="bg-white text-black p-4 md:p-8 border border-gray-100 md:rounded-[2rem] space-y-8 print:border-0 print:p-0 print:rounded-none"
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 uppercase print:text-black">
            KHAN EDUCATION SYSTEM
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 print:text-gray-700">
            Unified ERP & Fiscal Disbursement Control
          </p>
          <div className="h-[2px] bg-gray-900 w-24 mx-auto my-3 print:bg-black" />
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 print:text-gray-600">
            STAFF SALARY SLIP
          </h3>
        </div>

        {/* Meta details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 print:bg-white print:border-gray-200 print:rounded-none">
          <div>
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 print:text-gray-600">Employee ID</span>
            <span className="font-bold text-sm text-gray-900 uppercase">{slip.employeeId || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 print:text-gray-600">Employee Name</span>
            <span className="font-bold text-sm text-gray-900 uppercase">{slip.staffName}</span>
          </div>
          <div>
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 print:text-gray-600">Department</span>
            <span className="font-bold text-sm text-gray-900 uppercase">{slip.department}</span>
          </div>
          <div>
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 print:text-gray-600">Salary Month</span>
            <span className="font-bold text-sm text-gray-900">{slip.month}</span>
          </div>
        </div>

        {/* Metrics Table */}
        <div className="overflow-hidden w-full border border-gray-100 rounded-2xl print:rounded-none print:border-gray-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[8px] font-black uppercase tracking-[0.25em] print:bg-white print:border-gray-300 print:text-gray-700">
                <th className="py-4 px-6">Description / Attendance Breakdown</th>
                <th className="py-4 px-6 text-center">Value / Count</th>
                <th className="py-4 px-6 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700 print:divide-gray-200 print:text-black">
              <tr>
                <td className="py-4 px-6 text-gray-900">Basic Monthly Salary</td>
                <td className="py-4 px-6 text-center">-</td>
                <td className="py-4 px-6 text-right font-mono text-[13px]">Rs {formatCurrency(slip.basicSalary)}</td>
              </tr>
              <tr>
                <td className="py-4 px-6">Attendance Period</td>
                <td className="py-4 px-6 text-center font-black">{slip.presentDays} / {slip.workingDays} Days</td>
                <td className="py-4 px-6 text-right">-</td>
              </tr>
              
              <tr className="bg-gray-50/50">
                <td className="py-4 px-6 text-gray-900 font-black">Earned Prorated Salary</td>
                <td className="py-4 px-6 text-center font-medium">Days Present</td>
                <td className="py-4 px-6 text-right font-black text-[13px]">Rs {formatCurrency(Math.round((slip.basicSalary / (slip.workingDays || 30)) * (slip.presentDays || 0)))}</td>
              </tr>

              {/* Additions */}
              {((slip.incentive || 0) > 0) && (
                <tr className="text-emerald-700 print:text-black">
                  <td className="py-4 px-6 font-bold">Incentive (+)</td>
                  <td className="py-4 px-6 text-center">-</td>
                  <td className="py-4 px-6 text-right font-mono text-[13px]">+ Rs {formatCurrency(slip.incentive || 0)}</td>
                </tr>
              )}
              {((slip.otherEarnings || 0) > 0) && (
                <tr className="text-emerald-700 print:text-black">
                  <td className="py-4 px-6 font-bold">Other Earnings / Custom (+)</td>
                  <td className="py-4 px-6 text-center">-</td>
                  <td className="py-4 px-6 text-right font-mono text-[13px]">+ Rs {formatCurrency(slip.otherEarnings || 0)}</td>
                </tr>
              )}

              {/* Legacy fallback check just in case older records exist */}
              {((slip.bonus || 0) > 0) && (
                <tr className="text-emerald-700 print:text-black">
                  <td className="py-4 px-6 font-bold">Bonuses / Other (+)</td>
                  <td className="py-4 px-6 text-center">-</td>
                  <td className="py-4 px-6 text-right font-mono text-[13px]">+ Rs {formatCurrency(slip.bonus || 0)}</td>
                </tr>
              )}

              {/* Deductions */}
              {((slip.absentDeduction || 0) > 0) && (
                <tr className="text-red-700 print:text-black">
                  <td className="py-4 px-6 font-bold">Absent Deduction (-)</td>
                  <td className="py-4 px-6 text-center">Applied</td>
                  <td className="py-4 px-6 text-right font-mono text-[13px]">- Rs {formatCurrency(slip.absentDeduction || 0)}</td>
                </tr>
              )}
              {((slip.fine || 0) > 0) && (
                <tr className="text-red-700 print:text-black">
                  <td className="py-4 px-6 font-bold">Fine / Penalty (-)</td>
                  <td className="py-4 px-6 text-center">-</td>
                  <td className="py-4 px-6 text-right font-mono text-[13px]">- Rs {formatCurrency(slip.fine || 0)}</td>
                </tr>
              )}
              {((slip.advance || 0) > 0) && (
                <tr className="text-red-700 print:text-black">
                  <td className="py-4 px-6 font-bold">Advance Salary Adjustment (-)</td>
                  <td className="py-4 px-6 text-center">-</td>
                  <td className="py-4 px-6 text-right font-mono text-[13px]">- Rs {formatCurrency(slip.advance || 0)}</td>
                </tr>
              )}
              {((slip.otherDeductions || 0) > 0) && (
                <tr className="text-red-700 print:text-black">
                  <td className="py-4 px-6 font-bold">Other / Custom Deductions (-)</td>
                  <td className="py-4 px-6 text-center">-</td>
                  <td className="py-4 px-6 text-right font-mono text-[13px]">- Rs {formatCurrency(slip.otherDeductions || 0)}</td>
                </tr>
              )}

              <tr className="bg-gray-900 font-black text-[11px] uppercase tracking-tight text-white print:bg-white print:text-black print:border-t-2 print:border-black">
                <td className="py-5 px-6 uppercase font-black text-[12px]">Net Disbursed Amount</td>
                <td className="py-5 px-6 text-center">-</td>
                <td className="py-5 px-6 text-right text-lg font-black tracking-tight font-mono">
                  Rs {formatCurrency(slip.netSalary)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rationales */}
        {((slip.bonusReason) || (slip.otherEarningsReason) || (slip.deductionReason)) && (
          <div className="space-y-4 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 print:bg-white print:rounded-none print:border-gray-200">
            <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 print:text-gray-600">
              Detailed Justifications
            </h4>
            {slip.otherEarningsReason && (
              <div className="text-xs">
                <span className="font-black uppercase text-[8px] tracking-[0.1em] text-emerald-700 block mb-1 print:text-black">Earning Reason:</span>
                <p className="text-gray-700 italic font-medium print:text-black">"{slip.otherEarningsReason}"</p>
              </div>
            )}
            {slip.deductionReason && (
              <div className="text-xs">
                <span className="font-black uppercase text-[8px] tracking-[0.1em] text-red-700 block mb-1 print:text-black">Deduction Reason:</span>
                <p className="text-gray-700 italic font-medium print:text-black">"{slip.deductionReason}"</p>
              </div>
            )}
            {slip.bonusReason && !slip.otherEarningsReason && (
              <div className="text-xs">
                <span className="font-black uppercase text-[8px] tracking-[0.1em] text-emerald-700 block mb-1 print:text-black">Note:</span>
                <p className="text-gray-700 italic font-medium print:text-black">"{slip.bonusReason}"</p>
              </div>
            )}
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 pt-16 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 print:text-black print:pt-12">
          <div className="space-y-3">
            <div className="border-b border-gray-200 mx-auto w-3/4 h-8 print:border-gray-400" />
            <span>PREPARED BY (CASHIER)</span>
          </div>
          <div className="space-y-3">
            <div className="border-b border-gray-200 mx-auto w-3/4 h-8 print:border-gray-400" />
            <span>AUTHORIZED (SUPERADMIN)</span>
          </div>
          <div className="space-y-3">
            <div className="border-b border-gray-200 mx-auto w-3/4 h-8 print:border-gray-400" />
            <span>RECEIVED BY (EMPLOYEE)</span>
          </div>
        </div>

        {/* Watermark */}
        <div className="text-center pt-8 text-[8px] font-black uppercase tracking-[0.3em] text-gray-300 print:text-gray-500">
          System Generated on {new Date(slip.createdAt || '').toLocaleString()} · KHANHUB ERP Payroll
        </div>
      </div>
    </div>
  );
}
