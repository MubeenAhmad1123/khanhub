// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter, Timestamp, updateDoc, where } from 'firebase/firestore';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, History, Loader2, Minus, Plus, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

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
  const [forwardModalTx, setForwardModalTx] = useState<any | null>(null);
  const [forwardProofFile, setForwardProofFile] = useState<File | null>(null);
  const [forwardProofReason, setForwardProofReason] = useState('');
  const [forwardProofUploading, setForwardProofUploading] = useState(false);

  const [departmentCode, setDepartmentCode] = useState('rehab');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityResults, setEntityResults] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  const [txnType, setTxnType] = useState<TxnType>('income');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofReason, setProofReason] = useState('');
  const [proofUploading, setProofUploading] = useState(false);

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
  const isStaffMode = departmentCode === 'rehab' && txnType === 'expense' && selectedCategoryId === 'staff_salary';

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

  function openForwardModal(tx: any) {
    setForwardModalTx(tx);
    setForwardProofFile(null);
    setForwardProofReason('');
    setForwardProofUploading(false);
  }

  async function confirmForwardToSuperadmin() {
    if (!forwardModalTx?.id) return;
    if (incomingActionId) return;
    const txId = forwardModalTx.id;

    const hasProofFile = !!forwardProofFile;
    const reason = forwardProofReason.trim();

    if (!hasProofFile && !reason) {
      setMessage({ type: 'error', text: 'Upload proof OR enter reason for missing proof.' });
      return;
    }

    setIncomingActionId(txId);
    setForwardProofUploading(true);
    setMessage(null);

    try {
      let proofUrl: string | undefined;
      if (forwardProofFile) {
        proofUrl = await uploadToCloudinary(forwardProofFile, 'khanhub/hq/receipts');
      }

      await updateDoc(doc(db, 'rehab_transactions', txId), {
        status: 'pending',
        proofUrl: proofUrl || undefined,
        proofMissingReason: proofUrl ? undefined : reason,
        proofRequired: true,
        cashierForwardedAt: Timestamp.now(),
        cashierForwardedBy: session?.uid,
        cashierForwardedByName: session?.name || session?.displayName || 'HQ Cashier',
      });

      setMessage({ type: 'success', text: 'Request sent to superadmin approvals.' });
      setForwardModalTx(null);
      setForwardProofFile(null);
      setForwardProofReason('');
      await fetchHistory();
    } catch {
      setMessage({ type: 'error', text: 'Failed to forward request.' });
    } finally {
      setIncomingActionId(null);
      setForwardProofUploading(false);
    }
  }

  useEffect(() => {
    setSelectedEntity(null);
    setEntityResults([]);
    setSearchResults([]);
    setSearchOpen(false);
    setSearchQuery('');
  }, [departmentCode]);

  useEffect(() => {
    if (!session) return;
    const run = async () => {
      try {
        const entityCollection = isStaffMode ? 'rehab_staff' : activeDepartment.entityCollection;
        const snap = await getDocs(collection(db, entityCollection));
        setAllPatients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        setAllPatients([]);
      }
    };
    void run();
  }, [session, departmentCode, isStaffMode, activeDepartment.entityCollection]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const matches = allPatients.filter((p) =>
      (p.name || p.fullName || '').toLowerCase().includes(q) ||
      (p.patientId || p.studentId || p.customId || p.employeeId || p.rollNumber || p.id || '').toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 10));
    setSearchOpen(true);
  }, [searchQuery, allPatients]);

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
    if (!proofFile && !proofReason.trim()) {
      return setMessage({ type: 'error', text: 'Upload proof OR enter reason if proof is missing.' });
    }

    setProcessing(true);
    setProofUploading(true);
    try {
      let proofUrl: string | undefined;
      if (proofFile) {
        proofUrl = await uploadToCloudinary(proofFile, 'khanhub/hq/receipts');
      }

      await addDoc(collection(db, activeDepartment.txCollection), {
        type: txnType,
        amount: Number(amount),
        category: selectedCategory.id,
        categoryName: selectedCategory.name,
        departmentCode: activeDepartment.code,
        departmentName: activeDepartment.label,
        ...(isStaffMode
          ? { staffId: selectedEntity.id, staffName: selectedEntity.name || selectedEntity.employeeId || 'Unknown' }
          : { patientId: selectedEntity.id, patientName: selectedEntity.name || selectedEntity.fullName || 'Unknown' }),
        description,
        paymentMethod,
        referenceNo,
        status: 'pending',
        proofUrl: proofUrl || undefined,
        proofMissingReason: proofUrl ? undefined : proofReason.trim(),
        proofRequired: true,
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
      setProofFile(null);
      setProofReason('');
      setProofUploading(false);
      await fetchHistory();
    } catch {
      setMessage({ type: 'error', text: 'Failed to submit transaction.' });
    } finally {
      setProcessing(false);
      setProofUploading(false);
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
    return !searchQuery.trim() || `${tx.patientName || ''} ${tx.patientId || ''} ${tx.staffName || ''} ${tx.staffId || ''} ${tx.categoryName || tx.category || ''} ${tx.description || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="min-h-screen md:pl-0 overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 pb-24 md:pb-8">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-gray-950/80 border-b border-white/5 px-4 py-4 md:px-8 md:py-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white shrink-0">
            <CreditCard size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">Cashier Station</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">Terminal ID: {session?.customId || 'HQ-CASHIER'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-4 min-w-0">
          <div className="bg-white/5 border border-white/8 rounded-3xl p-5 md:p-7">
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Plus size={14} /> Admin Fee Requests
            </h2>
            </div>
            {incomingLoading ? (
              <div className="p-4 rounded-xl bg-[#1a1f2a] border border-white/10 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-teal-400" />
              </div>
            ) : incomingFeeReqs.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#1a1f2a] border border-white/10 text-xs font-bold text-gray-400">
                No incoming fee requests.
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {incomingFeeReqs.map((tx, index) => (
                  <div key={tx.id} style={{ animationDelay: `${index * 60}ms` }} className="animate-in fade-in slide-in-from-bottom-2 duration-300 group bg-white/5 border border-white/8 rounded-2xl p-4 md:p-5 hover:bg-white/8 hover:border-amber-500/20 transition-all duration-300">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white truncate">{tx.patientName || 'Patient'}</div>
                        <div className="text-[10px] font-bold text-gray-400 truncate">{tx.patientId || tx.id}</div>
                        <div className="text-xs font-bold text-teal-300 mt-1">Rs {Number(tx.amount || 0).toLocaleString()}</div>
                        <div className="text-[10px] font-semibold text-gray-300 mt-1 line-clamp-2">{tx.description || tx.note || ''}</div>
                        <span className={cn('mt-2 inline-flex px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border', tx.status === 'pending_cashier' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-blue-500/15 text-blue-400 border-blue-500/20')}>
                          {tx.status || 'pending_cashier'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={incomingActionId === tx.id}
                        onClick={() => openForwardModal(tx)}
                        className="min-h-[44px] shrink-0 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] md:text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
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

          <div className="bg-white/5 border border-white/8 rounded-3xl p-5 md:p-7">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
              <Search size={14} /> {isStaffMode ? 'Search Staff' : 'Search Account'}
            </h2>
            <div className="space-y-3">
              <select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 placeholder-gray-600">
                {DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
              <div className="relative w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery && setSearchOpen(true)}
                    placeholder="Search by name or ID..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/50 transition-all duration-200 placeholder-gray-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedEntity(p);
                          setEntityResults([p]);
                          setSearchQuery(p.name || p.fullName || p.patientId || p.studentId || p.id);
                          setSearchOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-xs flex-shrink-0">
                          {String(p.name || p.fullName || '?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">{p.name || p.fullName || 'Unknown'}</p>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            {p.patientId || p.studentId || p.customId || p.employeeId || p.rollNumber || p.id}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
                )}
              </div>
            </div>
            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
              {entityResults.map((e) => (
                <button key={e.id} type="button" onClick={() => setSelectedEntity(e)} className="min-h-[44px] w-full text-left p-3 rounded-xl bg-[#1a1f2a] border border-transparent hover:border-teal-500/40">
                  <div className="text-sm font-black text-white truncate">{e.name || e.fullName || 'Unknown'}</div>
                  <div className="text-[10px] font-bold text-gray-400 truncate">{e.customId || e.rollNumber || e.id?.slice(0, 10)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 min-w-0">
          <div className="bg-white/5 border border-white/8 rounded-3xl p-5 md:p-7">
            <form onSubmit={submitTx} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1a1f2a] border border-white/10 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{selectedEntity ? 'Account Selected' : 'Select Account'}</p>
                <p className="text-base sm:text-lg font-black text-white truncate">{selectedEntity ? selectedEntity.name : 'Search and select account from left panel'}</p>
              </div>

              <div className="inline-flex bg-white/5 rounded-2xl p-1 border border-white/8">
                <button type="button" onClick={() => setTxnType('income')} className={cn('min-h-[44px] text-xs uppercase tracking-widest px-5 py-2 rounded-xl transition-all duration-200 font-black', txnType === 'income' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-gray-300')}>
                  Payment In
                </button>
                <button type="button" onClick={() => setTxnType('expense')} className={cn('min-h-[44px] text-xs uppercase tracking-widest px-5 py-2 rounded-xl transition-all duration-200 font-black', txnType === 'expense' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-gray-300')}>
                  Payment Out
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setTxnType('income')} className={cn('min-h-[44px] p-4 rounded-xl border flex flex-col items-center gap-2', txnType === 'income' ? 'border-teal-500 bg-teal-500/10' : 'border-white/10 bg-[#1a1f2a]')}>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', txnType === 'income' ? 'bg-teal-500 text-white' : 'bg-[#242b39] text-gray-300')}><TrendingUp size={20} /></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Payment In</span>
                </button>
                <button type="button" onClick={() => setTxnType('expense')} className={cn('min-h-[44px] p-4 rounded-xl border flex flex-col items-center gap-2', txnType === 'expense' ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-[#1a1f2a]')}>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', txnType === 'expense' ? 'bg-red-500 text-white' : 'bg-[#242b39] text-gray-300')}><TrendingDown size={20} /></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Payment Out</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Field / Category</label>
                  <input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder="Search or create custom field..." className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 placeholder-gray-600" />
                  <div className="mt-2 border border-white/10 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                    {visibleCategories.map((c) => (
                      <button key={c.id} type="button" onClick={() => setSelectedCategoryId(c.id)} className={cn('min-h-[44px] w-full text-left px-3 py-2 text-sm font-semibold border-b border-white/10 last:border-0 truncate', selectedCategoryId === c.id ? 'text-teal-400 bg-teal-500/10' : 'text-gray-200 bg-[#1a1f2a]')}>
                        {c.name}
                      </button>
                    ))}
                    {visibleCategories.length === 0 && categorySearch.trim() && (
                      <button type="button" onClick={createCategory} className="min-h-[44px] w-full text-left px-3 py-3 text-sm font-bold text-teal-400 bg-[#1a1f2a] truncate">
                        Create "{categorySearch.trim()}"
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3 min-w-0">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date</label>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 placeholder-gray-600" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 placeholder-gray-600">
                      <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="jazzcash">JazzCash</option><option value="easypaisa">EasyPaisa</option><option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Amount (PKR)</label>
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Reference No</label>
                  <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Optional reference..." className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 placeholder-gray-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Proof Upload (Image/PDF)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 placeholder-gray-600"
                    disabled={processing}
                  />
                  <p className="mt-2 text-[11px] text-gray-500 font-bold break-all">
                    {proofFile ? `Selected: ${proofFile.name}` : 'No file selected.'}
                  </p>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Reason if proof is missing
                  </label>
                  <textarea
                    value={proofReason}
                    onChange={(e) => setProofReason(e.target.value)}
                    placeholder="If you cannot upload screenshot, explain why..."
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 min-h-[96px] resize-none placeholder-gray-600"
                    disabled={processing}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Purpose / Note</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Purpose of this transaction..." className="mt-2 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-medium outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all duration-200 min-h-[110px] resize-none placeholder-gray-600" />
              </div>

              {message && (
                <div className={cn('p-3 rounded-xl border flex items-center gap-2', message.type === 'success' ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-red-500/10 border-red-500/30 text-red-300')}>
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <p className="text-sm font-bold">{message.text}</p>
                </div>
              )}

              <button type="submit" disabled={processing} className="min-h-[44px] w-full md:w-auto bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
          <div className="border-l-4 border-l-emerald-500 rounded-2xl bg-white/5 border border-white/8 p-4 md:p-5 hover:bg-white/8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default"><p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Income</p><p className="text-xl md:text-2xl font-black text-white">Rs {totals.income.toLocaleString()}</p></div>
          <div className="border-l-4 border-l-rose-500 rounded-2xl bg-white/5 border border-white/8 p-4 md:p-5 hover:bg-white/8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default"><p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Expense</p><p className="text-xl md:text-2xl font-black text-white">Rs {totals.expense.toLocaleString()}</p></div>
          <div className="border-l-4 border-l-amber-500 rounded-2xl bg-white/5 border border-white/8 p-4 md:p-5 hover:bg-white/8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default"><p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Pending</p><p className="text-xl md:text-2xl font-black text-white">{historyFiltered.filter((x) => x.status === 'pending').length}</p></div>
          <div className="border-l-4 border-l-blue-500 rounded-2xl bg-white/5 border border-white/8 p-4 md:p-5 hover:bg-white/8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default"><p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Total</p><p className="text-xl md:text-2xl font-black text-white">Rs {totals.net.toLocaleString()}</p></div>
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
                  <div className="text-sm font-black text-white truncate">{tx.patientName || tx.staffName || '-'}</div>
                  <div className="text-[10px] font-bold text-gray-400">{tx.departmentName || tx.departmentCode}</div>
                </div>
                <div className={cn('text-sm font-black shrink-0', tx.type === 'income' ? 'text-teal-400' : 'text-red-400')}>{tx.type === 'income' ? '+' : '-'} Rs {Number(tx.amount || 0).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-xs text-gray-300">{tx.categoryName || tx.category}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider', tx.status === 'approved' ? 'bg-teal-500/10 text-teal-300' : tx.status === 'rejected' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300')}>{tx.status || 'pending'}</span>
                <span className="text-[10px] font-bold text-gray-400">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-[#11151d] rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[860px] text-left">
              <thead><tr className="bg-white/[0.02] border-b border-white/10"><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Department</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Entity</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Category</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th><th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Amount</th></tr></thead>
              <tbody>{historyLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 className="w-7 h-7 animate-spin text-teal-400 mx-auto" /></td></tr> : historyFiltered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm font-bold text-gray-400">No transactions match your filters.</td></tr> : historyFiltered.map((tx) => (<tr key={tx.id} className="border-b border-white/5"><td className="px-4 py-3 text-sm font-black text-white">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</td><td className="px-4 py-3 text-sm font-bold text-gray-300">{tx.departmentName || tx.departmentCode}</td><td className="px-4 py-3"><div className="text-sm font-black text-white">{tx.patientName || tx.staffName || '-'}</div><div className="text-[10px] font-bold text-gray-400">{tx.patientId || tx.staffId || '-'}</div></td><td className="px-4 py-3 text-sm font-bold text-gray-300">{tx.categoryName || tx.category}</td><td className="px-4 py-3"><span className={cn('px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider', tx.status === 'approved' ? 'bg-teal-500/10 text-teal-300' : tx.status === 'rejected' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300')}>{tx.status || 'pending'}</span></td><td className="px-4 py-3 text-right"><div className={cn('text-sm font-black flex items-center justify-end gap-2', tx.type === 'income' ? 'text-teal-400' : 'text-red-400')}>{tx.type === 'income' ? <Plus size={12} /> : <Minus size={12} />}Rs {Number(tx.amount || 0).toLocaleString()}</div></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>

      {forwardModalTx && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0d0f14] border border-white/10 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-lg font-black text-white">Add Fee Request Proof</p>
                <p className="text-sm font-bold text-gray-400 mt-1">
                  {forwardModalTx.patientName || forwardModalTx.patientId || 'Patient'} - Rs {Number(forwardModalTx.amount || 0).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                disabled={forwardProofUploading}
                onClick={() => setForwardModalTx(null)}
                className="min-h-[44px] p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 disabled:opacity-60"
              >
                X
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Proof Upload (Image/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setForwardProofFile(e.target.files?.[0] || null)}
                  className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10"
                  disabled={forwardProofUploading}
                />
                <p className="mt-2 text-[11px] text-gray-500 font-bold">
                  {forwardProofFile ? `Selected: ${forwardProofFile.name}` : 'No file selected yet.'}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Reason (required if no proof uploaded)
                </label>
                <textarea
                  value={forwardProofReason}
                  onChange={(e) => setForwardProofReason(e.target.value)}
                  placeholder="Why proof is missing? (e.g., app error / receipt not available)"
                  className="mt-2 w-full bg-[#1a1f2a] rounded-xl px-4 py-3 text-sm font-semibold text-white border border-white/10 min-h-[90px] resize-none placeholder:text-gray-500"
                  disabled={forwardProofUploading}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForwardModalTx(null)}
                  disabled={forwardProofUploading}
                  className="min-h-[44px] flex-1 py-3 rounded-xl font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 text-gray-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmForwardToSuperadmin()}
                  disabled={forwardProofUploading}
                  className="min-h-[44px] flex-1 py-3 rounded-xl font-black uppercase tracking-[0.2em] bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60"
                >
                  {forwardProofUploading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

