// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, getDocs, query, where, doc, addDoc, Timestamp, orderBy, limit, getDoc, updateDoc, increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { 
  Loader2, CreditCard, Search, Plus, Minus, ArrowRight, 
  History, Wallet, User as UserIcon, CheckCircle2, AlertCircle,
  TrendingUp, TrendingDown, LayoutGrid, Receipt, ChevronRight
} from 'lucide-react';
import { toDate, cn } from '@/lib/utils';

export default function CashierStationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [txnType, setTxnType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('fee');
  
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchRecentTransactions();
  }, [session, sessionLoading, router]);

  const fetchRecentTransactions = async () => {
    try {
      const q = query(
        collection(db, 'rehab_transactions'), 
        orderBy('createdAt', 'desc'), 
        limit(10)
      );
      const snap = await getDocs(q);
      setRecentTxns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching txns:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      // Search in rehab_patients
      const q = query(
        collection(db, 'rehab_patients'),
        where('name', '>=', searchQuery),
        where('name', '<=', searchQuery + '\uf8ff')
      );
      const snap = await getDocs(q);
      setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !amount || processing) return;
    
    setProcessing(true);
    setMessage(null);
    const numAmount = parseFloat(amount);

    try {
      const txnData = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        amount: numAmount,
        type: txnType,
        category,
        description,
        status: 'approved', // HQ Cashier txns are auto-approved
        createdBy: session?.uid,
        createdByName: session?.displayName || session?.name || 'HQ Cashier',
        createdAt: Timestamp.now(),
        date: Timestamp.now()
      };

      // 1. Create transaction record
      await addDoc(collection(db, 'rehab_transactions'), txnData);

      // 2. Update patient balance (if canteen or fee)
      const patientRef = doc(db, 'rehab_patients', selectedPatient.id);
      if (category === 'canteen') {
        const adjustment = txnType === 'income' ? numAmount : -numAmount;
        await updateDoc(patientRef, {
          canteenBalance: increment(adjustment)
        });
      } else if (category === 'fee' && txnType === 'income') {
        await updateDoc(patientRef, {
          totalPaid: increment(numAmount)
        });
      }

      setMessage({ type: 'success', text: `Transaction of Rs. ${numAmount} recorded successfully!` });
      setAmount('');
      setDescription('');
      fetchRecentTransactions();
      
      // Refresh patient data
      const updatedPatient = await getDoc(patientRef);
      setSelectedPatient({ id: updatedPatient.id, ...updatedPatient.data() });

    } catch (err) {
      console.error('Transaction error:', err);
      setMessage({ type: 'error', text: 'Failed to process transaction. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-100">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Cashier Station</h1>
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest leading-none mt-1.5">HQ Terminal / {session?.displayName || session?.name || 'Cashier'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-teal-50 px-4 py-2 rounded-xl border border-teal-100">
              <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Station Status</div>
              <div className="text-sm font-black text-teal-700 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Active & Secured
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Search & Patient Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-gray-100/50 border border-gray-100">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search size={16} /> Patient Selection
            </h2>
            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-gray-50 border-none rounded-2xl pl-5 pr-12 py-4 text-sm font-bold focus:ring-4 focus:ring-teal-50 transition-all"
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-600 text-white rounded-xl shadow-md hover:bg-teal-700 transition-colors"
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {patients.map(p => (
                <button 
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border",
                    selectedPatient?.id === p.id 
                      ? "bg-teal-50 border-teal-200" 
                      : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                  )}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black text-sm">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-gray-900">{p.name}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">{p.patientId || 'No ID'}</div>
                  </div>
                  {selectedPatient?.id === p.id && <CheckCircle2 className="ml-auto text-teal-600" size={16} />}
                </button>
              ))}
              {patients.length === 0 && !loading && searchQuery && (
                <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <UserIcon className="mx-auto text-gray-300 mb-2" size={24} />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">No patient found</p>
                </div>
              )}
            </div>
          </div>

          {selectedPatient && (
            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-gray-100/50 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Wallet size={16} /> Balance Snapshot
              </h2>
              <div className="space-y-4">
                <div className="bg-teal-50/50 border border-teal-100/50 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Canteen Balance</div>
                  <div className="text-2xl font-black text-teal-700">Rs. {(selectedPatient.canteenBalance || 0).toLocaleString()}</div>
                </div>
                <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Fees Paid</div>
                  <div className="text-2xl font-black text-blue-700">Rs. {(selectedPatient.totalPaid || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Middle Column: Transaction Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 h-full relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-[4rem] -mr-8 -mt-8 -z-10" />
            
            {!selectedPatient ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mb-6">
                  <Receipt size={40} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Select a Patient</h3>
                <p className="text-gray-400 text-sm max-w-xs">Please search and select a patient from the left panel to start a transaction.</p>
              </div>
            ) : (
              <form onSubmit={handleTransaction} className="space-y-8 max-w-2xl mx-auto">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-teal-600 text-xl font-black">
                    {selectedPatient.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Transaction For</p>
                    <p className="text-xl font-black text-gray-900">{selectedPatient.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setTxnType('income')}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all group",
                      txnType === 'income' 
                        ? "bg-teal-50 border-teal-500 shadow-lg shadow-teal-100" 
                        : "bg-white border-gray-50 hover:border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                      txnType === 'income' ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-teal-400 group-hover:text-white"
                    )}>
                      <TrendingUp size={24} />
                    </div>
                    <span className={cn("text-xs font-black uppercase tracking-widest", txnType === 'income' ? "text-teal-700" : "text-gray-400")}>Payment In</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setTxnType('expense')}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all group",
                      txnType === 'expense' 
                        ? "bg-red-50 border-red-500 shadow-lg shadow-red-100" 
                        : "bg-white border-gray-50 hover:border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                      txnType === 'expense' ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-red-400 group-hover:text-white"
                    )}>
                      <TrendingDown size={24} />
                    </div>
                    <span className={cn("text-xs font-black uppercase tracking-widest", txnType === 'expense' ? "text-red-700" : "text-gray-400")}>Payment Out</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transaction Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all appearance-none"
                    >
                      <option value="fee">Admission/Installment Fee</option>
                      <option value="canteen">Canteen Deposit/Withdrawal</option>
                      <option value="emergency">Emergency / Medical</option>
                      <option value="other">Other / Miscellaneous</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (PKR)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">Rs.</span>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-5 py-4 text-lg font-black focus:ring-4 focus:ring-teal-50 outline-none transition-all placeholder:text-gray-200"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Narration / Description</label>
                  <textarea 
                    placeholder="Enter details about this transaction..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-3xl px-5 py-4 text-sm font-semibold focus:ring-4 focus:ring-teal-50 outline-none transition-all placeholder:text-gray-200 min-h-[100px]"
                  />
                </div>

                {message && (
                  <div className={cn(
                    "p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                    message.type === 'success' ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-red-50 text-red-700 border border-red-100"
                  )}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-bold">{message.text}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={processing}
                  className={cn(
                    "w-full py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3",
                    txnType === 'income' 
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-100" 
                      : "bg-red-600 hover:bg-red-700 text-white shadow-red-100"
                  )}
                >
                  {processing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>Process {txnType} <ArrowRight size={20} /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-teal-600 shadow-sm">
              <History size={18} />
            </div>
            Recent Hq Ledger Entries
          </h2>
          <button className="text-xs font-black text-teal-600 uppercase tracking-widest hover:underline flex items-center gap-1">
            View full ledger <ChevronRight size={14} />
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entry Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient / Client</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentTxns.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-gray-900">{toDate(tx.date || tx.createdAt)?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">{toDate(tx.date || tx.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-gray-900">{tx.patientName}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tx.patientId?.slice(0, 8)}...</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200/50">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className={cn(
                      "text-sm font-black flex items-center justify-end gap-1.5",
                      tx.type === 'income' ? "text-teal-600" : "text-red-500"
                    )}>
                      {tx.type === 'income' ? <Plus size={12} /> : <Minus size={12} />}
                      Rs. {tx.amount?.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                       <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-500">
                        {tx.createdByName?.[0]?.toUpperCase() || 'C'}
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{tx.createdByName?.split(' ')[0]}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}