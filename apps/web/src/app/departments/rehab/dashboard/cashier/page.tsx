'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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

  const [todayTransactions, setTodayTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const fetchTodayTransactions = async (uid: string) => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // Simple single-field query — no composite index needed
      const snap = await getDocs(
        query(
          collection(db, 'rehab_transactions'),
          where('cashierId', '==', uid)
        )
      )

      const allTxns = snap.docs.map(d => {
        const data = d.data()
        const createdAt = data.createdAt?.toDate?.() 
          ? data.createdAt.toDate() 
          : data.createdAt 
            ? new Date(data.createdAt) 
            : new Date()
        return {
          id: d.id,
          type: data.type || '',
          category: data.category || '',
          description: data.description || '',
          amount: data.amount || 0,
          status: data.status || 'pending',
          patientId: data.patientId || null,
          cashierId: data.cashierId || '',
          createdAt,
          date: data.date?.toDate?.() ? data.date.toDate() : new Date(),
        }
      })

      // Filter today's entries client-side
      const todayTxns = allTxns
        .filter(t => t.createdAt >= todayStart)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setTodayTransactions(todayTxns)
      setLoadingTransactions(false)
    } catch (err: any) {
      console.error('Fetch today transactions error:', err?.message)
      setLoadingTransactions(false)
    }
  }

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
    fetchTodayTransactions(parsed.uid);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) {
      toast.error('Please fill required fields');
      return;
    }
    const needsPatient = category === 'canteen_deposit' || category === 'canteen_expense' || (activeTab === 'income' && category === 'patient_fee');
    if (needsPatient && !patientId.trim()) {
      toast.error('Patient ID is required for this transaction');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Anti-Cheat: 5-minute duplicate check
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const dupSnap = await getDocs(
        query(
          collection(db, 'rehab_transactions'),
          where('cashierId', '==', session.uid),
          where('amount', '==', Number(amount)),
          where('category', '==', category)
        )
      );
      const recentDup = dupSnap.docs.find(d => {
        const created = d.data().createdAt?.toDate?.()
        return created && created >= fiveMinutesAgo
      });
      if (recentDup) {
        toast.error('Duplicate transaction detected! Please wait 5 minutes.');
        setIsSubmitting(false);
        return;
      }

      // 1. Submit to rehab_transactions
      await addDoc(collection(db, 'rehab_transactions'), {
        type: activeTab,
        category,
        amount: Number(amount),
        description,
        date: Timestamp.fromDate(new Date(dateStr)),
        cashierId: session.uid,
        patientId: patientId || null,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. If canteen_deposit or canteen_expense → update rehab_canteen
      if ((category === 'canteen_deposit' || category === 'canteen_expense') && patientId.trim()) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const isDeposit = category === 'canteen_deposit';
        const txEntry = {
          id: Date.now().toString(),
          type: isDeposit ? 'deposit' : 'expense',
          amount: Number(amount),
          description: description || (isDeposit ? 'Canteen deposit' : 'Canteen expense'),
          date: Timestamp.now(),
          cashierId: session.uid,
        };

        try {
          const canteenQ = query(
            collection(db, 'rehab_canteen'),
            where('patientId', '==', patientId.trim()),
            where('month', '==', currentMonth)
          );
          const snap = await getDocs(canteenQ);

          if (!snap.empty) {
            const canteenDoc = snap.docs[0];
            const d = canteenDoc.data();
            const newDeposited = isDeposit ? (d.totalDeposited || 0) + Number(amount) : (d.totalDeposited || 0);
            const newSpent = !isDeposit ? (d.totalSpent || 0) + Number(amount) : (d.totalSpent || 0);
            await updateDoc(doc(db, 'rehab_canteen', canteenDoc.id), {
              totalDeposited: newDeposited,
              totalSpent: newSpent,
              balance: newDeposited - newSpent,
              transactions: [...(d.transactions || []), txEntry],
            });
          } else {
            await addDoc(collection(db, 'rehab_canteen'), {
              patientId: patientId.trim(),
              month: currentMonth,
              totalDeposited: isDeposit ? Number(amount) : 0,
              totalSpent: !isDeposit ? Number(amount) : 0,
              balance: isDeposit ? Number(amount) : -Number(amount),
              transactions: [txEntry],
            });
          }
        } catch (canteenErr) {
          console.error('Canteen update failed:', canteenErr);
        }
      }

      toast.success('Submitted for approval ✓');
      setCategory('');
      setAmount('');
      setDescription('');
      setPatientId('');
      setDateStr(new Date().toISOString().split('T')[0]);
      fetchTodayTransactions(session.uid);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error('Failed to submit transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      patient_fee: 'Patient Monthly Fee',
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
      patient_welfare: 'Patient Welfare',
      office_supplies: 'Office Supplies',
      other_expense: 'Other Expense',
    }
    return map[cat] || cat.replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const incomeCategories = [
    { value: 'patient_fee', label: 'Patient Monthly Fee' },
    { value: 'canteen_deposit', label: 'Canteen Deposit (Family)' },
    { value: 'donation', label: 'Donation' },
    { value: 'government_grant', label: 'Government Grant' },
    { value: 'other_income', label: 'Other Income' }
  ];

  const expenseCategories = [
    { value: 'staff_salary', label: 'Staff Salary' },
    { value: 'rent', label: 'Rent / Property' },
    { value: 'electricity', label: 'Electricity Bill' },
    { value: 'gas', label: 'Gas Bill' },
    { value: 'water', label: 'Water Bill' },
    { value: 'medicine', label: 'Medicine / Pharmacy' },
    { value: 'food', label: 'Food & Groceries' },
    { value: 'canteen_expense', label: 'Canteen Expense (Patient)' },
    { value: 'maintenance', label: 'Building Maintenance' },
    { value: 'transport', label: 'Transport / Fuel' },
    { value: 'equipment', label: 'Equipment Purchase' },
    { value: 'security', label: 'Security Services' },
    { value: 'cleaning', label: 'Cleaning Supplies' },
    { value: 'patient_welfare', label: 'Patient Welfare' },
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'other_expense', label: 'Other Expense' }
  ];

  const showPatientField = category === 'canteen_deposit' || category === 'canteen_expense' || (activeTab === 'income' && category === 'patient_fee');
  const showStaffField = category === 'staff_salary';

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

              {showPatientField && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    placeholder="Paste patient doc ID"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Find the patient ID from the Patients list page</p>
                </div>
              )}

              {showStaffField && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID (Optional)</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    placeholder="Staff doc ID (optional, for reference)"
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

        {/* Today's Submissions */}
        <div className="mt-8">
          <h3 className="text-sm font-black text-gray-400 uppercase 
            tracking-widest mb-4">
            Today's Submissions ({todayTransactions.length})
          </h3>
          
          {loadingTransactions ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : todayTransactions.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl 
              border border-dashed border-gray-200 text-gray-400 
              text-sm font-medium">
              No transactions submitted today yet.
            </div>
          ) : (
            <div className="space-y-3">
              {todayTransactions.map(tx => (
                <div key={tx.id} className={`bg-white rounded-2xl p-4 
                  border-l-4 shadow-sm flex items-center 
                  justify-between gap-4 ${
                    tx.type === 'income' 
                      ? 'border-l-green-400' 
                      : 'border-l-red-400'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase 
                        px-2 py-0.5 rounded-md ${
                          tx.type === 'income' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                        {tx.type}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {formatCategory(tx.category)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {tx.description || '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {tx.createdAt.toLocaleTimeString('en-PK', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-gray-900 text-sm">
                      PKR {tx.amount.toLocaleString('en-PK')}
                    </p>
                    <span className={`text-[9px] font-black uppercase 
                      px-2 py-0.5 rounded-full ${
                        tx.status === 'approved' 
                          ? 'bg-green-100 text-green-600'
                          : tx.status === 'rejected'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-yellow-100 text-yellow-600'
                      }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
