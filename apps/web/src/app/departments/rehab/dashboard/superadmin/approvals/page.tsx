'use client';

import React, { useEffect, useState } from 'react';
import { getPendingTransactions, approveTransaction, rejectTransaction } from '@/lib/rehab/transactions';
import type { Transaction, RehabUser } from '@/types/rehab';

export default function SuperAdminApprovalsPage() {
  const [pending, setPending] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState('');

  const fetchData = async () => {
    const raw = localStorage.getItem('rehab_session');
    if (raw) {
      const user = JSON.parse(raw) as RehabUser;
      if (user.role !== 'superadmin') {
        window.location.href = '/departments/rehab/login';
        return;
      }
      setAdminId(user.uid);
    }

    try {
      const data = await getPendingTransactions();
      setPending(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approveTransaction(id, adminId);
      } else {
        await rejectTransaction(id, adminId);
      }
      fetchData();
    } catch (err) {
      alert(`Error during ${action}`);
    }
  };

  if (loading) return <div className="space-y-8 animate-pulse"><div className="h-16 bg-gray-100 rounded-2xl" /><div className="h-96 bg-gray-100 rounded-3xl" /></div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Queue Approval</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Authorize Financial Operations</p>
        </div>
        <div className="bg-orange-50 px-6 py-3 rounded-2xl border border-orange-100 font-black text-[#f97316] text-sm uppercase tracking-widest flex items-center gap-3">
          <span className="w-6 h-6 bg-orange-200 rounded-lg flex items-center justify-center text-xs">!</span>
          {pending.length} Pending Requets
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transaction Details</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cashier</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Amount</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pending.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-6">
                  <p className="font-black text-gray-900 text-sm leading-tight mb-1">{t.description}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.category.replace('_', ' ')} • {new Date(t.date).toLocaleDateString()}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400">ID</div>
                    <span className="text-xs font-black text-gray-700 tracking-wider">#{t.cashierId.slice(-6).toUpperCase()}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} PKR
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => handleAction(t.id, 'reject')}
                      className="px-6 py-2.5 rounded-xl border-2 border-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm shadow-red-50"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(t.id, 'approve')}
                      className="px-6 py-2.5 rounded-xl bg-[#1D9E75] text-white hover:bg-[#1D9E75]/90 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#1D9E75]/20"
                    >
                      Authorize
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pending.length === 0 && (
          <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs py-24">
             The queue is currently empty. All transactions are up to date.
          </div>
        )}
      </div>
    </div>
  );
}
