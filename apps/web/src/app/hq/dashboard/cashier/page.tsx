// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, getDocs, query, where, doc, addDoc, Timestamp, orderBy, limit, getDoc, updateDoc, increment, startAfter
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
  
  const [historyTxns, setHistoryTxns] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDateMode, setHistoryDateMode] = useState<'today' | 'all' | 'range'>('today');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyStatus, setHistoryStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchHistoryTransactions();
  }, [session, sessionLoading, router]);

  const fetchHistoryTransactions = async () => {
    try {
      setHistoryLoading(true);
      setHistoryTxns([]);

      // Fetch in pages so "All history" stays complete.
      const pageSize = 100;
      let lastDoc: any = null;
      const all: any[] = [];

      while (true) {
        const q = lastDoc
          ? query(
              collection(db, 'rehab_transactions'),
              orderBy('createdAt', 'desc'),
              limit(pageSize),
              startAfter(lastDoc)
            )
          : query(
              collection(db, 'rehab_transactions'),
              orderBy('createdAt', 'desc'),
              limit(pageSize)
            );

        const snap = await getDocs(q);
        if (snap.empty) break;

        all.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
        lastDoc = snap.docs[snap.docs.length - 1];

        if (snap.docs.length < pageSize) break;
      }

      setHistoryTxns(all);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
    finally {
      setHistoryLoading(false);
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
      fetchHistoryTransactions();
      
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const fromDate = historyFrom ? new Date(`${historyFrom}T00:00:00`) : null;
  const toDateValue = historyTo ? new Date(`${historyTo}T23:59:59.999`) : null;
  const historySearchTerm = searchQuery.trim().toLowerCase();

  const filteredHistoryTxns = historyTxns.filter((tx: any) => {
    const businessDate = toDate(tx.date || tx.createdAt);
    if (!businessDate) return false;

    if (historyDateMode === 'today') {
      const txDay = businessDate.toISOString().split('T')[0];
      if (txDay !== todayStr) return false;
    }

    if (historyDateMode === 'range') {
      if (!fromDate || !toDateValue) return true; // wait for user to complete range
      if (businessDate < fromDate || businessDate > toDateValue) return false;
    }

    if (historyStatus !== 'all' && tx.status !== historyStatus) return false;

    if (!historySearchTerm) return true;

    const amountTerm = Number(historySearchTerm);
    const amountStr = String(tx.amount ?? '');

    const fields = [
      tx.patientName,
      tx.patientId,
      tx.staffName,
      tx.staffId,
      tx.category,
      tx.description,
      tx.type,
      tx.status,
      tx.createdByName,
    ].filter(Boolean).map((v: any) => String(v).toLowerCase());

    const matchesTextField = fields.some((f: string) => f.includes(historySearchTerm));
    const matchesAmount = (!Number.isNaN(amountTerm) && Number(tx.amount ?? 0) === amountTerm) || amountStr.toLowerCase().includes(historySearchTerm);

    return matchesTextField || matchesAmount;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#111111] border-b border-gray-100 dark:border-white/5 px-4 md:px-8 py-4 md:py-6 sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-[#111111]/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-start md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Cashier Station</h1>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Terminal ID: {session?.customId || 'HQ-001'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-teal-50 dark:bg-teal-500/10 px-4 py-2 rounded-xl border border-teal-100 dark:border-teal-500/20">
              <div className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Operator</div>
              <div className="text-xs font-black text-teal-700 dark:text-teal-300 flex items-center gap-1.5 capitalized">
                {session?.displayName || session?.name || 'Authorized Cashier'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
        
        {/* Left Column: Search & Patient Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#111111] rounded-[1.5rem] sm:rounded-[2.5rem] p-7 shadow-sm border border-gray-100 dark:border-white/5">
            <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search size={14} /> Search Account
            </h2>
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder="Name or Patient ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pl-5 pr-12 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-gray-400"
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-600 text-white rounded-xl shadow-md hover:bg-teal-700 transition-colors"
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {patients.map(p => (
                <button 
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl transition-all border text-left active:scale-[0.98]",
                    selectedPatient?.id === p.id 
                      ? "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30" 
                      : "bg-white dark:bg-white/5 border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.07] hover:border-gray-100 dark:hover:border-white/10"
                  )}
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 font-black text-sm">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-gray-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{p.patientId || 'New/Unknown'}</div>
                  </div>
                  {selectedPatient?.id === p.id && <CheckCircle2 className="text-teal-600 dark:text-teal-400" size={16} />}
                </button>
              ))}
              {patients.length === 0 && !loading && searchQuery && (
                <div className="py-12 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                  <UserIcon className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={32} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching records</p>
                </div>
              )}
            </div>
          </div>

          {selectedPatient && (
            <div className="bg-white dark:bg-[#111111] rounded-[1.5rem] sm:rounded-[2.5rem] p-7 shadow-sm border border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Wallet size={14} /> Ledger Summary
              </h2>
              <div className="space-y-4">
                <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 rounded-3xl p-5">
                  <p className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] mb-1">Canteen Credits</p>
                  <p className="text-2xl font-black text-teal-700 dark:text-teal-300">₨{(selectedPatient.canteenBalance || 0).toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-3xl p-5">
                  <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-1">Tuition Total</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">₨{(selectedPatient.totalPaid || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Middle Column: Transaction Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-[#111111] rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-12 shadow-sm border border-gray-100 dark:border-white/5 min-h-[600px] relative overflow-hidden group">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-bl-[8rem] -mr-16 -mt-16 transition-all group-hover:scale-110 duration-700 pointer-events-none" />
            
            {!selectedPatient ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-300 dark:text-gray-700 mb-8 animate-pulse">
                  <Receipt size={48} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Await Selection</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs font-medium">Use the left panel to search and select an account for processing.</p>
              </div>
            ) : (
              <form onSubmit={handleTransaction} className="space-y-10 max-w-2xl mx-auto relative z-10">
                <div className="flex items-center gap-5 p-5 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                  <div className="w-16 h-16 bg-white dark:bg-[#1A1A1A] rounded-[1.25rem] shadow-sm flex items-center justify-center text-teal-600 dark:text-teal-400 text-2xl font-black border border-gray-100 dark:border-white/10">
                    {selectedPatient.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Processing For</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{selectedPatient.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <button 
                    type="button"
                    onClick={() => setTxnType('income')}
                    className={cn(
                      "flex flex-col items-center gap-4 p-5 sm:p-8 rounded-[2.5rem] border-2 transition-all group relative active:scale-95",
                      txnType === 'income' 
                        ? "bg-teal-50 dark:bg-teal-500/10 border-teal-500 shadow-xl shadow-teal-500/10" 
                        : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-teal-500/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                      txnType === 'income' ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20" : "bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:bg-teal-400 group-hover:text-white"
                    )}>
                      <TrendingUp size={28} strokeWidth={2.5} />
                    </div>
                    <span className={cn("text-[11px] font-black uppercase tracking-[0.2em]", txnType === 'income' ? "text-teal-700 dark:text-teal-300" : "text-gray-400 dark:text-gray-500")}>Payment In</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setTxnType('expense')}
                    className={cn(
                      "flex flex-col items-center gap-4 p-5 sm:p-8 rounded-[2.5rem] border-2 transition-all group relative active:scale-95",
                      txnType === 'expense' 
                        ? "bg-red-50 dark:bg-red-500/10 border-red-500 shadow-xl shadow-red-500/10" 
                        : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-red-500/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                      txnType === 'expense' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:bg-red-400 group-hover:text-white"
                    )}>
                      <TrendingDown size={28} strokeWidth={2.5} />
                    </div>
                    <span className={cn("text-[11px] font-black uppercase tracking-[0.2em]", txnType === 'expense' ? "text-red-700 dark:text-red-300" : "text-gray-400 dark:text-gray-500")}>Payment Out</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all appearance-none"
                    >
                      <option value="fee">Admission / Fees</option>
                      <option value="canteen">Canteen Funds</option>
                      <option value="emergency">Medical / Emergency</option>
                      <option value="other">Miscellaneous</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Amount (PKR)</label>
                    <div className="relative group">
                      <span className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 font-black text-lg transition-colors group-focus-within:text-teal-600">₨</span>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-10 pr-4 sm:pl-12 sm:pr-6 py-4 text-2xl font-black text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all placeholder:text-gray-200 dark:placeholder:text-gray-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Narration</label>
                  <textarea 
                    placeholder="Describe this financial movement..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] px-6 py-5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700 min-h-[140px] resize-none"
                  />
                </div>

                {message && (
                  <div className={cn(
                    "p-5 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm border",
                    message.type === 'success' ? "bg-teal-50/50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-500/20" : "bg-red-50/50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-100 dark:border-red-500/20"
                  )}>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", message.type === 'success' ? "bg-teal-500 text-white" : "bg-red-500 text-white")}>
                      {message.type === 'success' ? <CheckCircle2 size={20} strokeWidth={3} /> : <AlertCircle size={20} strokeWidth={3} />}
                    </div>
                    <p className="text-sm font-black uppercase tracking-tight">{message.text}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={processing}
                  className={cn(
                    "w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50",
                    txnType === 'income' 
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/30" 
                      : "bg-red-600 hover:bg-red-700 text-white shadow-red-500/30"
                  )}
                >
                  {processing ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>Submit Transaction <ArrowRight size={24} strokeWidth={3} /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4">
            <div className="w-10 h-10 bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
              <History size={20} />
            </div>
            Terminal History
          </h2>
          <button className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] hover:bg-teal-50 dark:hover:bg-teal-500/10 px-5 py-2.5 rounded-xl transition-all border border-transparent hover:border-teal-100 dark:hover:border-teal-500/20 flex items-center gap-2">
            View Operations Log <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>

        <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-[1.5rem] p-5 sm:p-7 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Date</label>
              <select
                value={historyDateMode}
                onChange={(e) => setHistoryDateMode(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
              >
                <option value="today">Today</option>
                <option value="all">All History</option>
                <option value="range">Date Range</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Status</label>
              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Search</label>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-relaxed pt-2 md:pt-4">
                Uses the left panel search (patient/student/staff name or ID).
              </div>
            </div>
          </div>

          {historyDateMode === 'range' && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">From</label>
                <input
                  type="date"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">To</label>
                <input
                  type="date"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#111111] rounded-2xl sm:rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                  <th className="px-4 py-4 sm:px-8 sm:py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-4 py-4 sm:px-8 sm:py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Account Entity</th>
                  <th className="px-4 py-4 sm:px-8 sm:py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Category</th>
                  <th className="px-4 py-4 sm:px-8 sm:py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Amount</th>
                  <th className="px-4 py-4 sm:px-8 sm:py-6 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-center">Verified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {historyLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 sm:px-8 sm:py-14 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400 mx-auto" />
                      <div className="mt-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Loading transaction history...
                      </div>
                    </td>
                  </tr>
                ) : filteredHistoryTxns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 sm:px-8 sm:py-14 text-center">
                      <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        No transactions match your filters.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistoryTxns.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-4 sm:px-8 sm:py-6">
                        <div className="text-sm font-black text-gray-900 dark:text-white capitalize">
                          {toDate(tx.date || tx.createdAt)?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase">
                          {toDate(tx.date || tx.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-8 sm:py-6">
                        <div className="text-sm font-black text-gray-900 dark:text-white">
                          {tx.patientName || tx.staffName}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                          {(tx.patientId || tx.staffId)?.slice(0, 10)}...
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-8 sm:py-6">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/10 opacity-80">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-8 sm:py-6 text-right">
                        <div className={cn(
                          "text-lg font-black flex items-center justify-end gap-2",
                          tx.type === 'income' ? "text-teal-600 dark:text-teal-400" : "text-red-500"
                        )}>
                          {tx.type === 'income' ? <Plus size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
                          ₨{tx.amount?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-8 sm:py-6">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center text-[10px] font-black text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-white/10">
                            {tx.createdByName?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                            {tx.createdByName?.split(' ')[0]}
                          </span>
                        </div>
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