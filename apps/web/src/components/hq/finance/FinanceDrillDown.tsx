'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  User,
  Hash,
  Sparkles
} from 'lucide-react';
import { DeptBreakdown, approveTransaction } from '@/lib/hq/superadmin/finance';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DrillDownProps {
  dept: DeptBreakdown | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const FinanceDrillDown: React.FC<DrillDownProps> = ({ dept, onClose, onUpdate }) => {
  const [pending, setPending] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [approving, setApproving] = React.useState<string | null>(null);

  const fetchPending = React.useCallback(async () => {
    if (!dept) return;
    setLoading(true);
    try {
      let col = '';
      if (dept.deptId === 'rehab') col = 'rehab_transactions';
      else if (dept.deptId === 'spims') col = 'spims_transactions';
      else if (dept.deptId === 'job-center') col = 'job_center_transactions';
      else col = 'cashierTransactions';

      const q = query(collection(db, col), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load pending transactions");
    } finally {
      setLoading(false);
    }
  }, [dept]);

  React.useEffect(() => {
    if (dept) fetchPending();
  }, [dept, fetchPending]);

  const handleApprove = async (txId: string) => {
    if (!dept) return;
    setApproving(txId);
    try {
      await approveTransaction(dept.deptId, txId);
      toast.success("Transaction Approved");
      setPending(prev => prev.filter(t => t.id !== txId));
      onUpdate();
    } catch (err) {
      toast.error("Approval failed");
    } finally {
      setApproving(null);
    }
  };

  if (!dept) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-[3rem] border border-gray-100 bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-10 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                <Sparkles className="w-5 h-5 fill-indigo-100" />
                HQ Finance Hub
              </div>
              <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight">
                {dept.deptName} <span className="text-indigo-600 tracking-normal font-black">Audit</span>
              </h2>
              <p className="text-gray-500 mt-2 text-xs font-bold uppercase tracking-widest">Deep departmental flow analysis and authorization portal.</p>
            </div>
            
            <button 
              onClick={onClose} 
              className="relative z-10 p-4 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#FCFBF8]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-8 rounded-[2.5rem] bg-gray-900 text-white shadow-xl flex flex-col justify-between group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-none" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 relative z-10">Verified Inflow</span>
                <div className="mt-6 relative z-10">
                   <div className="text-4xl font-black tracking-tight">Rs. {dept.totalIncome.toLocaleString()}</div>
                   <div className="flex items-center gap-2 text-[10px] mt-2 font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                     <TrendingUp className="w-4 h-4 text-emerald-400" /> System Confirmed
                   </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-8 rounded-[2.5rem] border border-amber-200/50 bg-amber-50/50 flex flex-col justify-between hover:-translate-y-1 transition-all group"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Pipeline Value</span>
                <div className="mt-6">
                   <div className="text-4xl font-black tracking-tight text-amber-900">Rs. {dept.pendingAmount.toLocaleString()}</div>
                   <div className="flex items-center gap-2 text-[10px] text-amber-600 mt-2 font-bold uppercase tracking-wider animate-pulse">
                     <Clock className="w-4 h-4" /> Awaiting Auth
                   </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-8 rounded-[2.5rem] border border-gray-100 bg-white flex flex-col justify-between hover:-translate-y-1 transition-all shadow-sm"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Queue Depth</span>
                <div className="mt-6">
                   <div className="text-4xl font-black tracking-tight text-gray-800">{dept.pendingCount} <span className="text-sm font-bold opacity-30">ITEMS</span></div>
                   <div className="flex items-center gap-2 text-[10px] text-indigo-500 mt-2 font-bold uppercase tracking-wider">
                     <Hash className="w-4 h-4" /> Registry Count
                   </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-8 rounded-[2.5rem] bg-gray-50/80 border border-gray-100 flex flex-col justify-between group hover:-translate-y-1 transition-all"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Volume Share</span>
                <div className="mt-6">
                   <div className="text-4xl font-black tracking-tight text-gray-800">{Math.round(dept.percentOfTotal)}% <span className="text-sm font-bold opacity-30">GLOBAL</span></div>
                   <div className="flex items-center gap-2 text-[10px] text-indigo-600 mt-2 font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                     <ArrowUpRight className="w-4 h-4" /> Dynamic Growth
                   </div>
                </div>
              </motion.div>
            </div>

            {/* Ways of Income */}
            <div className="mb-14">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 border-l-4 border-indigo-600 pl-4 font-black">Revenue Stream Distribution</h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(dept.ways).map(([key, val]) => (
                  <div 
                    key={key} 
                    className="px-6 py-4 rounded-2xl bg-white border border-gray-100 flex items-center gap-4 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="opacity-60">{key}:</span>
                    <span className="font-black text-gray-900">Rs. {val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Transactions List */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-4 border-amber-500 pl-4 font-black">Pending Ledger Verifications</h3>
                <div className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider">{pending.length} Items Found</div>
              </div>

              {loading ? (
                <div className="space-y-6">
                  {[1,2,3].map(i => <div key={i} className="h-24 w-full animate-pulse bg-gray-100 rounded-[2rem] border border-gray-100" />)}
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-gray-200 rounded-[3rem] bg-gray-50/50 group">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500/30 mx-auto mb-6 group-hover:scale-110 group-hover:text-emerald-500/50 transition-all duration-500" />
                  <p className="font-black text-xs text-gray-400 uppercase tracking-widest">All system operations are verified. Clean state.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pending.map((tx) => (
                    <motion.div
                      layout
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group p-8 rounded-[2.5rem] border border-gray-100 bg-white hover:bg-gray-50 transition-all flex flex-wrap items-center justify-between gap-8 shadow-sm hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-6">
                         <div className={cn(
                           "p-5 rounded-[1.5rem] transition-all duration-500 group-hover:scale-110 border border-gray-100",
                           tx.type === 'expense' ? "bg-rose-50 text-rose-600 rotate-6" : "bg-emerald-50 text-emerald-600 -rotate-6"
                         )}>
                           {tx.type === 'expense' ? <ArrowDownRight className="w-6 h-6" strokeWidth={3} /> : <ArrowUpRight className="w-6 h-6" strokeWidth={3} />}
                         </div>
                         <div>
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-black tracking-tight text-gray-900">Rs. {(tx.amount || 0).toLocaleString()}</span>
                              <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                {tx.category || tx.categoryName || 'General Revenue'}
                              </div>
                            </div>
                            <div className="text-[10px] font-bold text-gray-500 flex items-center gap-5 mt-2 uppercase tracking-wider">
                               <span className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> {tx.collectedBy || tx.staffName || 'Automated System'}</span>
                               <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> {tx.paymentMethod || 'Direct Ledger'}</span>
                               <span className="flex items-center gap-2 font-mono opacity-50">#{tx.id.slice(-8).toUpperCase()}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleApprove(tx.id)}
                          disabled={approving === tx.id}
                          className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                        >
                          {approving === tx.id ? (
                            <Clock className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              Authorize
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
