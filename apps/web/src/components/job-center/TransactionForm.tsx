// src/components/job-center/TransactionForm.tsx
'use client';

import React, { useState } from 'react';
import { createTransaction } from '@/lib/job-center/transactions';
import { toast } from 'react-hot-toast';

export default function TransactionForm({ cashierId, onSuccess }: { cashierId: string, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: 'seeker_fee',
    amount: '',
    description: '',
    seekerId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = {
    income: ['seeker_fee', 'canteen_deposit'],
    expense: ['rent', 'electricity', 'medicine', 'staff_salary', 'miscellaneous']
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await createTransaction({
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        txnDescription: formData.description,
        cashierId,
        seekerId: formData.seekerId || undefined,
        date: new Date(formData.date)
      });
      setFormData({ ...formData, amount: '', description: '', seekerId: '' });
      toast.success('Transaction recorded');
      onSuccess();
    } catch (err) {
      console.error('Error creating transaction:', err);
      toast.error('Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
      <h3 className="text-xl font-black text-gray-900 mb-2">New Transaction</h3>
      
      <div className="flex gap-4 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'income', category: 'seeker_fee' })}
          className={`flex-1 py-3 rounded-xl font-black transition-all ${formData.type === 'income' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'expense', category: 'miscellaneous' })}
          className={`flex-1 py-3 rounded-xl font-black transition-all ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/20' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-bold focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {categories[formData.type].map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
          <input
            type="date"
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Amount (PKR)</label>
        <div className="relative">
           <input
            type="number"
            required
            placeholder="0.00"
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-3xl font-black text-gray-900 placeholder:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black text-lg">PKR</span>
        </div>
      </div>

      {(formData.category === 'seeker_fee' || formData.category === 'canteen_deposit') && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Seeker ID</label>
          <input
            type="text"
            required
            placeholder="e.g. JOBCENTER-058"
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
            value={formData.seekerId}
            onChange={(e) => setFormData({ ...formData, seekerId: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
        <textarea
          required
          rows={3}
          placeholder="Provide more details..."
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-bold focus:ring-2 focus:ring-orange-500 outline-none resize-none"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <button
        disabled={loading}
        className="w-full bg-gray-900 text-white rounded-2xl py-5 font-black text-lg hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-gray-200 active:scale-95"
      >
        {loading ? 'Processing...' : 'Record Transaction'}
      </button>
    </form>
  );
}
