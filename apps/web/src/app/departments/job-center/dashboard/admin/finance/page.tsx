'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  collection, getDocs, addDoc, query, orderBy, limit, Timestamp, where 
} from 'firebase/firestore';
import { 
  Banknote, TrendingUp, TrendingDown, Plus, 
  Search, Filter, Download, ArrowUpRight, 
  ArrowDownRight, Loader2, DollarSign, PieChart,
  Calendar, Building, User, Tag
} from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function JobCenterFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    regFees: 0,
    commissions: 0,
    balance: 0
  });

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'registration',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    entityName: '', // Seeker or Employer name
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    fetchFinanceData();
  }, [router]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'jobcenter_finance'), orderBy('date', 'desc'), limit(50));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(docs);

      // Calculate simple stats (this would normally be done via cloud functions or a summary doc)
      let income = 0;
      let expenses = 0;
      let reg = 0;
      let comm = 0;

      docs.forEach((t: any) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') {
          income += amt;
          if (t.category === 'registration') reg += amt;
          if (t.category === 'commission') comm += amt;
        } else {
          expenses += amt;
        }
      });

      setStats({
        totalIncome: income,
        totalExpenses: expenses,
        regFees: reg,
        commissions: comm,
        balance: income - expenses
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    try {
      setIsSaving(true);
      const session = JSON.parse(localStorage.getItem('jobcenter_session') || '{}');
      
      const txData = {
        ...formData,
        amount: Number(formData.amount),
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: Timestamp.now(),
        createdBy: session.displayName || 'Admin',
        createdById: session.uid || 'unknown'
      };

      await addDoc(collection(db, 'jobcenter_finance'), txData);
      toast.success('Transaction recorded successfully');
      setShowAddModal(false);
      fetchFinanceData();
      setFormData({
        type: 'income',
        category: 'registration',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        entityName: '',
      });
    } catch (err) {
      toast.error('Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/5 pb-10">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-black tracking-tighter leading-tight">
            Financial <span className="text-orange-600">Ledger</span> 💰
          </h1>
          <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-orange-500" />
            Revenue & Expense Tracking • Job Center
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl text-[13px] font-black hover:bg-orange-600 transition-all active:scale-95 shadow-2xl shadow-black/10 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
          Record Entry
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm group hover:border-black/20 transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Current Balance</p>
          <p className="text-3xl font-black text-black tracking-tight">PKR {stats.balance.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
            <ArrowUpRight size={12} /> Net Liquidity
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Registration Fees</p>
          <p className="text-3xl font-black text-orange-600 tracking-tight">PKR {stats.regFees.toLocaleString()}</p>
          <p className="mt-4 text-[10px] text-gray-400 font-black uppercase tracking-tight">Total collected from Seekers</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Placment Commissions</p>
          <p className="text-3xl font-black text-indigo-600 tracking-tight">PKR {stats.commissions.toLocaleString()}</p>
          <p className="mt-4 text-[10px] text-gray-400 font-black uppercase tracking-tight">30% First Salary Shares</p>
        </div>

        <div className="bg-red-50 rounded-[2.5rem] p-8 border border-red-100 shadow-sm">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">Total Expenses</p>
          <p className="text-3xl font-black text-red-600 tracking-tight">PKR {stats.totalExpenses.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-600">
            <ArrowDownRight size={12} /> Outgoing Funds
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-[3rem] border border-black/5 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-700">
        <div className="p-10 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
              <Banknote size={24} />
            </div>
            <h2 className="text-xl font-black text-black tracking-tight uppercase">Recent Transactions</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-2">
                <Search size={14} className="text-gray-400" />
                <input type="text" placeholder="Search entries..." className="bg-transparent border-none text-xs font-bold outline-none ml-2 w-40" />
             </div>
             <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400"><Filter size={20} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Date</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Description</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Category</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Entity</th>
                <th className="px-10 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center opacity-30">
                     <Banknote className="w-12 h-12 mx-auto mb-4" />
                     <p className="text-sm font-black uppercase tracking-widest">No transaction records found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-6">
                       <p className="text-xs font-black text-gray-900">{formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}</p>
                    </td>
                    <td className="px-6 py-6">
                       <p className="text-sm font-bold text-gray-700">{t.description}</p>
                    </td>
                    <td className="px-6 py-6">
                       <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                         t.type === 'income' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                       }`}>
                         {t.category || t.type}
                       </span>
                    </td>
                    <td className="px-6 py-6">
                       <p className="text-[10px] font-black text-gray-400 uppercase">{t.entityName || 'General'}</p>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <p className={`text-sm font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                         {t.type === 'income' ? '+' : '-'} PKR {Number(t.amount).toLocaleString()}
                       </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <form onSubmit={handleAddTransaction}>
              <div className="p-8 border-b border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 uppercase">New Finance Entry</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Record a manual income or expense</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="income">INCOME (+)</option>
                      <option value="expense">EXPENSE (-)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="registration">REGISTRATION FEE</option>
                      <option value="commission">PLACEMENT (30%)</option>
                      <option value="salary">STAFF SALARY</option>
                      <option value="marketing">MARKETING</option>
                      <option value="utility">UTILITIES</option>
                      <option value="other">OTHER</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (PKR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-300">PKR</span>
                    <input 
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-14 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <input 
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Monthly Rent, Registration for Seeker X"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                    <input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Related Entity</label>
                    <input 
                      type="text"
                      value={formData.entityName}
                      onChange={(e) => setFormData({...formData, entityName: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Name (Optional)"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
