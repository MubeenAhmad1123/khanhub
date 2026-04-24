// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter, Timestamp, updateDoc, where, QueryConstraint, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, DollarSign, FileText, History, LayoutDashboard, Loader2, Lock, Minus, Plus, Search, TrendingDown, TrendingUp, X, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, parseDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { markHqNotificationRead, markAllHqNotificationsRead, subscribeHqNotifications, sendHqPushNotification } from '@/lib/hqNotifications';
import { toast } from 'react-hot-toast';
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
  const [historyTo, setHistoryTo] = useState('');
  const [historyStatus, setHistoryStatus] = useState<StatusFilter>('all');
  const [historyType, setHistoryType] = useState<'all' | TxnType>('all');
  const [historyDepartment, setHistoryDepartment] = useState<'all' | string>('all');
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

  // Optimized fetchHistory that uses filters and aggregation
  const fetchHistory = useCallback(async () => {
    if (!session) return;
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
        
        // Date Logic
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

        // --- Aggregation Step (Efficient Stats) ---
        try {
          const aggQ = query(collection(db, dept.txCollection), ...constraints);
          const aggSnap = await getAggregateFromServer(aggQ, {
            income: sum(where('type', '==', 'income') ? 'amount' : 0), // Note: Firestore sum doesn't take conditional, we need separate queries for complex ones
            count: count()
          });
          
          // Better Aggregation approach for Firestore:
          const incomeAgg = await getAggregateFromServer(query(collection(db, dept.txCollection), ...constraints, where('type', '==', 'income')), { total: sum('amount') });
          const expenseAgg = await getAggregateFromServer(query(collection(db, dept.txCollection), ...constraints, where('type', '==', 'expense')), { total: sum('amount') });
          const countAgg = await getAggregateFromServer(query(collection(db, dept.txCollection), ...constraints), { total: count() });

          totalIncome += incomeAgg.data().total || 0;
          totalExpense += expenseAgg.data().total || 0;
          totalCount += countAgg.data().total || 0;

          // Unique entity estimation (approximate by transaction count for now, or separate queries)
          if (dept.code === 'spims') studentsTouched += countAgg.data().total;
          if (dept.code === 'rehab' || dept.code === 'hospital') patientsTouched += countAgg.data().total;
          if (dept.code === 'job-center') clientsTouched += countAgg.data().total;

        } catch (err) {
          console.warn(`[HQ Cashier] Aggregation failed for ${dept.code}`, err);
        }

        // --- Fetch Step (List View) ---
        constraints.push(limit(200));

        try {
          const q = query(collection(db, dept.txCollection), ...constraints);
          const snap = await getDocs(q);
          all.push(...snap.docs.map((d) => ({ 
            id: d.id, 
            departmentCode: dept.code, 
            departmentName: dept.label, 
            ...d.data() 
          })));
        } catch (err: any) {
          console.warn(`[HQ Cashier] List fetch failed for ${dept.code}.`, err);
          // Simple fallback
          const qBasic = query(collection(db, dept.txCollection), orderBy('createdAt', 'desc'), limit(50));
          const snapBasic = await getDocs(qBasic);
          all.push(...snapBasic.docs.map((d) => ({ 
            id: d.id, 
            departmentCode: dept.code, 
            departmentName: dept.label, 
            ...d.data() 
          })));
        }
      }

      setHistoryStats({ income: totalIncome, expense: totalExpense, count: totalCount, students: studentsTouched, patients: patientsTouched, clients: clientsTouched });

      // Final unified sort for display
      all.sort((a, b) => {
        const dateA = toDate(a.transactionDate || a.date || a.createdAt);
        const dateB = toDate(b.transactionDate || b.date || b.createdAt);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      });
      
      setHistoryTxns(all);
    } catch (err) {
      console.error('[HQ Cashier] fetchHistory Error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [session, historyDateMode, historyFrom, historyTo, historyStatus, historyType, historyDepartment]);

  useEffect(() => {
    setMounted(true);
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
  }, [sessionLoading, session, router, fetchHistory]);

  function subscribeIncoming() {
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
        
        console.log(`[HQ Cashier] Merging ${allTx.length} total pending transactions from ${DEPARTMENTS.length} departments.`);
        
        const visible = allTx.filter((tx: any) => {
          const txCashier = String(tx.cashierId || '').trim().toUpperCase();
          if (!txCashier || txCashier === 'CASHIER') return true; // Show universal or explicitly assigned
          
          const match = txCashier === cashierCustomId;
          if (!match) {
            console.debug(`[HQ Cashier] Filtering out TX ${tx.id} - assigned to ${txCashier}, current is ${cashierCustomId}`);
          }
          return match;
        });

        console.log(`[HQ Cashier] Visible transactions for ${cashierCustomId}: ${visible.length}`);

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
        console.error('[HQ Cashier] subscribeIncoming error:', err);
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
  }

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
        const snap = await getDocs(collection(db, entityCollection));
        setAllPatients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        setAllPatients([]);
      }
    };
    void run();
  }, [session, departmentCode, isStaffMode, activeDepartment.entityCollection]);

  useEffect(() => {
    if (!session) return;
    const loadSuperadminRecipient = async () => {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'hq_users'), where('role', '==', 'superadmin'))
        );
        const firstDoc = usersSnap.docs[0];
        if (firstDoc) {
          const data = firstDoc.data();
          setSuperadminRecipient({ id: firstDoc.id, customId: data.customId || 'SUPERADMIN' });
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

  async function loadCustomCategories() {
    try {
      const snap = await getDocs(collection(db, 'hq_cashier_categories'));
      const list = snap.docs.map((d) => ({ id: d.data().slug || d.id, name: d.data().name || 'Custom', appliesTo: d.data().appliesTo || 'both' }));
      setCustomCategories(list as any);
    } catch (err) {
      console.error(err);
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
  const historyFiltered = useMemo(() => {
    return historyTxns.filter((tx) => {
      // 1. Department Filter (Immediate UI responsiveness)
      if (historyDepartment !== 'all' && tx.departmentCode !== historyDepartment) return false;

      // 2. Status Filter
      if (historyStatus !== 'all') {
        if (historyStatus === 'pending') {
          if (!['pending', 'pending_cashier'].includes(tx.status)) return false;
        } else if (tx.status !== historyStatus) return false;
      }

      // 3. Type Filter
      if (historyType !== 'all' && tx.type !== historyType) return false;

      // 4. Search Query Filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      
      const searchStr = `${tx.patientName || ''} ${tx.patientId || ''} ${tx.donorName || ''} ${tx.donorId || ''} ${tx.staffName || ''} ${tx.staffId || ''} ${tx.categoryName || tx.category || ''} ${tx.description || ''}`.toLowerCase();
      return searchStr.includes(q);
    });
  }, [historyTxns, searchQuery, historyDepartment, historyStatus, historyType]);

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
        <Loader2 className="w-10 h-10 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pl-0 overflow-x-hidden bg-[#FCFBF8] text-black pb-32 md:pb-8">
      <div className="sticky top-0 z-30 bg-white border-b-4 border-black px-4 py-6 md:px-8 md:py-8 shadow-xl shadow-black/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 min-w-0">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shrink-0 shadow-2xl">
              <CreditCard size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight truncate uppercase">Cashier Terminal</h1>
              <p className="text-[10px] text-black font-black uppercase tracking-[0.2em] mt-1 opacity-50">Active Session: {session?.customId || 'HQ-DELTA'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {[
              { href: "/hq/dashboard/cashier/history", icon: History, label: "Logs" },
              { href: "/hq/dashboard/cashier/daily-report", icon: LayoutDashboard, label: "Sheet" },
              { href: "/hq/dashboard/cashier/reconciliation", icon: ShieldCheck, label: "Audit" }
            ].map(link => (
              <Link 
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-black hover:text-white rounded-2xl border-2 border-black text-[10px] font-black uppercase tracking-[0.2em] text-black transition-all active:scale-95 shadow-xl shadow-black/5"
              >
                <link.icon size={16} />
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            ))}
            <Link 
              href="/hq/dashboard/cashier/day-close"
              className="flex items-center gap-2 px-8 py-3.5 bg-black hover:bg-white hover:text-black border-2 border-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-black/20 transition-all active:scale-95"
            >
              <Lock size={16} />
              <span className="hidden lg:inline">Terminal Lock</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-10 min-w-0">
          <div className="bg-white border-4 border-black rounded-[3rem] p-8 md:p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-black flex items-center gap-3">
              <Plus size={16} strokeWidth={4} /> Incoming Queue
            </h2>
            </div>
            {incomingError ? (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs font-bold">
                {incomingError}
              </div>
            ) : null}
            {incomingLoading ? (
              <div className="p-8 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-purple-600" />
              </div>
            ) : incomingFeeReqs.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface-subtle border border-border-subtle text-center">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                  <FileText className="text-black" size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-black">Queue empty</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {incomingFeeReqs.map((tx, index) => (
                  <div 
                    key={tx.id} 
                    style={{ animationDelay: `${index * 60}ms` }} 
                    onClick={() => setDetailModalTx(tx)}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300 group cursor-pointer bg-white border border-border-subtle rounded-2xl p-5 hover:border-black transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                            {formatDateDMY(tx.createdAt)}
                          </span>
                          <span className="text-[9px] font-black text-black uppercase tracking-widest">
                            {tx.departmentCode}
                          </span>
                        </div>
                        <div className="text-sm font-black text-black truncate uppercase tracking-tight">{tx.patientName || tx.donorName || 'Entity'}</div>
                        <div className="text-[10px] font-black text-black truncate opacity-40">{tx.patientId || tx.donorId || tx.id}</div>
                        <div className="text-sm font-black text-black mt-3">Rs {Number(tx.amount || 0).toLocaleString()}</div>
                        <div className="text-[10px] font-bold text-black mt-1 line-clamp-1 italic opacity-60">{tx.description || tx.note || 'No manifest provided'}</div>
                        <span className="mt-4 inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border-2 border-black bg-black text-white">
                          {tx.status?.replace('_', ' ') || 'QUEUED'}
                        </span>
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={incomingActionId === tx.id}
                          onClick={(e) => { e.stopPropagation(); openForwardModal(tx); }}
                          className="px-3 py-2 rounded-lg bg-black hover:bg-black/90 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 transition-all active:scale-95 shadow-lg shadow-black/10"
                        >
                          {incomingActionId === tx.id ? <Loader2 size={14} className="animate-spin" /> : 'Process'}
                        </button>
                        <button
                          type="button"
                          disabled={incomingActionId === tx.id}
                          onClick={(e) => { e.stopPropagation(); openRejectModal(tx); }}
                          className="px-3 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest disabled:opacity-60 transition-all active:scale-95"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[10px] font-bold text-black">
              Clicking <span className="text-black font-black">Process</span> sends request to superadmin approvals.
            </p>
          </div>

          {/* Quick Statistics */}
          <div className="bg-white border-4 border-black rounded-[3rem] p-8 md:p-10 shadow-2xl">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-black/5 border-2 border-black/10 rounded-[2rem] p-8 transition-all hover:border-black">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl">
                  <TrendingUp size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black mb-1 opacity-40">Revenue Today</p>
                <p className="text-2xl font-black text-black">Rs {totals.income.toLocaleString()}</p>
              </div>
              <div className="bg-black/5 border-2 border-black/10 rounded-[2rem] p-8 transition-all hover:border-black">
                <div className="w-12 h-12 bg-white border-2 border-black rounded-2xl flex items-center justify-center text-black mb-6 shadow-xl">
                  <TrendingDown size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black mb-1 opacity-40">Payout Today</p>
                <p className="text-2xl font-black text-black">Rs {totals.expense.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white border-4 border-black rounded-[3rem] p-8 md:p-10 shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-black mb-8 flex items-center gap-3">
              <Search size={16} strokeWidth={4} /> {isStaffMode ? 'Fleet Directory' : 'Global Accounts'}
            </h2>
            <div className="space-y-4">
              <select 
                value={departmentCode} 
                onChange={(e) => setDepartmentCode(e.target.value)} 
                className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-3.5 text-black text-sm font-bold outline-none focus:border-black transition-all"
              >
                {DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
              
              <div className="relative w-full">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery && setSearchOpen(true)}
                    placeholder="Search by name or ID..."
                    className="w-full bg-surface-subtle border border-border-subtle rounded-2xl pl-12 pr-10 py-3.5 text-black text-sm font-bold outline-none focus:border-black transition-all placeholder:text-black"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-black hover:text-black transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border-subtle rounded-[1.5rem] shadow-2xl z-50 overflow-hidden border-t-0 animate-in fade-in slide-in-from-top-2 duration-200">
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
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-subtle transition-colors text-left border-b border-border-subtle last:border-0"
                      >
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white font-black text-xs shrink-0">
                          {String(p.name || p.fullName || '?')[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-black text-sm font-black truncate">{p.name || p.fullName || 'Unknown'}</p>
                          <p className="text-black text-[10px] font-bold uppercase tracking-widest truncate">
                            {p.patientId || p.studentId || p.customId || p.employeeId || p.rollNumber || p.id}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchOpen && <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />}
              </div>
            </div>
            {entityResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {entityResults.map((e) => (
                  <button 
                    key={e.id} 
                    type="button" 
                    onClick={() => setSelectedEntity(e)} 
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all",
                      selectedEntity?.id === e.id ? "bg-black border-black text-white" : "bg-surface-subtle border-border-subtle text-black hover:border-black"
                    )}
                  >
                    <div className="text-sm font-black truncate">{e.name || e.fullName || 'Unknown'}</div>
                    <div className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", selectedEntity?.id === e.id ? "text-black" : "text-black")}>
                      {e.customId || e.rollNumber || e.id?.slice(0, 10)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 min-w-0">
          <div className="bg-white border border-border-subtle rounded-[2rem] p-6 md:p-10 shadow-sm">
            <form onSubmit={submitTx} className="space-y-6">
              <div className="p-8 rounded-[2rem] bg-black text-white min-w-0 shadow-2xl shadow-black/20">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{selectedEntity ? 'Account Selected' : departmentCode === 'hospital' ? 'Account Auto-selected' : 'Action Required'}</p>
                <div className="flex items-center justify-between gap-4 mt-2">
                  <p className="text-xl sm:text-2xl font-black truncate">{selectedEntity ? (selectedEntity.name || selectedEntity.fullName) : departmentCode === 'hospital' ? 'General Hospital Account' : 'Select account from search'}</p>
                  {selectedEntity && (
                    <button type="button" onClick={() => { setSelectedEntity(null); setAmount(''); }} className="text-[10px] font-black text-white underline underline-offset-8 uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">Change</button>
                  )}
                </div>
                
                {selectedEntity && isStaffMode && (
                  <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/10 animate-in zoom-in-95 duration-500">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">Days Present</span>
                      <span className="text-sm font-black">{selectedEntity.daysPresent || 0} Days</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">Pro-rated Salary</span>
                      <span className="text-sm font-black">Rs {Number(selectedEntity.calculatedSalary || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">Unpaid Fines</span>
                      <span className="text-sm font-black text-red-400">- Rs {Number(selectedEntity.totalFines || 0).toLocaleString()}</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">Net Payable</span>
                      <span className="text-2xl font-[1000] text-green-400">Rs {(Number(selectedEntity.calculatedSalary || 0) - Number(selectedEntity.totalFines || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button" onClick={() => setTxnType('income')} className={cn('p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all active:scale-95', txnType === 'income' ? 'border-black bg-black text-white shadow-xl shadow-black/20' : 'border-border-subtle bg-white hover:bg-surface-subtle text-black')}>
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', txnType === 'income' ? 'bg-white/10 text-white' : 'bg-surface-subtle text-black')}><TrendingUp size={24} /></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Payment In</span>
                </button>
                <button type="button" onClick={() => setTxnType('expense')} className={cn('p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all active:scale-95', txnType === 'expense' ? 'border-black bg-black text-white shadow-xl shadow-black/20' : 'border-border-subtle bg-white hover:bg-surface-subtle text-black')}>
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', txnType === 'expense' ? 'bg-white/10 text-white' : 'bg-surface-subtle text-black')}><TrendingDown size={24} /></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Payment Out</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Field / Category</label>
                  <input 
                    value={categorySearch} 
                    onChange={(e) => setCategorySearch(e.target.value)} 
                    placeholder="Search or create field..." 
                    className="mt-2 w-full bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-3.5 text-black text-sm font-bold outline-none focus:border-black transition-all placeholder:text-black" 
                  />
                  <div className="mt-3 border border-border-subtle rounded-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar bg-white shadow-inner">
                    {visibleCategories.map((c) => (
                      <button 
                        key={c.id} 
                        type="button" 
                        onClick={() => setSelectedCategoryId(c.id)} 
                        className={cn(
                          'w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest border-b border-border-subtle last:border-0 transition-all', 
                          selectedCategoryId === c.id ? 'bg-black text-white' : 'text-black bg-white hover:bg-surface-subtle'
                        )}
                      >
                        {c.name}
                      </button>
                    ))}
                    {visibleCategories.length === 0 && categorySearch.trim() && (
                      <button type="button" onClick={createCategory} className="w-full text-left px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 bg-purple-50 hover:bg-purple-100 transition-all">
                        Create "{categorySearch.trim()}"
                      </button>
                    )}
                  </div>
                  {departmentCode === 'spims' && selectedCategoryId === 'fee' && (
                    <div className="mt-4 p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">SPIMS Fee Category</label>
                      <select
                        value={spimsFeeSubtype}
                        onChange={(e) => setSpimsFeeSubtype(e.target.value as any)}
                        className="mt-2 w-full bg-white border border-indigo-200 rounded-2xl px-4 py-3 text-indigo-900 text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all"
                      >
                        <option value="admission">Admission Fee</option>
                        <option value="registration">Registration Fee</option>
                        <option value="examination">Examination Fee</option>
                        <option value="monthly">Monthly Tuition</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-6 min-w-0">
                  {departmentCode === 'hospital' ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-6 shadow-sm">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Hospital Service Details</label>
                      <select value={hospCategory} onChange={(e) => setHospCategory(e.target.value as any)} className="mt-2 w-full bg-white border border-emerald-200 rounded-xl px-4 py-3.5 text-black text-sm font-black outline-none focus:border-emerald-500">
                        <option value="opd_reception">OPD Reception</option>
                        <option value="lab_test">Lab Test</option>
                        <option value="operation">Operation/Surgery</option>
                        <option value="staff_salary">Staff Salary</option>
                        <option value="utilities">Utilities</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="other_income">Other Income</option>
                        <option value="other_expense">Other Expense</option>
                      </select>

                      {['opd_reception', 'lab_test', 'operation'].includes(hospCategory) && (
                        <div className="mt-5 space-y-4">
                          <input type="text" value={hospPatientName} onChange={e => setHospPatientName(e.target.value)} placeholder="Patient Name" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                          <input type="text" value={hospGuardian} onChange={e => setHospGuardian(e.target.value)} placeholder="Guardian Name (Optional)" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={hospAge} onChange={e => setHospAge(e.target.value)} placeholder="Age" className="bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                            <input type="text" value={hospContact} onChange={e => setHospContact(e.target.value)} placeholder="Contact No" className="bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                          </div>
                          
                          {hospCategory === 'opd_reception' && (
                            <>
                              <select value={hospOpdShift} onChange={(e) => setHospOpdShift(e.target.value as any)} className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500">
                                <option value="morning">Morning Shift</option>
                                <option value="evening">Evening Shift</option>
                              </select>
                              <input type="text" value={hospVisitPurpose} onChange={e => setHospVisitPurpose(e.target.value)} placeholder="Visit Purpose (e.g. Checkup)" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                            </>
                          )}

                          {hospCategory === 'lab_test' && (
                            <>
                              <input type="text" value={hospTestName} onChange={e => setHospTestName(e.target.value)} placeholder="Test Name" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                              <input type="text" value={hospReferredBy} onChange={e => setHospReferredBy(e.target.value)} placeholder="Referred By (Optional)" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                              {txnType === 'expense' && <input type="number" value={hospTestExpense} onChange={e => setHospTestExpense(e.target.value)} placeholder="Lab Cost/Expense (Optional)" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />}
                            </>
                          )}

                          {hospCategory === 'operation' && (
                            <>
                              <input type="text" value={hospOpType} onChange={e => setHospOpType(e.target.value)} placeholder="Operation Type" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                              <input type="text" value={hospReferredBy} onChange={e => setHospReferredBy(e.target.value)} placeholder="Referred By (Optional)" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-black font-bold outline-none focus:border-emerald-500 transition-all" />
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black uppercase text-emerald-600 pl-1">Admit Date</label>
                                  <input
                                    type="text"
                                    placeholder="DD MM YYYY"
                                    value={formatDateDMY(hospAdmitDate)}
                                    onChange={e => setHospAdmitDate(e.target.value)}
                                    onBlur={e => {
                                      const parsed = parseDateDMY(e.target.value);
                                      if (parsed) setHospAdmitDate(parsed.toISOString().split('T')[0]);
                                    }}
                                    className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs text-black font-black outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black uppercase text-emerald-600 pl-1">Discharge Date</label>
                                  <input
                                    type="text"
                                    placeholder="DD MM YYYY"
                                    value={formatDateDMY(hospDischargeDate)}
                                    onChange={e => setHospDischargeDate(e.target.value)}
                                    onBlur={e => {
                                      const parsed = parseDateDMY(e.target.value);
                                      if (parsed) setHospDischargeDate(parsed.toISOString().split('T')[0]);
                                    }}
                                    className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs text-black font-black outline-none"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Amount (Rs)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="mt-2 w-full bg-surface-subtle border border-border-subtle rounded-2xl px-6 py-5 text-3xl font-[1000] text-black outline-none focus:border-black transition-all placeholder:text-gray-200"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Date</label>
                          <input
                            type="date"
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                            className="mt-2 w-full bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-4 text-sm font-black text-black outline-none focus:border-black transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Method</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="mt-2 w-full bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-4 text-sm font-black text-black outline-none focus:border-black transition-all"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="jazzcash">JazzCash</option>
                            <option value="easypaisa">EasyPaisa</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Reference / Bill No</label>
                        <input 
                          value={referenceNo} 
                          onChange={(e) => setReferenceNo(e.target.value)} 
                          placeholder="Internal or bank reference..." 
                          className="mt-2 w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-5 text-sm font-black text-black outline-none focus:border-black transition-all placeholder:text-black" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Proof Upload</label>
                        <div className="relative mt-2">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={processing}
                          />
                          <div className="w-full bg-surface-subtle border border-dashed border-border-subtle rounded-2xl px-5 py-4 flex items-center justify-between group transition-all hover:border-black">
                            <span className="text-xs font-black text-black truncate max-w-[150px]">
                              {proofFile ? proofFile.name : "Select Receipt Image"}
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <ArrowRight size={14} className="-rotate-45" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="min-w-0">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Missing Proof Reason</label>
                      <textarea
                        value={proofReason}
                        onChange={(e) => setProofReason(e.target.value)}
                        placeholder="Explain if receipt is not available..."
                        className="mt-2 w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-bold text-black outline-none focus:border-black transition-all min-h-[120px] resize-none placeholder:text-black"
                        disabled={processing}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Purpose / Details</label>
                      <textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Additional details about this transaction..." 
                        className="mt-2 w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-bold text-black outline-none focus:border-black transition-all min-h-[120px] resize-none placeholder:text-black" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {message && (
                <div className={cn('p-5 rounded-2xl border flex items-center gap-3 animate-in fade-in zoom-in-95', message.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700')}>
                  {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  <p className="text-sm font-black uppercase tracking-tight">{message.text}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={processing || (!selectedEntity && departmentCode !== 'hospital')} 
                className="w-full bg-black hover:bg-black/90 active:scale-[0.98] text-white font-black text-xs uppercase tracking-[0.2em] px-10 py-6 rounded-2xl transition-all shadow-2xl shadow-black/20 disabled:opacity-30 flex items-center justify-center gap-4"
              >
                {processing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Processing Securely...</span>
                  </>
                ) : (
                  <>
                    Finalize Transaction <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-black/20">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-4xl font-[1000] text-black uppercase tracking-tight">Terminal History</h2>
              <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] mt-1">Live Transaction Ledger</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => void fetchHistory()} 
            disabled={historyLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all active:scale-95"
          >
            <RefreshCw size={14} className={cn(historyLoading && 'animate-spin')} />
            {historyLoading ? 'Syncing...' : 'Refresh Records'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-black px-1">Timeframe</span>
            <select value={historyDateMode} onChange={(e) => setHistoryDateMode(e.target.value as DateMode)} className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-black text-black outline-none focus:border-black transition-all">
              <option value="today">Transaction Date: Today</option>
              <option value="created_today">Entry Date: Added Today</option>
              <option value="range">Custom Date Range</option>
              <option value="all">Full Historical Log</option>
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-black px-1">Transaction Status</span>
            <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value as StatusFilter)} className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-black text-black outline-none focus:border-black transition-all">
              <option value="all">All Statuses</option>
              <option value="pending">Awaiting Approval</option>
              <option value="approved">Verified / Approved</option>
              <option value="rejected">Rejected / Error</option>
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-black px-1">Flow Type</span>
            <select value={historyType} onChange={(e) => setHistoryType(e.target.value as any)} className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-black text-black outline-none focus:border-black transition-all">
              <option value="all">All Cash Flows</option>
              <option value="income">Inbound Payments</option>
              <option value="expense">Outbound Expenses</option>
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-black px-1">Department Origin</span>
            <select value={historyDepartment} onChange={(e) => setHistoryDepartment(e.target.value)} className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-black text-black outline-none focus:border-black transition-all">
              <option value="all">All Portals</option>
              {DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
            </select>
          </div>
        </div>

        {historyDateMode === 'range' && (
          <div className="grid grid-cols-2 gap-4 mb-8 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-black px-1">Start Date</span>
              <input
                type="text"
                placeholder="DD MM YYYY"
                value={formatDateDMY(historyFrom)}
                onChange={(e) => setHistoryFrom(e.target.value)}
                onBlur={(e) => {
                  const parsed = parseDateDMY(e.target.value);
                  if (parsed) setHistoryFrom(parsed.toISOString().split('T')[0]);
                }}
                className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-black text-black outline-none focus:border-black"
              />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-black px-1">End Date</span>
              <input
                type="text"
                placeholder="DD MM YYYY"
                value={formatDateDMY(historyTo)}
                onChange={(e) => setHistoryTo(e.target.value)}
                onBlur={(e) => {
                  const parsed = parseDateDMY(e.target.value);
                  if (parsed) setHistoryTo(parsed.toISOString().split('T')[0]);
                }}
                className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-black text-black outline-none focus:border-black"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-l-8 border-l-black border border-border-subtle rounded-[2rem] p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-black">Total Income</p>
            <p className="text-2xl md:text-3xl font-[1000] text-black mt-2">Rs {totals.income.toLocaleString()}</p>
          </div>
          <div className="bg-white border-l-8 border-l-red-600 border border-border-subtle rounded-[2rem] p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-black">Total Expense</p>
            <p className="text-2xl md:text-3xl font-[1000] text-black mt-2">Rs {totals.expense.toLocaleString()}</p>
          </div>
          <div className="bg-white border-l-8 border-l-gray-300 border border-border-subtle rounded-[2rem] p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-black">Transactions</p>
            <p className="text-2xl md:text-3xl font-[1000] text-black mt-2">{historyStats.count || historyFiltered.length}</p>
          </div>
          <div className="bg-white border-l-8 border-l-emerald-600 border border-border-subtle rounded-[2rem] p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-black">Net Balance</p>
            <p className="text-2xl md:text-3xl font-[1000] text-black mt-2">Rs {totals.net.toLocaleString()}</p>
          </div>
        </div>

        {/* Operational Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-black text-white rounded-[2rem] p-6 flex items-center justify-between shadow-2xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Patients Records</p>
              <p className="text-3xl font-[1000] mt-1">{historyStats.patients}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Plus size={20} />
            </div>
          </div>
          <div className="bg-white border border-black rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Students Records</p>
              <p className="text-3xl font-[1000] mt-1">{historyStats.students}</p>
            </div>
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="bg-white border border-border-subtle rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Client Records</p>
              <p className="text-3xl font-[1000] mt-1">{historyStats.clients}</p>
            </div>
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {historyLoading ? (
            <div className="bg-white rounded-[2rem] p-10 border border-border-subtle text-center shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-black mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-widest mt-4">Retrieving Ledger...</p>
            </div>
          ) : historyFiltered.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-8 border border-border-subtle text-center shadow-sm">
              <p className="text-sm font-black text-black">No records found for this selection.</p>
            </div>
          ) : historyFiltered.map((tx) => (
            <div key={tx.id} onClick={() => setDetailModalTx(tx)} className="bg-white rounded-[2rem] p-6 border border-border-subtle shadow-sm active:scale-[0.98] transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-black text-black truncate">{tx.patientName || tx.staffName || 'General Tx'}</div>
                  <div className="text-[9px] font-black text-black uppercase tracking-widest mt-1">{tx.departmentCode} • {tx.categoryName || tx.category}</div>
                </div>
                <div className={cn('text-sm font-black shrink-0', tx.type === 'income' ? 'text-black' : 'text-red-600')}>
                  {tx.type === 'income' ? '+' : '-'} Rs {Number(tx.amount || 0).toLocaleString()}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={cn('px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border', 
                  tx.status === 'approved' ? 'bg-black text-white border-black' : 
                  tx.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 
                  'bg-surface-subtle text-black border-border-subtle'
                )}>
                  {tx.status || 'pending'}
                </span>
                <span className="text-[10px] font-bold text-black">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-white rounded-[2.5rem] border border-border-subtle overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-surface-subtle">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black border-b border-border-subtle">Date</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black border-b border-border-subtle">Dept</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black border-b border-border-subtle">Account / Detail</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black border-b border-border-subtle">Category</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black border-b border-border-subtle">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-black border-b border-border-subtle text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-black mx-auto" />
                      <p className="text-black text-[10px] font-black uppercase tracking-[0.2em] mt-6">Securing Live Data Stream...</p>
                    </td>
                  </tr>
                ) : historyFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-sm font-black text-black uppercase tracking-widest">No entries found for this query.</td>
                  </tr>
                ) : historyFiltered.map((tx) => (
                  <tr key={tx.id} onClick={() => setDetailModalTx(tx)} className="hover:bg-surface-subtle transition-colors cursor-pointer group">
                    <td className="px-8 py-6 text-xs font-black text-black">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</td>
                    <td className="px-8 py-6">
                      <span className="px-2 py-0.5 rounded bg-black text-white text-[9px] font-black uppercase tracking-widest">{tx.departmentCode}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-black group-hover:underline underline-offset-4">{tx.patientName || tx.staffName || 'General Account'}</div>
                      <div className="text-[9px] font-bold text-black tracking-wider uppercase mt-0.5">{tx.id?.slice(0, 12)}</div>
                    </td>
                    <td className="px-8 py-6 text-xs font-black text-black uppercase tracking-widest">{tx.categoryName || tx.category}</td>
                    <td className="px-8 py-6">
                      <span className={cn('px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border', 
                        tx.status === 'approved' ? 'bg-black text-white border-black' : 
                        tx.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' : 
                        'bg-surface-subtle text-black border-border-subtle'
                      )}>
                        {tx.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={cn('text-sm font-black', tx.type === 'income' ? 'text-black' : 'text-red-600')}>
                        {tx.type === 'income' ? '+' : '-'} Rs {Number(tx.amount || 0).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {forwardModalTx && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-surface-subtle px-8 py-6 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-xl font-[1000] text-black uppercase tracking-tight">Authorization Proof</h3>
                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">
                  {forwardModalTx.patientName || forwardModalTx.patientId || 'Account Holder'} • Rs {Number(forwardModalTx.amount || 0).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                disabled={forwardProofUploading}
                onClick={() => setForwardModalTx(null)}
                className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-black hover:bg-black hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black px-1">Digital Evidence (Image/PDF)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setForwardProofFile(e.target.files?.[0] || null)}
                    className="w-full opacity-0 absolute inset-0 cursor-pointer z-10"
                    disabled={forwardProofUploading}
                  />
                  <div className="w-full bg-surface-subtle border-2 border-dashed border-border-subtle rounded-2xl px-6 py-8 text-center transition-all hover:border-black">
                    <p className="text-sm font-black text-black">
                      {forwardProofFile ? forwardProofFile.name : 'Click or Drop Proof File'}
                    </p>
                    <p className="text-[9px] font-bold text-black uppercase tracking-widest mt-2">Maximum file size: 5MB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black px-1">
                  Compliance Note (Required if no proof)
                </label>
                <textarea
                  value={forwardProofReason}
                  onChange={(e) => setForwardProofReason(e.target.value)}
                  placeholder="Explain the circumstances if digital proof is unavailable..."
                  className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-bold text-black outline-none focus:border-black min-h-[100px] resize-none transition-all"
                  disabled={forwardProofUploading}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setForwardModalTx(null)}
                  disabled={forwardProofUploading}
                  className="flex-1 py-4 rounded-2xl bg-white border border-border-subtle text-black font-black text-[10px] uppercase tracking-widest hover:bg-surface-subtle transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmForwardToSuperadmin()}
                  disabled={forwardProofUploading}
                  className="flex-1 py-4 rounded-2xl bg-black text-white font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {forwardProofUploading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Authorize & Commit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectModalTx && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
          <div className="w-full max-w-xl bg-white border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-[1000] text-red-600 uppercase tracking-tight">Rejection Protocol</h3>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-1">
                  Final denial for transaction: {rejectModalTx.id?.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                disabled={rejecting}
                onClick={() => setRejectModalTx(null)}
                className="w-10 h-10 rounded-xl bg-white border border-red-100 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-5 bg-surface-subtle border border-border-subtle rounded-2xl flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-black">Claim Amount</span>
                <span className="text-lg font-[1000] text-black">Rs {Number(rejectModalTx.amount || 0).toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black px-1">Reason for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Clearly state the reason for this rejection..."
                  className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-bold text-black outline-none focus:border-black min-h-[120px] resize-none transition-all"
                  disabled={rejecting}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTx(null)}
                  disabled={rejecting}
                  className="flex-1 py-4 rounded-2xl bg-white border border-border-subtle text-black font-black text-[10px] uppercase tracking-widest hover:bg-surface-subtle transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmRejectIncoming()}
                  disabled={rejecting}
                  className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {rejecting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailModalTx && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white border border-border-subtle rounded-[3rem] overflow-hidden shadow-2xl">
            <div className="relative p-10">
              <button 
                onClick={() => setDetailModalTx(null)}
                className="absolute top-8 right-8 w-10 h-10 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-black hover:bg-black hover:text-white transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center text-white mb-5 shadow-2xl shadow-black/20">
                  <FileText size={32} />
                </div>
                <h3 className="text-2xl font-[1000] text-black uppercase tracking-tight">Audit Record</h3>
                <p className="text-[10px] font-black text-black uppercase tracking-widest mt-1">Log Reference: {detailModalTx.id}</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-surface-subtle border border-border-subtle">
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Timestamp</p>
                    <p className="text-sm font-black text-black">{formatDateDMY(detailModalTx.createdAt || detailModalTx.date)}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-surface-subtle border border-border-subtle">
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Portal Source</p>
                    <p className="text-sm font-black text-black uppercase">{detailModalTx.departmentCode || 'HQ'}</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border-2 border-black/5 shadow-inner">
                  <p className="text-[9px] font-black text-black uppercase tracking-widest mb-2">Account Entity</p>
                  <p className="text-lg font-black text-black">{detailModalTx.patientName || detailModalTx.staffName || 'General Account'}</p>
                  <p className="text-[11px] font-bold text-black mt-1">{detailModalTx.patientId || detailModalTx.staffId || 'ID UNKNOWN'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="px-1">
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Ledger Category</p>
                    <p className="text-sm font-black text-black">{detailModalTx.categoryName || detailModalTx.category || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right px-1">
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-1">Value Transacted</p>
                    <p className="text-xl font-[1000] text-black">Rs {Number(detailModalTx.amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                {detailModalTx.description && (
                  <div className="p-5 rounded-2xl bg-surface-subtle border border-dashed border-border-subtle">
                    <p className="text-[9px] font-black text-black uppercase tracking-widest mb-2 text-center">Transaction Memo</p>
                    <p className="text-xs font-bold text-black text-center leading-relaxed italic">
                      "{detailModalTx.description}"
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setDetailModalTx(null)}
                  className="flex-1 py-5 bg-white border border-border-subtle text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                >
                  Dismiss
                </button>
                {detailModalTx.status === 'pending_cashier' && (
                   <button 
                   onClick={() => {
                     setDetailModalTx(null);
                     openForwardModal(detailModalTx);
                   }}
                   className="flex-1 py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all"
                 >
                   Authorize Tx
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
