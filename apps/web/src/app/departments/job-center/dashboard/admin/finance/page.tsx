'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  collection, getDocs, query, where, orderBy, Timestamp, 
  addDoc, doc, getDoc, getCountFromServer, getAggregateFromServer, sum 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  TrendingUp, TrendingDown, DollarSign, Filter, 
  Search, Calendar, Loader2, BarChart3, AlertCircle, CheckCircle, Plus, X, ArrowLeft
} from 'lucide-react';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';
import { toast } from 'react-hot-toast';

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
  const [filterBy, setFilterBy] = useState<'date' | 'createdAt'>('date');
  const [todayStats, setTodayStats] = useState({ income: 0, count: 0 });

  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, net: 0 });

  // Add Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTx, setNewTx] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    category: 'other_income',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/job-center/login');
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

      const dateField = filterBy === 'date' ? 'date' : 'createdAt';

      const baseQ = query(
        collection(db, 'jobcenter_transactions'),
        where(dateField, '>=', Timestamp.fromDate(from)),
        where(dateField, '<=', Timestamp.fromDate(to))
      );

      // 1. Fetch Stats via Aggregation (Low Reads)
      const statsQ = query(baseQ, where('status', '==', 'approved'));
      const incomeQ = query(statsQ, where('type', '==', 'income'));
      const expenseQ = query(statsQ, where('type', '==', 'expense'));
      
      const [incomeSnap, expenseSnap] = await Promise.all([
        getAggregateFromServer(incomeQ, { total: sum('amount') }),
        getAggregateFromServer(expenseQ, { total: sum('amount') })
      ]);

      const incomeVal = incomeSnap.data().total || 0;
      const expenseVal = expenseSnap.data().total || 0;
      setStats({ income: incomeVal, expense: expenseVal, net: incomeVal - expenseVal });

      // 2. Fetch Detailed List
      let listQ = query(baseQ, orderBy(dateField, 'desc'));
      const snapshot = await getDocs(listQ);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // Client-side filtering for secondary fields
      if (typeFilter !== 'all') data = data.filter(tx => tx.type === typeFilter);
      if (statusFilter !== 'all') data = data.filter(tx => tx.status === statusFilter);
      if (categoryFilter !== 'all') data = data.filter(tx => tx.category === categoryFilter);

      setTransactions(data);

      // 3. Today's "Added Today" Stats
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);

      const todayQ = query(
        collection(db, 'jobcenter_transactions'),
        where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
        where('createdAt', '<=', Timestamp.fromDate(endOfToday))
      );
      const todayCountSnap = await getCountFromServer(todayQ);
      const todayIncomeSnap = await getAggregateFromServer(query(todayQ, where('type', '==', 'income')), { total: sum('amount') });
      
      setTodayStats({ 
        income: todayIncomeSnap.data().total || 0, 
        count: todayCountSnap.data().count 
      });

    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setQueryLoading(false);
    }
  }, [dateFrom, dateTo, typeFilter, statusFilter, categoryFilter, filterBy]);

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

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || Number(newTx.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsSaving(true);
      
      const setupSnap = await getDoc(doc(db, 'jobcenter_meta', 'setup'));
      const setupData = setupSnap.data() as any;
      const cashierCustomId = String(setupData?.cashierCustomId || '').toUpperCase();

      if (!cashierCustomId) {
        toast.error("Cashier ID not configured in settings");
        setIsSaving(false);
        return;
      }

      await addDoc(collection(db, 'jobcenter_transactions'), {
        type: newTx.type,
        amount: Number(newTx.amount),
        category: newTx.category,
        categoryName: formatCategory(newTx.category),
        description: newTx.description,
        date: Timestamp.fromDate(new Date(newTx.date)),
        transactionDate: Timestamp.fromDate(new Date(newTx.date)),
        status: 'pending', // Admins create transactions that might need cashier/superadmin sync but for jobcenter admin we'll keep it pending for cashier to reconcile
        cashierId: cashierCustomId,
        departmentCode: 'job-center',
        departmentName: 'Job Center',
        createdBy: session.uid,
        createdByName: session.displayName || 'Job Center Admin',
        createdAt: Timestamp.now()
      });

      toast.success("Transaction added successfully ✓");
      setShowAddModal(false);
      setNewTx({
        type: 'income',
        amount: '',
        category: 'other_income',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      console.error("Add transaction error:", error);
      toast.error("Failed to add transaction");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      seeker_fee: 'Job Seeker Fee',
      canteen_deposit: 'Canteen Deposit',
      donation: 'Donation',
      government_grant: 'Government Grant',
      commission_30_percent: '30% Placement Commission',
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
      seeker_welfare: 'Job Seeker Welfare',
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
    'seeker_fee', 'commission_30_percent', 'canteen_deposit', 'donation', 'government_grant', 'other_income',
    'staff_salary', 'rent', 'electricity', 'gas', 'water', 'medicine', 'food',
    'canteen_expense', 'maintenance', 'transport', 'equipment', 'security',
    'cleaning', 'seeker_welfare', 'office_supplies', 'other_expense'
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNewTx(prev => ({ ...prev, type: 'expense', category: 'other_expense' }));
                setShowAddModal(true);
              }}
              className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
            <button
              onClick={() => {
                setNewTx(prev => ({ ...prev, type: 'income', category: 'other_income' }));
                setShowAddModal(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-900/10 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Income
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-12 h-12 text-green-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Income</span>
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight">₨{stats.income.toLocaleString()}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown className="w-12 h-12 text-red-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Expense</span>
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight">₨{stats.expense.toLocaleString()}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-teal-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle className="w-12 h-12 text-teal-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Added Today</span>
            </div>
            <div className="text-2xl font-black text-teal-700 tracking-tight">₨{todayStats.income.toLocaleString()}</div>
            <p className="text-[10px] font-bold text-teal-500 mt-1 uppercase tracking-widest">{todayStats.count} TX Logged Today</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-12 h-12 text-gray-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Balance</span>
            </div>
            <div className={`text-2xl font-black tracking-tight ${stats.net >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              ₨{stats.net.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-50">
            <Filter className="w-4 h-4 text-teal-600" /> Filters
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Filter By</label>
              <select 
                value={filterBy} 
                onChange={e => setFilterBy(e.target.value as any)} 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm font-bold text-gray-700"
              >
                <option value="date">Transaction Date</option>
                <option value="createdAt">Date Created/Added</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">From</label>
              <input
                type="text"
                placeholder="DD MM YYYY"
                value={formatDateDMY(dateFrom)}
                onChange={e => setDateFrom(e.target.value)}
                onBlur={e => {
                  const parsed = parseDateDMY(e.target.value);
                  if (parsed) setDateFrom(parsed.toISOString().split('T')[0]);
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">To</label>
              <input
                type="text"
                placeholder="DD MM YYYY"
                value={formatDateDMY(dateTo)}
                onChange={e => setDateTo(e.target.value)}
                onBlur={e => {
                  const parsed = parseDateDMY(e.target.value);
                  if (parsed) setDateTo(parsed.toISOString().split('T')[0]);
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
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

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className={`p-6 ${newTx.type === 'income' ? 'bg-teal-600' : 'bg-red-600'} text-white flex justify-between items-center`}>
              <div>
                <h3 className="text-xl font-black">Add New {newTx.type === 'income' ? 'Income' : 'Expense'}</h3>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Job Center Finance</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Amount (PKR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      required
                      value={newTx.amount}
                      onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                      placeholder="Enter amount..."
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-lg font-black outline-none focus:border-teal-500/50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Category</label>
                  <select
                    value={newTx.category}
                    onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-teal-500/50 focus:bg-white transition-all capitalize"
                  >
                    {allCategories.filter(cat => {
                      if (newTx.type === 'income') return ['seeker_fee', 'commission_30_percent', 'donation', 'government_grant', 'other_income'].includes(cat);
                      return !['seeker_fee', 'commission_30_percent', 'donation', 'government_grant', 'other_income'].includes(cat) || cat === 'other_expense';
                    }).map(cat => (
                      <option key={cat} value={cat}>{formatCategory(cat)}</option>
                    ))}
                    {/* Add commission_30_percent if not in list */}
                    {!allCategories.includes('commission_30_percent') && newTx.type === 'income' && (
                      <option value="commission_30_percent">30% Placement Commission</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Date</label>
                  <input
                    type="date"
                    required
                    value={newTx.date}
                    onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-teal-500/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Description</label>
                  <textarea
                    rows={3}
                    value={newTx.description}
                    onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                    placeholder="Describe this transaction..."
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-teal-500/50 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 ${
                    newTx.type === 'income' ? 'bg-teal-600 shadow-teal-900/20' : 'bg-red-600 shadow-red-900/20'
                  }`}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

