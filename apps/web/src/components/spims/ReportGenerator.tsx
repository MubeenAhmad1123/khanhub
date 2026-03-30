'use client';

import React, { useState } from 'react';
import { generateMonthlyReport } from '@/lib/spims/reports';

export default function ReportGenerator() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateMonthlyReport(year, month);
      setReportData(data);
    } catch (err) {
      alert('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="flex-1 grid grid-cols-2 gap-4">
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:ring-2 focus:ring-[#1D9E75]/20"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:ring-2 focus:ring-[#1D9E75]/20"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-[#1D9E75] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#1D9E75]/20 hover:scale-105 transition-all"
        >
          {loading ? 'Generaitng...' : 'Generate Report'}
        </button>
      </div>

      {reportData && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center border-b border-gray-50 pb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Financial Report</h2>
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">{reportData.period}</p>
            </div>
            <div className="text-right">
              <button 
                onClick={() => window.print()}
                className="text-sm font-bold text-[#1D9E75] bg-[#1D9E75]/10 px-4 py-2 rounded-lg hover:bg-[#1D9E75]/20 transition-all no-print"
              >
                Print PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-green-50 p-6 rounded-2xl">
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Total Income</p>
              <p className="text-2xl font-black text-green-700">{reportData.totalIncome.toLocaleString()} PKR</p>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl">
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Total Expenses</p>
              <p className="text-2xl font-black text-red-700">{reportData.totalExpenses.toLocaleString()} PKR</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-2xl">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Net Balance</p>
              <p className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                {reportData.netBalance.toLocaleString()} PKR
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Category Breakdown</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(reportData.categoryBreakdown).map(([cat, val]: [string, any]) => (
                <div key={cat} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-bold text-gray-600 uppercase text-xs">{cat.replace('_', ' ')}</span>
                  <span className={`font-black ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {val.toLocaleString()} PKR
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 text-center text-xs text-gray-400 font-medium">
             KhanHub Spims Center Management System — Transaction Count: {reportData.transactionCount}
          </div>
        </div>
      )}
    </div>
  );
}
