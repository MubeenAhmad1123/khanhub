'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  TrendingUp, TrendingDown, Plus, 
  Clock, CheckCircle, AlertCircle, Loader2, Receipt 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CashierStationPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('');
  const [patientId, setPatientId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Today's Transactions
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'cashier' && parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }
    setSession(parsed);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    fetchTodayTransactions();
  }, [session]);

  const fetchTodayTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, 'rehab_transactions'),
        where('cashierId', '==', session.uid),
        where('date', '>=', Timestamp.fromDate(today)),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load today's transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) {
      toast.error('Please fill required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await addDoc(collection(db, 'rehab_transactions'), {
        type: activeTab,
        category,
        amount: Number(amount),
        description,
        date: Timestamp.fromDate(new Date(dateStr)),
        cashierId: session.uid,
        patientId: patientId || null,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      
      toast.success('Submitted for approval ✓');
      // Reset form
      setCategory('');
      setAmount('');
      setDescription('');
      setPatientId('');
      setDateStr(new Date().toISOString().split('T')[0]);
      
      fetchTodayTransactions();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error('Failed to submit transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const incomeCategories = [
    { value: 'patient_fee', label: 'Patient Fee' },
    { value: 'canteen_deposit', label: 'Canteen Deposit' },
    { value: 'other', label: 'Other Income' }
  ];

  const expenseCategories = [
    { value: 'rent', label: 'Rent' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'salary', label: 'Salary' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'food', label: 'Food' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other Expense' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-teal-600" />
              Cashier Station
            </h1>
            <p className="text-sm text-gray-500">
              Welcome, {session?.displayName}. Today is {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Tabs & Form */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setActiveTab('income'); setCategory(''); }}
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'income' 
                  ? 'border-b-2 border-teal-500 text-teal-700 bg-teal-50/30' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              💰 Income
            </button>
            <button
              onClick={() => { setActiveTab('expense'); setCategory(''); }}
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'expense' 
                  ? 'border-b-2 border-red-500 text-red-700 bg-red-50/30' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              📤 Expense
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  required
                >
                  <option value="">Select Category</option>
                  {(activeTab === 'income' ? incomeCategories : expenseCategories).map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              {activeTab === 'income' && category === 'patient_fee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID (Optional)</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    placeholder="e.g. patient doc ID"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  placeholder="Brief description of the transaction"
                  required={activeTab === 'expense'}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Submit for Approval
              </button>
            </div>
          </form>
        </div>

        {/* Today's Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Today's Submissions
          </h2>

          <div className="space-y-3">
            {loadingTransactions ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">No transactions submitted today.</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()} PKR
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {tx.category.replace('_', ' ')} {tx.description ? `• ${tx.description}` : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    {tx.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                        <AlertCircle className="w-3 h-3" /> Pending
                      </span>
                    )}
                    {tx.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {tx.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        <AlertCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {tx.date?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'No time'}
                    </span>
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
