'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { 
  AlertCircle,
  ArrowLeft, 
  Banknote,
  Calculator,
  Calendar, 
  CheckCircle2,
  ChevronRight,
  Coins,
  FileCheck,
  History,
  LayoutDashboard, 
  Loader2,
  Lock,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  TrendingDown, 
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, toDate } from '@/lib/utils';

// Standard departments logic
const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions' },
  { code: 'hospital', label: 'Khan Hospital', txCollection: 'hospital_transactions' },
  { code: 'sukoon-center', label: 'Sukoon Center', txCollection: 'sukoon_transactions' },
  { code: 'welfare', label: 'Welfare', txCollection: 'welfare_transactions' },
  { code: 'job-center', label: 'Job Center', txCollection: 'job_center_transactions' },
];

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  paymentMethod: string;
  departmentCode: string;
  departmentName: string;
  status: string;
  createdAt: any;
  date?: any;
};

export default function DayClosePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  
  const [reportDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastReconciliation, setLastReconciliation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDayClosed, setIsDayClosed] = useState(false);
  
  // Closing Form
  const [actualCash, setActualCash] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // 1. Get Opening Balance (Previous actual closing)
      const reconQ = query(
        collection(db, 'hq_reconciliation'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const reconSnap = await getDocs(reconQ);
      if (!reconSnap.empty) {
        setLastReconciliation(reconSnap.docs[0].data());
      }

      // 2. Fetch all transactions for TODAY across ALL departments
      const allTxs: Transaction[] = [];
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const startTimestamp = Timestamp.fromDate(startOfDay);
      const endTimestamp = Timestamp.fromDate(endOfDay);

      // Fetch from all collections
      const fetchPromises = DEPARTMENTS.map(async (dept) => {
        try {
          const q = query(
            collection(db, dept.txCollection),
            where('date', '>=', startTimestamp),
            where('date', '<=', endTimestamp)
          );
          const snap = await getDocs(q);
          return snap.docs.map(doc => ({
            id: doc.id,
            departmentCode: dept.code,
            departmentName: dept.label,
            ...doc.data()
          })) as Transaction[];
        } catch (err) {
            console.warn(`[DayClose] Failed fetch for ${dept.code}`, err);
            return [];
        }
      });

      const genericSnap = await getDocs(query(
        collection(db, 'cashierTransactions'),
        where('date', '>=', startTimestamp),
        where('date', '<=', endTimestamp)
      ));
      const genericTxs = genericSnap.docs.map(doc => ({ id: doc.id, departmentCode: 'other', ...doc.data() })) as Transaction[];

      const results = await Promise.all(fetchPromises);
      setTransactions([...results.flat(), ...genericTxs]);

      // 3. Check if already closed
      const dateStr = formatDateDMY(new Date());
      const closedCheck = await getDocs(query(
        collection(db, 'hq_reconciliation'),
        where('date', '==', dateStr),
        limit(1)
      ));
      setIsDayClosed(!closedCheck.empty);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    fetchData();
  }, [sessionLoading, session, fetchData]);

  const stats = useMemo(() => {
    const s = {
      income: 0,
      expense: 0,
      cashExpected: 0
    };
    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') s.income += amt;
      else s.expense += amt;

      if (tx.paymentMethod === 'cash') {
        s.cashExpected += (tx.type === 'income' ? amt : -amt);
      }
    });
    return s;
  }, [transactions]);

  const openingBalance = lastReconciliation?.actualClosing || 0;
  const expectedClosing = openingBalance + stats.income - stats.expense;
  const variance = Number(actualCash) - expectedClosing;

  const handleCloseDay = async () => {
    if (!actualCash) return alert('Enter physical cash amount');
    setIsSubmitting(true);
    try {
      const dateStr = formatDateDMY(new Date());
      
      await addDoc(collection(db, 'hq_reconciliation'), {
        date: dateStr,
        openingBalance,
        totalInflow: stats.income,
        totalOutflow: stats.expense,
        expectedClosing,
        actualClosing: Number(actualCash),
        variance,
        varianceNote: note,
        cashierId: session?.customId || session?.uid,
        cashierName: session?.name || session?.displayName,
        status: 'closed',
        createdAt: serverTimestamp(),
      });

      setIsDayClosed(true);
      alert('Day closed successfully!');
      router.push('/hq/dashboard/cashier/daily-report');
    } catch (err) {
      console.error('Error closing day:', err);
      alert('Failed to finalize day.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
        <div className="text-center animate-pulse">
           <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
           <p className="text-zinc-400 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-5">
            <button 
              onClick={() => router.back()}
              className="p-2.5 hover:bg-zinc-50 rounded-2xl transition-all active:scale-95 text-zinc-400 hover:text-zinc-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight">Financial Liquidation</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">End of Day Reconciliation</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-white px-5 py-2.5 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-black text-zinc-900">{formatDateDMY(new Date())}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 md:px-8">
        {isDayClosed ? (
          <div className="bg-white p-16 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-indigo-100/30 text-center animate-in zoom-in-95 duration-700">
             <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner group">
                <Lock className="w-10 h-10 text-emerald-600 transition-transform group-hover:scale-110" />
             </div>
             <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">Counter is Finalized</h2>
             <p className="text-zinc-500 font-bold max-w-sm mx-auto leading-relaxed mb-12">
                The financial ledger for today has been audited, verified, and locked. No further modifications are permitted.
             </p>
             <button 
                onClick={() => router.push('/hq/dashboard/cashier/daily-report')}
                className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-zinc-900 transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
             >
                View Final Report
             </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] transition-transform group-hover:rotate-12 duration-1000">
                  <ShieldCheck className="w-64 h-64 text-zinc-900" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                       <div className="w-2 h-10 bg-indigo-600 rounded-full" />
                       <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Counter Balance Verification</h2>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                       <ShieldCheck className="w-4 h-4 text-indigo-600" />
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Secure Audit Protocol</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                     <div className="p-8 rounded-[2.5rem] bg-zinc-50/50 border border-zinc-100 flex flex-col justify-between group hover:bg-white hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-500 border-dashed">
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase mb-2">Opening Cash</p>
                          <p className="text-2xl font-black text-zinc-900 tracking-tight">PKR {openingBalance.toLocaleString()}</p>
                        </div>
                        <div className="mt-6 flex items-center gap-2">
                           <History className="w-4 h-4 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                           <span className="text-[9px] font-black text-zinc-300 uppercase">From Last Closing</span>
                        </div>
                     </div>
                     
                     <div className="p-8 rounded-[2.5rem] bg-indigo-50/30 border border-indigo-100/30 flex flex-col justify-between hover:bg-white hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-500">
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase mb-2 italic">Net Inflow Today</p>
                          <p className="text-2xl font-black text-indigo-900 tracking-tight">PKR {stats.cashExpected.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                           <TrendingUp className="w-4 h-4 text-emerald-500" />
                           <span className="text-[9px] font-black text-emerald-600 uppercase">Computed Balance</span>
                        </div>
                     </div>

                     <div className="p-10 rounded-[3rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 flex flex-col items-center justify-center md:scale-105 transition-transform hover:scale-[1.08] duration-500">
                        <p className="text-[10px] font-black text-indigo-200 tracking-widest uppercase mb-2">Target Liquidity</p>
                        <p className="text-4xl font-black text-white tracking-tighter">PKR {expectedClosing.toLocaleString()}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    <div className="space-y-10">
                       <div className="space-y-6">
                          <label className="text-xs font-black text-zinc-400 tracking-[0.2em] uppercase px-2 flex items-center gap-2.5">
                             <div className="p-1.5 bg-zinc-100 rounded-lg">
                                <Coins className="w-4 h-4 text-zinc-600" />
                             </div>
                             Physical Cash Count
                          </label>
                          <div className="relative group">
                             <div className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-black text-zinc-200 group-focus-within:text-indigo-600 transition-colors duration-500">PKR</div>
                             <input 
                               type="number"
                               value={actualCash}
                               onChange={(e) => setActualCash(e.target.value)}
                               placeholder="00"
                               className="w-full pl-24 pr-10 py-10 bg-zinc-50 border-2 border-zinc-100 rounded-[2.5rem] font-black text-5xl text-zinc-900 outline-none focus:bg-white focus:border-indigo-600 transition-all duration-500 placeholder:text-zinc-100 shadow-inner focus:shadow-2xl focus:shadow-indigo-100/50"
                             />
                          </div>
                       </div>

                       {actualCash && (
                        <div className={cn(
                          "p-10 rounded-[2.5rem] flex items-center justify-between animate-in slide-in-from-top-4 duration-500 shadow-xl",
                          variance === 0 ? "bg-emerald-500 text-white shadow-emerald-200/50" : 
                          variance > 0 ? "bg-indigo-600 text-white shadow-indigo-200/50" : "bg-rose-500 text-white shadow-rose-200/50"
                        )}>
                           <div className="flex items-center gap-6">
                              <div className={cn(
                                "p-5 rounded-2xl shadow-inner",
                                "bg-white/20"
                              )}>
                                 {variance === 0 ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Balance Variance</p>
                                 <p className="text-2xl font-black tracking-tight">PKR {Math.abs(variance).toLocaleString()}</p>
                              </div>
                           </div>
                           <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Status</span>
                              <span className="text-sm font-black italic tracking-tighter">
                                {variance === 0 ? 'Exact Match' : variance > 0 ? 'Surplus (+)' : 'Shortage (-)'}
                              </span>
                           </div>
                        </div>
                       )}
                    </div>

                    <div className="space-y-8 h-full flex flex-col">
                       <div className="flex-grow space-y-6">
                          <label className="text-xs font-black text-zinc-400 tracking-[0.2em] uppercase px-2 flex items-center gap-2.5">
                             <div className="p-1.5 bg-zinc-100 rounded-lg">
                                <Calculator className="w-4 h-4 text-zinc-600" />
                             </div>
                             Reconciliation Narrative
                          </label>
                          <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Explain any shortages, transaction exceptions, or cash handling observations for today's shift..."
                            className="w-full flex-grow p-8 bg-zinc-50 border-2 border-zinc-100 rounded-[2.5rem] font-bold text-base text-zinc-900 outline-none focus:bg-white focus:border-indigo-600 transition-all duration-500 placeholder:text-zinc-200 min-h-[220px]"
                          />
                       </div>

                       <button 
                         onClick={handleCloseDay}
                         disabled={!actualCash || isSubmitting}
                          className="w-full py-10 bg-indigo-600 hover:bg-zinc-900 text-white rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-5 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50 disabled:grayscale group"
                       >
                         {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                           <>
                             <FileCheck className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
                             Lock & Liquidate
                           </>
                         )}
                       </button>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
        .zoom-in-95 { animation: zoomIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .slide-in-from-bottom-8 { animation: slideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards; }
        .slide-in-from-top-4 { animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
