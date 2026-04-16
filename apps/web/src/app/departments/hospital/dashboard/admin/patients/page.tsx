// src/app/departments/hospital/dashboard/admin/patients/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { 
  FileText, Search, Filter, Calendar, Loader2, 
  ArrowLeft, Download, CheckCircle, AlertCircle, X, 
  ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { formatDateDMY, toDate } from '@/lib/utils';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'opd_reception', label: 'OPD Reception' },
  { value: 'lab_test', label: 'Lab Test' },
  { value: 'operation', label: 'Operation' },
  { value: 'expense', label: 'All Expenses' },
  { value: 'other_income', label: 'Other Income' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const CATEGORY_LABELS: Record<string, string> = {
  opd_reception: 'OPD Reception',
  lab_test: 'Lab Test',
  operation: 'Operation',
  staff_salary: 'Staff Salary',
  utilities: 'Utilities',
  other_expense: 'Other Expense',
  other_income: 'Other Income'
};

export default function TransactionRecordsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) {
      router.push('/departments/hospital/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/hospital/login');
      return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, dateFrom, dateTo, categoryFilter, statusFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const start = new Date(dateFrom); start.setHours(0,0,0,0);
      const end = new Date(dateTo); end.setHours(23,59,59,999);

      let q = query(
        collection(db, 'hospital_transactions'),
        where('departmentCode', '==', 'hospital'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
      );

      const snap = await getDocs(q);
      let allTx = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Client-side category filtering if not 'all'
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'expense') {
          allTx = allTx.filter(tx => tx.type === 'expense');
        } else {
          allTx = allTx.filter(tx => tx.category === categoryFilter);
        }
      }

      // Client-side status filtering if not 'all'
      if (statusFilter !== 'all') {
        allTx = allTx.filter(tx => tx.status === statusFilter);
      }

      setTransactions(allTx);
    } catch (err: any) {
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDetails = (tx: any) => {
    const meta = tx.hospitalMeta || {};
    if (tx.category === 'lab_test') return meta.testName || 'Lab Test';
    if (tx.category === 'operation') return meta.operationType || 'Operation';
    if (tx.category === 'opd_reception' || tx.category === 'opd') return meta.visitPurpose || (meta.shift ? `OPD ${meta.shift}` : 'Walk-in OPD');
    if (tx.type === 'expense') return tx.otherMeta?.paidTo || tx.otherMeta?.expenseDetail || 'Expense';
    return 'N/A';
  };

  const filteredBySearch = transactions.filter(tx => 
    (tx.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              Transaction Records
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Full audit trail and history of all hospital activities</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date From</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date To</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <div className="relative">
                <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by patient name or service detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 font-black text-xs uppercase tracking-widest italic animate-pulse">Syncing Database Records...</p>
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-200" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">No Records Found</h3>
                <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">Try adjusting your filters or date range to find what you're looking for.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Date & Time</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Service Type</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Patient/Entity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Details</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {filteredBySearch.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">{formatDateDMY(tx.date)}</span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                            <Clock size={10} className="text-emerald-500" />
                            {toDate(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-700">{tx.category ? (CATEGORY_LABELS[tx.category] || tx.category) : '—'}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center font-black text-[10px] shadow-sm`}>
                            {(tx.patientName || tx.otherMeta?.paidTo || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-900">{tx.patientName || tx.otherMeta?.paidTo || '—'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-medium text-slate-500 line-clamp-1 italic">
                          {getDetails(tx)}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5">
                          {tx.type === 'income' ? <ArrowUpRight size={12} className="text-emerald-500" /> : <ArrowDownRight size={12} className="text-rose-500" />}
                          <span className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₨ {Number(tx.amount).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm
                          ${tx.status === 'approved' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 
                            tx.status === 'rejected' ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100' : 
                            'bg-amber-50 text-amber-600 ring-1 ring-amber-100'}
                        `}>
                          {tx.status === 'approved' && <CheckCircle size={10} />}
                          {tx.status === 'rejected' && <X size={10} />}
                          {tx.status === 'pending' && <AlertCircle size={10} className="animate-pulse" />}
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-slate-900 rounded-[2rem] text-white">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Record Verification</p>
                <p className="text-[10px] text-slate-400 font-medium">Click on any transaction to view source image/receipt receipt in HQ portal.</p>
             </div>
          </div>
          <div className="flex gap-1 items-center mt-4 sm:mt-0">
             <span className="text-[11px] font-black bg-emerald-500 text-white px-3 py-1 rounded-lg">{filteredBySearch.length}</span>
             <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Total Entries in View</span>
          </div>
        </div>

      </div>
    </div>
  );
}