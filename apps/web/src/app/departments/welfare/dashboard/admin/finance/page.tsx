'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  TrendingUp, TrendingDown, DollarSign, Filter, 
  Search, Calendar, Loader2, BarChart3, AlertCircle, CheckCircle
} from 'lucide-react';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';
import { BrutalistCalendar } from '@/components/ui/BrutalistCalendar';

export default function FinanceLogPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [queryLoading, setQueryLoading] = useState(false);

  // Filters
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'rejected_cashier'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, net: 0 });

  useEffect(() => {
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) {
      router.push('/departments/welfare/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/welfare/login');
      return;
    }
    setSession(parsed);
    setLoading(false);
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      setQueryLoading(true);
      
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);

      // We constrain our query to date range to keep it simple and composite index minimal
      const q = query(
        collection(db, 'welfare_transactions'),
        where('date', '>=', Timestamp.fromDate(from)),
        where('date', '<=', Timestamp.fromDate(to)),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // Client-side filtering for other fields
      if (typeFilter !== 'all') {
        data = data.filter(tx => tx.type === typeFilter);
      }
      if (statusFilter !== 'all') {
        data = data.filter(tx => tx.status === statusFilter);
      }
      if (categoryFilter !== 'all') {
        data = data.filter(tx => tx.category === categoryFilter);
      }

      setTransactions(data);

      // Calculate stats (only approved transactions contribute to stats)
      let income = 0;
      let expense = 0;
      data.forEach(tx => {
        if (tx.status === 'approved') {
          if (tx.type === 'income') income += tx.amount;
          if (tx.type === 'expense') expense += tx.amount;
        }
      });
      setStats({ income, expense, net: income - expense });

    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setQueryLoading(false);
    }
  }, [dateFrom, dateTo, typeFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    if (!session) return;
    fetchData();
  }, [session, fetchData]);

  const clearFilters = () => {
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    // The user will click Apply Filters to re-fetch
  };

  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      child_fee: 'Child Monthly Fee',
      canteen_deposit: 'Canteen Deposit',
      donation: 'Donation',
      government_grant: 'Government Grant',
      other_income: 'Other Income',
      staff_salary: 'Staff Salary',
      rent: 'Rent / Property',
      electricity: 'Electricity Bill',
      gas: 'Gas Bill',
      water: 'Water Bill',
      medicine: 'Medicine / Pharmacy',
      food: 'Food & Groceries',
      canteen_expense: 'Canteen Expense',
      maintenance: 'Building Maintenance',
      transport: 'Transport / Fuel',
      equipment: 'Equipment Purchase',
      security: 'Security Services',
      cleaning: 'Cleaning Supplies',
      child_welfare: 'Child Welfare',
      office_supplies: 'Office Supplies',
      other_expense: 'Other Expense',
    };
    return map[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const allCategories = [
    'child_fee', 'canteen_deposit', 'donation', 'government_grant', 'other_income',
    'staff_salary', 'rent', 'electricity', 'gas', 'water', 'medicine', 'food',
    'canteen_expense', 'maintenance', 'transport', 'equipment', 'security',
    'cleaning', 'child_welfare', 'office_supplies', 'other_expense'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-teal-600" />
              Finance Log
            </h1>
            <p className="text-sm text-gray-500 mt-1">Read-only financial overview & history</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-50">
            <Filter className="w-4 h-4 text-teal-600" /> Filters
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <BrutalistCalendar
                label="From"
                value={dateFrom}
                onChange={setDateFrom}
              />
            </div>
            <div className="space-y-1.5">
              <BrutalistCalendar
                label="To"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm capitalize font-bold text-gray-700">
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm capitalize font-bold text-gray-700">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="rejected_cashier">Rejected by Cashier</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Category</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm capitalize font-bold text-gray-700">
                <option value="all">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{formatCategory(cat)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-6 mt-2 border-t border-gray-50">
            <button onClick={clearFilters} className="text-sm font-medium text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100">Clear</button>
            <button 
              onClick={fetchData}
              disabled={queryLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
            >
              {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Apply Filters
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-green-100 rounded-2xl shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-16 h-16 text-green-600" />
            </div>
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <TrendingUp className="w-5 h-5" />
              <span className="font-black text-[10px] uppercase tracking-widest">Approved Income</span>
            </div>
            <div className="text-3xl font-black text-gray-900 leading-none">₨{stats.income.toLocaleString('en-PK')}</div>
          </div>

          <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown className="w-16 h-16 text-red-600" />
            </div>
            <div className="flex items-center gap-2 text-red-600 mb-3">
              <TrendingDown className="w-5 h-5" />
              <span className="font-black text-[10px] uppercase tracking-widest">Approved Expense</span>
            </div>
            <div className="text-3xl font-black text-gray-900 leading-none">₨{stats.expense.toLocaleString('en-PK')}</div>
          </div>

          <div className="bg-white border border-teal-100 rounded-2xl shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-all sm:col-span-1 md:col-span-1">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-16 h-16 text-teal-600" />
            </div>
            <div className="flex items-center gap-2 text-teal-600 mb-3">
              <DollarSign className="w-5 h-5" />
              <span className="font-black text-[10px] uppercase tracking-widest">Net Balance</span>
            </div>
            <div className={`text-3xl font-black leading-none ${stats.net >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
              ₨{stats.net.toLocaleString('en-PK')}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Type / Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Cashier</th>
                  <th className="px-6 py-4 text-right">Amount (PKR)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 text-gray-300" />
                        <p className="text-base font-medium text-gray-600">No transactions found</p>
                        <p className="text-sm">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <span className="font-medium text-gray-900">{formatCategory(tx.category)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 truncate max-w-xs">
                        <div className="text-gray-700">{tx.description || '-'}</div>
                        {tx.status === 'rejected_cashier' && tx.cashierRejectReason && (
                          <div className="mt-1 text-[11px] font-bold text-red-600">
                            Rejected reason: {tx.cashierRejectReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {formatDateDMY(tx.date?.toDate?.() ? tx.date.toDate() : tx.date)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-400 truncate max-w-[100px]">{tx.cashierId}</td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">
                        {tx.amount.toLocaleString('en-PK')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {tx.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {tx.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <Loader2 className="w-3 h-3 animate-spin" /> Pending
                          </span>
                        )}
                        {tx.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                        {tx.status === 'rejected_cashier' && (
                          <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Rejected by Cashier
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
