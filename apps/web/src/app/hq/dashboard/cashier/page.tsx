// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, deleteDoc, getDocs, limit, onSnapshot, orderBy, query, startAfter, Timestamp, updateDoc, where, QueryConstraint, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, DollarSign, FileText, History, LayoutDashboard, Loader2, Lock, Minus, Plus, Search, TrendingDown, TrendingUp, X, RefreshCw, ShieldCheck, Clock, Activity, Trash2, Sparkles, Eye, Calendar, Check, Camera, Terminal, User, Printer, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, parseDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { markHqNotificationRead, markAllHqNotificationsRead, subscribeHqNotifications, sendHqPushNotification } from '@/lib/hqNotifications';
import { toast } from 'react-hot-toast';
import { getCached, setCached } from '@/lib/queryCache';
import type { HospitalTxCategory, HospitalTxMeta, LabTestMeta, OperationMeta, OpdReceptionMeta } from '@/types/hospital';
import { BrutalistCalendar } from '@/components/ui';


type TxnType = 'income' | 'expense';
type DateMode = 'today' | 'all' | 'range' | 'created_today' | 'yesterday';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PaymentMethod = 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'other';

const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions', entityCollection: 'rehab_patients' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions', entityCollection: 'spims_students' },
  { code: 'hospital', label: 'Khan Hospital', txCollection: 'hospital_transactions', entityCollection: 'hospital_patients' },
  { code: 'sukoon-center', label: 'Sukoon Center', txCollection: 'sukoon_transactions', entityCollection: 'sukoon_clients' },
  { code: 'welfare', label: 'Welfare', txCollection: 'welfare_transactions', entityCollection: 'welfare_donors' },
  { code: 'job-center', label: 'Job Center', txCollection: 'jobcenter_transactions', entityCollection: 'jobcenter_seekers' },
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
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchType, setSearchType] = useState<'patient' | 'student' | 'staff' | 'other'>('patient');

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
  const [historyType, setHistoryType] = useState<'all' | 'income' | 'expense'>('all');
  const [historyDepartment, setHistoryDepartment] = useState('all');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

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
  
  // 1. Consolidated History Filtering & Sorting
  const historyFiltered = useMemo(() => {
    let result = historyTxns.filter((tx) => {
      if (historyDepartment !== 'all' && tx.departmentCode !== historyDepartment) return false;
      if (historyStatus !== 'all') {
        if (historyStatus === 'pending') {
          if (!['pending', 'pending_cashier'].includes(tx.status)) return false;
        } else if (tx.status !== historyStatus) return false;
      }
      if (historyType !== 'all' && tx.type !== historyType) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const searchStr = `${tx.patientName || ''} ${tx.patientId || ''} ${tx.donorName || ''} ${tx.donorId || ''} ${tx.staffName || ''} ${tx.staffId || ''} ${tx.categoryName || tx.category || ''} ${tx.description || ''}`.toLowerCase();
      return searchStr.includes(q);
    });

    if (showDuplicatesOnly) {
      result = result.filter((tx1, idx1) => {
        return result.some((tx2, idx2) => {
          if (idx1 === idx2) return false;
          const date1 = getLocalDateString(tx1.transactionDate || tx1.date || tx1.createdAt);
          const date2 = getLocalDateString(tx2.transactionDate || tx2.date || tx2.createdAt);
          const entity1 = tx1.patientId || tx1.staffId || tx1.entityId || tx1.donorId;
          const entity2 = tx2.patientId || tx2.staffId || tx2.entityId || tx2.donorId;
          return tx1.amount === tx2.amount && date1 === date2 && entity1 === entity2 && !!entity1;
        });
      });
    }

    // Client-side Sorting
    result = [...result].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: any, valB: any;

      if (key === 'date') {
        valA = toDate(a.transactionDate || a.date || a.createdAt)?.getTime() || 0;
        valB = toDate(b.transactionDate || b.date || b.createdAt)?.getTime() || 0;
      } else if (key === 'amount') {
        valA = Number(a.amount || 0);
        valB = Number(b.amount || 0);
      } else {
        valA = String(a[key as keyof typeof a] || '').toLowerCase();
        valB = String(b[key as keyof typeof b] || '').toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [historyTxns, searchQuery, historyDepartment, historyStatus, historyType, showDuplicatesOnly, sortConfig]);

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
      const tomorrowTimestamp = Timestamp.fromDate(
        new Date(today.getTime() + 24 * 60 * 60 * 1000)
      );

      for (const dept of targetDepts) {
        try {
          let q;
          
          if (historyDateMode === 'today') {
            q = query(
              collection(db, dept.txCollection),
              where('date', '>=', todayTimestamp),
              where('date', '<', tomorrowTimestamp),
              limit(50)
            );
          } else if (historyDateMode === 'created_today') {
            q = query(
              collection(db, dept.txCollection),
              where('createdAt', '>=', todayTimestamp),
              where('createdAt', '<', tomorrowTimestamp),
              limit(50)
            );
          } else if (historyDateMode === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStart = Timestamp.fromDate(yesterday);
            const yesterdayEnd = todayTimestamp;
            q = query(
              collection(db, dept.txCollection),
              where('date', '>=', yesterdayStart),
              where('date', '<', yesterdayEnd),
              limit(50)
            );
          } else if (historyDateMode === 'range' && historyFrom) {
            const fromDate = new Date(`${historyFrom}T00:00:00`);
            const toDateVal = historyTo 
              ? new Date(`${historyTo}T23:59:59`) 
              : new Date();
            q = query(
              collection(db, dept.txCollection),
              where('date', '>=', Timestamp.fromDate(fromDate)),
              where('date', '<=', Timestamp.fromDate(toDateVal)),
              limit(100)
            );
          } else {
            q = query(
              collection(db, dept.txCollection),
              limit(50)
            );
          }

          const snap = await getDocs(q);
          const docs = snap.docs.map((d) => ({ 
            id: d.id, 
            departmentCode: dept.code, 
            departmentName: dept.label, 
            ...d.data() 
          }));
          all.push(...docs);
        } catch (err: any) {
          console.warn(`[HQ Cashier] List fetch failed for ${dept.code}:`, err.message);
        }
      }

      all.sort((a, b) => {
        const dateA = toDate(a.transactionDate || a.date || a.createdAt);
        const dateB = toDate(b.transactionDate || b.date || b.createdAt);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      });
      
      setHistoryTxns(all);
      
      const income = all.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
      const expense = all.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
      setHistoryStats({ 
        income, expense, count: all.length, 
        students: all.filter(t => t.departmentCode === 'spims').length, 
        patients: all.filter(t => t.departmentCode === 'rehab' || t.departmentCode === 'hospital').length, 
        clients: all.filter(t => t.departmentCode === 'job-center').length 
      });

    } catch (err) {
      console.error('[HQ Cashier] fetchHistory Error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [session, historyDateMode, historyFrom, historyTo, historyDepartment]);


  const fetchEntityHistory = useCallback(async (entity: any, deptOverride?: string) => {
    if (!entity?.id) return;
    try {
      setEntityHistoryLoading(true);
      
      const targetDeptCode = deptOverride || entity._deptCode || departmentCode;
      const dept = DEPARTMENTS.find(d => d.code === targetDeptCode) || activeDepartment;
      const col = collection(db, dept.txCollection);

      let list: any[] = [];
      const staffMode = entity._entityType === 'staff' || (targetDeptCode === 'rehab' && txnType === 'expense' && selectedCategoryId === 'staff_salary');

      if (targetDeptCode === 'spims' && !staffMode) {
        const [txSnap, feesSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'spims_transactions'), 
            where('studentId', '==', entity.id), 
            limit(200)
          )),
          getDocs(query(
            collection(db, 'spims_fees'), 
            where('studentId', '==', entity.id), 
            limit(200)
          ))
        ]);
        
        const map = new Map<string, any>();
        
        txSnap.docs.forEach(d => {
          map.set(d.id, { 
            id: d.id, 
            ...d.data(), 
            _source: 'spims_transactions' 
          });
        });
        
        feesSnap.docs.forEach(d => {
          const feeData = d.data();
          const linkedTxId = feeData.linkedTransactionId;
          if (linkedTxId && map.has(linkedTxId)) {
            return;
          }
          map.set('fee_' + d.id, { 
            id: d.id, 
            ...feeData,
            _source: 'spims_fees',
            type: 'income',
            categoryName: feeData.type 
              ? `Fee — ${feeData.type.charAt(0).toUpperCase() + feeData.type.slice(1)}`
              : 'Fee Payment',
            category: 'fee',
            patientName: feeData.studentName || 'Unknown Student',
          });
        });
        
        list = Array.from(map.values());
      } else {
        const idFieldMap: Record<string, string> = {
          'rehab': 'patientId',
          'hospital': 'patientId', 
          'sukoon-center': 'clientId',
          'welfare': 'donorId',
          'job-center': 'seekerId',
        };
        const idField = staffMode 
          ? 'staffId' 
          : (idFieldMap[targetDeptCode] || 'patientId');
          
        const snap = await getDocs(query(
          col,
          where(idField, '==', entity.id),
          limit(200)
        ));
        list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      list.sort((a: any, b: any) => {
        const tA = toDate(a.transactionDate || a.date || a.createdAt).getTime();
        const tB = toDate(b.transactionDate || b.date || b.createdAt).getTime();
        return tB - tA;
      });
      
      setEntityHistory(list);
    } catch (err) {
      console.error('[HQ Cashier] fetchEntityHistory Error:', err);
    } finally {
      setEntityHistoryLoading(false);
    }
  }, [activeDepartment, departmentCode, txnType, selectedCategoryId]);

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
          limit(50)
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
        const feeCol = col.replace('_transactions', '_fees');
        try {
          await updateDoc(doc(db, feeCol, rejectModalTx.feePaymentId), { status: 'rejected_cashier' });
        } catch (err) {
          console.warn(`[HQ Cashier] could not update linked fee in ${feeCol}:`, err);
        }
      }
      toast.success('Request rejected successfully');
      setRejectModalTx(null);
      setRejectReason('');
      await fetchHistory();
    } catch (err: any) {
      console.error('[HQ Cashier] reject error:', err);
      toast.error('Failed to reject: ' + (err?.message || 'Error'));
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

      toast.success('Request forwarded to superadmin');
      setForwardModalTx(null);
      setForwardProofFile(null);
      setForwardProofReason('');
      await fetchHistory();
    } catch (err: any) {
      console.error('[HQ Cashier] forward error:', err);
      toast.error('Failed to forward: ' + (err?.message || 'Error'));
    } finally {
      setIncomingActionId(null);
      setForwardProofUploading(false);
    }
  }

  useEffect(() => {
    setEntityResults([]);
    setSearchResults([]);
    setSearchOpen(false);
    setSearchQuery('');
  }, [departmentCode]);




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
          setCached(cacheKey, result, 600); 
        }
      } catch {
        setSuperadminRecipient({ id: '', customId: 'SUPERADMIN' });
      }
    };
    void loadSuperadminRecipient();
  }, [session]);

  const loadAllEntities = async () => {
    if (!auth.currentUser) {
      console.warn('[CashierStation] Skipping fetch: Auth not ready');
      return;
    }
    setEntitiesLoading(true);
    const cacheKey = 'cashier_all_entities';
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      setAllEntities(cached);
      setEntitiesLoading(false);
      return;
    }

    try {
      const all: any[] = [];
      const sources = [
        { coll: 'rehab_patients', code: 'rehab', label: 'Rehab' },
        { coll: 'spims_students', code: 'spims', label: 'SPIMS' },
        { coll: 'hospital_patients', code: 'hospital', label: 'Hospital' },
        { coll: 'sukoon_clients', code: 'sukoon-center', label: 'Sukoon' },
        { coll: 'welfare_donors', code: 'welfare', label: 'Welfare' },
        { coll: 'jobcenter_seekers', code: 'job-center', label: 'Job Center' },
        { coll: 'hq_users', code: 'hq', label: 'HQ Users' },
        { coll: 'rehab_users', code: 'rehab', label: 'Rehab Staff' },
        { coll: 'spims_users', code: 'spims', label: 'SPIMS Staff' },
        { coll: 'hospital_users', code: 'hospital', label: 'Hospital Staff' },
        { coll: 'sukoon_users', code: 'sukoon-center', label: 'Sukoon Staff' },
        { coll: 'welfare_users', code: 'welfare', label: 'Welfare Staff' },
        { coll: 'jobcenter_users', code: 'job-center', label: 'Job Center Staff' },
        { coll: 'hq_staff', code: 'hq', label: 'HQ Personnel' },
        { coll: 'rehab_staff', code: 'rehab', label: 'Rehab Personnel' },
        { coll: 'spims_staff', code: 'spims', label: 'SPIMS Personnel' },
        { coll: 'hospital_staff', code: 'hospital', label: 'Hospital Personnel' },
        { coll: 'sukoon_staff', code: 'sukoon-center', label: 'Sukoon Personnel' },
        { coll: 'welfare_staff', code: 'welfare', label: 'Welfare Personnel' },
        { coll: 'jobcenter_staff', code: 'job-center', label: 'Job Center Personnel' },
      ];

      for (const source of sources) {
        try {
          const snap = await getDocs(query(collection(db, source.coll), limit(1000)));
          const docs = snap.docs.map(d => ({ 
            ...d.data(), 
            id: d.id, 
            _deptCode: source.code, 
            _deptLabel: source.label,
            _entityType: source.coll.includes('staff') ? 'staff' : source.coll.split('_')[1].slice(0, -1)
          }));
          all.push(...docs);
        } catch (err) {
          console.error(`[HQ Cashier] Failed to fetch entities for ${source.coll}:`, err);
        }
      }

      setAllEntities(all);
      setCached(cacheKey, all, 300); 
    } catch (err) {
      console.error('[HQ Cashier] Universal Search Load Error:', err);
    } finally {
      setEntitiesLoading(false);
    }
  };

  useEffect(() => {
    const isReady = !sessionLoading && session && (session.role === 'cashier' || session.role === 'superadmin') && auth.currentUser;
    if (isReady && (searchFocused || searchQuery.length > 0)) {
      loadAllEntities();
    }
  }, [sessionLoading, session, auth.currentUser, searchFocused, searchQuery]);


  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const matches = allEntities.filter((p) => {
      const queryMatch = (p.name || p.fullName || '').toLowerCase().includes(q) ||
        (p.patientId || p.studentId || p.customId || p.employeeId || p.rollNumber || p.id || '').toLowerCase().includes(q);
      
      if (!queryMatch) return false;

      if (searchType === 'patient') {
        return p._entityType === 'patient' || p._entityType === 'client' || p._entityType === 'seeker' || p._entityType === 'donor';
      }
      if (searchType === 'student') {
        return (p._entityType === 'student' || p._deptCode === 'spims') && (p._entityType !== 'staff');
      }
      if (searchType === 'staff') {
        return p._entityType === 'staff' || p._collection?.includes('users') || p._collection?.includes('staff');
      }
      return true;
    });
    setSearchResults(matches.slice(0, 15));
    setSearchOpen(true);
  }, [searchQuery, allEntities, searchType]);



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
        } else if (hospCategory === 'operation' || hospCategory === 'operation_theater') {
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
          createPayload.category = selectedCategory.id;
          createPayload.categoryName = selectedCategory.name;
        }
      }

      const txRef = await addDoc(collection(db, activeDepartment.txCollection), createPayload);

      if (departmentCode === 'spims' && selectedCategory.id === 'fee' && selectedEntity) {
        try {
          const feeRef = await addDoc(collection(db, 'spims_fees'), {
            studentId: selectedEntity.id,
            studentName: selectedEntity.name || selectedEntity.fullName || 'Unknown Student',
            course: selectedEntity.course || 'Unknown Course',
            session: selectedEntity.session || 'Unknown Session',
            date: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
            amount: Number(amount),
            receivedBy: session?.displayName || session?.name || 'HQ Cashier',
            type: spimsFeeSubtype || 'monthly',
            note: description || `Payment via HQ Cashier`,
            status: 'pending', 
            createdBy: session?.uid,
            createdAt: Timestamp.now(),
            linkedTransactionId: txRef.id
          });

          await updateDoc(txRef, { feePaymentId: feeRef.id });
        } catch (err) {
          console.error('[HQ Cashier] SPIMS Fee Sync Error:', err);
          await deleteDoc(txRef).catch(() => {});
          throw new Error('Transaction failed: Could not sync with SPIMS fees system. Please try again.');
        }
      }

      if (isStaffMode && selectedCategoryId === 'staff_salary' && selectedEntity) {
        const prefix = departmentCode.replace('-', '_');
        const entityCollection = prefix === 'hq' ? 'hq_users' : `${prefix}_staff`;
        
        await updateDoc(doc(db, entityCollection, selectedEntity.id), {
          totalFines: 0,
          presentDays: 0,
          lastSalaryPaidAt: Timestamp.now()
        }).catch(err => console.error("Failed to reset staff cycle:", err));

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

      toast.success('Transaction submitted successfully ✓');
      
      setSelectedEntity(null);
      setAmount('');
      setDescription('');
      setReferenceNo('');
      setProofFile(null);
      setProofReason('');
      setCategorySearch('');
      setSearchQuery('');
      setEntityResults([]);
      
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
      toast.error(err?.message || 'Transaction failed');
      setMessage({ type: 'error', text: `${err?.code || 'error'}: ${err?.message || 'Failed to submit transaction.'}` });
    } finally {
      setProcessing(false);
      setProofUploading(false);
    }
  }

  const todayStr = getLocalDateString(new Date());
  
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

  const totals = useMemo(() => {
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
    <div className="min-h-screen bg-[#FCFBF8] py-6 md:py-16 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto px-4 md:px-12">
        
        <div className="space-y-12 mb-16 animate-in fade-in slide-in-from-top-12 duration-1000">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="absolute -inset-4 bg-indigo-600/20 rounded-[2.5rem] blur-2xl group-hover:bg-indigo-600/40 transition-all duration-700" />
                <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl relative">
                  <Terminal size={40} strokeWidth={2.5} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                  <p className="text-[10px] md:text-xs font-black text-indigo-600 uppercase tracking-[0.5em]">System Node: 001-HQ</p>
                </div>
                <h1 className="text-4xl md:text-6xl font-[1000] text-zinc-900 tracking-tighter uppercase leading-none">
                  Cashier <span className="text-indigo-600">Station</span>
                </h1>
                <p className="text-zinc-400 font-bold flex items-center gap-2">
                  <User size={14} className="text-zinc-300" />
                  Logged in as <span className="text-zinc-900">{session?.name || 'Authorized Personnel'}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="px-8 py-5 bg-white border border-zinc-100 rounded-[2rem] shadow-xl flex items-center gap-6 group hover:border-indigo-200 transition-all">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Network Latency</p>
                  <p className="text-lg font-black text-zinc-900 tracking-tight">Active / Secure</p>
                </div>
              </div>
              <button 
                onClick={() => fetchHistory()}
                className="w-16 h-16 bg-zinc-900 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-indigo-600 transition-all active:scale-90 shadow-xl"
              >
                <RefreshCw size={24} className={cn(historyLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-4 md:p-14 border border-zinc-100 shadow-[0_64px_96px_-32px_rgba(0,0,0,0.08)] relative overflow-hidden group/search">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 rounded-full -mr-96 -mt-96 blur-[120px] group-hover/search:bg-indigo-600/10 transition-all duration-1000" />
            
            <div className="relative z-10 space-y-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl group-hover/search:scale-110 transition-transform duration-700">
                    <Search size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-4xl font-[1000] text-zinc-900 uppercase tracking-tighter">Universal Search</h3>
                    <p className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-[0.4em] mt-2">Access cross-departmental records instantaneously</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-2 bg-zinc-100 rounded-[2rem]">
                  {(['patient', 'student', 'staff', 'other'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSearchType(t)}
                      className={cn(
                        "px-8 md:px-10 py-4 md:py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        searchType === t 
                          ? "bg-white text-indigo-600 shadow-2xl shadow-indigo-600/10" 
                          : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50"
                      )}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-10 md:pl-12 flex items-center pointer-events-none">
                  <User size={32} className="text-indigo-600/30" />
                </div>
                <input
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search for a ${searchType} by name, ID, CNIC or phone...`}
                  className="w-full h-16 md:h-24 lg:h-32 bg-zinc-50 border-4 border-transparent rounded-[1.5rem] md:rounded-[2.5rem] lg:rounded-[3.5rem] pl-20 md:pl-32 pr-12 text-lg md:text-2xl lg:text-3xl font-black text-zinc-900 outline-none focus:ring-[20px] focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner placeholder:text-zinc-200"
                />
                {entitiesLoading && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 size={32} className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>

              {searchOpen && searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-8 duration-700">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                         setSelectedEntity(p);
                         setSelectedEntityType(p._entityType || 'unknown');
                         setDepartmentCode(p._deptCode || 'rehab');
                         setSearchQuery('');
                         setSearchOpen(false);
                         setShowProfileModal(true);
                      }}
                      className="group p-8 bg-zinc-50 border-2 border-transparent rounded-[2.5rem] hover:border-indigo-500 hover:bg-white hover:shadow-[0_32px_64px_-16px_rgba(79,70,229,0.15)] transition-all flex items-center justify-between text-left relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl group-hover:rotate-6">
                          <User size={28} />
                        </div>
                        <div>
                          <h4 className="text-xl font-[1000] text-zinc-900 uppercase tracking-tight truncate max-w-[180px]">{p.name || p.fullName || 'Unknown'}</h4>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{p._deptLabel}</span>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">ID: {p.patientId || p.studentId || p.customId || p.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={24} className="text-zinc-200 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all relative z-10" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 overflow-hidden">
        <div className="lg:col-span-4 space-y-8 md:space-y-12 min-w-0 order-2 lg:order-1">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-zinc-100 shadow-2xl shadow-zinc-200/50 h-full">
            <div className="flex items-center justify-between mb-8 md:mb-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600">
                  <Clock size={20} className="md:w-6 md:h-6" />
                </div>
                <h3 className="text-xl md:text-2xl font-[1000] text-zinc-900 uppercase tracking-tight">Queue</h3>
              </div>
              <div className="px-3 md:px-4 py-1.5 md:py-2 bg-amber-500 text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest animate-pulse">
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
                {incomingFeeReqs.map((req, index) => (
                  <div 
                    key={req.id} 
                    onClick={() => setDetailModalTx(req)}
                    className="group cursor-pointer bg-zinc-50 border border-transparent hover:border-indigo-200 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 transition-all hover:shadow-2xl hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={cn(
                          "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg",
                          req.type === 'income' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                        )}>
                          {req.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div>
                          <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest">{req.departmentCode}</p>
                          <h4 className="text-base md:text-lg font-black text-zinc-900 uppercase tracking-tight mt-0.5 md:mt-1">{req.patientName || req.donorName || 'General Req'}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg md:text-xl font-[1000] text-zinc-900 tracking-tighter tabular-nums">Rs {Number(req.amount).toLocaleString()}</p>
                        <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 md:mt-2">{formatDateDMY(req.date || req.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-row gap-3">
                      <button
                        type="button"
                        disabled={incomingActionId === req.id}
                        onClick={(e) => { e.stopPropagation(); openForwardModal(req); }}
                        className="flex-1 h-10 md:h-12 rounded-xl md:rounded-[1.2rem] bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                      >
                        {incomingActionId === req.id ? <Loader2 size={14} className="animate-spin" /> : 'Authorize'}
                      </button>
                      <button
                        type="button"
                        disabled={incomingActionId === req.id}
                        onClick={(e) => { e.stopPropagation(); openRejectModal(req); }}
                        className="flex-1 h-10 md:h-12 rounded-xl md:rounded-[1.2rem] bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-xl shadow-zinc-200/40 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
              <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 relative z-10">Revenue Today</p>
              <h4 className="text-xl md:text-3xl font-[1000] text-zinc-900 tracking-tighter relative z-10">Rs {totals.income.toLocaleString()}</h4>
            </div>
            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-xl shadow-zinc-200/40 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
              <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 relative z-10">Payouts Today</p>
              <h4 className="text-xl md:text-3xl font-[1000] text-zinc-900 tracking-tighter relative z-10">Rs {totals.expense.toLocaleString()}</h4>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 min-w-0 overflow-hidden space-y-12 order-1 lg:order-2">
          <div className="bg-white rounded-[3rem] md:rounded-[4rem] border border-zinc-100 p-8 md:p-14 shadow-[0_64px_96px_-32px_rgba(0,0,0,0.08)] relative overflow-hidden group/console">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-zinc-50 rounded-full -mr-64 -mt-64 blur-3xl group-hover/console:bg-indigo-50 transition-all duration-1000" />
            
            <div className="relative z-10 space-y-14">
              {selectedEntity ? (
                <div className="space-y-12 animate-in fade-in zoom-in-95 duration-700">
                  <div className="w-full p-10 md:p-16 rounded-[3.5rem] md:rounded-[5rem] bg-zinc-900 text-white min-w-0 shadow-[0_48px_80px_-24px_rgba(0,0,0,0.3)] group/profile relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -mr-64 -mt-64 blur-[100px] group-hover/profile:bg-white/10 transition-all duration-1000" />
                    
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-12">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
                          <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 backdrop-blur-2xl rounded-[3rem] md:rounded-[4rem] flex items-center justify-center border-2 border-white/20 shadow-2xl relative group/avatar overflow-hidden">
                            <User size={80} className="text-white/40 md:w-32 md:h-32 group-hover/avatar:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-zinc-900 shadow-xl">
                              <ShieldCheck size={24} className="text-white" />
                            </div>
                          </div>
                          <div className="text-center md:text-left space-y-6">
                            <div className="flex items-center justify-center md:justify-start gap-4">
                              <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Active Protocol Target</p>
                              </div>
                            </div>
                            <h2 className="text-3xl md:text-5xl lg:text-7xl font-[1000] tracking-tighter leading-none uppercase">{selectedEntity.name || selectedEntity.fullName}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-5">
                              <div className="px-8 py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest">
                                ID: <span className="text-indigo-400">{selectedEntity.patientId || selectedEntity.studentId || selectedEntity.employeeId || selectedEntity.rollNo || selectedEntity.id.slice(0, 8)}</span>
                              </div>
                              <div className="px-8 py-3 bg-indigo-600 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl">
                                {departmentCode}
                              </div>
                              <button 
                                onClick={() => setShowProfileModal(true)}
                                className="px-8 py-3 bg-white text-zinc-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-2xl flex items-center gap-3"
                              >
                                <Eye size={16} />
                                Full Ledger
                              </button>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setSelectedEntity(null); setAmount(''); }} 
                          className="w-20 h-20 bg-white/10 hover:bg-rose-600 text-white rounded-[2rem] flex items-center justify-center transition-all backdrop-blur-xl border border-white/10 shadow-2xl group/btn active:scale-90"
                        >
                          <X size={32} strokeWidth={3} className="group-hover/btn:rotate-90 transition-transform" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
                        <div className="p-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[3rem] group/card hover:bg-white/10 transition-all">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Total Protocol Value</p>
                          <h4 className="text-3xl font-[1000] tracking-tighter tabular-nums">Rs {(selectedEntity.totalPackage || selectedEntity.packageAmount || 0).toLocaleString()}</h4>
                        </div>
                        <div className="p-10 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-[3rem] group/card hover:bg-emerald-500/20 transition-all">
                          <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.3em] mb-4">Total Settled</p>
                          <h4 className="text-3xl font-[1000] text-emerald-400 tracking-tighter tabular-nums">Rs {(selectedEntity.totalReceived || selectedEntity.totalReceivedFees || 0).toLocaleString()}</h4>
                        </div>
                        <div className="p-10 bg-rose-500/10 backdrop-blur-sm border border-rose-500/20 rounded-[3rem] group/card hover:bg-rose-500/20 transition-all">
                          <p className="text-[10px] font-black text-rose-400/60 uppercase tracking-[0.3em] mb-4">Current Exposure</p>
                          <h4 className="text-3xl font-[1000] text-rose-400 tracking-tighter tabular-nums">Rs {(selectedEntity.remaining || ((selectedEntity.totalPackage || selectedEntity.packageAmount || 0) - (selectedEntity.totalReceived || 0))).toLocaleString()}</h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  {entityHistory.length > 0 && (
                    <div className="space-y-8 px-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xl font-[1000] text-zinc-900 uppercase tracking-tighter flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                            <History size={20} />
                          </div>
                          Journal Snippet
                        </h4>
                        <div className="h-[1px] flex-1 bg-zinc-100 mx-8" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {entityHistory.slice(0, 4).map((tx) => (
                          <div key={tx.id} className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 flex items-center justify-between group/tx hover:bg-white hover:border-indigo-200 hover:shadow-xl transition-all">
                            <div className="flex items-center gap-5">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover/tx:rotate-6",
                                tx.type === 'income' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
                              )}>
                                {tx.type === 'income' ? <Plus size={24} /> : <Minus size={24} />}
                              </div>
                              <div>
                                <p className="text-base font-black text-zinc-900 uppercase tracking-tight">{tx.categoryName || tx.category}</p>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{formatDateDMY(tx.date)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("text-xl font-[1000] tracking-tighter tabular-nums", tx.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                                Rs {tx.amount.toLocaleString()}
                              </p>
                              <div className="flex items-center justify-end gap-2 mt-1">
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  tx.status === 'approved' ? "bg-emerald-500" : "bg-amber-500"
                                )} />
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{tx.status}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-20 md:p-32 rounded-[4rem] bg-zinc-50 border-4 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center group/empty hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-1000">
                  <div className="relative">
                    <div className="absolute -inset-8 bg-white rounded-full blur-2xl opacity-0 group-hover/empty:opacity-100 transition-opacity" />
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-[3rem] flex items-center justify-center text-zinc-300 mb-10 shadow-2xl relative group-hover/empty:scale-110 group-hover/empty:text-indigo-500 group-hover/empty:rotate-12 transition-all duration-700">
                      <Terminal size={48} className="md:w-16 md:h-16" />
                    </div>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-[1000] text-zinc-900 uppercase tracking-tighter">Terminal Awaiting Target</h3>
                  <p className="text-xs md:text-base font-black text-zinc-400 uppercase tracking-[0.3em] mt-6 max-w-xl mx-auto leading-relaxed opacity-60">Select an entity from the universal search to initialize transaction protocol and open financial gateway.</p>
                </div>
              )}

              <form onSubmit={submitTx} className="space-y-16 pt-10 border-t border-zinc-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Department Vector</label>
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Required</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {DEPARTMENTS.map((dept) => (
                          <button
                            key={dept.code}
                            type="button"
                            onClick={() => {
                              setDepartmentCode(dept.code);
                              setSelectedEntity(null);
                              setAmount('');
                            }}
                            className={cn(
                              "h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all border-2 group/dept",
                              departmentCode === dept.code 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-600/30 -translate-y-1" 
                                : "bg-white border-zinc-100 text-zinc-400 hover:border-indigo-200 hover:text-zinc-600"
                            )}
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest group-hover/dept:scale-110 transition-transform">{dept.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Directional Flow</label>
                      <div className="grid grid-cols-2 gap-6">
                        <button
                          type="button"
                          onClick={() => setTxnType('income')}
                          className={cn(
                            "h-28 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all border-4 relative overflow-hidden group/flow",
                            txnType === 'income' 
                              ? "bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-500/30 -translate-y-1" 
                              : "bg-white border-zinc-100 text-zinc-400 hover:border-emerald-200 hover:bg-emerald-50"
                          )}
                        >
                          <TrendingUp size={32} className={cn("transition-transform group-hover/flow:scale-125", txnType === 'income' && "scale-110")} />
                          <span className="text-[11px] font-black uppercase tracking-[0.3em]">Credit Entry</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxnType('expense')}
                          className={cn(
                            "h-28 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all border-4 relative overflow-hidden group/flow",
                            txnType === 'expense' 
                              ? "bg-rose-600 border-rose-500 text-white shadow-2xl shadow-rose-500/30 -translate-y-1" 
                              : "bg-white border-zinc-100 text-zinc-400 hover:border-rose-200 hover:bg-rose-50"
                          )}
                        >
                          <TrendingDown size={32} className={cn("transition-transform group-hover/flow:scale-125", txnType === 'expense' && "scale-110")} />
                          <span className="text-[11px] font-black uppercase tracking-[0.3em]">Debit Entry</span>
                        </button>
                      </div>
                    </div>

                    {departmentCode === 'hospital' && (
                      <div className="p-10 bg-zinc-50 rounded-[3rem] border-2 border-zinc-100 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Activity size={24} />
                          </div>
                          <h4 className="text-2xl font-[1000] text-zinc-900 uppercase tracking-tighter">Clinical Vector</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {([
                            { id: 'opd_reception', label: 'OPD' },
                            { id: 'lab_test', label: 'Lab' },
                            { id: 'operation_theater', label: 'Surgery' },
                            { id: 'indoor_patient', label: 'Indoor' }
                          ] as const).map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setHospCategory(cat.id)}
                              className={cn(
                                "py-5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                hospCategory === cat.id ? "bg-zinc-900 border-zinc-900 text-white shadow-xl" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                              )}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-6 pt-6 border-t border-zinc-200">
                          <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Subject Identity</label>
                              <input value={hospPatientName} onChange={(e) => setHospPatientName(e.target.value)} placeholder="Enter patient name..." className="w-full h-16 bg-white border-2 border-zinc-100 rounded-[1.5rem] px-8 text-base font-bold outline-none focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all shadow-inner" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Phone / Contact</label>
                                <input value={hospContact} onChange={(e) => setHospContact(e.target.value)} placeholder="03xx-xxxxxxx" className="w-full h-16 bg-white border-2 border-zinc-100 rounded-[1.5rem] px-8 text-base font-bold outline-none focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all shadow-inner" />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Subject Age</label>
                                <input value={hospAge} onChange={(e) => setHospAge(e.target.value)} placeholder="Years" className="w-full h-16 bg-white border-2 border-zinc-100 rounded-[1.5rem] px-8 text-base font-bold outline-none focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all shadow-inner" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Transaction Date</label>
                      </div>
                      <BrutalistCalendar
                        value={txDate}
                        onChange={(iso) => setTxDate(iso)}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Protocol Value (PKR)</label>
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Real-time Calculation</span>
                        </div>
                      </div>
                      <div className="relative group/amount">
                        <div className="absolute inset-y-0 left-0 pl-10 flex items-center pointer-events-none">
                          <DollarSign size={40} className="text-indigo-600/20 group-focus-within/amount:text-indigo-600 transition-colors" />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-20 md:h-32 lg:h-40 bg-zinc-50 border-4 border-transparent rounded-[1.5rem] md:rounded-[2.5rem] lg:rounded-[3.5rem] pl-20 md:pl-24 pr-12 text-3xl md:text-5xl lg:text-7xl font-[1000] text-zinc-900 outline-none focus:ring-[24px] focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner tracking-tighter placeholder:text-zinc-200 tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Target Category</label>
                        <button type="button" onClick={() => createCategory()} className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-widest">+ Custom</button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                        <input 
                          value={categorySearch} 
                          onChange={(e) => setCategorySearch(e.target.value)} 
                          placeholder="Search classification..." 
                          className="w-full h-16 bg-zinc-50 border-2 border-transparent rounded-[1.5rem] pl-16 pr-6 text-sm font-bold outline-none focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner" 
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                        {visibleCategories.map((c) => (
                          <button 
                            key={c.id} 
                            type="button" 
                            onClick={() => setSelectedCategoryId(c.id)} 
                            className={cn(
                              'px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border-2', 
                              selectedCategoryId === c.id 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20 -translate-y-0.5' 
                                : 'bg-white border-zinc-100 text-zinc-500 hover:border-indigo-200'
                            )}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8 pt-6 border-t border-zinc-100">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Protocol Narration</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter mandatory context for this ledger entry..."
                          className="w-full bg-zinc-50 border-2 border-transparent rounded-[2rem] px-8 py-8 text-base font-bold text-zinc-900 outline-none focus:ring-8 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner min-h-[140px] resize-none"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={processing || (!selectedEntity && departmentCode !== 'hospital')} 
                        className="w-full h-24 md:h-32 bg-zinc-900 hover:bg-indigo-600 text-white font-[1000] text-lg md:text-xl uppercase tracking-[0.4em] rounded-[2.5rem] md:rounded-[3.5rem] transition-all shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] disabled:opacity-20 flex items-center justify-center gap-8 group/submit active:scale-[0.98]"
                      >
                        {processing ? <Loader2 size={32} className="animate-spin" /> : (
                          <>
                            Commit Entry
                            <ArrowRight size={32} className="group-hover:translate-x-4 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        <div className="mt-16 md:mt-24 space-y-12 lg:col-span-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-900 rounded-[2rem] md:rounded-[3rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/10">
                <FileText size={32} className="md:w-10 md:h-10" />
              </div>
              <div>
                <h2 className="text-4xl md:text-6xl font-[1000] text-zinc-900 uppercase tracking-tighter leading-none">
                  Live <span className="text-indigo-600">Journal</span>
                </h2>
                <p className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-[0.5em] mt-3">Quantum Financial Stream • Real-time Sync</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-[2rem] border border-zinc-100 shadow-xl">
                {(['today', 'yesterday', 'range', 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setHistoryDateMode(mode);
                      if (mode === 'yesterday') {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        const s = d.toISOString().split('T')[0];
                        setHistoryFrom(s);
                        setHistoryTo(s);
                      }
                    }}
                    className={cn(
                      "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      historyDateMode === mode ? "bg-zinc-900 text-white shadow-lg" : "bg-transparent text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {historyDateMode === 'range' && (
                <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                  <div className="w-[180px]">
                    <BrutalistCalendar
                      value={historyFrom}
                      onChange={(iso) => setHistoryFrom(iso)}
                      className="bg-white border border-zinc-100 rounded-2xl"
                    />
                  </div>
                  <span className="text-zinc-300 font-black">→</span>
                  <div className="w-[180px]">
                    <BrutalistCalendar
                      value={historyTo}
                      onChange={(iso) => setHistoryTo(iso)}
                      className="bg-white border border-zinc-100 rounded-2xl"
                    />
                  </div>
                </div>
              )}

              <select 
                value={historyDepartment}
                onChange={(e) => setHistoryDepartment(e.target.value)}
                className="h-16 bg-white border border-zinc-100 rounded-[1.5rem] px-8 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-600/20 shadow-xl cursor-pointer"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))}
              </select>

              <select 
                value={historyType}
                onChange={(e) => setHistoryType(e.target.value as any)}
                className="h-16 bg-white border border-zinc-100 rounded-[1.5rem] px-8 text-[10px] font-black uppercase tracking-widest shadow-xl cursor-pointer"
              >
                <option value="all">Full Spectrum</option>
                <option value="income">Credits Only</option>
                <option value="expense">Debits Only</option>
              </select>

              <div className="relative group min-w-[240px]">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan history..."
                  className="w-full h-16 bg-white border border-zinc-100 rounded-[1.5rem] pl-16 pr-8 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-600/20 shadow-xl"
                />
              </div>
            </div>
          </div>

          <div className="hidden md:block bg-white rounded-[3.5rem] border-2 border-zinc-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b-2 border-zinc-100 h-28">
                    <th className="px-12 text-left cursor-pointer hover:bg-zinc-100 transition-colors group/h" onClick={() => setSortConfig({key: 'date', direction: sortConfig.key === 'date' && sortConfig.direction === 'desc' ? 'asc' : 'desc'})}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Timestamp</span>
                        {sortConfig.key === 'date' && (
                          <div className="text-indigo-600 animate-in fade-in zoom-in duration-300">
                            {sortConfig.direction === 'asc' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="px-12 text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Entity Node</span>
                    </th>
                    <th className="px-12 text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Protocol</span>
                    </th>
                    <th className="px-12 text-right cursor-pointer hover:bg-zinc-100 transition-colors group/h" onClick={() => setSortConfig({key: 'amount', direction: sortConfig.key === 'amount' && sortConfig.direction === 'desc' ? 'asc' : 'desc'})}>
                      <div className="flex items-center justify-end gap-2">
                        {sortConfig.key === 'amount' && (
                          <div className="text-indigo-600 animate-in fade-in zoom-in duration-300">
                            {sortConfig.direction === 'asc' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
                          </div>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Flow</span>
                      </div>
                    </th>
                    <th className="px-12 text-right">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Status</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-zinc-50">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={5} className="px-12 py-40 text-center">
                        <div className="flex flex-col items-center gap-8">
                          <div className="w-20 h-20 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
                          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.5em]">Synchronizing Nexus...</p>
                        </div>
                      </td>
                    </tr>
                  ) : historyFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-12 py-40 text-center">
                        <p className="text-zinc-300 text-sm font-black uppercase tracking-[0.5em]">Zero records found in this dimension</p>
                      </td>
                    </tr>
                  ) : historyFiltered.map((tx: any) => (
                    <tr key={tx.id} onClick={() => setDetailModalTx(tx)} className="hover:bg-zinc-50 transition-all cursor-pointer group h-28">
                      <td className="px-12 py-8">
                        <div className="text-xs font-black text-zinc-900 tabular-nums">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</div>
                        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">UTC {new Date(tx.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="px-12 py-8">
                        <div className="text-lg font-[1000] text-zinc-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{tx.patientName || tx.staffName || 'General Nexus'}</div>
                        <div className="text-[9px] font-black text-zinc-400 tracking-[0.3em] uppercase mt-2">{tx.id?.slice(0, 12)}</div>
                      </td>
                      <td className="px-12 py-8">
                        <span className="inline-flex items-center h-10 px-6 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                          {tx.categoryName || tx.category}
                        </span>
                      </td>
                      <td className="px-12 py-8 text-right">
                        <div className={cn('text-3xl font-[1000] tracking-tighter tabular-nums', tx.type === 'income' ? 'text-indigo-600' : 'text-rose-500')}>
                          {tx.type === 'income' ? '+' : '-'} {Number(tx.amount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-12 py-8 text-right">
                        <div className="flex items-center justify-end gap-6">
                          <span className={cn('h-12 px-8 flex items-center rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] border-2 transition-all', 
                            tx.status === 'approved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                            tx.status === 'rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                            'bg-zinc-50 text-zinc-400 border-zinc-100'
                          )}>
                            {tx.status || 'pending'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      {showProfileModal && selectedEntity && (
        <EntityProfileModal 
          entity={selectedEntity} 
          onClose={() => setShowProfileModal(false)}
          allTransactions={historyTxns}
          allCategories={allCategories}
          onAddCustomCategory={(cat) => setCustomCategories(p => [...p, cat])}
          onRefetch={() => {
            fetchHistory();
            fetchEntityHistory(selectedEntity);
          }}
        />
      )}

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
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] ml-2">Quantum Magnitude</span>
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
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] px-8 py-6 text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-50/10 focus:border-indigo-500 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
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
                <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-600/20">
                  <FileText size={32} className="md:w-10 md:h-10" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl md:text-3xl font-[1000] text-zinc-900 uppercase tracking-tighter">Audit Dossier</h3>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em] mt-3">{detailModalTx.id}</p>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-[2rem] bg-zinc-50 border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">Matrix Time</p>
                    <p className="text-sm font-[1000] text-zinc-900">{formatDateDMY(detailModalTx.createdAt || detailModalTx.date)}</p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-zinc-50 border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">Node Source</p>
                    <p className="text-sm font-[1000] text-zinc-900 uppercase">{detailModalTx.departmentCode || 'HQ-MAIN'}</p>
                  </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-indigo-600 shadow-2xl shadow-indigo-600/30 group text-white">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-3">Entity Identity</p>
                  <p className="text-2xl font-[1000] text-white tracking-tight">{detailModalTx.patientName || detailModalTx.staffName || 'General Nexus'}</p>
                  <p className="text-xs font-black text-white/60 mt-2 font-mono uppercase tracking-widest">{detailModalTx.patientId || detailModalTx.staffId || 'ANONYMOUS_VOID'}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 px-4">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-2">Classification</p>
                    <p className="text-base font-[1000] text-zinc-900">{detailModalTx.categoryName || detailModalTx.category || 'Undefined'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-2">Magnitude</p>
                    <p className="text-2xl font-[1000] text-zinc-900 tabular-nums">Rs {Number(detailModalTx.amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                {detailModalTx.description && (
                  <div className="p-8 rounded-[2.5rem] bg-zinc-50 border-2 border-dashed border-zinc-200">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 text-center">Context Payload</p>
                    <p className="text-sm font-black text-zinc-600 text-center leading-relaxed italic">
                      "{detailModalTx.description}"
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-12 grid grid-cols-2 gap-4">
                {['pending', 'pending_cashier'].includes(detailModalTx.status) && (
                  <button 
                    onClick={() => {
                      setDetailModalTx(null);
                      handleDeleteTransaction(detailModalTx);
                    }}
                    className="h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-600 hover:text-white transition-all shadow-xl shadow-rose-600/5"
                  >
                    Purge Record
                  </button>
                )}
                {detailModalTx.status === 'pending_cashier' ? (
                  <button 
                    onClick={() => {
                      setDetailModalTx(null);
                      openForwardModal(detailModalTx);
                    }}
                    className="h-16 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all"
                  >
                    Authorize Node
                  </button>
                ) : (
                  <button 
                    onClick={() => setDetailModalTx(null)}
                    className="h-16 bg-zinc-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-xl"
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
    </div>
  </div>
);
}

function EntityProfileModal({ 
  entity, 
  onClose,
  allTransactions,
  onDeleteTransaction,
  onRefetch,
  allCategories = BASE_CATEGORIES,
  onAddCustomCategory,
}: { 
  entity: any; 
  onClose: () => void;
  allTransactions: any[];
  onDeleteTransaction?: (tx: any) => Promise<void>;
  onRefetch?: () => void;
  allCategories?: readonly any[];
  onAddCustomCategory?: (cat: any) => void;
}) {
  const [localTxns, setLocalTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [profileSortConfig, setProfileSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: '',
    category: 'fee',
    categoryName: 'Admission / Fees',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const { session } = useHqSession();

  const handleCreateCategory = async (isForEdit: boolean = false) => {
    const name = customCategoryName.trim();
    if (!name) return;
    const slug = slugify(name);
    
    // Check if exists
    const existing = allCategories.find(c => c.id === slug);
    if (existing) {
      if (isForEdit) {
        setEditForm({ ...editForm, category: existing.id, categoryName: existing.name });
      } else {
        setNewTx({ ...newTx, category: existing.id, categoryName: existing.name });
      }
      setShowCustomCategoryInput(false);
      setCustomCategoryName('');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const type = isForEdit ? (localTxns.find(t => t.id === editingId)?.type || 'income') : 'income';
      const newCat = { 
        name, 
        slug, 
        appliesTo: type, 
        isCustom: true, 
        createdBy: session?.uid, 
        createdAt: Timestamp.now() 
      };
      
      await addDoc(collection(db, 'hq_cashier_categories'), newCat);
      
      const catObj = { id: slug, name, appliesTo: type };
      if (onAddCustomCategory) onAddCustomCategory(catObj);
      
      if (isForEdit) {
        setEditForm({ ...editForm, category: slug, categoryName: name });
      } else {
        setNewTx({ ...newTx, category: slug, categoryName: name });
      }
      
      setShowCustomCategoryInput(false);
      setCustomCategoryName('');
      toast.success('Category created ✓');
    } catch (err: any) {
      toast.error('Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!newTx.amount || Number(newTx.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setAdding(true);
    try {
      const deptCode = entity._deptCode || 'rehab';
      const dept = DEPARTMENTS.find(d => d.code === deptCode);
      if (!dept) throw new Error('Invalid Department');

      const txDate = new Date(`${newTx.date}T12:00:00`);
      
      const payload: any = {
        amount: Number(newTx.amount),
        category: newTx.category,
        categoryName: newTx.categoryName,
        date: Timestamp.fromDate(txDate),
        createdAt: Timestamp.now(),
        description: newTx.description,
        status: 'pending_cashier',
        type: 'income',
        departmentCode: deptCode,
        cashierId: 'CASHIER',
      };

      if (deptCode === 'spims') {
        payload.studentId = entity.id;
        payload.studentName = entity.name || entity.fullName;
      } else {
        const idFieldMap: Record<string, string> = {
          'rehab': 'patientId', 'hospital': 'patientId', 'sukoon-center': 'clientId', 'welfare': 'donorId', 'job-center': 'seekerId',
        };
        const idField = idFieldMap[deptCode] || 'patientId';
        payload[idField] = entity.id;
        payload.patientName = entity.name || entity.fullName;
      }

      const docRef = await addDoc(collection(db, dept.txCollection), payload);
      
      const freshDoc = { id: docRef.id, ...payload, _collection: dept.txCollection };
      setLocalTxns(prev => [freshDoc, ...prev]);
      
      setShowAddForm(false);
      setNewTx({ amount: '', category: 'fee', categoryName: 'Admission / Fees', date: new Date().toISOString().split('T')[0], description: '' });
      toast.success('Transaction added successfully ✓');
      if (onRefetch) onRefetch();
    } catch (err: any) {
      toast.error('Failed to add: ' + (err.message || 'Error'));
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (tx: any) => {
    if (!editForm) return;
    setLoading(true);
    try {
      const coll = tx._collection || 'spims_transactions';
      const docRef = doc(db, coll, tx.id);
      
      const updatePayload: any = {
        amount: Number(editForm.amount),
        category: editForm.category,
        categoryName: editForm.categoryName,
        date: Timestamp.fromDate(new Date(`${editForm.date}T12:00:00`)),
      };

      if (coll === 'spims_fees') {
        updatePayload.type = editForm.categoryName.includes('Admission') ? 'admission' : 'monthly';
      }

      await updateDoc(docRef, updatePayload);
      
      setLocalTxns(prev => prev.map(t => t.id === tx.id ? { ...t, ...updatePayload, amount: Number(editForm.amount) } : t));
      setEditingId(null);
      setEditForm(null);
      toast.success('Record updated successfully ✓');
      if (onRefetch) onRefetch();
    } catch (err: any) {
      toast.error('Update failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const entityId = entity.id;
        const deptCode = entity._deptCode || 'rehab';
        const dept = DEPARTMENTS.find(d => d.code === deptCode);
        
        if (!dept) { setLoading(false); return; }

        const results: any[] = [];

        if (deptCode === 'spims') {
          const visualId = entity.studentId || entity.rollNumber || entity.customId;
          
          const [txSnap, txSnapAlt, feesSnap, feesSnapAlt] = await Promise.all([
            getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', entityId), limit(200))),
            visualId ? getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', visualId), limit(200))) : Promise.resolve({ docs: [] }),
            getDocs(query(collection(db, 'spims_fees'), where('studentId', '==', entityId), limit(200))),
            visualId ? getDocs(query(collection(db, 'spims_fees'), where('studentId', '==', visualId), limit(200))) : Promise.resolve({ docs: [] })
          ]);

          const [txSnapPat, txSnapPatAlt] = await Promise.all([
            getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', entityId), limit(200))),
            visualId ? getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', visualId), limit(200))) : Promise.resolve({ docs: [] })
          ]);
          
          const txMap = new Map<string, any>();
          [...txSnap.docs, ...txSnapAlt.docs, ...txSnapPat.docs, ...txSnapPatAlt.docs].forEach(d => {
            txMap.set(d.id, { id: d.id, ...d.data(), _collection: 'spims_transactions' });
          });
          
          results.push(...Array.from(txMap.values()));
          
          const feeMap = new Map<string, any>();
          [...feesSnap.docs, ...feesSnapAlt.docs].forEach(d => {
            feeMap.set(d.id, { id: d.id, ...d.data() });
          });

          feeMap.forEach((feeData, feeId) => {
            const linkedId = feeData.linkedTransactionId;
            if (!linkedId || !txMap.has(linkedId)) {
              results.push({
                id: feeId,
                ...feeData,
                _collection: 'spims_fees',
                type: 'income',
                categoryName: `Fee — ${feeData.type || 'Monthly'}`,
                status: feeData.status || 'pending',
                patientName: feeData.studentName,
              });
            }
          });
        } else {
          const idFieldMap: Record<string, string> = {
            'rehab': 'patientId',
            'hospital': 'patientId',
            'sukoon-center': 'clientId',
            'welfare': 'donorId',
            'job-center': 'seekerId',
          };
          const idField = idFieldMap[deptCode] || 'patientId';
          
          const snap = await getDocs(query(
            collection(db, dept.txCollection),
            where(idField, '==', entityId),
            limit(200)
          ));
          snap.docs.forEach(d => {
            results.push({ 
              id: d.id, 
              ...d.data(), 
              _collection: dept.txCollection 
            });
          });
        }

        results.sort((a, b) => {
          const tA = toDate(a.transactionDate || a.date || a.createdAt).getTime();
          const tB = toDate(b.transactionDate || b.date || b.createdAt).getTime();
          return tB - tA;
        });

        setLocalTxns(results);
      } catch (err) {
        console.error('[EntityProfileModal] fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [entity]);

  const handleDelete = async (tx: any) => {
    if (!window.confirm(`Delete this ${tx.status} transaction of Rs ${Number(tx.amount).toLocaleString()}? This cannot be undone.`)) return;
    
    let targetCollection = tx._collection;
    if (!targetCollection) {
      const deptCode = tx.departmentCode || entity?._deptCode;
      const dept = DEPARTMENTS.find(d => d.code === deptCode);
      if (dept) targetCollection = dept.txCollection;
    }

    if (!targetCollection) {
      toast.error('Critical Error: Source collection undefined. Deletion aborted for safety.');
      return;
    }

    setDeletingId(tx.id);
    try {
      await deleteDoc(doc(db, targetCollection, tx.id));
      setLocalTxns(prev => prev.filter(t => t.id !== tx.id));
      toast.success('Transaction deleted ✓');
      if (onRefetch) onRefetch();
    } catch (err: any) {
      toast.error('Delete failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    let result = localTxns.filter(t => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'pending') return ['pending', 'pending_cashier'].includes(t.status);
      return t.status === filterStatus;
    });

    result.sort((a, b) => {
      if (profileSortConfig.key === 'date') {
        const tA = toDate(a.transactionDate || a.date || a.createdAt).getTime();
        const tB = toDate(b.transactionDate || b.date || b.createdAt).getTime();
        return profileSortConfig.direction === 'asc' ? tA - tB : tB - tA;
      } else {
        const valA = Number(a.amount || 0);
        const valB = Number(b.amount || 0);
        return profileSortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [localTxns, filterStatus, profileSortConfig]);

  const totalPackage = entity.totalPackage || entity.packageAmount || 0;
  const totalApproved = localTxns
    .filter(t => t.type === 'income' && t.status === 'approved')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalPending = localTxns
    .filter(t => t.type === 'income' && ['pending', 'pending_cashier'].includes(t.status))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const remaining = totalPackage - totalApproved;

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-12 bg-zinc-950/80 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-5xl h-[98vh] md:h-[92vh] bg-white rounded-t-[2.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-zinc-100">
        
        <div className="bg-zinc-900 px-6 md:px-8 py-6 md:py-8 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                <User size={24} className="md:hidden text-white" />
                <User size={32} className="hidden md:block text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg md:text-3xl font-black text-white uppercase tracking-tight truncate leading-tight">
                  {entity.name || entity.fullName}
                </h2>
                <p className="text-[10px] md:text-sm text-white/50 font-bold mt-0.5 md:mt-1 truncate">
                  {entity._deptLabel} • ID: {entity.patientId || entity.studentId || entity.id?.slice(0,8)}
                  {entity.rollNumber && ` • Roll: ${entity.rollNumber}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.print()} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-all">
                <Printer size={20} />
              </button>
              <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-zinc-100 flex-shrink-0 overflow-hidden">
          <div className="p-4 md:p-6 border-r border-b md:border-b-0 border-zinc-100">
            <p className="text-[9px] md:text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Total Package</p>
            <p className="text-base md:text-2xl font-[1000] text-zinc-900 tracking-tighter">Rs {totalPackage.toLocaleString()}</p>
          </div>
          <div className="p-4 md:p-6 border-r border-b md:border-b-0 border-zinc-100 bg-emerald-50/30">
            <p className="text-[9px] md:text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Approved Paid</p>
            <p className="text-base md:text-2xl font-[1000] text-emerald-700 tracking-tighter">Rs {totalApproved.toLocaleString()}</p>
          </div>
          <div className="p-4 md:p-6 border-r border-zinc-100 bg-amber-50/30">
            <p className="text-[9px] md:text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Pending Review</p>
            <p className="text-base md:text-2xl font-[1000] text-amber-700 tracking-tighter">Rs {totalPending.toLocaleString()}</p>
          </div>
          <div className="p-4 md:p-6 bg-rose-50/30">
            <p className="text-[9px] md:text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Still Remaining</p>
            <p className="text-base md:text-2xl font-[1000] text-rose-700 tracking-tighter">Rs {remaining.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-4 border-b border-zinc-100 flex-shrink-0 bg-zinc-50 gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Filter:</span>
            {(['all', 'pending', 'approved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  filterStatus === s
                    ? 'bg-zinc-900 text-white shadow-lg'
                    : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-400'
                )}
              >
                {s} ({s === 'all' ? localTxns.length : s === 'pending' ? localTxns.filter(t => ['pending','pending_cashier'].includes(t.status)).length : localTxns.filter(t => t.status === s).length})
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={cn(
              "w-full md:w-auto px-6 py-3 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              showAddForm ? "bg-rose-100 text-rose-600" : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            )}
          >
            {showAddForm ? <X size={14} /> : <Plus size={14} />}
            {showAddForm ? "Dismiss Panel" : "Quick Entry"}
          </button>
        </div>

        {showAddForm && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <BrutalistCalendar
                  label="Date"
                  value={newTx.date}
                  onChange={(iso: string) => setNewTx({...newTx, date: iso})}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase text-indigo-400">Category</label>
                  <button 
                    onClick={() => setShowCustomCategoryInput(!showCustomCategoryInput)}
                    className="text-[8px] font-black uppercase text-indigo-600 hover:underline"
                  >
                    {showCustomCategoryInput ? 'Cancel' : '+ Custom'}
                  </button>
                </div>
                {showCustomCategoryInput ? (
                  <div className="flex gap-2">
                    <input 
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="New name..."
                      className="flex-1 h-12 bg-white border border-indigo-200 rounded-xl px-4 text-xs font-bold outline-none"
                    />
                    <button 
                      onClick={() => handleCreateCategory(false)}
                      disabled={isCreatingCategory}
                      className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center"
                    >
                      {isCreatingCategory ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                  </div>
                ) : (
                  <select 
                    value={newTx.category}
                    onChange={(e) => {
                      const cat = allCategories.find(c => c.id === e.target.value);
                      setNewTx({...newTx, category: e.target.value, categoryName: cat?.name || e.target.value});
                    }}
                    className="w-full h-12 bg-white border border-indigo-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-indigo-400"
                  >
                    {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-indigo-400">Amount (Rs)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({...newTx, amount: e.target.value})}
                  className="w-full h-12 bg-white border border-indigo-100 rounded-xl px-4 text-xs font-black outline-none focus:border-indigo-400 tabular-nums"
                />
              </div>
              <button 
                onClick={handleAddTransaction}
                disabled={adding}
                className="h-12 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Terminal size={14} />}
                Execute
              </button>
            </div>
            <div className="mt-4">
              <input 
                placeholder="Optional narration / context..."
                value={newTx.description}
                onChange={(e) => setNewTx({...newTx, description: e.target.value})}
                className="w-full h-10 bg-white/50 border border-indigo-100 rounded-xl px-4 text-[10px] font-bold outline-none focus:bg-white"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <FileText size={40} className="text-zinc-200" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">End of History</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th 
                        className="px-6 py-4 text-left cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => setProfileSortConfig({ key: 'date', direction: profileSortConfig.key === 'date' && profileSortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Date</span>
                          {profileSortConfig.key === 'date' && (
                            <div className="text-indigo-600">
                              {profileSortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            </div>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</th>
                      <th 
                        className="px-6 py-4 text-right cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => setProfileSortConfig({ key: 'amount', direction: profileSortConfig.key === 'amount' && profileSortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                      >
                        <div className="flex items-center justify-end gap-2">
                          {profileSortConfig.key === 'amount' && (
                            <div className="text-indigo-600">
                              {profileSortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            </div>
                          )}
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Amount</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filtered.map((tx) => {
                      const isEditing = editingId === tx.id;
                      return (
                        <tr key={tx.id} className={cn("hover:bg-zinc-50 transition-colors group", isEditing && "bg-indigo-50/50")}>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <BrutalistCalendar
                                value={editForm.date}
                                onChange={(iso: string) => setEditForm({ ...editForm, date: iso })}
                              />
                            ) : (
                              <span className="text-sm font-bold text-zinc-700 whitespace-nowrap">
                                {formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              )}>
                                {tx.type === 'income' ? <Plus size={16} /> : <Minus size={16} />}
                              </div>
                              <div className="min-w-0">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <button 
                                        onClick={() => setShowCustomCategoryInput(!showCustomCategoryInput)}
                                        className="text-[8px] font-black uppercase text-indigo-600 hover:underline"
                                      >
                                        {showCustomCategoryInput ? 'Cancel' : '+ Custom'}
                                      </button>
                                    </div>
                                    {showCustomCategoryInput ? (
                                      <div className="flex gap-2">
                                        <input 
                                          value={customCategoryName}
                                          onChange={(e) => setCustomCategoryName(e.target.value)}
                                          placeholder="New..."
                                          className="flex-1 h-9 bg-white border border-zinc-200 rounded-lg px-2 text-[10px] font-bold outline-none"
                                        />
                                        <button 
                                          onClick={() => handleCreateCategory(true)}
                                          disabled={isCreatingCategory}
                                          className="w-9 h-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center"
                                        >
                                          {isCreatingCategory ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                        </button>
                                      </div>
                                    ) : (
                                      <select 
                                        className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs font-bold outline-none"
                                        value={editForm.category}
                                        onChange={(e) => {
                                          const cat = allCategories.find(c => c.id === e.target.value);
                                          setEditForm({ ...editForm, category: e.target.value, categoryName: cat?.name || e.target.value });
                                        }}
                                      >
                                        {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                      </select>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm font-black text-zinc-900 truncate uppercase tracking-tight">{tx.categoryName || tx.category}</p>
                                    {tx.description && (
                                      <p className="text-[10px] text-zinc-400 truncate max-w-[200px] font-bold italic">{tx.description}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <input 
                                type="number" 
                                className="w-32 bg-white border border-zinc-200 rounded-lg p-2 text-right text-sm font-black outline-none"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                              />
                            ) : (
                              <span className={cn(
                                'text-lg font-[1000] tabular-nums tracking-tighter',
                                tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                              )}>
                                {tx.type === 'income' ? '+' : '-'} Rs {Number(tx.amount || 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                              tx.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              tx.status === 'rejected' || tx.status === 'rejected_cashier' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            )}>
                              {tx.status === 'pending_cashier' ? 'Pending' : tx.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleUpdate(tx)}
                                    disabled={loading}
                                    className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg disabled:opacity-50"
                                  >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                  </button>
                                  <button
                                    onClick={() => { setEditingId(null); setEditForm(null); }}
                                    className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-400 flex items-center justify-center"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                ['pending', 'pending_cashier'].includes(tx.status) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingId(tx.id);
                                        setEditForm({
                                          amount: tx.amount,
                                          category: tx.category || 'fee',
                                          categoryName: tx.categoryName || 'Admission / Fees',
                                          date: toDate(tx.transactionDate || tx.date || tx.createdAt).toISOString().split('T')[0]
                                        });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100"
                                    >
                                      <Terminal size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(tx)}
                                      disabled={deletingId === tx.id}
                                      className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100"
                                    >
                                      {deletingId === tx.id 
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <Trash2 size={14} />
                                      }
                                    </button>
                                  </>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {filtered.map((tx) => {
                  const isEditing = editingId === tx.id;
                  const dateLabel = formatDateDMY(tx.transactionDate || tx.date || tx.createdAt);
                  return (
                    <div key={tx.id} className={cn(
                      "bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm transition-all",
                      isEditing && "ring-2 ring-indigo-500 border-transparent shadow-xl"
                    )}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <BrutalistCalendar
                            value={editForm.date}
                            onChange={(iso) => setEditForm({ ...editForm, date: iso })}
                            className="bg-zinc-50 border border-zinc-100 rounded-xl"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[8px] font-black text-zinc-400 uppercase">Category</label>
                              <button 
                                onClick={() => setShowCustomCategoryInput(!showCustomCategoryInput)}
                                className="text-[8px] font-black text-indigo-600 uppercase"
                              >
                                {showCustomCategoryInput ? 'Cancel' : '+ Custom'}
                              </button>
                            </div>
                            {showCustomCategoryInput ? (
                              <div className="flex gap-2">
                                <input 
                                  value={customCategoryName}
                                  onChange={(e) => setCustomCategoryName(e.target.value)}
                                  placeholder="New category..."
                                  className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-xs font-bold"
                                />
                                <button 
                                  onClick={() => handleCreateCategory(true)}
                                  disabled={isCreatingCategory}
                                  className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center"
                                >
                                  {isCreatingCategory ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </button>
                              </div>
                            ) : (
                              <select 
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-xs font-bold"
                                value={editForm.category}
                                onChange={(e) => {
                                  const cat = allCategories.find(c => c.id === e.target.value);
                                  setEditForm({ ...editForm, category: e.target.value, categoryName: cat?.name || e.target.value });
                                }}
                              >
                                {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            )}
                          </div>
                          <input 
                            type="number" 
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-sm font-black"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdate(tx)} 
                              disabled={loading}
                              className="flex-1 bg-emerald-500 text-white h-12 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {loading && <Loader2 size={14} className="animate-spin" />}
                              Update
                            </button>
                            <button 
                              onClick={() => { setEditingId(null); setEditForm(null); }} 
                              disabled={loading}
                              className="flex-1 bg-zinc-100 text-zinc-400 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-center"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              )}>
                                {tx.type === 'income' ? <Plus size={18} /> : <Minus size={18} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">{tx.categoryName || tx.category}</p>
                                <p className="text-[10px] font-bold text-zinc-400">{dateLabel}</p>
                              </div>
                            </div>
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest',
                              tx.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              tx.status === 'rejected' || tx.status === 'rejected_cashier' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            )}>
                              {tx.status === 'pending_cashier' ? 'Pending' : tx.status || 'Pending'}
                            </span>
                          </div>
                          
                          <div className="flex items-end justify-between">
                            <div className="min-w-0 flex-1 pr-4">
                              {tx.description && (
                                <p className="text-[9px] text-zinc-400 font-bold italic line-clamp-2">{tx.description}</p>
                              )}
                            </div>
                            <p className={cn(
                              'text-lg font-[1000] tracking-tighter tabular-nums whitespace-nowrap',
                              tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                            )}>
                              Rs {Number(tx.amount || 0).toLocaleString()}
                            </p>
                          </div>

                          {['pending', 'pending_cashier'].includes(tx.status) && (
                            <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-50">
                              <button
                                onClick={() => {
                                  setEditingId(tx.id);
                                  setEditForm({
                                    amount: tx.amount,
                                    category: tx.category || 'fee',
                                    categoryName: tx.categoryName || 'Admission / Fees',
                                    date: toDate(tx.transactionDate || tx.date || tx.createdAt).toISOString().split('T')[0]
                                  });
                                }}
                                className="flex-1 bg-indigo-50 text-indigo-600 h-9 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                              >
                                <Terminal size={12} /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(tx)}
                                disabled={deletingId === tx.id}
                                className="flex-1 bg-rose-50 text-rose-500 h-9 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                              >
                                {deletingId === tx.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-zinc-50 border-t border-zinc-100 flex-shrink-0 print:hidden">
          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest text-center">
            Khan Hub HQ • {entity._deptLabel} Financial Record
          </p>
        </div>
      </div>
    </div>
  );
}
