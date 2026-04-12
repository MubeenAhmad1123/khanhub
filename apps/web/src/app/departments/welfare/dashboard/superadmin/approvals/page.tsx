'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, updateDoc, doc, query, where, Timestamp, onSnapshot, getDocs, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, 
  Filter, Loader2, Receipt, AlertCircle, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY } from '@/lib/utils';

export default function ApprovalsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<'approved' | 'rejected'>('approved');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) {
      router.push('/departments/welfare/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'superadmin') {
      router.push('/departments/welfare/login');
      return;
    }
    setSession(parsed);
    setLoading(false);
  }, [router]);

  // Realtime listener for pending transactions
  useEffect(() => {
    if (!session) return;

    // No orderBy — avoids index requirement
    const q = query(
      collection(db, 'welfare_transactions'),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending = snapshot.docs
        .map(d => {
          const data = d.data()
          return {
            id: d.id,
            type: data.type || '',
            category: data.category || '',
            description: data.description || '',
            amount: Number(data.amount) || 0,
            status: data.status || 'pending',
            cashierId: data.cashierId || '',
            childId: data.childId || null,
            childName: data.childName || null,
            date: data.date,  // keep as Firestore Timestamp for display
            createdAt: data.createdAt,
          }
        })
        // Sort newest first client-side
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() 
            || new Date(a.createdAt || 0).getTime()
          const bTime = b.createdAt?.toDate?.()?.getTime() 
            || new Date(b.createdAt || 0).getTime()
          return bTime - aTime
        })
      setPendingTransactions(pending)
    }, (err) => {
      console.error('Pending listener error:', err?.message)
    })

    return () => unsubscribe()
  }, [session])

  const fetchHistory = async () => {
    try {
      // No orderBy — avoids composite index requirement
      const snap = await getDocs(
        query(
          collection(db, 'welfare_transactions'),
          where('status', 'in', ['approved', 'rejected'])
        )
      )

      const history = snap.docs
        .map(d => {
          const data = d.data()
          const createdAt = data.createdAt?.toDate?.()
            ? data.createdAt.toDate()
            : data.createdAt
              ? new Date(data.createdAt)
              : new Date()
          const approvedAt = data.approvedAt?.toDate?.()
            ? data.approvedAt.toDate()
            : data.approvedAt
              ? new Date(data.approvedAt)
              : null
          const txDate = data.date?.toDate?.()
            ? data.date.toDate()
            : data.date
              ? new Date(data.date)
              : new Date()

          return {
            id: d.id,
            type: data.type || '',
            category: data.category || '',
            description: data.description || '',
            amount: Number(data.amount) || 0,
            status: data.status || '',
            cashierId: data.cashierId || '',
            approvedBy: data.approvedBy || '',
            rejectedBy: data.rejectedBy || '',
            rejectReason: data.rejectReason || '',
            childId: data.childId || null,
            childName: data.childName || null,
            createdAt,
            approvedAt,
            date: txDate,
          }
        })
        // Sort newest first client-side
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        // Limit to 30
        .slice(0, 30)

      setHistoryTransactions(history)
    } catch (err: any) {
      console.error('History fetch error:', err?.message)
    }
  }

  // Fetch History on load and tab change
  useEffect(() => {
    if (!session) return;
    fetchHistory();
  }, [session, historyTab]);

  const handleApprove = async (txId: string) => {
    try {
      setActionLoading(txId);
      
      // 1. Update the transaction status first
      await updateDoc(doc(db, 'welfare_transactions', txId), {
        status: 'approved',
        approvedBy: session.uid,
        approvedAt: Timestamp.now()
      });

      // ── SYNC TO PATIENT RECORDS AFTER APPROVAL ──
      const allTransactions = [...pendingTransactions, ...historyTransactions];
      const tx = allTransactions.find((t: any) => t.id === txId);
      if (tx && tx.childId) {
        try {
          const txDate = tx.date?.toDate ? tx.date.toDate() : new Date();
          const month = txDate.toISOString().slice(0, 7); // "2026-03"

          if (tx.category === 'child_fee') {
            // Find or CREATE the fee record for this child+month
            const feesQ = query(
              collection(db, 'welfare_fees'),
              where('childId', '==', tx.childId),
              where('month', '==', month)
            );
            const feesSnap = await getDocs(feesQ);

            if (feesSnap.empty) {
              // Auto-create fee record — fetch child package amount first
              const childSnap = await getDoc(doc(db, 'welfare_children', tx.childId));
              const packageAmount = childSnap.exists()
                ? (childSnap.data().packageAmount || 60000)
                : 60000;
              const amountPaid = tx.amount;
              const amountRemaining = Math.max(0, packageAmount - amountPaid);
              await addDoc(collection(db, 'welfare_fees'), {
                childId: tx.childId,
                childName: tx.childName || '',
                month,
                packageAmount,
                amountPaid,
                amountRemaining,
                payments: [{
                  amount: tx.amount,
                  date: txDate,
                  transactionId: txId,
                  approvedBy: session?.uid,
                }],
                lastPaymentDate: serverTimestamp(),
                lastPaymentAmount: tx.amount,
                createdAt: serverTimestamp(),
              });
            } else {
              // Update existing fee record
              const feeDoc = feesSnap.docs[0];
              const current = feeDoc.data();
              const newPaid = (current.amountPaid || 0) + tx.amount;
              const newRemaining = Math.max(0, (current.packageAmount || 60000) - newPaid);
              const existingPayments = current.payments || [];
              await updateDoc(doc(db, 'welfare_fees', feeDoc.id), {
                amountPaid: newPaid,
                amountRemaining: newRemaining,
                lastPaymentDate: serverTimestamp(),
                lastPaymentAmount: tx.amount,
                payments: [...existingPayments, {
                  amount: tx.amount,
                  date: txDate,
                  transactionId: txId,
                  approvedBy: session?.uid,
                }],
              });
            }
          }

          if (tx.category === 'canteen_deposit') {
            const canteenQ = query(
              collection(db, 'welfare_canteen'),
              where('childId', '==', tx.childId),
              where('month', '==', month)
            );
            const canteenSnap = await getDocs(canteenQ);

            if (canteenSnap.empty) {
              // Auto-create canteen record
              await addDoc(collection(db, 'welfare_canteen'), {
                childId: tx.childId,
                childName: tx.childName || '',
                month,
                totalDeposited: tx.amount,
                totalSpent: 0,
                balance: tx.amount,
                lastDepositDate: serverTimestamp(),
                createdAt: serverTimestamp(),
              });
            } else {
              const canteenDoc = canteenSnap.docs[0];
              const current = canteenDoc.data();
              const newDeposited = (current.totalDeposited || 0) + tx.amount;
              const newBalance = newDeposited - (current.totalSpent || 0);
              await updateDoc(doc(db, 'welfare_canteen', canteenDoc.id), {
                totalDeposited: newDeposited,
                balance: newBalance,
                lastDepositDate: serverTimestamp(),
              });
            }
          }

          if (tx.category === 'canteen_expense') {
            const canteenQ = query(
              collection(db, 'welfare_canteen'),
              where('childId', '==', tx.childId),
              where('month', '==', month)
            );
            const canteenSnap = await getDocs(canteenQ);
            if (!canteenSnap.empty) {
              const canteenDoc = canteenSnap.docs[0];
              const current = canteenDoc.data();
              const newSpent = (current.totalSpent || 0) + tx.amount;
              const newBalance = (current.totalDeposited || 0) - newSpent;
              await updateDoc(doc(db, 'welfare_canteen', canteenDoc.id), {
                totalSpent: newSpent,
                balance: Math.max(0, newBalance),
              });
            }
          }

          if (tx.category === 'staff_salary' && tx.staffId) {
            // Mark salary as paid for this staff member this month
            const salaryQ = query(
              collection(db, 'rehab_salary_records'),
              where('staffId', '==', tx.staffId),
              where('month', '==', month)
            );
            const salarySnap = await getDocs(salaryQ);
            if (salarySnap.empty) {
              await addDoc(collection(db, 'rehab_salary_records'), {
                staffId: tx.staffId,
                staffName: tx.staffName || '',
                month,
                amount: tx.amount,
                transactionId: txId,
                paidAt: serverTimestamp(),
                approvedBy: session?.uid,
              });
            } else {
              await updateDoc(doc(db, 'rehab_salary_records', salarySnap.docs[0].id), {
                amount: (salarySnap.docs[0].data().amount || 0) + tx.amount,
                lastPaidAt: serverTimestamp(),
              });
            }
          }
        } catch (syncErr) {
          console.error('Sync error after approval:', syncErr);
          // Don't fail the approval if sync fails — transaction is already approved
        }
      }

      toast.success('Approved ✓');
      fetchHistory(); // Refresh history
    } catch (error) {
      console.error("Approve error", error);
      toast.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (txId: string) => {
    if (rejectId !== txId) {
      setRejectId(txId);
      setRejectReason('');
      return;
    }
    
    try {
      setActionLoading(txId);
      await updateDoc(doc(db, 'welfare_transactions', txId), {
        status: 'rejected',
        rejectedBy: session.uid,
        rejectedAt: Timestamp.now(),
        rejectReason: rejectReason || null
      });
      toast.success('Rejected');
      setRejectId(null);
      setRejectReason('');
      fetchHistory(); // Refresh history
    } catch (error) {
      console.error("Reject error", error);
      toast.error("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      child_fee: 'Child Monthly Fee',
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
      child_welfare: 'Child Welfare',
      office_supplies: 'Office Supplies',
      other_expense: 'Other Expense',
    };
    return map[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const TransactionCard = ({ tx, type }: { tx: any, type: 'pending' | 'history' }) => (
    <div className={`bg-white border-l-4 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-gray-900/5 transition-all active:scale-[0.99] group overflow-hidden relative border ${
      tx.type === 'income' ? 'border-l-green-500' : 'border-l-red-500'
    } ${type === 'pending' ? 'border-gray-100' : 'border-gray-50 opacity-90'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
            tx.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {tx.type === 'income' ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                tx.type === 'income' ? 'bg-green-100/50 text-green-600' : 'bg-red-100/50 text-red-600'
              }`}>
                {tx.type}
              </span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {formatCategory(tx.category)}
              </span>
              {type === 'pending' && tx.createdAt && (Date.now() - (tx.createdAt?.toDate?.()?.getTime() || new Date(tx.createdAt).getTime())) > 48 * 60 * 60 * 1000 && (
                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-md animate-pulse">
                  48h+ PENDING
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1 tracking-tight">
              {tx.amount.toLocaleString('en-PK')} <span className="text-sm font-bold text-gray-400">PKR</span>
              {tx.childName && (
                <span className="ml-3 text-sm font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                  Child: {tx.childName}
                </span>
              )}
            </div>
            {tx.description && (
              <p className="text-sm font-medium text-gray-500 mb-3 bg-gray-50 p-2 rounded-xl border border-gray-100/50 italic px-3">"{tx.description}"</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                <Clock size={12} className="text-gray-300" />
                Original Date: {formatDateDMY(tx.date?.toDate?.() ? tx.date.toDate() : tx.date)}
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                <User size={12} className="text-gray-300" />
                Cashier ID: {tx.cashierId?.slice(-6)}
              </div>
              {type === 'history' && tx.approvedAt && (
                <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-2 py-1 rounded-lg">
                   Approved At: {new Date(tx.approvedAt).toLocaleString('en-PK')}
                </div>
              )}
            </div>
            {type === 'history' && tx.status === 'approved' && (
              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Approved by: {tx.approvedBy}</p>
            )}
            {type === 'history' && tx.status === 'rejected' && tx.rejectReason && (
              <div className="text-[10px] font-black text-red-500 mt-3 p-2 bg-red-50 rounded-xl border border-red-100 uppercase tracking-widest flex items-center gap-2">
                <XCircle size={12} /> Reason: {tx.rejectReason}
              </div>
            )}
          </div>
        </div>

        {type === 'pending' ? (
          <div className="flex flex-col sm:flex-row gap-2 min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
             {rejectId === tx.id ? (
              <div className="w-full space-y-2 animate-in slide-in-from-right-2">
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full text-sm font-bold border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReject(tx.id)}
                    disabled={actionLoading === tx.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                  >Confirm</button>
                  <button 
                    onClick={() => setRejectId(null)}
                    className="flex-1 bg-white border border-gray-100 text-gray-400 text-xs font-black uppercase tracking-widest py-3 rounded-xl hover:bg-gray-50 transition-all"
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleApprove(tx.id)}
                  disabled={actionLoading === tx.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-500 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-teal-600 transition-all shadow-lg shadow-teal-200 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle size={16} />} 
                  Approve
                </button>
                <button
                  onClick={() => handleReject(tx.id)}
                  disabled={actionLoading === tx.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 whitespace-nowrap pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
            {tx.status === 'approved' ? (
              <span className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-100 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                <CheckCircle size={14} /> APPROVED
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                <XCircle size={14} /> REJECTED
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-teal-600" />
              Transaction Approvals
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage financial entries
            </p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-medium text-sm border border-yellow-200">
            <Clock className="w-4 h-4" />
            {pendingTransactions.length} Pending
          </div>
        </div>

        {/* Pending Section */}
        <section>
           <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Clock className="w-4 h-4" /> Pending Review
           </h2>
          <div className="space-y-4">
            {pendingTransactions.length === 0 ? (
              <div className="bg-white border text-center border-gray-200 border-dashed rounded-xl p-12 text-gray-500">
                <p className="text-lg font-medium text-gray-600 mb-1">No pending transactions 🎉</p>
                <p className="text-sm">You are all caught up!</p>
              </div>
            ) : (
              pendingTransactions.map(tx => <TransactionCard key={tx.id} tx={tx} type="pending" />)
            )}
          </div>
        </section>

        {/* History Section */}
        <section className="pt-8">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-2">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Approval History (Last 30)
            </h2>
          </div>
          <div className="space-y-4">
            {historyTransactions.length === 0 ? (
              <p className="text-center text-gray-300 py-10 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200 uppercase tracking-widest">No approval history yet.</p>
            ) : (
              historyTransactions.map(tx => <TransactionCard key={tx.id} tx={tx} type="history" />)
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
