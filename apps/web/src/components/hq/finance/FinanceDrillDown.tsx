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
          className="absolute inset-0 bg-background/80 backdrop-blur-2xl"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-[3rem] border-2 border-border/50 bg-background shadow-[0_50px_100px_rgba(0,0,0,0.3)] flex flex-col"
        >
          {/* Header */}
          <div className="p-10 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2 text-primary font-bold uppercase tracking-widest text-[10px]">
                <Sparkles className="w-5 h-5 fill-primary/20" />
                HQ Finance Hub
              </div>
              <h2 className="text-4xl font-bold text-black dark:text-white uppercase tracking-tight">
                {dept.deptName} <span className="text-primary tracking-normal">Audit</span>
              </h2>
              <p className="text-muted-foreground mt-2 text-xs font-bold uppercase tracking-widest opacity-60">Deep departmental flow analysis and authorization portal.</p>
            </div>
            
            <button 
              onClick={onClose} 
              className="relative z-10 p-4 rounded-3xl bg-muted/30 hover:bg-destructive/10 hover:text-destructive transition-all group border border-transparent hover:border-destructive/20"
            >
              <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-grid-white/[0.01]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="p-8 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black shadow-2xl flex flex-col justify-between group">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Total Verified Inflow</span>
                <div className="mt-6">
                   <div className="text-4xl font-bold tracking-tight">Rs. {dept.totalIncome.toLocaleString()}</div>
                   <div className="flex items-center gap-2 text-[10px] mt-2 font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                     <TrendingUp className="w-4 h-4 text-emerald-400" /> System Synchronized
                   </div>
                </div>
              </div>

              <div className="p-8 rounded-[2rem] border-2 border-border/50 bg-background flex flex-col justify-between hover:border-primary/30 transition-all">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Awaiting Authorization</span>
                <div className="mt-6">
                   <div className="text-4xl font-bold tracking-tight text-black dark:text-white">{dept.pendingCount} <span className="text-sm">ITEMS</span></div>
                   <div className="flex items-center gap-2 text-[10px] text-amber-500 mt-2 font-bold uppercase tracking-wider animate-pulse">
                     <Clock className="w-4 h-4" /> Real-time Queue
                   </div>
                </div>
              </div>

              <div className="p-8 rounded-[2rem] bg-primary/10 border-2 border-primary/20 flex flex-col justify-between group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Global Multiplier</span>
                <div className="mt-6">
                   <div className="text-4xl font-bold tracking-tight text-black dark:text-white">{Math.round(dept.percentOfTotal)}% <span className="text-sm">SHARE</span></div>
                   <div className="flex items-center gap-2 text-[10px] text-primary mt-2 font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                     <ArrowUpRight className="w-4 h-4" /> Growth Dynamic
                   </div>
                </div>
              </div>
            </div>

            {/* Ways of Income */}
            <div className="mb-14">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6 border-l-4 border-primary pl-4">Revenue Stream Distribution</h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(dept.ways).map(([key, val]) => (
                  <div 
                    key={key} 
                    className="px-6 py-4 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-4 text-xs font-bold uppercase tracking-wider hover:border-primary/20 hover:bg-muted/50 transition-all"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                    <span className="opacity-60">{key}:</span>
                    <span className="text-black dark:text-white font-bold">Rs. {val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Transactions List */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-l-4 border-amber-500 pl-4 text-black dark:text-white">Pending Ledger Verifications</h3>
                <div className="bg-muted px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider opacity-60">{pending.length} Items Found</div>
              </div>

              {loading ? (
                <div className="space-y-6">
                  {[1,2,3].map(i => <div key={i} className="h-24 w-full animate-pulse bg-muted rounded-[2rem]" />)}
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-24 border-4 border-dashed border-border/30 rounded-[3rem] bg-muted/10 group">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500/20 mx-auto mb-6 group-hover:scale-110 group-hover:text-emerald-500/40 transition-all duration-500" />
                  <p className="font-bold text-xs text-muted-foreground uppercase tracking-wider">All system operations are verified. Clean state.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pending.map((tx) => (
                    <motion.div
                      layout
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group p-8 rounded-[2.5rem] border-2 border-border/50 hover:border-primary/40 bg-background hover:bg-primary/[0.02] transition-all flex flex-wrap items-center justify-between gap-8 shadow-sm hover:shadow-xl"
                    >
                      <div className="flex items-center gap-6">
                         <div className={cn(
                           "p-5 rounded-[1.5rem] transition-all duration-500 group-hover:scale-110 shadow-lg",
                           tx.type === 'expense' ? "bg-rose-500 text-white rotate-6" : "bg-emerald-500 text-white -rotate-6"
                         )}>
                           {tx.type === 'expense' ? <ArrowDownRight className="w-8 h-8" strokeWidth={3} /> : <ArrowUpRight className="w-8 h-8" strokeWidth={3} />}
                         </div>
                         <div>
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-bold tracking-tight">Rs. {(tx.amount || 0).toLocaleString()}</span>
                              <div className="bg-muted px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider opacity-70">
                                {tx.category || tx.categoryName || 'General Revenue'}
                              </div>
                            </div>
                            <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-5 mt-2 uppercase tracking-wider">
                               <span className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /> {tx.collectedBy || tx.staffName || 'Automated System'}</span>
                               <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> {tx.paymentMethod || 'Direct Ledger'}</span>
                               <span className="flex items-center gap-2 font-mono opacity-50">#{tx.id.slice(-8).toUpperCase()}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleApprove(tx.id)}
                          disabled={approving === tx.id}
                          className="rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-[10px] h-14 px-10 shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                        >
                          {approving === tx.id ? (
                            <Clock className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
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
