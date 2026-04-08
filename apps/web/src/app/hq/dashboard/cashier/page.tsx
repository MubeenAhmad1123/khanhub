// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter, Timestamp, updateDoc, where } from 'firebase/firestore';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, History, Loader2, Minus, Plus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, toDate } from '@/lib/utils';

type TxnType = 'income' | 'expense';
type DateMode = 'today' | 'all' | 'range';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PaymentMethod = 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'other';

const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions', entityCollection: 'rehab_patients' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions', entityCollection: 'spims_students' },
];

const BASE_CATEGORIES = [
  { id: 'fee', name: 'Admission / Fees', appliesTo: 'income' },
  { id: 'canteen', name: 'Canteen Funds', appliesTo: 'both' },
  { id: 'staff_salary', name: 'Staff Salary', appliesTo: 'expense' },
  { id: 'utilities', name: 'Utilities', appliesTo: 'expense' },
  { id: 'maintenance', name: 'Maintenance', appliesTo: 'expense' },
  { id: 'other_income', name: 'Other Income', appliesTo: 'income' },
  { id: 'other_expense', name: 'Other Expense', appliesTo: 'expense' },
] as const;

function slugify(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export default function CashierStationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();

  const [incomingFeeReqs, setIncomingFeeReqs] = useState<any[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [incomingActionId, setIncomingActionId] = useState<string | null>(null);

  const [departmentCode, setDepartmentCode] = useState('rehab');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityResults, setEntityResults] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [txnType, setTxnType] = useState<TxnType>('income');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNo, setReferenceNo] = useState('');

  const [customCategories, setCustomCategories] = useState<{ id: string; name: string; appliesTo: 'income' | 'expense' | 'both' }[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('fee');

  const [historyTxns, setHistoryTxns] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDateMode, setHistoryDateMode] = useState<DateMode>('today');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyStatus, setHistoryStatus] = useState<StatusFilter>('all');
  const [historyType, setHistoryType] = useState<'all' | TxnType>('all');
  const [historyDepartment, setHistoryDepartment] = useState<'all' | string>('all');

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeDepartment = DEPARTMENTS.find((d) => d.code === departmentCode) || DEPARTMENTS[0];
  const allCategories = useMemo(() => [...BASE_CATEGORIES, ...customCategories], [customCategories]);
  const selectedCategory = allCategories.find((c) => c.id === selectedCategoryId);
  const visibleCategories = allCategories.filter((c) => (c.appliesTo === 'both' || c.appliesTo === txnType) && (!categorySearch.trim() || c.name.toLowerCase().includes(categorySearch.toLowerCase())));

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    void loadCustomCategories();
    void fetchHistory();
    const unsub = subscribeIncoming();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [sessionLoading, session, router]);

  function subscribeIncoming() {
    if (!session?.customId) return;
    setIncomingLoading(true);
    try {
      const q = query(
        collection(db, 'rehab_transactions'),
        where('status', '==', 'pending_cashier'),
        where('cashierId', '==', session.customId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(
        q,
        (snap) => {
          setIncomingFeeReqs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setIncomingLoading(false);
        },
        () => setIncomingLoading(false)
      );
    } catch {
      setIncomingLoading(false);
    }
  }

  async function forwardToSuperadmin(txId: string) {
    if (incomingActionId) return;
    setIncomingActionId(txId);
    try {
      await updateDoc(doc(db, 'rehab_transactions', txId), {
        status: 'pending',
        cashierForwardedAt: Timestamp.now(),
        cashierForwardedBy: session?.uid,
        cashierForwardedByName: session?.name || session?.displayName || 'HQ Cashier',
      });
      await fetchHistory();
      setMessage({ type: 'success', text: 'Sent to superadmin approvals.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to forward request.' });
    } finally {
      setIncomingActionId(null);
    }
  }

  useEffect(() => {
    setSelectedEntity(null);
    setEntityResults([]);
    setSearchQuery('');
  }, [departmentCode]);

  async function loadCustomCategories() {
    try {
      const snap = await getDocs(collection(db, 'hq_cashier_categories'));
      const list = snap.docs.map((d) => ({ id: d.data().slug || d.id, name: d.data().name || 'Custom', appliesTo: d.data().appliesTo || 'both' }));
      setCustomCategories(list as any);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchHistory() {
    try {
      setHistoryLoading(true);
      const all: any[] = [];
      for (const dept of DEPARTMENTS) {
        let cursor: any = null;
        while (true) {
          const q = cursor
            ? query(collection(db, dept.txCollection), orderBy('createdAt', 'desc'), limit(100), startAfter(cursor))
            : query(collection(db, dept.txCollection), orderBy('createdAt', 'desc'), limit(100));
          const snap = await getDocs(q);
          if (snap.empty) break;
          all.push(...snap.docs.map((d) => ({ id: d.id, departmentCode: dept.code, departmentName: dept.label, ...d.data() })));
          cursor = snap.docs[snap.docs.length - 1];
          if (snap.docs.length < 100) break;
        }
      }
      all.sort((a, b) => (toDate(b.createdAt || b.date)?.getTime() || 0) - (toDate(a.createdAt || a.date)?.getTime() || 0));
      setHistoryTxns(all);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function searchEntities() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const q = query(collection(db, activeDepartment.entityCollection), where('name', '>=', searchQuery), where('name', '<=', `${searchQuery}\uf8ff`), limit(20));
      const snap = await getDocs(q);
      setEntityResults(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setSearchLoading(false);
    }
  }

  async function createCategory() {
    const name = categorySearch.trim();
    if (!name) return;
    const slug = slugify(name);
    if (allCategories.some((c) => c.id === slug)) {
      setSelectedCategoryId(slug);
      return;
    }
    await addDoc(collection(db, 'hq_cashier_categories'), { name, slug, appliesTo: txnType, isCustom: true, createdBy: session?.uid, createdAt: Timestamp.now() });
    setCustomCategories((p) => [...p, { id: slug, name, appliesTo: txnType } as any]);
    setSelectedCategoryId(slug);
    setCategorySearch('');
  }

  async function submitTx(e: React.FormEvent) {
    e.preventDefault();
    if (processing) return;
    setMessage(null);
    if (!selectedEntity) return setMessage({ type: 'error', text: 'Select account first.' });
    if (!selectedCategory) return setMessage({ type: 'error', text: 'Select category field.' });
    if (!amount || Number(amount) <= 0) return setMessage({ type: 'error', text: 'Enter valid amount.' });

    setProcessing(true);
    try {
      await addDoc(collection(db, activeDepartment.txCollection), {
        type: txnType,
        amount: Number(amount),
        category: selectedCategory.id,
        categoryName: selectedCategory.name,
        departmentCode: activeDepartment.code,
        departmentName: activeDepartment.label,
        patientId: selectedEntity.id,
        patientName: selectedEntity.name || selectedEntity.fullName || 'Unknown',
        description,
        paymentMethod,
        referenceNo,
        status: 'pending',
        date: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        transactionDate: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        createdBy: session?.uid,
        createdByName: session?.displayName || session?.name || 'HQ Cashier',
        createdAt: Timestamp.now(),
      });
      setMessage({ type: 'success', text: 'Transaction sent for superadmin approval.' });
      setAmount('');
      setDescription('');
      setReferenceNo('');
      await fetchHistory();
    } catch {
      setMessage({ type: 'error', text: 'Failed to submit transaction.' });
    } finally {
      setProcessing(false);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const fromDate = historyFrom ? new Date(`${historyFrom}T00:00:00`) : null;
  const toDateValue = historyTo ? new Date(`${historyTo}T23:59:59.999`) : null;
  const historyFiltered = historyTxns.filter((tx) => {
    const d = toDate(tx.transactionDate || tx.date || tx.createdAt);
    if (!d) return false;
    if (historyDateMode === 'today' && d.toISOString().split('T')[0] !== todayStr) return false;
    if (historyDateMode === 'range' && fromDate && toDateValue && (d < fromDate || d > toDateValue)) return false;
    if (historyStatus !== 'all' && tx.status !== historyStatus) return false;
    if (historyType !== 'all' && tx.type !== historyType) return false;
    if (historyDepartment !== 'all' && tx.departmentCode !== historyDepartment) return false;
    return !searchQuery.trim() || `${tx.patientName || ''} ${tx.patientId || ''} ${tx.categoryName || tx.category || ''} ${tx.description || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totals = useMemo(() => {
    const income = historyFiltered.filter((x) => x.type === 'income').reduce((s, x) => s + Number(x.amount || 0), 0);
    const expense = historyFiltered.filter((x) => x.type === 'expense').reduce((s, x) => s + Number(x.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [historyFiltered]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-950 text-gray-100 pb-16">
      <div className="border-b border-white/10 px-4 md:px-8 py-4 sticky top-0 z-30 bg-[#0d0f14]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white shrink-0">
            <CreditCard size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white truncate">Cashier Station</h1>
            <p className="text-[10px] font-black uppercase text-gray-400 truncate">Terminal ID: {session?.customId || 'HQ-CASHIER'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-4 min-w-0">
          <div className="bg-[#11151d] rounded-2xl p-4 border border-white/10">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <Plus size={14} /> Admin Fee Requests
            </h2>
            {incomingLoading ? (
              <div className="p-4 rounded-xl bg-[#1a1f2a] border border-white/10 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-teal-400" />
              </div>
            ) : incomingFeeReqs.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#1a1f2a] border border-white/10 text-xs font-bold text-gray-400">
                No incoming fee requests.
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {incomingFeeReqs.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-xl bg-[#1a1f2a] border border-white/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white truncate">{tx.patientName || 'Patient'}</div>
                        <div className="text-[10px] font-bold text-gray-400 truncate">{tx.patientId || tx.id}</div>
                        <div className="text-xs font-bold text-teal-300 mt-1">Rs {Number(tx.amount || 0).toLocaleString()}</div>
                        <div className="text-[10px] font-semibold text-gray-300 mt-1 line-clamp-2">{tx.description || tx.note || ''}</div>
                      </div>
                      <button
                        type="button"
                        disabled={incomingActionId === tx.id}
                        onClick={() => forwardToSuperadmin(tx.id)}
                        className="shrink-0 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                      >
                        {incomingActionId === tx.id ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] font-bold text-gray-500">
              Clicking <span className="text-gray-200 font-black">Add</span> sends request to superadmin approvals.
            </p>
          </div>

          <div className="bg-[#11151d] rounded-2xl p-4 border border-white/10">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <Search size={14} /> Search Account
            </h2>
            <div className="space-y-3">
              <select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} className="w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10">
                {DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
              <div className="relative">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name or ID..." className="w-full bg-[#1a1f2a] rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-white border border-white/10 placeholder:text-gray-500" />
                <button type="button" onClick={searchEntities} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-teal-600 text-white">
                  {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
              {entityResults.map((e) => (
                <button key={e.id} type="button" onClick={() => setSelectedEntity(e)} className="w-full text-left p-3 rounded-xl bg-[#1a1f2a] border border-transparent hover:border-teal-500/40">
                  <div className="text-sm font-black text-white truncate">{e.name || e.fullName || 'Unknown'}</div>
                  <div className="text-[10px] font-bold text-gray-400 truncate">{e.customId || e.rollNumber || e.id?.slice(0, 10)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 min-w-0">
          <div className="bg-[#11151d] rounded-2xl p-4 sm:p-6 border border-white/10">
            <form onSubmit={submitTx} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1a1f2a] border border-white/10 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{selectedEntity ? 'Account Selected' : 'Select Account'}</p>
                <p className="text-base sm:text-lg font-black text-white truncate">{selectedEntity ? selectedEntity.name : 'Search and select account from left panel'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setTxnType('income')} className={cn('p-4 rounded-xl border flex flex-col items-center gap-2', txnType === 'income' ? 'border-teal-500 bg-teal-500/10' : 'border-white/10 bg-[#1a1f2a]')}>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', txnType === 'income' ? 'bg-teal-500 text-white' : 'bg-[#242b39] text-gray-300')}><TrendingUp size={20} /></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Payment In</span>
                </button>
                <button type="button" onClick={() => setTxnType('expense')} className={cn('p-4 rounded-xl border flex flex-col items-center gap-2', txnType === 'expense' ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-[#1a1f2a]')}>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', txnType === 'expense' ? 'bg-red-500 text-white' : 'bg-[#242b39] text-gray-300')}><TrendingDown size={20} /></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Payment Out</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Field / Category</label>
                  <input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder="Search or create custom field..." className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10 placeholder:text-gray-500" />
                  <div className="mt-2 border border-white/10 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                    {visibleCategories.map((c) => (
                      <button key={c.id} type="button" onClick={() => setSelectedCategoryId(c.id)} className={cn('w-full text-left px-3 py-2 text-sm font-semibold border-b border-white/10 last:border-0 truncate', selectedCategoryId === c.id ? 'text-teal-400 bg-teal-500/10' : 'text-gray-200 bg-[#1a1f2a]')}>
                        {c.name}
                      </button>
                    ))}
                    {visibleCategories.length === 0 && categorySearch.trim() && (
                      <button type="button" onClick={createCategory} className="w-full text-left px-3 py-3 text-sm font-bold text-teal-400 bg-[#1a1f2a] truncate">
                        Create "{categorySearch.trim()}"
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3 min-w-0">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date</label>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10">
                      <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="jazzcash">JazzCash</option><option value="easypaisa">EasyPaisa</option><option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Amount (PKR)</label>
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-xl font-black text-white border border-white/10 placeholder:text-gray-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Reference No</label>
                  <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Optional reference..." className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10 placeholder:text-gray-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Purpose / Note</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Purpose of this transaction..." className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-semibold text-white border border-white/10 min-h-[110px] resize-none placeholder:text-gray-500" />
              </div>

              {message && (
                <div className={cn('p-3 rounded-xl border flex items-center gap-2', message.type === 'success' ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-red-500/10 border-red-500/30 text-red-300')}>
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <p className="text-sm font-bold">{message.text}</p>
                </div>
              )}

              <button type="submit" disabled={processing} className={cn('w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-white flex items-center justify-center gap-2 disabled:opacity-50', txnType === 'income' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-600 hover:bg-red-700')}>
                {processing ? <Loader2 size={18} className="animate-spin" /> : <>Submit Transaction <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="flex items-center gap-2 mb-4"><History size={18} className="text-teal-400" /><h2 className="text-xl sm:text-2xl font-black text-white">Terminal History</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <select value={historyDateMode} onChange={(e) => setHistoryDateMode(e.target.value as DateMode)} className="bg-[#11151d] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10"><option value="today">Today</option><option value="all">All History</option><option value="range">Date Range</option></select>
          <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value as StatusFilter)} className="bg-[#11151d] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
          <select value={historyType} onChange={(e) => setHistoryType(e.target.value as any)} className="bg-[#11151d] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10"><option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option></select>
          <select value={historyDepartment} onChange={(e) => setHistoryDepartment(e.target.value)} className="bg-[#11151d] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10"><option value="all">All Departments</option>{DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}</select>
          {historyDateMode === 'range' && (<><input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="bg-[#11151d] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10" /><input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="bg-[#11151d] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10" /></>)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-teal-500/10 rounded-xl p-3 border border-teal-500/20"><p className="text-xs font-black uppercase tracking-widest text-teal-300">Income</p><p className="text-lg font-black text-teal-200">Rs {totals.income.toLocaleString()}</p></div>
          <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20"><p className="text-xs font-black uppercase tracking-widest text-red-300">Expense</p><p className="text-lg font-black text-red-200">Rs {totals.expense.toLocaleString()}</p></div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10"><p className="text-xs font-black uppercase tracking-widest text-gray-300">Net</p><p className="text-lg font-black text-white">Rs {totals.net.toLocaleString()}</p></div>
        </div>

        <div className="md:hidden space-y-3">
          {historyLoading ? (
            <div className="bg-[#11151d] rounded-xl p-6 border border-white/10 text-center"><Loader2 className="w-7 h-7 animate-spin text-teal-400 mx-auto" /></div>
          ) : historyFiltered.length === 0 ? (
            <div className="bg-[#11151d] rounded-xl p-4 border border-white/10 text-sm font-bold text-gray-400">No transactions match your filters.</div>
          ) : historyFiltered.map((tx) => (
            <div key={tx.id} className="bg-[#11151d] rounded-xl p-4 border border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-black text-white truncate">{tx.patientName || '-'}</div>
                  <div className="text-[10px] font-bold text-gray-400">{tx.departmentName || tx.departmentCode}</div>
                </div>
                <div className={cn('text-sm font-black shrink-0', tx.type === 'income' ? 'text-teal-400' : 'text-red-400')}>{tx.type === 'income' ? '+' : '-'} Rs {Number(tx.amount || 0).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-xs text-gray-300">{tx.categoryName || tx.category}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider', tx.status === 'approved' ? 'bg-teal-500/10 text-teal-300' : tx.status === 'rejected' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300')}>{tx.status || 'pending'}</span>
                <span className="text-[10px] font-bold text-gray-400">{toDate(tx.transactionDate || tx.date || tx.createdAt)?.toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-[#11151d] rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead><tr className="bg-white/[0.02] border-b border-white/10"><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Department</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Entity</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Category</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Amount</th></tr></thead>
              <tbody>{historyLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 className="w-7 h-7 animate-spin text-teal-400 mx-auto" /></td></tr> : historyFiltered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm font-bold text-gray-400">No transactions match your filters.</td></tr> : historyFiltered.map((tx) => (<tr key={tx.id} className="border-b border-white/5"><td className="px-4 py-3 text-sm font-black text-white">{toDate(tx.transactionDate || tx.date || tx.createdAt)?.toLocaleDateString('en-GB')}</td><td className="px-4 py-3 text-sm font-bold text-gray-300">{tx.departmentName || tx.departmentCode}</td><td className="px-4 py-3"><div className="text-sm font-black text-white">{tx.patientName || '-'}</div><div className="text-[10px] font-bold text-gray-400">{tx.patientId || '-'}</div></td><td className="px-4 py-3 text-sm font-bold text-gray-300">{tx.categoryName || tx.category}</td><td className="px-4 py-3"><span className={cn('px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider', tx.status === 'approved' ? 'bg-teal-500/10 text-teal-300' : tx.status === 'rejected' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300')}>{tx.status || 'pending'}</span></td><td className="px-4 py-3 text-right"><div className={cn('text-sm font-black flex items-center justify-end gap-2', tx.type === 'income' ? 'text-teal-400' : 'text-red-400')}>{tx.type === 'income' ? <Plus size={12} /> : <Minus size={12} />}Rs {Number(tx.amount || 0).toLocaleString()}</div></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

