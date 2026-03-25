'use client';

import React, { useEffect, useState } from 'react';
import { getTransactionsByDateRange } from '@/lib/rehab/transactions';
import type { Transaction } from '@/types/rehab';

export default function AdminFinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getTransactionsByDateRange(new Date(range.start), new Date(range.end));
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Financial Records</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Transaction History & Auditing</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Start Date</p>
            <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-[#1D9E75]/10 transition-all shadow-sm" />
          </div>
          <div className="space-y-1 text-gray-300 font-black text-xl">→</div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">End Date</p>
            <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-[#1D9E75]/10 transition-all shadow-sm" />
          </div>
        </div>
        <button onClick={fetchData} className="bg-[#1D9E75] text-white px-10 py-4 rounded-[1.5rem] font-bold shadow-xl shadow-[#1D9E75]/20 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest">Filter Records</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 shadow-sm shadow-green-100/30">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Approved Income</p>
          <p className="text-3xl font-black text-green-700">{totalIncome.toLocaleString()} <span className="text-sm font-normal text-green-600/60">PKR</span></p>
        </div>
        <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm shadow-red-100/30">
          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Approved Expenses</p>
          <p className="text-3xl font-black text-red-700">{totalExpense.toLocaleString()} <span className="text-sm font-normal text-red-600/60">PKR</span></p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm shadow-gray-100/30 relative">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Flow</p>
          <p className={`text-3xl font-black ${totalIncome - totalExpense >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{(totalIncome - totalExpense).toLocaleString()} <span className="text-sm font-normal text-gray-400">PKR</span></p>
          <div className="absolute top-8 right-8 text-xl opacity-20">📊</div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transaction</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Amount</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-6">
                  <p className="font-black text-gray-900 leading-tight mb-1">{t.description}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recorded {new Date(t.date).toLocaleDateString()}</p>
                </td>
                <td className="px-8 py-6 uppercase font-bold text-xs text-gray-500 tracking-widest">{t.category.replace('_', ' ')}</td>
                <td className="px-8 py-6">
                  <span className={`font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} PKR
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                   <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${
                     t.status === 'approved' ? 'bg-green-100 text-green-600' : 
                     t.status === 'pending' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                   }`}>
                     {t.status}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
