'use client';

import React, { useState } from 'react';
import { createTransaction } from '@/lib/welfare/transactions';

export default function TransactionForm({ cashierId, onSuccess }: { cashierId: string, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: 'patient_fee',
    amount: '',
    description: '',
    patientId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = {
    income: ['patient_fee', 'canteen_deposit'],
    expense: ['rent', 'electricity', 'medicine', 'staff_salary', 'miscellaneous']
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTransaction({
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        txnDescription: formData.description,
        cashierId,
        patientId: formData.patientId || undefined,
        date: new Date(formData.date)
      });
      setFormData({ ...formData, amount: '', description: '', patientId: '' });
      onSuccess();
    } catch (err) {
      alert('Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
      <h3 className="text-xl font-black text-gray-900 mb-2">New Transaction</h3>
      
      <div className="flex gap-4 p-1 bg-gray-50 rounded-2xl border border-gray-100">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'income', category: 'patient_fee' })}
          className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.type === 'income' ? 'bg-[#1D9E75] text-white shadow-md shadow-[#1D9E75]/20' : 'text-gray-500'}`}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'expense', category: 'miscellaneous' })}
          className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.type === 'expense' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'text-gray-500'}`}
        >
          Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Category</label>
          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-medium focus:ring-2 focus:ring-[#1D9E75]/20 outline-none appearance-none"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {categories[formData.type].map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Date</label>
          <input
            type="date"
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-medium focus:ring-2 focus:ring-[#1D9E75]/20 outline-none"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Amount (PKR)</label>
        <input
          type="number"
          required
          placeholder="Enter amount..."
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-2xl font-black text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#1D9E75]/20 outline-none"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        />
      </div>

      {(formData.category === 'patient_fee' || formData.category === 'canteen_deposit') && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Patient ID</label>
          <input
            type="text"
            required
            placeholder="e.g. PAT-001"
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-medium focus:ring-2 focus:ring-[#1D9E75]/20 outline-none"
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Description</label>
        <textarea
          required
          rows={3}
          placeholder="Provide more details..."
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-700 font-medium focus:ring-2 focus:ring-[#1D9E75]/20 outline-none resize-none"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <button
        disabled={loading}
        className="w-full bg-gray-900 text-white rounded-2xl py-5 font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 shadow-xl shadow-gray-200"
      >
        {loading ? 'Processing...' : 'Record Transaction'}
      </button>
    </form>
  );
}
