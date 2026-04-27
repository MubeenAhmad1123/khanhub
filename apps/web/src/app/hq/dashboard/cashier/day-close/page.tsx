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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
           <div className="w-12 h-12 border-4 border-slate-950 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
           <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Synchronizing Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-5">
            <button 
              onClick={() => router.back()}
              className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 text-slate-400 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Financial Liquidation</h1>
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-0.5">End of Day Reconciliation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-black text-slate-700">{formatDateDMY(new Date())}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 md:px-8">
        {isDayClosed ? (
          <div className="bg-white p-12 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 text-center animate-in zoom-in-95 duration-500">
             <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Lock className="w-10 h-10 text-emerald-600" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Counter is Finalized</h2>
             <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed mb-10">
                The financial ledger for today has been audited and locked. New entries are now prohibited.
             </p>
             <button 
               onClick={() => router.push('/hq/dashboard/cashier/daily-report')}
                className="px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-zinc-900 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
             >
                View Final Report
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-12 space-y-8">
               <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-200/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldCheck className="w-40 h-40 text-slate-950" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                       <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                       <h2 className="text-2xl font-black text-slate-900 tracking-tight">Counter Balance Verification</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                       <div className="p-6 rounded-[3rem] bg-slate-50/80 border border-slate-100 flex flex-col justify-between group hover:bg-white hover:shadow-xl transition-all border-dashed">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Opening Cash</p>
                            <p className="text-xl font-black text-slate-900">PKR {openingBalance.toLocaleString()}</p>
                          </div>
                          <History className="w-5 h-5 text-slate-300 mt-4 group-hover:text-indigo-500 transition-colors" />
                       </div>
                       
                       <div className="p-6 rounded-[3rem] bg-indigo-50/40 border border-indigo-100/50 flex flex-col justify-between hover:bg-indigo-50 transition-all">
                          <div>
                            <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase mb-1 italic">Total Cash Flow (Net)</p>
                            <p className="text-xl font-black text-indigo-900">PKR {stats.cashExpected.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                             <TrendingUp className="w-4 h-4 text-emerald-500" />
                             <span className="text-[9px] font-black text-emerald-600 uppercase">Computed</span>
                          </div>
                       </div>

                       <div className="p-8 rounded-[3rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-200 flex flex-col items-center justify-center md:scale-105">
                          <p className="text-[10px] font-black text-indigo-200 tracking-widest uppercase mb-2">Expected Cash</p>
                          <p className="text-3xl font-black text-white tracking-tighter">PKR {expectedClosing.toLocaleString()}</p>
                       </div>
                    </div>

                    <div className="space-y-10 max-w-2xl">
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-500 tracking-widest uppercase px-1 flex items-center gap-2">
                             <Coins className="w-3.5 h-3.5" />
                             Actual Physical Balance
                          </label>
                          <div className="relative group">
                             <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-indigo-600 transition-colors">PKR</div>
                             <input 
                               type="number"
                               value={actualCash}
                               onChange={(e) => setActualCash(e.target.value)}
                               placeholder="00"
                               className="w-full pl-20 pr-8 py-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-4xl text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:text-slate-200"
                             />
                          </div>
                       </div>

                       {actualCash && (
                        <div className={cn(
                          "p-8 rounded-[2rem] flex items-center justify-between animate-in slide-in-from-top-4",
                          variance === 0 ? "bg-emerald-50 border border-emerald-100" : 
                          variance > 0 ? "bg-blue-50 border border-blue-100" : "bg-rose-50 border border-rose-100"
                        )}>
                           <div className="flex items-center gap-5">
                              <div className={cn(
                                "p-4 rounded-2xl shadow-sm",
                                variance === 0 ? "bg-white text-emerald-600" :
                                variance > 0 ? "bg-white text-blue-600" : "bg-white text-rose-600"
                              )}>
                                 {variance === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Balance Variance</p>
                                 <p className="text-xl font-black">PKR {Math.abs(variance).toLocaleString()}</p>
                              </div>
                           </div>
                           <span className={cn(
                             "text-[11px] font-black uppercase px-4 py-2 rounded-xl",
                             variance === 0 ? "bg-emerald-600 text-white" : 
                             variance > 0 ? "bg-blue-600 text-white" : "bg-rose-600 text-white"
                           )}>
                             {variance === 0 ? 'Perfect' : variance > 0 ? 'Surplus' : 'Deficit'}
                           </span>
                        </div>
                       )}

                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-500 tracking-widest uppercase px-1">Internal Note / Narration</label>
                          <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Explain any shortages or transaction exceptions..."
                            rows={3}
                            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:text-slate-300"
                          />
                       </div>

                       <button 
                         onClick={handleCloseDay}
                         disabled={!actualCash || isSubmitting}
                          className="w-full py-8 bg-indigo-600 hover:bg-zinc-900 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
                       >
                         {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                           <>
                             <FileCheck className="w-6 h-6" />
                             Finalize & Archive Ledger
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
        .animate-in { animation: fadeIn 0.3s ease-out forwards; }
        .zoom-in-95 { animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .slide-in-from-top-4 { animation: slideIn 0.4s ease-out; }
        @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
