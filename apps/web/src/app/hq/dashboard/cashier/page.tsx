// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter, Timestamp, updateDoc, where, QueryConstraint, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, DollarSign, FileText, History, LayoutDashboard, Loader2, Lock, Minus, Plus, Search, TrendingDown, TrendingUp, X, RefreshCw, ShieldCheck, Clock, Activity, Trash2, Sparkles, Eye, Calendar, Check, Camera } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, parseDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { markHqNotificationRead, markAllHqNotificationsRead, subscribeHqNotifications, sendHqPushNotification } from '@/lib/hqNotifications';
import { toast } from 'react-hot-toast';
import { getCached, setCached } from '@/lib/queryCache';
import type { HospitalTxCategory, HospitalTxMeta, LabTestMeta, OperationMeta, OpdReceptionMeta } from '@/types/hospital';


type TxnType = 'income' | 'expense';
type DateMode = 'today' | 'all' | 'range' | 'created_today';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PaymentMethod = 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'other';

const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions', entityCollection: 'rehab_patients' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions', entityCollection: 'spims_students' },
  { code: 'hospital', label: 'Khan Hospital', txCollection: 'hospital_transactions', entityCollection: 'hospital_patients' },
  { code: 'sukoon-center', label: 'Sukoon Center', txCollection: 'sukoon_transactions', entityCollection: 'sukoon_clients' },
  { code: 'welfare', label: 'Welfare', txCollection: 'welfare_transactions', entityCollection: 'welfare_donors' },
  { code: 'job-center', label: 'Job Center', txCollection: 'job_center_transactions', entityCollection: 'job_center_seekers' },
];

const BASE_CATEGORIES = [
  { id: 'fee', name: 'Admission / Fees', appliesTo: 'income' },
  { id: 'donation', name: 'Donation', appliesTo: 'income' },
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

function getLocalDateString(val: any): string {
  if (!val) return '';
  const d = toDate(val);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CashierStationPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [mounted, setMounted] = useState(false);

  const [incomingFeeReqs, setIncomingFeeReqs] = useState<any[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [incomingActionId, setIncomingActionId] = useState<string | null>(null);
  const [incomingError, setIncomingError] = useState<string | null>(null);
  const [detailModalTx, setDetailModalTx] = useState<any | null>(null);
  const [forwardModalTx, setForwardModalTx] = useState<any | null>(null);
  const [forwardProofFile, setForwardProofFile] = useState<File | null>(null);
  const [forwardProofReason, setForwardProofReason] = useState('');
  const [forwardProofUploading, setForwardProofUploading] = useState(false);
  const [rejectModalTx, setRejectModalTx] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [superadminRecipient, setSuperadminRecipient] = useState<{ id: string; customId: string }>({ id: '', customId: 'SUPERADMIN' });

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
  const [historyStatus, setHistoryStatus] = useState<StatusFilter>('all');
  const [historyType, setHistoryType] = useState<'all' | 'income' | 'expense'>('all');
  const [historyDepartment, setHistoryDepartment] = useState('all');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Intelligence Stats
  const [intelStats, setIntelStats] = useState({
    todayRevenue: 0,
    todayExpense: 0,
    pendingCount: 0,
    topDept: 'N/A'
  });
  const [entityHistory, setEntityHistory] = useState<any[]>([]);
  const [entityHistoryLoading, setEntityHistoryLoading] = useState(false);

  const getProfileLink = (entity: any) => {
    if (!entity?.id) return null;
    if (isStaffMode) return `/hq/dashboard/manager/staff/${entity.id}`;
    if (activeDepartment.code === 'spims') return `/departments/spims/dashboard/admin/students/${entity.id}`;
    if (activeDepartment.code === 'rehab') return `/departments/rehab/dashboard/admin/patients/${entity.id}`;
    return null;
  };

  const [historyTo, setHistoryTo] = useState('');
  const [historyStats, setHistoryStats] = useState({ income: 0, expense: 0, count: 0, students: 0, patients: 0, clients: 0 });
  const [spimsFeeSubtype, setSpimsFeeSubtype] = useState<'admission' | 'registration' | 'examination' | 'monthly'>('monthly');

  // Hospital Meta States
  const [hospCategory, setHospCategory] = useState<HospitalTxCategory>('opd_reception');
  const [hospPatientName, setHospPatientName] = useState('');
  const [hospGuardian, setHospGuardian] = useState('');
  const [hospAge, setHospAge] = useState('');
  const [hospContact, setHospContact] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospReferredBy, setHospReferredBy] = useState('');
  const [hospTestName, setHospTestName] = useState('');
  const [hospTestReport, setHospTestReport] = useState('');
  const [hospTestExpense, setHospTestExpense] = useState('');
  const [hospOpType, setHospOpType] = useState('');
  const [hospAdmitDate, setHospAdmitDate] = useState('');
  const [hospDischargeDate, setHospDischargeDate] = useState('');
  const [hospOpdShift, setHospOpdShift] = useState<'morning' | 'evening'>('morning');
  const [hospVisitTime, setHospVisitTime] = useState('');
  const [hospVisitPurpose, setHospVisitPurpose] = useState('');

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeDepartment = DEPARTMENTS.find((d) => d.code === departmentCode) || DEPARTMENTS[0];
  const allCategories = useMemo(() => [...BASE_CATEGORIES, ...customCategories], [customCategories]);
  const selectedCategory = allCategories.find((c) => c.id === selectedCategoryId);
  const visibleCategories = allCategories.filter((c) => (c.appliesTo === 'both' || c.appliesTo === txnType) && (!categorySearch.trim() || c.name.toLowerCase().includes(categorySearch.toLowerCase())));
  const isStaffMode = departmentCode === 'rehab' && txnType === 'expense' && selectedCategoryId === 'staff_salary';
  
  // 1. Consolidated History Filtering (Base Filters + Duplicate Analysis)
  const historyFiltered = useMemo(() => {
    // Stage 1: Base Application of Filters (Dept, Status, Type, Search)
    const base = historyTxns.filter((tx) => {
      // Department Filter
      if (historyDepartment !== 'all' && tx.departmentCode !== historyDepartment) return false;

      // Status Filter
      if (historyStatus !== 'all') {
        if (historyStatus === 'pending') {
          if (!['pending', 'pending_cashier'].includes(tx.status)) return false;
        } else if (tx.status !== historyStatus) return false;
      }

      // Type Filter
      if (historyType !== 'all' && tx.type !== historyType) return false;

      // Search Query Filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      
      const searchStr = `${tx.patientName || ''} ${tx.patientId || ''} ${tx.donorName || ''} ${tx.donorId || ''} ${tx.staffName || ''} ${tx.staffId || ''} ${tx.categoryName || tx.category || ''} ${tx.description || ''}`.toLowerCase();
      return searchStr.includes(q);
    });

    // Stage 2: Optional Duplicate Analysis
    if (!showDuplicatesOnly) return base;

    return base.filter((tx1, idx1) => {
      return base.some((tx2, idx2) => {
        if (idx1 === idx2) return false;
        const date1 = getLocalDateString(tx1.transactionDate || tx1.date || tx1.createdAt);
        const date2 = getLocalDateString(tx2.transactionDate || tx2.date || tx2.createdAt);
        const entity1 = tx1.patientId || tx1.staffId || tx1.entityId || tx1.donorId;
        const entity2 = tx2.patientId || tx2.staffId || tx2.entityId || tx2.donorId;
        return tx1.amount === tx2.amount && date1 === date2 && entity1 === entity2 && !!entity1;
      });
    });
  }, [historyTxns, searchQuery, historyDepartment, historyStatus, historyType, showDuplicatesOnly]);

  // Optimized fetchHistory that uses filters and aggregation
  const fetchHistory = useCallback(async () => {
    if (!session) return;
    const cacheKey = `cashier_history_${historyDateMode}_${historyFrom}_${historyTo}_${historyStatus}_${historyType}_${historyDepartment}`;
    const cached = getCached<any[]>(cacheKey);
    // Note: We only return cached if it exists. We might still want to refresh stats.
    
    try {
      setHistoryLoading(true);
      const all: any[] = [];
      
      const targetDepts = historyDepartment === 'all' 
        ? DEPARTMENTS 
        : DEPARTMENTS.filter(d => d.code === historyDepartment);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);
      const tomorrowTimestamp = Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000));

      let totalIncome = 0;
      let totalExpense = 0;
      let totalCount = 0;
      let studentsTouched = 0;
      let patientsTouched = 0;
      let clientsTouched = 0;

      for (const dept of targetDepts) {
        const constraints: QueryConstraint[] = [];
        
        if (historyDateMode === 'today') {
          constraints.push(where('date', '>=', todayTimestamp));
          constraints.push(where('date', '<', tomorrowTimestamp));
          constraints.push(orderBy('date', 'desc'));
        } else if (historyDateMode === 'created_today') {
          constraints.push(where('createdAt', '>=', todayTimestamp));
          constraints.push(where('createdAt', '<', tomorrowTimestamp));
          constraints.push(orderBy('createdAt', 'desc'));
        } else if (historyDateMode === 'range' && historyFrom) {
          const fromDate = new Date(`${historyFrom}T00:00:00`);
          const toDateVal = historyTo ? new Date(`${historyTo}T23:59:59`) : new Date();
          constraints.push(where('date', '>=', Timestamp.fromDate(fromDate)));
          constraints.push(where('date', '<=', Timestamp.fromDate(toDateVal)));
          constraints.push(orderBy('date', 'desc'));
        } else {
          constraints.push(orderBy('createdAt', 'desc'));
        }

        if (historyStatus !== 'all') {
          if (historyStatus === 'pending') {
            constraints.push(where('status', 'in', ['pending', 'pending_cashier']));
          } else {
            constraints.push(where('status', '==', historyStatus));
          }
        }

        if (historyType !== 'all') {
          constraints.push(where('type', '==', historyType));
        }

        // Removed expensive aggregation queries to prevent "Quota exceeded" (429) errors on Spark plan.
        // We will calculate stats from the fetched documents instead.

        constraints.push(limit(100)); // Limit per department to keep it responsive

        try {
          const snap = await getDocs(query(collection(db, dept.txCollection), ...constraints));
          const docs = snap.docs.map((d) => ({ 
            id: d.id, 
            departmentCode: dept.code, 
            departmentName: dept.label, 
            ...d.data() 
          }));
          
          all.push(...docs);

          // Calculate stats from the fetched slice (compromise for quota)
          docs.forEach((tx: any) => {
            const amt = Number(tx.amount) || 0;
            if (tx.type === 'income') totalIncome += amt;
            else if (tx.type === 'expense') totalExpense += amt;
            totalCount++;
            
            if (dept.code === 'spims') studentsTouched++;
            if (dept.code === 'rehab' || dept.code === 'hospital') patientsTouched++;
            if (dept.code === 'job-center') clientsTouched++;
          });

        } catch (err: any) {
          console.warn(`[HQ Cashier] List fetch failed for ${dept.code}.`, err);
        }
      }

      setHistoryStats({ income: totalIncome, expense: totalExpense, count: totalCount, students: studentsTouched, patients: patientsTouched, clients: clientsTouched });

      all.sort((a, b) => {
        const dateA = toDate(a.transactionDate || a.date || a.createdAt);
        const dateB = toDate(b.transactionDate || b.date || b.createdAt);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      });
      
      setHistoryTxns(all);
      setCached(cacheKey, all, 60); // Cache results for 60s
    } catch (err) {
      console.error('[HQ Cashier] fetchHistory Error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [session, historyDateMode, historyFrom, historyTo, historyStatus, historyType, historyDepartment]);


  const fetchEntityHistory = useCallback(async (entity: any) => {
    if (!entity?.id) return;
    try {
      setEntityHistoryLoading(true);
      
      let list: any[] = [];
      const col = collection(db, activeDepartment.txCollection);

      if (activeDepartment.code === 'spims' && !isStaffMode) {
        // Option A: Fetch both studentId and patientId for SPIMS to ensure no legacy/new data is missed
        const [snap1, snap2] = await Promise.all([
          getDocs(query(col, where('studentId', '==', entity.id), limit(50))),
          getDocs(query(col, where('patientId', '==', entity.id), limit(50)))
        ]);
        
        const map = new Map();
        snap1.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        snap2.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        list = Array.from(map.values());
      } else {
        const q = query(
          col,
          where(isStaffMode ? 'staffId' : (activeDepartment.code === 'welfare' ? 'donorId' : 'patientId'), '==', entity.id),
          limit(50)
        );
        const snap = await getDocs(q);
        list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      // Client-side sort by createdAt desc
      list.sort((a: any, b: any) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });
      
      setEntityHistory(list.slice(0, 50));
    } catch (err) {
      console.error('[HQ Cashier] fetchEntityHistory Error:', err);
    } finally {
      setEntityHistoryLoading(false);
    }
  }, [activeDepartment, isStaffMode]);

  useEffect(() => {
    if (selectedEntity) {
      fetchEntityHistory(selectedEntity);
    } else {
      setEntityHistory([]);
    }
  }, [selectedEntity, fetchEntityHistory]);

  const handleDeleteTransaction = async (tx: any) => {
    const isPermanent = tx.status === 'approved' || tx.status === 'rejected';
    const msg = isPermanent 
      ? 'WARNING: This transaction is already PROCESSED. Deleting it will permanently remove it from the ledger and financial records. Are you ABSOLUTELY SURE?' 
      : 'Are you sure you want to PERMANENTLY DELETE this transaction? This action cannot be undone.';
    
    if (!window.confirm(msg)) return;
    try {
      setProcessing(true);
      const dept = DEPARTMENTS.find(d => d.code === tx.departmentCode) || activeDepartment;
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, dept.txCollection, tx.id));
      
      // If it was a fee payment in SPIMS, we might want to update the fee doc too
      if (tx.departmentCode === 'spims' && tx.feePaymentId) {
        await deleteDoc(doc(db, 'spims_fees', tx.feePaymentId)).catch(() => {});
      }

      toast.success('Transaction permanently deleted from database');
      fetchHistory();
      if (selectedEntity) fetchEntityHistory(selectedEntity);
    } catch (err) {
      console.error(err);
      toast.error('Deletion failed');
    } finally {
      setProcessing(false);
    }
  };

  // ─── 4. Hooks & Effects (Ordered by Dependency) ───────────────────────────

  async function loadCustomCategories() {
    const cacheKey = 'hq_cashier_categories_list';
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      setCustomCategories(cached);
      return;
    }
    try {
      const snap = await getDocs(collection(db, 'hq_cashier_categories'));
      const list = snap.docs.map((d) => ({ id: d.data().slug || d.id, name: d.data().name || 'Custom', appliesTo: d.data().appliesTo || 'both' }));
      setCustomCategories(list as any);
      setCached(cacheKey, list, 600);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    setMounted(true);
    if (sessionLoading) return;
    if (!session || (session.role !== 'cashier' && session.role !== 'superadmin')) {
      router.push('/hq/login');
      return;
    }
    void loadCustomCategories();
    void fetchHistory();
  }, [sessionLoading, session, router, fetchHistory]);

  const subscribeIncoming = useCallback(() => {
    if (!session?.customId) return;
    setIncomingLoading(true);
    setIncomingError(null);
    try {
      const cashierCustomId = String(session.customId || '').trim().toUpperCase();
      let rowsMap: Record<string, any[]> = {};
      DEPARTMENTS.forEach(d => rowsMap[d.txCollection] = []);

      const merge = () => {
        const allTx = DEPARTMENTS.flatMap((dept) =>
          rowsMap[dept.txCollection].map((tx: any) => ({ ...tx, _txCollection: dept.txCollection }))
        );
        
        const visible = allTx.filter((tx: any) => {
          const txCashier = String(tx.cashierId || '').trim().toUpperCase();
          if (!txCashier || txCashier === 'CASHIER') return true;
          return txCashier === cashierCustomId;
        });

        const createdMs = (row: any) => {
          const c = row.createdAt;
          if (!c) return 0;
          if (typeof c.toMillis === 'function') return c.toMillis();
          if (typeof c.seconds === 'number') return c.seconds * 1000;
          return 0;
        };
        visible.sort((a: any, b: any) => createdMs(b) - createdMs(a));
        setIncomingFeeReqs(visible);
        setIncomingLoading(false);
      };

      const onErr = (err: unknown) => {
        console.warn('[HQ Cashier] subscribeIncoming error:', err);
        setIncomingError(
          `${(err as any)?.code || 'error'}: ${(err as any)?.message || 'Failed to load incoming requests.'}`
        );
        setIncomingLoading(false);
      };

      const unsubs = DEPARTMENTS.map(dept => {
        const qDept = query(
          collection(db, dept.txCollection),
          where('status', '==', 'pending_cashier'),
          orderBy('createdAt', 'desc')
        );
        return onSnapshot(
          qDept,
          (snap) => {
            rowsMap[dept.txCollection] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            merge();
          },
          onErr
        );
      });

      return () => {
        unsubs.forEach(u => u());
      };
    } catch (err) {
      console.error('[HQ Cashier] subscribeIncoming setup error:', err);
      setIncomingError('Failed to load incoming requests.');
      setIncomingLoading(false);
    }
  }, [session?.customId]);

  useEffect(() => {
    if (!session?.customId || sessionLoading) return;
    const unsub = subscribeIncoming();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [sessionLoading, session?.customId, subscribeIncoming]);

  function openForwardModal(tx: any) {
    setForwardModalTx(tx);
    setForwardProofFile(null);
    setForwardProofReason('');
    setForwardProofUploading(false);
  }

  function openRejectModal(tx: any) {
    setRejectModalTx(tx);
    setRejectReason('');
    setRejecting(false);
  }

  async function confirmRejectIncoming() {
    if (!rejectModalTx?.id) return;
    if (rejecting) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setMessage({ type: 'error', text: 'Enter a rejection reason.' });
      return;
    }
    setRejecting(true);
    setMessage(null);
    try {
      const dCode = String(rejectModalTx.departmentCode || '').toLowerCase();
      const col = rejectModalTx._txCollection || DEPARTMENTS.find(d => d.code === dCode)?.txCollection || 'rehab_transactions';
      await updateDoc(doc(db, col, rejectModalTx.id), {
        status: 'rejected_cashier',
        cashierRejectedAt: Timestamp.now(),
        cashierRejectedBy: session?.uid,
        cashierRejectedByName: session?.name || session?.displayName || 'HQ Cashier',
        cashierRejectReason: reason,
      });
      if (rejectModalTx.feePaymentId) {
        // Automatically handle fee status for all departments
        const feeCol = col.replace('_transactions', '_fees');
        try {
          await updateDoc(doc(db, feeCol, rejectModalTx.feePaymentId), { status: 'rejected_cashier' });
        } catch (err) {
          console.warn(`[HQ Cashier] could not update linked fee in ${feeCol}:`, err);
        }
      }
      setMessage({ type: 'success', text: 'Request rejected and sent back to admin.' });
      setRejectModalTx(null);
      setRejectReason('');
      await fetchHistory();
    } catch (err: any) {
      console.error('[HQ Cashier] reject error:', err);
      setMessage({ type: 'error', text: `${err?.code || 'error'}: ${err?.message || 'Failed to reject request.'}` });
    } finally {
      setRejecting(false);
    }
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
        proofUrl = await uploadToCloudinary(forwardProofFile, 'Khan Hub/hq/receipts');
      }

      const updatePayload: Record<string, any> = {
        status: 'pending',
        proofRequired: true,
        cashierForwardedAt: Timestamp.now(),
        cashierForwardedBy: session?.uid,
        cashierForwardedByName: session?.name || session?.displayName || 'HQ Cashier',
      };
      if (proofUrl) updatePayload.proofUrl = proofUrl;
      if (!proofUrl && reason) updatePayload.proofMissingReason = reason;

      const dCode = String(forwardModalTx.departmentCode || '').toLowerCase();
      const col = forwardModalTx._txCollection || DEPARTMENTS.find(d => d.code === dCode)?.txCollection || 'rehab_transactions';
      await updateDoc(doc(db, col, txId), updatePayload);

      if (forwardModalTx.feePaymentId && col === 'spims_transactions') {
        await updateDoc(doc(db, 'spims_fees', forwardModalTx.feePaymentId), { status: 'pending' });
      }

      await sendHqPushNotification({
        recipientId: superadminRecipient.customId,
        recipientUid: superadminRecipient.id,
        recipientRole: 'superadmin',
        type: 'tx_forwarded',
        title: 'New Transaction Pending Approval',
        body: `Cashier ${session?.name || 'HQ Cashier'} forwarded a Rs ${Number(forwardModalTx?.amount || 0).toLocaleString()} ${forwardModalTx?.type || 'income'} transaction for approval.`,
        relatedId: txId,
        actionUrl: '/hq/dashboard/superadmin/approvals',
      });

      setMessage({ type: 'success', text: 'Request sent to superadmin approvals.' });
      setForwardModalTx(null);
      setForwardProofFile(null);
      setForwardProofReason('');
      await fetchHistory();
    } catch (err: any) {
      console.error('[HQ Cashier] forward error:', err);
      setMessage({ type: 'error', text: `${err?.code || 'error'}: ${err?.message || 'Failed to forward request.'}` });
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
    
    // CHANGE BEHAVIOR FOR HOSPITAL: Skip automatic fetching of all patients
    if (departmentCode === 'hospital') {
      setAllPatients([]);
      return;
    }

    const run = async () => {
      try {
        const entityCollection = isStaffMode ? 'rehab_staff' : activeDepartment.entityCollection;
        const cacheKey = `cashier_entities_${entityCollection}`;
        const cached = getCached<any[]>(cacheKey);
        
        if (cached) {
          setAllPatients(cached);
          return;
        }

        const snap = await getDocs(query(collection(db, entityCollection), limit(1000))); // Cap at 1000 for safety
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllPatients(data);
        setCached(cacheKey, data, 300); // 5 minute cache
      } catch {
        setAllPatients([]);
      }
    };
    void run();
  }, [session, departmentCode, isStaffMode, activeDepartment.entityCollection]);


  useEffect(() => {
    if (!session) return;
    const loadSuperadminRecipient = async () => {
      const cacheKey = 'hq_superadmin_recipient';
      const cached = getCached<{ id: string; customId: string }>(cacheKey);
      if (cached) {
        setSuperadminRecipient(cached);
        return;
      }

      try {
        const usersSnap = await getDocs(
          query(collection(db, 'hq_users'), where('role', '==', 'superadmin'), limit(1))
        );
        const firstDoc = usersSnap.docs[0];
        if (firstDoc) {
          const data = firstDoc.data();
          const result = { id: firstDoc.id, customId: data.customId || 'SUPERADMIN' };
          setSuperadminRecipient(result);
          setCached(cacheKey, result, 600); // 10 mins
        }
      } catch {
        setSuperadminRecipient({ id: '', customId: 'SUPERADMIN' });
      }
    };
    void loadSuperadminRecipient();
  }, [session]);


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
    if (!selectedEntity && departmentCode !== 'hospital') return setMessage({ type: 'error', text: 'Select account first.' });
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
        proofUrl = await uploadToCloudinary(proofFile, 'Khan Hub/hq/receipts');
      }

      const createPayload: Record<string, any> = {
        type: txnType,
        amount: Number(amount),
        category: selectedCategory.id,
        categoryName: selectedCategory.name,
        departmentCode: activeDepartment.code,
        departmentName: activeDepartment.label,
        ...(isStaffMode
          ? { staffId: selectedEntity?.id, staffName: selectedEntity?.name || selectedEntity?.employeeId || 'Unknown' }
          : departmentCode === 'welfare' 
            ? { 
                donorId: selectedEntity?.id, 
                donorName: selectedEntity?.name || selectedEntity?.fullName || 'Unknown',
                childId: selectedEntity?.linkedChildId || undefined,
                childName: selectedEntity?.linkedChildName || undefined,
                donationScope: selectedEntity?.donationScope || undefined,
                donationType: selectedEntity?.donationType || undefined
              }
            : { 
                patientId: selectedEntity?.id || (departmentCode === 'hospital' ? 'hospital-general' : undefined), 
                studentId: departmentCode === 'spims' ? selectedEntity?.id : undefined,
                patientName: selectedEntity?.name || selectedEntity?.fullName || (departmentCode === 'hospital' ? 'General Hospital Account' : 'Unknown') 
              }),
        description,
        paymentMethod,
        referenceNo,
        status: 'pending',
        cashierId: session?.customId || 'HQ-CASHIER',
        proofRequired: true,
        date: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        transactionDate: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        createdBy: session?.uid,
        createdByName: session?.displayName || session?.name || 'HQ Cashier',
        createdAt: Timestamp.now(),
        ...(departmentCode === 'spims' && selectedCategory.id === 'fee' ? { spimsFeeSubtype } : {}),
      };
      if (proofUrl) createPayload.proofUrl = proofUrl;
      const missingReason = proofReason.trim();
      if (!proofUrl && missingReason) createPayload.proofMissingReason = missingReason;

      if (departmentCode === 'hospital') {
        let hMeta: HospitalTxMeta | undefined;
        if (hospCategory === 'opd_reception') {
          hMeta = {
            shift: hospOpdShift,
            patientName: hospPatientName || 'Unknown',
            guardianName: hospGuardian || undefined,
            age: hospAge || undefined,
            contactNo: hospContact || undefined,
            address: hospAddress || undefined,
            visitTime: hospVisitTime || undefined,
            visitPurpose: hospVisitPurpose || undefined,
          };
        } else if (hospCategory === 'lab_test') {
          hMeta = {
            patientName: hospPatientName || 'Unknown',
            testName: hospTestName || 'Unknown Test',
            testReportResult: hospTestReport || undefined,
            referredBy: hospReferredBy || undefined,
            testCharges: Number(amount),
            testExpense: hospTestExpense ? Number(hospTestExpense) : undefined,
          };
        } else if (hospCategory === 'operation') {
          hMeta = {
            patientName: hospPatientName || 'Unknown',
            operationType: hospOpType || 'Unknown Operation',
            contactNo: hospContact || undefined,
            referredBy: hospReferredBy || undefined,
            admitDate: hospAdmitDate || undefined,
            dischargeDate: hospDischargeDate || undefined,
          };
        }
        if (hMeta) {
          createPayload.hospitalMeta = hMeta;
          createPayload.category = hospCategory;
          createPayload.categoryName = hospCategory.replace('_', ' ').toUpperCase();
        } else {
          // fallback custom category for hospital expenses like staff_salary etc
          createPayload.category = selectedCategory.id;
          createPayload.categoryName = selectedCategory.name;
        }
      }

      const txRef = await addDoc(collection(db, activeDepartment.txCollection), createPayload);

      // CREATE SPIMS FEE DOC IF NEEDED
      if (departmentCode === 'spims' && selectedCategory.id === 'fee' && selectedEntity) {
        console.log('Fetching fees for studentId:', selectedEntity.id);
        await addDoc(collection(db, 'spims_fees'), {
          studentId: selectedEntity.id,
          studentName: selectedEntity.name || selectedEntity.fullName || 'Unknown Student',
          course: selectedEntity.course || 'Unknown Course',
          session: selectedEntity.session || 'Unknown Session',
          date: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
          amount: Number(amount),
          receivedBy: session?.displayName || session?.name || 'HQ Cashier',
          type: spimsFeeSubtype || 'monthly',
          note: description || `Payment via HQ Cashier`,
          status: 'pending', // Match transaction status
          createdBy: session?.uid,
          createdAt: Timestamp.now(),
          linkedTransactionId: txRef.id
        });
      }

      // Handle Fine Reset for Staff Salary
      if (isStaffMode && selectedCategoryId === 'staff_salary' && selectedEntity) {
        const prefix = departmentCode.replace('-', '_');
        const entityCollection = prefix === 'hq' ? 'hq_users' : `${prefix}_staff`;
        
        // Reset staff cycle
        await updateDoc(doc(db, entityCollection, selectedEntity.id), {
          totalFines: 0,
          presentDays: 0, // Reset days as per user request
          lastSalaryPaidAt: Timestamp.now()
        }).catch(err => console.error("Failed to reset staff cycle:", err));

        // Mark individual fines as paid
        try {
          const finesSnap = await getDocs(query(
            collection(db, `${prefix}_fines`),
            where('staffId', '==', selectedEntity.id),
            where('status', '==', 'unpaid')
          ));
          
          for (const fineDoc of finesSnap.docs) {
            await updateDoc(fineDoc.ref, { 
              status: 'paid', 
              paidAt: Timestamp.now(),
              paymentTxId: txRef.id 
            });
          }
        } catch (err) {
          console.error("Failed to mark fines as paid:", err);
        }
      }

      // Notify superadmin of new transaction pending approval
      void sendHqPushNotification({
        recipientId: superadminRecipient.customId,
        recipientUid: superadminRecipient.id,
        recipientRole: 'superadmin',
        type: 'tx_forwarded',
        title: 'New Transaction Submitted',
        body: `${session?.name || 'Cashier'} submitted a Rs ${Number(amount).toLocaleString()} transaction for ${selectedEntity?.name || 'General Hospital'}.`,
        relatedId: txRef.id,
        actionUrl: '/hq/dashboard/superadmin/approvals',
      });

      setMessage({ type: 'success', text: 'Amount Submitted Successfully!' });
      toast.success('Amount Submitted Successfully!');
      
      // Clear all fields
      setSelectedEntity(null);
      setAmount('');
      setDescription('');
      setReferenceNo('');
      setProofFile(null);
      setProofReason('');
      setCategorySearch('');
      setSearchQuery('');
      setEntityResults([]);
      
      // Clear Hospital fields if any
      setHospPatientName('');
      setHospGuardian('');
      setHospAge('');
      setHospContact('');
      setHospAddress('');
      setHospReferredBy('');
      setHospTestName('');
      setHospTestReport('');
      setHospTestExpense('');
      setHospOpType('');
      setHospAdmitDate('');
      setHospDischargeDate('');
      setHospVisitPurpose('');

      setProofUploading(false);
      await fetchHistory();
    } catch (err: any) {
      console.error('[HQ Cashier] submitTx error:', err);
      setMessage({ type: 'error', text: `${err?.code || 'error'}: ${err?.message || 'Failed to submit transaction.'}` });
    } finally {
      setProcessing(false);
      setProofUploading(false);
    }
  }

  const todayStr = getLocalDateString(new Date());
  
  // Client-side filtering as fallback/refinement
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxns = historyTxns.filter(t => t.date === today && t.status !== 'pending_cashier');
    
    const revenue = todayTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expense = todayTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const deptCounts: Record<string, number> = {};
    todayTxns.forEach(t => {
      deptCounts[t.departmentCode] = (deptCounts[t.departmentCode] || 0) + 1;
    });
    
    const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    setIntelStats({
      todayRevenue: revenue,
      todayExpense: expense,
      pendingCount: incomingFeeReqs.length,
      topDept
    });
  }, [historyTxns, incomingFeeReqs]);

  // historyFiltered now handles both base filtering and duplicate analysis

  const totals = useMemo(() => {
    // We use historyStats if we just fetched, otherwise calculate from historyFiltered
    if (historyStats.count > 0 && historyFiltered.length === historyTxns.length) {
      return { income: historyStats.income, expense: historyStats.expense, net: historyStats.income - historyStats.expense };
    }
    const income = historyFiltered.filter((x) => x.type === 'income').reduce((s, x) => s + Number(x.amount || 0), 0);
    const expense = historyFiltered.filter((x) => x.type === 'expense').reduce((s, x) => s + Number(x.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [historyFiltered, historyStats, historyTxns.length]);

  if (sessionLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] py-16 transition-colors duration-500">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-16">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/20">
              <CreditCard className="text-white" size={40} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-zinc-900 uppercase leading-none">Cashier Terminal</h1>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic pl-1">
                Central Financial Gateway • Secure Transaction Hub
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {[
              { href: "/hq/dashboard/cashier/history", icon: History, label: "History" },
              { href: "/hq/dashboard/cashier/daily-report", icon: LayoutDashboard, label: "Daily Sheet" },
              { href: "/hq/dashboard/cashier/reconciliation", icon: ShieldCheck, label: "Audit" }
            ].map(link => (
              <Link 
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 px-6 py-4 bg-white hover:bg-indigo-600 hover:text-white rounded-2xl border border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-900 transition-all active:scale-95 shadow-xl shadow-zinc-200/50"
              >
                <link.icon size={16} />
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            ))}
            <Link 
              href="/hq/dashboard/cashier/day-close"
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
            >
              <Lock size={16} />
              <span className="hidden lg:inline">Terminal Lock</span>
            </Link>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-12 min-w-0">
          <div className="bg-white rounded-[3rem] p-10 border border-zinc-100 shadow-2xl shadow-zinc-200/50 h-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Queue</h2>
              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                {incomingFeeReqs.length} Pending
              </div>
            </div>
            
            {incomingError ? (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                {incomingError}
              </div>
            ) : null}

            {incomingLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-300" />
              </div>
            ) : incomingFeeReqs.length === 0 ? (
              <div className="py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                  <FileText className="text-gray-300" size={32} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Queue is clear</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                {incomingFeeReqs.map((tx, index) => (
                  <div 
                    key={tx.id} 
                    onClick={() => setDetailModalTx(tx)}
                    className="group cursor-pointer bg-zinc-50 border border-transparent hover:border-indigo-100 rounded-[2.5rem] p-8 transition-all hover:shadow-2xl hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs">
                          {String(tx.patientName || tx.donorName || '?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate max-w-[120px]">
                            {tx.patientName || tx.donorName || 'Entity'}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {tx.departmentCode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-zinc-900 tracking-tighter">Rs {Number(tx.amount || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        disabled={incomingActionId === tx.id}
                        onClick={(e) => { e.stopPropagation(); openForwardModal(tx); }}
                        className="w-full h-12 rounded-[1.2rem] bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                      >
                        {incomingActionId === tx.id ? <Loader2 size={14} className="animate-spin" /> : 'Authorize'}
                      </button>
                      <button
                        type="button"
                        disabled={incomingActionId === tx.id}
                        onClick={(e) => { e.stopPropagation(); openRejectModal(tx); }}
                        className="w-full h-12 rounded-[1.2rem] bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Statistics */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-emerald-500 rounded-[3rem] p-8 shadow-2xl shadow-emerald-500/20 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-4">
                <TrendingUp size={24} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Revenue</p>
              <p className="text-xl font-black text-white">Rs {totals.income.toLocaleString()}</p>
            </div>
            <div className="bg-rose-500 rounded-[3rem] p-8 shadow-2xl shadow-rose-500/20 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-4">
                <TrendingDown size={24} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Payouts</p>
              <p className="text-xl font-black text-white">Rs {totals.expense.toLocaleString()}</p>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-2xl shadow-zinc-200/50">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 flex items-center gap-3">
              <Search size={16} strokeWidth={4} /> {isStaffMode ? 'Fleet Directory' : 'Global Accounts'}
            </h2>
            <div className="space-y-6">
              <select 
                value={departmentCode} 
                onChange={(e) => setDepartmentCode(e.target.value)} 
                className="w-full h-14 bg-zinc-50 border border-transparent rounded-[1.5rem] px-6 text-zinc-900 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
              >
                {DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
              
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-zinc-900 transition-colors" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setSearchOpen(true)}
                  placeholder="Search by name or ID..."
                  className="w-full h-14 bg-zinc-50 border border-transparent rounded-[1.5rem] pl-16 pr-12 text-zinc-900 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {searchOpen && searchResults.length > 0 && (
                <div className="bg-white border border-zinc-100 rounded-[2rem] shadow-2xl mt-4 overflow-hidden divide-y divide-zinc-50">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={async () => {
                         if (isStaffMode) {
                           const prefix = departmentCode.replace('-', '_');
                           const finesSnap = await getDocs(query(
                             collection(db, `${prefix}_fines`),
                             where('staffId', '==', p.id),
                             where('status', '==', 'unpaid')
                           ));
                           const totalFines = finesSnap.docs.reduce((acc, doc) => acc + (Number(doc.data().amount) || 0), 0);
                           const baseSalary = Number(p.monthlySalary || 0);
                           const daysPresent = Number(p.presentDays || 0);
                           const perDay = baseSalary / 30;
                           const calculatedSalary = Math.round(perDay * daysPresent);
                           const net = Math.max(0, calculatedSalary - totalFines);
                           setSelectedEntity({ ...p, totalFines, calculatedSalary, daysPresent });
                           setAmount(String(net));
                           setDescription(`Salary payment for ${p.name || p.employeeId}. Days Present: ${daysPresent}, Base: Rs ${baseSalary.toLocaleString()}, Calculated: Rs ${calculatedSalary.toLocaleString()}, Fines Deducted: Rs ${totalFines.toLocaleString()}`);
                         } else {
                           setSelectedEntity(p);
                         }
                         setEntityResults([p]);
                         setSearchQuery(p.name || p.fullName || p.patientId || p.studentId || p.id);
                         setSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-6 py-5 hover:bg-zinc-50 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-black text-xs shrink-0">
                        {String(p.name || p.fullName || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-zinc-900 text-sm font-black truncate">{p.name || p.fullName || 'Unknown'}</p>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest truncate">
                          {p.patientId || p.studentId || p.customId || p.employeeId || p.rollNumber || p.id}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 min-w-0 space-y-12">
          <div className="bg-white rounded-[3.5rem] border border-zinc-100 p-10 shadow-2xl shadow-zinc-200/50">
            <form onSubmit={submitTx} className="space-y-10">
              <div className="p-10 rounded-[3rem] bg-zinc-900 text-white min-w-0 shadow-2xl shadow-zinc-900/20 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center gap-8">
                    {selectedEntity && (
                      <div className="w-20 h-20 rounded-[2rem] bg-white/10 flex items-center justify-center text-3xl font-black border border-white/20 shadow-inner group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                        {selectedEntity.photoUrl ? (
                          <img src={selectedEntity.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(selectedEntity.name || selectedEntity.fullName || '?')[0]?.toUpperCase()}</span>
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">
                        {selectedEntity ? 'Verified Account Identity' : departmentCode === 'hospital' ? 'General Hospital Stream' : 'Account Identity Required'}
                      </p>
                      <div className="flex flex-col">
                        <p className="text-3xl sm:text-4xl font-[1000] tracking-tighter truncate leading-none">
                          {selectedEntity ? (selectedEntity.name || selectedEntity.fullName) : departmentCode === 'hospital' ? 'General Hospital Account' : 'Select identity...'}
                        </p>
                        {selectedEntity && (
                          <p className="text-[11px] font-black opacity-60 uppercase tracking-widest mt-3">
                            ID: {selectedEntity.patientId || selectedEntity.studentId || selectedEntity.employeeId || selectedEntity.customId || 'N/A'} • {activeDepartment.label}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {selectedEntity && (
                      <Link 
                        href={getProfileLink(selectedEntity) || '#'}
                        target="_blank"
                        className="h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 flex items-center gap-2 hover:-translate-y-1"
                      >
                        <Eye size={16} /> Profile
                      </Link>
                    )}
                    {selectedEntity && (
                      <button 
                        type="button" 
                        onClick={() => { setSelectedEntity(null); setAmount(''); }} 
                        className="h-14 w-14 rounded-2xl bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white transition-all border border-rose-500/20 flex items-center justify-center"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>
                
                {selectedEntity && isStaffMode && (
                  <div className="mt-8 p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      <div>
                        <span className="text-[9px] font-black uppercase opacity-40 tracking-widest block mb-2">Days Present</span>
                        <span className="text-xl font-black">{selectedEntity.daysPresent || 0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase opacity-40 tracking-widest block mb-2">Pro-rated</span>
                        <span className="text-xl font-black">Rs {Number(selectedEntity.calculatedSalary || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase opacity-40 tracking-widest block mb-2">Fines</span>
                        <span className="text-xl font-black text-rose-400">Rs {Number(selectedEntity.totalFines || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase opacity-40 tracking-widest block mb-2">Net Payable</span>
                        <span className="text-2xl font-[1000] text-emerald-400">Rs {(Number(selectedEntity.calculatedSalary || 0) - Number(selectedEntity.totalFines || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedEntity && (
                  <div className="mt-10 bg-white rounded-[2.5rem] p-10 shadow-2xl text-zinc-900">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-xs font-[1000] uppercase tracking-[0.3em] text-zinc-900 flex items-center gap-3">
                        <History size={18} /> Account Ledger
                      </h4>
                      {entityHistoryLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
                    </div>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4 -mr-4">
                      {entityHistory.length === 0 ? (
                        <div className="py-12 text-center">
                          <History size={32} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">No previous history found for this account.</p>
                        </div>
                      ) : entityHistory.map((tx: any) => (
                        <div 
                          key={tx.id} 
                          onClick={() => setDetailModalTx({ ...tx, departmentCode: activeDepartment.code })}
                          className="flex items-center justify-between p-5 rounded-[1.5rem] bg-zinc-50 hover:bg-zinc-100 transition-all border border-transparent hover:border-zinc-200 group relative cursor-pointer"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-sm font-black text-zinc-900 truncate uppercase">{tx.categoryName || tx.category}</p>
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                tx.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                tx.status === 'rejected' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                "bg-amber-50 text-amber-600 border-amber-100"
                              )}>
                                {tx.status || 'pending'}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDateDMY(tx.date || tx.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className={cn('text-sm font-[1000]', tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500')}>
                              {tx.type === 'income' ? '+' : '-'} {Number(tx.amount || 0).toLocaleString()}
                            </p>
                            {(tx.status === 'pending' || tx.status === 'pending_cashier' || !tx.status) && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDeleteTransaction({ ...tx, departmentCode: activeDepartment.code }); 
                                }}
                                className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Pending Transaction"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button 
                  type="button" 
                  onClick={() => setTxnType('income')} 
                  className={cn(
                    'p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group',
                    txnType === 'income' 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-500/5' 
                      : 'border-zinc-100 bg-white text-gray-400 hover:text-zinc-900 hover:bg-zinc-50'
                  )}
                >
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110',
                    txnType === 'income' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-zinc-100 text-gray-400'
                  )}>
                    <TrendingUp size={28} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Payment Receipt</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setTxnType('expense')} 
                  className={cn(
                    'p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 group',
                    txnType === 'expense' 
                      ? 'border-rose-500 bg-rose-50 text-rose-600 ring-4 ring-rose-500/5' 
                      : 'border-zinc-100 bg-white text-gray-400 hover:text-zinc-900 hover:bg-zinc-50'
                  )}
                >
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110',
                    txnType === 'expense' ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-zinc-100 text-gray-400'
                  )}>
                    <TrendingDown size={28} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Payment Disbursement</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Classification</label>
                    <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-zinc-900 transition-colors" size={18} />
                      <input 
                         value={categorySearch} 
                         onChange={(e) => setCategorySearch(e.target.value)} 
                         placeholder="Search or define new field..." 
                         className="w-full h-14 bg-zinc-50 border border-transparent rounded-[1.5rem] pl-16 pr-6 text-zinc-900 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" 
                      />
                    </div>
                    <div className="mt-4 bg-zinc-50 rounded-[2rem] p-3 border border-zinc-100 shadow-inner">
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {visibleCategories.map((c) => (
                          <button 
                            key={c.id} 
                            type="button" 
                            onClick={() => setSelectedCategoryId(c.id)} 
                            className={cn(
                              'px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all text-center', 
                              selectedCategoryId === c.id 
                                ? 'bg-zinc-900 text-white shadow-lg' 
                                : 'text-gray-500 hover:text-zinc-900 hover:bg-zinc-100'
                            )}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                      {visibleCategories.length === 0 && categorySearch.trim() && (
                        <button type="button" onClick={createCategory} className="w-full mt-2 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">
                          Create "{categorySearch.trim()}"
                        </button>
                      )}
                    </div>
                  </div>

                  {departmentCode === 'spims' && selectedCategoryId === 'fee' && (
                    <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Academic Fee Context</label>
                      <select
                        value={spimsFeeSubtype}
                        onChange={(e) => setSpimsFeeSubtype(e.target.value as any)}
                        className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-4 text-zinc-900 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="admission">Admission Fee</option>
                        <option value="registration">Registration Fee</option>
                        <option value="examination">Examination Fee</option>
                        <option value="monthly">Monthly Tuition</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-8">
                  {departmentCode === 'hospital' && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-8 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Service Category</label>
                        <select 
                          value={hospCategory} 
                          onChange={(e) => setHospCategory(e.target.value as any)} 
                          className="w-full h-14 bg-white border border-zinc-100 rounded-2xl px-6 text-zinc-900 text-sm font-black outline-none focus:ring-4 focus:ring-emerald-500/10"
                        >
                          <option value="opd_reception">OPD Reception</option>
                          <option value="lab_test">Lab Test</option>
                          <option value="operation">Operation/Surgery</option>
                          <option value="staff_salary">Staff Salary</option>
                          <option value="utilities">Utilities</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="other_income">Other Income</option>
                          <option value="other_expense">Other Expense</option>
                        </select>
                      </div>

                      {['opd_reception', 'lab_test', 'operation'].includes(hospCategory) && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                          <input type="text" value={hospPatientName} onChange={e => setHospPatientName(e.target.value)} placeholder="Patient Name" className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm text-zinc-900 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10" />
                          <input type="text" value={hospGuardian} onChange={e => setHospGuardian(e.target.value)} placeholder="Guardian Name" className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm text-zinc-900 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10" />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={hospAge} onChange={e => setHospAge(e.target.value)} placeholder="Age" className="h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm text-zinc-900 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10" />
                            <input type="text" value={hospContact} onChange={e => setHospContact(e.target.value)} placeholder="Contact No" className="h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm text-zinc-900 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10" />
                          </div>
                          
                          {hospCategory === 'opd_reception' && (
                            <div className="grid grid-cols-2 gap-4">
                              <select value={hospOpdShift} onChange={(e) => setHospOpdShift(e.target.value as any)} className="h-12 bg-white border border-zinc-100 rounded-xl px-4 text-xs font-black uppercase">
                                <option value="morning">Morning</option>
                                <option value="evening">Evening</option>
                              </select>
                              <input type="text" value={hospVisitPurpose} onChange={e => setHospVisitPurpose(e.target.value)} placeholder="Visit Purpose" className="h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm text-zinc-900 font-bold outline-none" />
                            </div>
                          )}

                          {hospCategory === 'lab_test' && (
                            <div className="space-y-4">
                              <input type="text" value={hospTestName} onChange={e => setHospTestName(e.target.value)} placeholder="Test Name" className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm font-bold outline-none" />
                              <input type="text" value={hospReferredBy} onChange={e => setHospReferredBy(e.target.value)} placeholder="Referred By" className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm font-bold outline-none" />
                            </div>
                          )}

                          {hospCategory === 'operation' && (
                            <div className="space-y-4">
                              <input type="text" value={hospOpType} onChange={e => setHospOpType(e.target.value)} placeholder="Surgery Type" className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-6 text-sm font-bold outline-none" />
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase text-emerald-500 ml-2">Admit</label>
                                  <input type="date" value={hospAdmitDate} onChange={e => setHospAdmitDate(e.target.value)} className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-4 text-xs font-black" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase text-emerald-500 ml-2">Discharge</label>
                                  <input type="date" value={hospDischargeDate} onChange={e => setHospDischargeDate(e.target.value)} className="w-full h-12 bg-white border border-zinc-100 rounded-xl px-4 text-xs font-black" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Currency Amount (PKR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-2 w-full h-24 bg-zinc-50 border border-transparent rounded-[2rem] px-10 text-5xl font-[1000] text-zinc-900 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-inner tracking-tighter placeholder:text-gray-200"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Processing Date</label>
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          className="w-full h-14 bg-zinc-50 border border-transparent rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Liquidity Channel</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full h-14 bg-zinc-50 border border-transparent rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="jazzcash">JazzCash</option>
                          <option value="easypaisa">EasyPaisa</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">External Reference (Optional)</label>
                      <input 
                        value={referenceNo} 
                        onChange={(e) => setReferenceNo(e.target.value)} 
                        placeholder="Cheque #, Bank ID, etc." 
                        className="w-full h-14 bg-zinc-50 border border-transparent rounded-2xl px-6 text-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Verification Audit</label>
                        <div className="relative group h-full">
                          <input
                            type="file"
                            accept="image/webp,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.type.startsWith('image/') && file.type !== 'image/webp') {
                                toast.error("Only .webp images are allowed");
                                e.target.value = '';
                                return;
                              }
                              setProofFile(file || null);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={processing}
                          />
                          <div className="h-full min-h-[120px] bg-zinc-50 border-2 border-dashed border-zinc-100 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                              <Camera size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 truncate max-w-[200px]">
                              {proofFile ? proofFile.name : "Secure Proof Upload"}
                            </span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase mt-2">WEBP or PDF</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Exception Reason</label>
                        <textarea
                          value={proofReason}
                          onChange={(e) => setProofReason(e.target.value)}
                          placeholder="Why is proof missing?"
                          className="w-full h-full min-h-[120px] bg-zinc-50 border border-transparent rounded-[2rem] px-6 py-6 text-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                          disabled={processing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Administrative Notes</label>
                      <textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Narrative description of transaction purpose..." 
                        className="w-full min-h-[120px] bg-zinc-50 border border-transparent rounded-[2rem] px-8 py-8 text-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {message && (
                <div className={cn(
                  'p-6 rounded-[2rem] border flex items-center gap-4 animate-in fade-in slide-in-from-top-2', 
                  message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                )}>
                  {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  <p className="text-sm font-black uppercase tracking-tight">{message.text}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={processing || (!selectedEntity && departmentCode !== 'hospital')} 
                className="w-full h-20 bg-indigo-600 hover:bg-zinc-900 active:scale-[0.98] text-white font-black text-xs uppercase tracking-[0.4em] rounded-[2rem] transition-all shadow-2xl shadow-indigo-600/20 disabled:opacity-30 flex items-center justify-center gap-6"
              >
                {processing ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    <span>Synchronizing Ledger...</span>
                  </>
                ) : (
                  <>
                    Finalize Entry <ArrowRight size={24} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="w-full mt-24">
        <div className="max-w-[1600px] mx-auto px-4 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-zinc-900/20">
                <History size={32} />
              </div>
              <div>
                <h2 className="text-4xl sm:text-6xl font-[1000] text-zinc-900 uppercase tracking-tight leading-none">Journal Log</h2>
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mt-3 ml-1">Universal Financial Stream</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button 
                type="button" 
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                className={cn(
                  "h-14 flex items-center gap-3 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border",
                  showDuplicatesOnly 
                    ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" 
                    : "bg-white border-zinc-100 text-zinc-900 hover:bg-zinc-50"
                )}
              >
                <RefreshCw size={16} className={cn(showDuplicatesOnly && "animate-pulse")} />
                {showDuplicatesOnly ? 'Isolating Clones' : 'Audit Duplicates'}
              </button>
              <button 
                type="button" 
                onClick={() => void fetchHistory()} 
                disabled={historyLoading}
                className="h-14 flex items-center gap-3 px-8 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
              >
                <RefreshCw size={16} className={cn(historyLoading && 'animate-spin')} />
                {historyLoading ? 'Syncing...' : 'Sync Records'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 animate-in fade-in slide-in-from-top-8 duration-1000 delay-200">
            <div className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Total Inbound</p>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
              </div>
              <h4 className="text-3xl font-[1000] text-zinc-900 tracking-tighter">Rs {intelStats.todayRevenue.toLocaleString()}</h4>
              <div className="mt-4 h-1 w-12 bg-emerald-500 rounded-full group-hover:w-full transition-all duration-700" />
            </div>

            <div className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Total Outbound</p>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <TrendingDown size={18} />
                </div>
              </div>
              <h4 className="text-3xl font-[1000] text-zinc-900 tracking-tighter">Rs {intelStats.todayExpense.toLocaleString()}</h4>
              <div className="mt-4 h-1 w-12 bg-rose-500 rounded-full group-hover:w-full transition-all duration-700" />
            </div>

            <div className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Pending Review</p>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Clock size={18} />
                </div>
              </div>
              <h4 className="text-3xl font-[1000] text-zinc-900 tracking-tighter">{incomingFeeReqs.length} Units</h4>
              <div className="mt-4 h-1 w-12 bg-amber-500 rounded-full group-hover:w-full transition-all duration-700" />
            </div>

            <div className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 group hover:translate-y-[-4px] transition-all">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Top Velocity</p>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Activity size={18} />
                </div>
              </div>
              <h4 className="text-3xl font-[1000] text-zinc-900 uppercase tracking-tighter">{intelStats.topDept}</h4>
              <div className="mt-4 h-1 w-12 bg-indigo-500 rounded-full group-hover:w-full transition-all duration-700" />
            </div>
          </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Temporal Filter</label>
            <select value={historyDateMode} onChange={(e) => setHistoryDateMode(e.target.value as DateMode)} className="w-full h-14 bg-white border border-zinc-100 rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
              <option value="today">Daily Active: Today</option>
              <option value="created_today">Entry Point: Today</option>
              <option value="range">Custom Matrix Range</option>
              <option value="all">Full Temporal Log</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Verification State</label>
            <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value as StatusFilter)} className="w-full h-14 bg-white border border-zinc-100 rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
              <option value="all">All Assertions</option>
              <option value="pending">Awaiting Validation</option>
              <option value="approved">Verified / Success</option>
              <option value="rejected">Denied / Error</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Flow Vector</label>
            <select value={historyType} onChange={(e) => setHistoryType(e.target.value as any)} className="w-full h-14 bg-white border border-zinc-100 rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
              <option value="all">Bi-Directional</option>
              <option value="income">Inbound (Credit)</option>
              <option value="expense">Outbound (Debit)</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Department Node</label>
            <select value={historyDepartment} onChange={(e) => setHistoryDepartment(e.target.value)} className="w-full h-14 bg-white border border-zinc-100 rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm">
              <option value="all">All Entry Points</option>
              {DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
            </select>
          </div>
        </div>

        {historyDateMode === 'range' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-in slide-in-from-top-4 duration-500">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">Start Coordinates</label>
              <input
                type="date"
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="w-full h-14 bg-white border border-zinc-100 rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-4">End Coordinates</label>
              <input
                type="date"
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="w-full h-14 bg-white border border-zinc-100 rounded-2xl px-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-8 shadow-sm group">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-4">Total Credits</p>
            <p className="text-3xl font-[1000] text-zinc-900">Rs {totals.income.toLocaleString()}</p>
            <div className="mt-4 h-1 w-8 bg-emerald-500 rounded-full group-hover:w-full transition-all duration-500" />
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8 shadow-sm group">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 mb-4">Total Debits</p>
            <p className="text-3xl font-[1000] text-zinc-900">Rs {totals.expense.toLocaleString()}</p>
            <div className="mt-4 h-1 w-8 bg-rose-500 rounded-full group-hover:w-full transition-all duration-500" />
          </div>
          <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm group">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4">Record Count</p>
            <p className="text-3xl font-[1000] text-zinc-900">{historyStats.count || historyFiltered.length}</p>
            <div className="mt-4 h-1 w-8 bg-zinc-400 rounded-full group-hover:w-full transition-all duration-500" />
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 shadow-sm group">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-4">Net Liquidity</p>
            <p className="text-3xl font-[1000] text-zinc-900">Rs {totals.net.toLocaleString()}</p>
            <div className="mt-4 h-1 w-8 bg-indigo-600 rounded-full group-hover:w-full transition-all duration-500" />
          </div>
        </div>

        {historyDateMode === 'range' && historyFiltered.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16 animate-in fade-in slide-in-from-top-8 duration-1000">
            <div className="bg-white border border-zinc-100 rounded-[3rem] p-10 shadow-2xl shadow-zinc-200/50 backdrop-blur-xl">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                  <Activity size={28} />
                </div>
                <h3 className="text-2xl font-[1000] uppercase tracking-tight text-zinc-900">Matrix Insights</h3>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center py-4 border-b border-zinc-100">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Mean Transaction</span>
                  <span className="text-xl font-black text-zinc-900">Rs {Math.round(totals.income / (historyFiltered.filter(t => t.type === 'income').length || 1)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-zinc-100">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Peak Inflow</span>
                  <span className="text-xl font-black text-emerald-500">Rs {Math.max(...historyFiltered.filter(t => t.type === 'income').map(t => Number(t.amount || 0)), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-4">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Unique Entities</span>
                  <span className="text-xl font-black text-zinc-900">{new Set(historyFiltered.map(t => t.patientId || t.staffId || t.donorId)).size} Identities</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-[3rem] p-10 shadow-2xl shadow-zinc-900/20 group overflow-hidden relative">
              <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-14 h-14 bg-white text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-2xl font-[1000] uppercase tracking-tight text-white">Audit Protocol</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg", historyFiltered.filter(t => !t.proofUrl && !t.proofMissingReason).length > 0 ? "bg-rose-500 text-white" : "bg-emerald-500 text-white")}>
                      {historyFiltered.filter(t => !t.proofUrl && !t.proofMissingReason).length > 0 ? <X size={20} /> : <Check size={20} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Compliance Factor</p>
                      <p className="text-lg font-black text-white">
                        {historyFiltered.filter(t => !t.proofUrl && !t.proofMissingReason).length > 0 
                          ? `${historyFiltered.filter(t => !t.proofUrl && !t.proofMissingReason).length} Items Non-Compliant` 
                          : 'Full Regulatory Integrity'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
                      <History size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Clone Detection</p>
                      <p className="text-lg font-black text-white">
                        {historyFiltered.filter((tx1, idx1) => historyFiltered.some((tx2, idx2) => idx1 !== idx2 && tx1.amount === tx2.amount && (tx1.date || tx1.createdAt) === (tx2.date || tx2.createdAt) && (tx1.patientId || tx1.staffId) === (tx2.patientId || tx2.staffId))).length} flaggable entries
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 md:hidden">
          {historyLoading ? (
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-zinc-200/60 border border-zinc-100 mb-16 relative overflow-hidden">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6 text-gray-400 text-center">Retrieving Stream...</p>
            </div>
          ) : historyFiltered.length === 0 ? (
            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] p-12 border border-black/5 dark:border-white/5 text-center shadow-xl">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No matching records found</p>
            </div>
          ) : historyFiltered.map((tx) => (
            <div key={tx.id} onClick={() => setDetailModalTx(tx)} className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-xl active:scale-[0.98] transition-all group">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-lg font-black text-black dark:text-white truncate group-hover:text-primary transition-colors">{tx.patientName || tx.staffName || 'General Tx'}</div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black rounded-md">{tx.departmentCode}</span>
                    <span>{tx.categoryName || tx.category}</span>
                  </div>
                </div>
                <div className={cn('text-xl font-[1000] shrink-0 tracking-tighter', tx.type === 'income' ? 'text-black dark:text-white' : 'text-rose-500')}>
                  {tx.type === 'income' ? '+' : '-'} {Number(tx.amount || 0).toLocaleString()}
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <span className={cn('px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all', 
                  tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                  tx.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                  'bg-gray-500/10 text-gray-500 border-gray-500/20'
                )}>
                  {tx.status || 'pending'}
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-white rounded-[3.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 overflow-hidden mb-24">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 h-24">
                <th className="px-10 text-left text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Time-Stamp</th>
                <th className="px-10 text-left text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Identity Nodes</th>
                <th className="px-10 text-left text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Class</th>
                <th className="px-10 text-right text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Flow</th>
                <th className="px-10 text-right text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Financial Ledger...</p>
                      </div>
                    </td>
                  </tr>
                ) : historyFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center text-sm font-black text-gray-400 uppercase tracking-[0.3em]">No matrix entries found for this query context.</td>
                  </tr>
                ) : historyFiltered.map((tx: any) => (
                  <tr key={tx.id} onClick={() => setDetailModalTx(tx)} className="hover:bg-zinc-50 transition-all cursor-pointer group h-24">
                    <td className="px-10 py-6 text-xs font-black text-zinc-900 tabular-nums">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</td>
                    <td className="px-10 py-6">
                      <div className="text-base font-[1000] text-zinc-900 group-hover:text-indigo-600 transition-colors">{tx.patientName || tx.staffName || 'General Account'}</div>
                      <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase mt-1.5">{tx.id?.slice(0, 16)}</div>
                    </td>
                    <td className="px-10 py-6 text-xs font-black text-gray-500 uppercase tracking-widest">{tx.categoryName || tx.category}</td>
                    <td className="px-10 py-6 text-right">
                        <div className={cn('text-xl font-[1000] tracking-tighter tabular-nums', tx.type === 'income' ? 'text-zinc-900' : 'text-rose-500')}>
                          {tx.type === 'income' ? '+' : '-'} {Number(tx.amount || 0).toLocaleString()}
                        </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-6">
                        <span className={cn('px-4 py-1.5 rounded-xl text-[9px] font-[1000] uppercase tracking-[0.2em] border transition-all', 
                          tx.status === 'approved' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 
                          tx.status === 'rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                          'bg-zinc-50 text-zinc-500 border-zinc-100'
                        )}>
                          {tx.status || 'pending'}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx); }}
                          className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                          title="Purge Transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
      {forwardModalTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#FCFBF8]/80 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-xl bg-white border border-zinc-100 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-indigo-600/10 transition-all">
            <div className="bg-indigo-600 px-10 py-10 flex items-center justify-between text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="relative z-10">
                <h3 className="text-2xl font-[1000] uppercase tracking-tighter">Auth Protocol</h3>
                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.4em] mt-2">
                  Commitment Hash: {forwardModalTx.id?.slice(0, 16)}
                </p>
              </div>
              <button
                type="button"
                disabled={forwardProofUploading}
                onClick={() => setForwardModalTx(null)}
                className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-md relative z-10"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex justify-between items-center group">
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em]">Quantum Magnitude</span>
                <span className="text-2xl font-[1000] text-indigo-600">Rs {Number(forwardModalTx.amount || 0).toLocaleString()}</span>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 px-2">Validation Evidence (IMG/PDF)</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/webp,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.type.startsWith('image/') && file.type !== 'image/webp') {
                        toast.error("Only .webp images are allowed");
                        e.target.value = '';
                        return;
                      }
                      setForwardProofFile(file || null);
                    }}
                    className="w-full opacity-0 absolute inset-0 cursor-pointer z-10"
                    disabled={forwardProofUploading}
                  />
                  <div className="w-full bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2rem] px-8 py-10 text-center transition-all group-hover:border-indigo-500 group-hover:bg-indigo-500/5">
                    <p className="text-sm font-[1000] text-zinc-900 transition-colors group-hover:text-indigo-600">
                      {forwardProofFile ? forwardProofFile.name : 'Inject Proof Matrix'}
                    </p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-3">Maximum Payload: 5MB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 px-2">
                  Compliance Annotation
                </label>
                <textarea
                  value={forwardProofReason}
                  onChange={(e) => setForwardProofReason(e.target.value)}
                  placeholder="Justify this commit for administrative audit..."
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] px-8 py-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
                  disabled={forwardProofUploading}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setForwardModalTx(null)}
                  disabled={forwardProofUploading}
                  className="flex-1 h-16 rounded-[1.5rem] bg-zinc-100 text-zinc-900 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all"
                >
                  Abort
                </button>
                <button
                  type="button"
                  onClick={() => void confirmForwardToSuperadmin()}
                  disabled={forwardProofUploading}
                  className="flex-1 h-16 rounded-[1.5rem] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {forwardProofUploading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Authorize & Commit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectModalTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#FCFBF8]/80 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-xl bg-white border border-zinc-100 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-rose-600/10 transition-all">
            <div className="bg-rose-600 px-10 py-10 flex items-center justify-between text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="relative z-10">
                <h3 className="text-2xl font-[1000] uppercase tracking-tighter">Denial Protocol</h3>
                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.4em] mt-2">
                  Incident Ref: {rejectModalTx.id?.slice(0, 16)}
                </p>
              </div>
              <button
                type="button"
                disabled={rejecting}
                onClick={() => setRejectModalTx(null)}
                className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-md relative z-10"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-rose-500 tracking-[0.3em]">Denied Magnitude</span>
                <span className="text-2xl font-[1000] text-rose-600">Rs {Number(rejectModalTx.amount || 0).toLocaleString()}</span>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 px-2">Basis for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State the regulatory or operational conflict..."
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] px-8 py-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 min-h-[150px] resize-none transition-all placeholder:text-gray-400"
                  disabled={rejecting}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setRejectModalTx(null)}
                  disabled={rejecting}
                  className="flex-1 h-16 rounded-[1.5rem] bg-zinc-100 text-zinc-900 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmRejectIncoming()}
                  disabled={rejecting}
                  className="flex-1 h-16 rounded-[1.5rem] bg-rose-600 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-700 shadow-xl shadow-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {rejecting ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Confirm Denial'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailModalTx && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#FCFBF8]/80 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-xl bg-white border border-zinc-100 rounded-[4rem] overflow-hidden shadow-2xl shadow-indigo-600/10">
            <div className="relative p-12">
              <button 
                onClick={() => setDetailModalTx(null)}
                className="absolute top-10 right-10 w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all group"
              >
                <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
              </button>

              <div className="flex flex-col items-center text-center mb-12">
                <div className="w-24 h-24 bg-black dark:bg-white rounded-[2rem] flex items-center justify-center text-white dark:text-black mb-6 shadow-2xl shadow-black/20 dark:shadow-white/10">
                  <FileText size={40} strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl font-[1000] text-black dark:text-white uppercase tracking-tighter">Audit Dossier</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mt-3">{detailModalTx.id}</p>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-[2rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Matrix Time</p>
                    <p className="text-sm font-[1000] text-black dark:text-white">{formatDateDMY(detailModalTx.createdAt || detailModalTx.date)}</p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Node Source</p>
                    <p className="text-sm font-[1000] text-black dark:text-white uppercase">{detailModalTx.departmentCode || 'HQ-MAIN'}</p>
                  </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-indigo-600 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)] group text-white">
                  <p className="text-[9px] font-black text-white/40 dark:text-black/40 uppercase tracking-[0.4em] mb-3">Entity Identity</p>
                  <p className="text-2xl font-[1000] text-white dark:text-black tracking-tight group-hover:text-primary transition-colors">{detailModalTx.patientName || detailModalTx.staffName || 'General Nexus'}</p>
                  <p className="text-xs font-black text-white/60 dark:text-black/60 mt-2 font-mono">{detailModalTx.patientId || detailModalTx.staffId || 'ANONYMOUS_VOID'}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 px-4">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-2">Classification</p>
                    <p className="text-base font-[1000] text-black dark:text-white">{detailModalTx.categoryName || detailModalTx.category || 'Undefined'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-2">Magnitude</p>
                    <p className="text-2xl font-[1000] text-black dark:text-white tabular-nums">Rs {Number(detailModalTx.amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                {detailModalTx.description && (
                  <div className="p-8 rounded-[2.5rem] bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4 text-center">Context Payload</p>
                    <p className="text-sm font-[1000] text-black dark:text-white text-center leading-relaxed italic opacity-80">
                      "{detailModalTx.description}"
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-12 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setDetailModalTx(null);
                    handleDeleteTransaction(detailModalTx);
                  }}
                  className="h-16 bg-rose-500/10 text-rose-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-500 hover:text-white transition-all"
                >
                  Purge Record
                </button>
                {detailModalTx.status === 'pending_cashier' ? (
                  <button 
                    onClick={() => {
                      setDetailModalTx(null);
                      openForwardModal(detailModalTx);
                    }}
                    className="h-16 bg-emerald-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all"
                  >
                    Authorize Node
                  </button>
                ) : (
                  <button 
                    onClick={() => setDetailModalTx(null)}
                    className="h-16 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-all"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
