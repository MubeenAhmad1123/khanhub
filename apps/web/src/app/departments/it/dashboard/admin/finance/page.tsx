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
  Calendar, Building, User, Tag, Laptop, Monitor
} from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/components/ui';

export default function ITFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    tuitionFees: 0,
    projectPayments: 0,
    balance: 0
  });

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'tuition',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    entityName: '', 
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) { router.push('/departments/it/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login'); return;
    }
    fetchFinanceData();
  }, [router]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'it_finance'), orderBy('date', 'desc'), limit(50));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          date: data.date?.toDate?.() || data.date || new Date()
        };
      });
      setTransactions(docs);

      let income = 0;
      let expenses = 0;
      let tuition = 0;
      let projects = 0;

      docs.forEach((t: any) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') {
          income += amt;
          if (t.category === 'tuition') tuition += amt;
          if (t.category === 'project') projects += amt;
        } else {
          expenses += amt;
        }
      });

      setStats({
        totalIncome: income,
        totalExpenses: expenses,
        tuitionFees: tuition,
        projectPayments: projects,
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
      const session = JSON.parse(localStorage.getItem('it_session') || '{}');
      
      const txData = {
        ...formData,
        amount: Number(formData.amount),
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: Timestamp.now(),
        createdBy: session.displayName || 'Admin',
        createdById: session.uid || 'unknown'
      };

      await addDoc(collection(db, 'it_finance'), txData);
      toast.success('Transaction recorded');
      setShowAddModal(false);
      fetchFinanceData();
      setFormData({
        type: 'income',
        category: 'tuition',
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/5 pb-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-black tracking-tighter leading-tight">
              Tech <span className="text-indigo-600">Treasury</span> 💸
            </h1>
            <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-500" />
              IT Financial Ledger • Revenue Tracking
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-10 py-5 bg-black text-white rounded-[2.5rem] text-[13px] font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl shadow-black/10 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
            Record Entry
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm group hover:border-indigo-500/20 transition-all">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Current Balance</p>
            <p className="text-3xl font-black text-black tracking-tight">PKR {stats.balance.toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit">
              <ArrowUpRight size={12} /> Net Liquidity
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Internship Fees</p>
            <p className="text-3xl font-black text-teal-600 tracking-tight">PKR {stats.tuitionFees.toLocaleString()}</p>
            <p className="mt-4 text-[10px] text-gray-400 font-black uppercase tracking-tight">Course Revenue</p>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Project Income</p>
            <p className="text-3xl font-black text-blue-600 tracking-tight">PKR {stats.projectPayments.toLocaleString()}</p>
            <p className="mt-4 text-[10px] text-gray-400 font-black uppercase tracking-tight">Development Services</p>
          </div>

          <div className="bg-red-50 rounded-[3rem] p-10 border border-red-100 shadow-sm">
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
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Banknote size={24} />
              </div>
              <h2 className="text-xl font-black text-black tracking-tight uppercase">Recent Transactions</h2>
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
                       <p className="text-sm font-black uppercase tracking-widest">No ledger entries</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-10 py-6">
                         <p className="text-xs font-black text-gray-900">{formatDateDMY(t.date)}</p>
                      </td>
                      <td className="px-6 py-6">
                         <p className="text-sm font-bold text-gray-700">{t.description}</p>
                      </td>
                      <td className="px-6 py-6">
                         <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                           t.type === 'income' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                         }`}>
                           {t.category}
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
                <div className="p-10 border-b border-gray-100">
                  <h3 className="text-3xl font-black text-black uppercase tracking-tighter">New Entry</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Record tech revenue or overheads</p>
                </div>
                
                <div className="p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      >
                        <option value="income">INCOME (+)</option>
                        <option value="expense">EXPENSE (-)</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      >
                        <option value="tuition">TUITION FEE</option>
                        <option value="project">PROJECT PAYMENT</option>
                        <option value="repair">HARDWARE REPAIR</option>
                        <option value="salary">STAFF SALARY</option>
                        <option value="assets">HARDWARE ASSETS</option>
                        <option value="other">OTHER</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (PKR)</label>
                    <input 
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-lg font-black outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <input 
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      placeholder="e.g. Web Project for Client X"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                      <input 
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Entity</label>
                      <input 
                        type="text"
                        value={formData.entityName}
                        onChange={(e) => setFormData({...formData, entityName: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        placeholder="Student/Client"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-6">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-10 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-3 shadow-xl active:scale-95"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Commit Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
