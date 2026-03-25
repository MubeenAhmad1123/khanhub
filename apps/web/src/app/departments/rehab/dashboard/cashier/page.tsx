'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { getTodayTransactions } from '@/lib/rehab/transactions';
import TransactionForm from '@/components/rehab/TransactionForm';
import type { Transaction } from '@/types/rehab';

export default function CashierDashboardPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRehabSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      const data = await getTodayTransactions(user.uid);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || (user.role !== 'cashier' && user.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }
    fetchData();
  }, [router, user, sessionLoading]);

  const todayIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const todayExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  if (sessionLoading || loading) return <div className="space-y-8 animate-pulse"><div className="h-48 bg-gray-100 rounded-3xl" /><div className="h-96 bg-gray-100 rounded-3xl" /></div>;

  return (
    <div className="space-y-10 pb-12">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Cashier Station</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest leading-relaxed">Financial Entry Management</p>
        </div>
        <div className="flex gap-6">
          <div className="text-right border-r border-gray-100 pr-6">
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Today's Income</p>
            <p className="text-2xl font-black text-gray-900">{todayIncome.toLocaleString()} <span className="text-sm font-normal text-gray-400">PKR</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Today's Expense</p>
            <p className="text-2xl font-black text-gray-900">{todayExpense.toLocaleString()} <span className="text-sm font-normal text-gray-400">PKR</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          {user && <TransactionForm cashierId={user.uid} onSuccess={fetchData} />}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-sm font-bold text-orange-500">📄</span>
              Recent Entries
            </h2>
            <button onClick={fetchData} className="text-xs font-black text-[#1D9E75] hover:underline uppercase tracking-widest">Refresh</button>
          </div>

          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] border border-gray-100 border-dashed text-center text-gray-400 font-medium">
                No transactions recorded today yet.
              </div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all border-l-4" style={{ borderLeftColor: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                       <span className="text-sm font-black text-gray-800">{t.description}</span>
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${t.status === 'approved' ? 'bg-green-100 text-green-600' : t.status === 'pending' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                         {t.status}
                       </span>
                    </div>
                    <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       <span>{t.category.replace('_', ' ')}</span>
                       <span>{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
