// src/app/hq/dashboard/cashier/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, deleteDoc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, startAfter, Timestamp, updateDoc, where, QueryConstraint, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, DollarSign, FileText, History, LayoutDashboard, Loader2, Lock, Minus, Plus, Search, TrendingDown, TrendingUp, X, RefreshCw, ShieldCheck, Clock, Activity, Trash2, Sparkles, Eye, Calendar, Check, Camera, Terminal, User, Printer, ChevronRight, ArrowUp, ArrowDown, Calculator } from 'lucide-react';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { cn, formatDateDMY, parseDateDMY, toDate } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { markHqNotificationRead, markAllHqNotificationsRead, subscribeHqNotifications, sendHqPushNotification } from '@/lib/hqNotifications';
import { toast } from 'react-hot-toast';
import { LogoLoader } from '@/components/ui';
import { getCached, setCached } from '@/lib/queryCache';
import type { HospitalTxCategory, HospitalTxMeta, LabTestMeta, OperationMeta, OpdReceptionMeta } from '@/types/hospital';
import { BrutalistCalendar } from '@/components/ui';


type TxnType = 'income' | 'expense';
type DateMode = 'today' | 'all' | 'range' | 'created_today' | 'yesterday';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PaymentMethod = 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'credit' | 'other';

const DEPARTMENTS = [
  { code: 'rehab', label: 'Rehab Center', txCollection: 'rehab_transactions', entityCollection: 'rehab_patients' },
  { code: 'spims', label: 'Spims', txCollection: 'spims_transactions', entityCollection: 'spims_students' },
  { code: 'hospital', label: 'Khan Hospital', txCollection: 'hospital_transactions', entityCollection: 'hospital_patients' },
  { code: 'sukoon-center', label: 'Sukoon Center', txCollection: 'sukoon_transactions', entityCollection: 'sukoon_clients' },
  { code: 'welfare', label: 'Welfare', txCollection: 'welfare_transactions', entityCollection: 'welfare_donors' },
  { code: 'job-center', label: 'Job Center', txCollection: 'jobcenter_transactions', entityCollection: 'jobcenter_seekers' },
  { code: 'it', label: 'IT Department', txCollection: 'it_transactions', entityCollection: 'it_users' },
  { code: 'social-media', label: 'Social Media', txCollection: 'media_transactions', entityCollection: 'media_users' },
  { code: 'hq', label: 'HQ Head Office', txCollection: 'hq_transactions', entityCollection: 'hq_users' },
];

function findDept(deptCode: string) {
  if (!deptCode) return DEPARTMENTS[0];
  const low = String(deptCode).toLowerCase().replace(/_/g, '-');
  const found = DEPARTMENTS.find(d => {
    const codeLow = d.code.toLowerCase().replace(/_/g, '-');
    if (codeLow === low) return true;
    if ((low === 'media' || low === 'social-media') && (codeLow === 'media' || codeLow === 'social-media')) return true;
    if ((low === 'sukoon' || low === 'sukoon-center') && (codeLow === 'sukoon' || codeLow === 'sukoon-center')) return true;
    if ((low === 'jobcenter' || low === 'job-center') && (codeLow === 'jobcenter' || codeLow === 'job-center')) return true;
    return false;
  });
  return found || DEPARTMENTS.find(d => d.code === 'rehab') || DEPARTMENTS[0];
}

const BASE_CATEGORIES = [
  { id: 'fee', name: 'Admission Fee', appliesTo: 'income' },
  { id: 'monthly_fee', name: 'Monthly Fee', appliesTo: 'income' },
  { id: 'medicine_charge', name: 'Medicine / Treatment', appliesTo: 'income' },
  { id: 'donation', name: 'Donation', appliesTo: 'income' },
  { id: 'canteen', name: 'Canteen', appliesTo: 'both' },
  { id: 'utilities', name: 'Utilities', appliesTo: 'expense' },
  { id: 'maintenance', name: 'Maintenance', appliesTo: 'expense' },
  { id: 'other_income', name: 'Other', appliesTo: 'income' },
  { id: 'other_expense', name: 'Other Expense', appliesTo: 'expense' },
] as const;

function slugify(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function reverseEntityTotals(db: any, deptCode: string, txData: any) {
  const entityId = txData.patientId || txData.studentId || txData.seekerId || txData.donorId || txData.clientId;
  if (!entityId) return;

  let col = '';
  if (deptCode === 'rehab') col = 'rehab_patients';
  else if (deptCode === 'spims') col = 'spims_students';
  else if (deptCode === 'job-center') col = 'job_center_seekers';
  else if (deptCode === 'hospital') col = 'hospital_patients';
  else if (deptCode === 'sukoon-center') col = 'sukoon_clients';
  else if (deptCode === 'welfare') col = 'welfare_donors';
  else return;

  try {
    const ref = doc(db, col, entityId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const amount = Number(txData.amount) || 0;
    const discount = Number(txData.discount || 0);
    const returnAmount = Number(txData.returnAmount || txData.return || 0);
    const isIncome = txData.type === 'income' || txData.type === undefined;
    const netAmount = amount - returnAmount;
    const diff = isIncome ? -netAmount : netAmount;

    const update: Record<string, any> = {};

    if (deptCode === 'rehab' && txData.category === 'medicine_charge') {
      update.medicineCharges = increment(-netAmount);
    } else {
      update.totalReceived = increment(diff);
      update.totalDiscount = increment(isIncome ? -discount : discount);
    }

    if (deptCode === 'spims' && isIncome && txData.category !== 'medicine_charge') {
      const subtype = txData.spimsFeeSubtype;
      if (subtype === 'admission') update.admissionPaid = increment(-amount);
      if (subtype === 'registration') update.registrationPaid = increment(-amount);
      if (subtype === 'examination') update.examinationPaid = increment(-amount);
    }

    await updateDoc(ref, update);

    const updatedSnap = await getDoc(ref);
    const updatedData = updatedSnap.data() as any;
    const pkg = Number(updatedData?.totalStayPackage || updatedData?.totalPackage || updatedData?.totalPackageAmount) || 0;
    const medCharges = Number(updatedData?.medicineCharges) || 0;
    const totalObligation = pkg + medCharges;
    const received = Number(updatedData?.totalReceived) || 0;
    const totalDiscount = Number(updatedData?.totalDiscount) || 0;

    await updateDoc(ref, {
      remaining: Math.max(0, totalObligation - received - totalDiscount),
      remainingBalance: Math.max(0, totalObligation - received - totalDiscount),
    });
  } catch (err) {
    console.error('[Cashier] reverseEntityTotals error:', err);
  }
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
  const [searchType, setSearchType] = useState<'patient' | 'student' | 'other' | 'staff' | 'job seeker' | 'company'>('patient');

  // Hospital Specific States
  const [hospitalMode, setHospitalMode] = useState<'none' | 'day_close' | 'all_transactions'>('none');
  
  // Job Center Specific States
  const [jobCenterMode, setJobCenterMode] = useState<'none' | 'day_close' | 'all_transactions'>('none');
  const [jobCenterIncomeAmount, setJobCenterIncomeAmount] = useState('');
  const [jobCenterExpenseAmount, setJobCenterExpenseAmount] = useState('');
  const [hospitalTxForm, setHospitalTxForm] = useState({
    serialNumber: '',
    patientName: '',
    fatherName: '',
    category: 'Check-up Patient',
    reason: '',
  });
  const [hospitalShift, setHospitalShift] = useState<'morning_shift' | 'night_shift' | 'combine'>('combine');
  const [hospitalIncomeAmount, setHospitalIncomeAmount] = useState('');
  const [hospitalExpenseAmount, setHospitalExpenseAmount] = useState('');

  // Refined Hospital Cashier States for Common Hospital
  const [hospitalIncomeType, setHospitalIncomeType] = useState<'fee' | 'medicine' | 'none'>('none');
  const [hospitalFeeType, setHospitalFeeType] = useState<'checkup' | 'usg' | 'bsr' | 'hb_test' | 'custom' | 'none'>('none');
  const [hospitalCustomFeeName, setHospitalCustomFeeName] = useState('');
  const [hospitalExpenseReceiver, setHospitalExpenseReceiver] = useState('');
  const [hospitalExpenseReason, setHospitalExpenseReason] = useState('');
  const [hospitalExpenseTime, setHospitalExpenseTime] = useState('');
  const [hospitalFeePatientName, setHospitalFeePatientName] = useState('');
  const [hospitalFeeTime, setHospitalFeeTime] = useState('');
  const [hospitalMedicinePatientName, setHospitalMedicinePatientName] = useState('');
  const [hospitalMedicineTime, setHospitalMedicineTime] = useState('');
  const [hospitalMedicineItems, setHospitalMedicineItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [newMedItemName, setNewMedItemName] = useState('');
  const [newMedItemPrice, setNewMedItemPrice] = useState('');

  // General Transaction States
  const [itemizedList, setItemizedList] = useState<{ id: string; name: string; price: number }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showGeneralTxForm, setShowGeneralTxForm] = useState(false);

  const [txnType, setTxnType] = useState<TxnType>('income');
  const [txDate, setTxDate] = useState(getLocalDateString(new Date()));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [returnAmount, setReturnAmount] = useState('');
  const [stayDurationIndex, setStayDurationIndex] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofReason, setProofReason] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const [customTargetName, setCustomTargetName] = useState('');
  
  // Cash Hold states
  const [isHold, setIsHold] = useState(false);
  const [activeHolds, setActiveHolds] = useState<any[]>([]);
  const [activeHoldsLoading, setActiveHoldsLoading] = useState(false);

  // Cash Hold Settlement modal states
  const [settleModalTx, setSettleModalTx] = useState<any | null>(null);
  const [settleSpentAmount, setSettleSpentAmount] = useState('');
  const [settleDescription, setSettleDescription] = useState('');
  const [settleProofFile, setSettleProofFile] = useState<File | null>(null);
  const [settleProofReason, setSettleProofReason] = useState('');
  const [settlingHold, setSettlingHold] = useState(false);

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


  const [detailModalTx, setDetailModalTx] = useState<any | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editDetailForm, setEditDetailForm] = useState({
    amount: '',
    date: '',
    description: '',
    category: '',
    categoryName: '',
    hospitalShift: 'combine',
    hospitalPatientName: '',
    hospitalReceiverName: '',
    hospitalReason: '',
    hospitalTime: '',
    hospitalFeeType: 'none' as 'none' | 'checkup' | 'usg' | 'bsr' | 'hb_test' | 'custom',
    hospitalCustomFeeName: '',
    hospitalIncomeType: 'none' as 'none' | 'fee' | 'medicine',
  });
  const [updatingDetail, setUpdatingDetail] = useState(false);
  const [forwardModalTx, setForwardModalTx] = useState<any | null>(null);
  const [forwardProofFile, setForwardProofFile] = useState<File | null>(null);
  const [forwardProofReason, setForwardProofReason] = useState('');
  const [forwardProofUploading, setForwardProofUploading] = useState(false);
  const [rejectModalTx, setRejectModalTx] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [incomingActionId, setIncomingActionId] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeDepartment = DEPARTMENTS.find((d) => d.code === departmentCode) || DEPARTMENTS[0];
  const isStaffMode = selectedEntity?._entityType === 'staff';
  const allCategories = useMemo(() => {
    if (isStaffMode) {
      return [
        { id: 'staff_salary', name: 'Staff Salary', appliesTo: 'expense' },
        { id: 'staff_advance', name: 'Staff Advance', appliesTo: 'expense' },
        ...BASE_CATEGORIES,
        ...customCategories
      ];
    }
    return [...BASE_CATEGORIES, ...customCategories].filter(
      (c) => c.id !== 'staff_salary' && c.id !== 'salary' && !c.name.toLowerCase().includes('salary') && !c.name.toLowerCase().includes('staff')
    );
  }, [customCategories, isStaffMode]);
  const selectedCategory = allCategories.find((c) => c.id === selectedCategoryId);
  const visibleCategories = allCategories.filter((c) => (c.appliesTo === 'both' || c.appliesTo === txnType) && (!categorySearch.trim() || c.name.toLowerCase().includes(categorySearch.toLowerCase())));
  
  const mainStayOptions = useMemo(() => {
    if (departmentCode !== 'rehab' || !selectedEntity) return [];
    const history = selectedEntity.rejoinHistory || [];
    const list = history.map((stay: any, idx: number) => ({
      index: idx,
      label: `Stay #${idx + 1} (Historical: ${getLocalDateString(stay.admissionDate)} to ${stay.dischargeDate ? getLocalDateString(stay.dischargeDate) : 'Present'})`
    }));
    list.push({
      index: history.length,
      label: `Stay #${history.length + 1} (Current Stay: ${getLocalDateString(selectedEntity.admissionDate)} to Present)`
    });
    return list;
  }, [departmentCode, selectedEntity]);

  const isHospitalDayClose = departmentCode === 'hospital' && hospitalMode === 'day_close';
  const isJobCenterDayClose = departmentCode === 'job-center' && jobCenterMode === 'day_close';
  
  useEffect(() => {
    if (selectedCategoryId === 'medicine_charge') {
      setPaymentMethod('credit');
    } else {
      setPaymentMethod(prev => prev === 'credit' ? 'cash' : prev);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    const isCatValid = allCategories.some(c => c.id === selectedCategoryId && (c.appliesTo === 'both' || c.appliesTo === txnType));
    if (!isCatValid) {
      const firstValid = allCategories.find(c => c.appliesTo === 'both' || c.appliesTo === txnType);
      if (firstValid) {
        setSelectedCategoryId(firstValid.id);
      }
    }
  }, [txnType, allCategories, selectedCategoryId]);

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

  const fetchActiveHolds = useCallback(async () => {
    if (!session) return;
    try {
      setActiveHoldsLoading(true);
      const dept = activeDepartment;
      const q = query(
        collection(db, dept.txCollection),
        where('isHold', '==', true)
      );
      const snap = await getDocs(q);
      const docs = snap.docs
        .map((d) => ({
          id: d.id,
          departmentCode: dept.code,
          departmentName: dept.label,
          ...d.data(),
        }))
        .filter((tx: any) => tx.holdStatus === 'held');
      
      docs.sort((a: any, b: any) => {
        const tA = toDate(a.transactionDate || a.date || a.createdAt)?.getTime() || 0;
        const tB = toDate(b.transactionDate || b.date || b.createdAt)?.getTime() || 0;
        return tB - tA;
      });

      setActiveHolds(docs);
    } catch (err) {
      console.error('[HQ Cashier] fetchActiveHolds Error:', err);
    } finally {
      setActiveHoldsLoading(false);
    }
  }, [session, activeDepartment]);

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
      const staffMode = entity._entityType === 'staff';

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
    const isProcessed = tx.status === 'approved' || tx.status === 'rejected' || tx.status === 'rejected_cashier';
    if (session?.role !== 'superadmin' && isProcessed) {
      toast.error('Processed transactions can only be deleted by the Super Admin.');
      return;
    }

    const isPermanent = tx.status === 'approved' || tx.status === 'rejected';
    const msg = isPermanent 
      ? 'WARNING: This transaction is already PROCESSED. Deleting it will permanently remove it from the ledger and financial records. Are you ABSOLUTELY SURE?' 
      : 'Are you sure you want to PERMANENTLY DELETE this transaction? This action cannot be undone.';
    
    if (!window.confirm(msg)) return;
    try {
      setProcessing(true);
      const dept = DEPARTMENTS.find(d => d.code === tx.departmentCode) || activeDepartment;
      
      if (tx.status === 'approved') {
        await reverseEntityTotals(db, tx.departmentCode || dept.code, tx).catch((err) => {
          console.error('[Cashier] Failed to reverse entity totals:', err);
        });
      }

      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, dept.txCollection, tx.id));
      
      if (tx.departmentCode === 'rehab') {
        const patientId = tx.patientId || tx.studentId || tx.seekerId;
        if (patientId) {
          try {
            const { syncRehabPatientFinance } = await import('@/app/hq/actions/approvals');
            await syncRehabPatientFinance(patientId);
          } catch (syncErr) {
            console.error('[HQ Cashier] Failed to sync patient finance after delete:', syncErr);
          }
        }
      }
      
      if (tx.departmentCode === 'spims' && tx.feePaymentId) {
        await deleteDoc(doc(db, 'spims_fees', tx.feePaymentId)).catch(() => {});
      }

      toast.success('Transaction permanently deleted from database ✓');
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

  const openSettleModal = (tx: any) => {
    setSettleModalTx(tx);
    setSettleSpentAmount(String(tx.amount || ''));
    setSettleDescription('');
    setSettleProofFile(null);
    setSettleProofReason('');
  };

  const handleSettleHoldSubmit = async () => {
    if (!settleModalTx) return;
    const spent = Number(settleSpentAmount);
    const original = Number(settleModalTx.amount);
    if (isNaN(spent) || spent < 0 || spent > original) {
      toast.error("Invalid spent amount");
      return;
    }

    setSettlingHold(true);
    try {
      // 1. Upload proof file if provided
      let proofUrl = settleModalTx.proofUrl || "";
      if (settleProofFile) {
        proofUrl = await uploadToCloudinary(settleProofFile, 'Khan Hub/hq/receipts');
      }

      const returned = original - spent;
      const finalDescription = `[HOLD SETTLED] ${settleModalTx.description || ''} | Spent: Rs ${spent.toLocaleString()} | Returned: Rs ${returned.toLocaleString()} | Details: ${settleDescription.trim()}`.trim();

      const dept = DEPARTMENTS.find(d => d.code === settleModalTx.departmentCode) || activeDepartment;
      const isApproved = settleModalTx.status === 'approved';

      if (isApproved) {
        // Use editApprovedTransaction server action
        const { editApprovedTransaction } = await import('@/app/hq/actions/approvals');
        const res = await editApprovedTransaction({
          dept: settleModalTx.departmentCode as any,
          txId: settleModalTx.id,
          amount: spent,
          date: getLocalDateString(settleModalTx.date || settleModalTx.transactionDate || settleModalTx.createdAt),
          description: finalDescription,
          _collection: settleModalTx._collection,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to update approved transaction');
        }

        // Merge hold fields on the transaction document (since editApprovedTransaction doesn't update hold fields)
        const coll = settleModalTx._collection || dept.txCollection;
        await updateDoc(doc(db, coll, settleModalTx.id), {
          isHold: true,
          holdStatus: 'settled',
          holdOriginalAmount: original,
          holdSpentAmount: spent,
          holdReturnedAmount: returned,
          settledAt: Timestamp.now(),
          ...(proofUrl ? { proofUrl } : {}),
          ...(settleProofReason ? { proofMissingReason: settleProofReason.trim() } : {}),
        });

      } else {
        // For pending, update directly
        const coll = settleModalTx._collection || dept.txCollection;
        const docRef = doc(db, coll, settleModalTx.id);
        const updatePayload: Record<string, any> = {
          amount: spent,
          description: finalDescription,
          isHold: true,
          holdStatus: 'settled',
          holdOriginalAmount: original,
          holdSpentAmount: spent,
          holdReturnedAmount: returned,
          settledAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          ...(proofUrl ? { proofUrl } : {}),
          ...(settleProofReason ? { proofMissingReason: settleProofReason.trim() } : {}),
        };
        await updateDoc(docRef, updatePayload);
      }

      toast.success(`Hold settled! Rs ${returned.toLocaleString()} returned to drawer ✓`);
      setSettleModalTx(null);
      await fetchHistory();
      await fetchActiveHolds();
      if (selectedEntity) fetchEntityHistory(selectedEntity);
    } catch (err: any) {
      console.error('[Cashier] Settlement error:', err);
      toast.error('Settlement failed: ' + (err.message || 'Error'));
    } finally {
      setSettlingHold(false);
    }
  };

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
    setCustomTargetName('');
    setHospitalMode('none');
    setHospitalShift('combine');
    setHospitalIncomeAmount('');
    setHospitalExpenseAmount('');
  }, [departmentCode]);

  useEffect(() => {
    if (selectedEntity) {
      setCustomTargetName('');
    }
  }, [selectedEntity]);

  useEffect(() => {
    if (session && mounted) {
      void fetchActiveHolds();
    }
  }, [session, departmentCode, mounted, fetchActiveHolds]);




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
        { coll: 'rehab_patients', code: 'rehab', label: 'Rehab', type: 'patient' },
        { coll: 'spims_students', code: 'spims', label: 'SPIMS', type: 'student' },
        { coll: 'hospital_patients', code: 'hospital', label: 'Hospital', type: 'patient' },
        { coll: 'sukoon_clients', code: 'sukoon-center', label: 'Sukoon', type: 'client' },
        { coll: 'welfare_donors', code: 'welfare', label: 'Welfare', type: 'donor' },
        { coll: 'jobcenter_seekers', code: 'job-center', label: 'Job Center', type: 'seeker' },
        { coll: 'jobcenter_employers', code: 'job-center', label: 'Company', type: 'employer' },
        { coll: 'hq_users', code: 'hq', label: 'HQ Staff', type: 'staff' },
        { coll: 'rehab_users', code: 'rehab', label: 'Rehab Staff', type: 'staff' },
        { coll: 'hospital_users', code: 'hospital', label: 'Hospital Staff', type: 'staff' },
        { coll: 'it_users', code: 'it', label: 'IT Staff', type: 'staff' },
        { coll: 'jobcenter_users', code: 'job-center', label: 'Job Center Staff', type: 'staff' },
        { coll: 'spims_users', code: 'spims', label: 'Spims Staff', type: 'staff' },
        { coll: 'sukoon_users', code: 'sukoon-center', label: 'Sukoon Staff', type: 'staff' },
        { coll: 'welfare_users', code: 'welfare', label: 'Welfare Staff', type: 'staff' },
      ];

      for (const source of sources) {
        try {
          const snap = await getDocs(query(collection(db, source.coll), limit(1000)));
          const docs = snap.docs.map(d => {
            const data = d.data();
            // Strict Active Check for staff
            if (source.type === 'staff') {
              const statusStr = String(data.status || '').toLowerCase().trim();
              const isActuallyActive = data.isActive !== false && statusStr !== 'inactive' && statusStr !== 'resigned' && statusStr !== 'terminated' && statusStr !== 'active_vacancy';
              if (!isActuallyActive) return null;
            }
            return { 
              ...data, 
              id: d.id, 
              _deptCode: source.code, 
              _deptLabel: source.label,
              _entityType: source.type
            };
          }).filter(Boolean);
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
    if (isReady) {
      loadAllEntities();
    }
  }, [sessionLoading, session, auth.currentUser]);


  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const matches = allEntities.filter((p) => {
      const ids: string[] = [];
      if (p.patientId) ids.push(String(p.patientId));
      if (p.studentId) ids.push(String(p.studentId));
      if (p.customId) ids.push(String(p.customId));
      if (p.employeeId) ids.push(String(p.employeeId));
      if (p.rollNumber) ids.push(String(p.rollNumber));
      if (p.rollNo) ids.push(String(p.rollNo));
      if (p.inpatientNumber) ids.push(String(p.inpatientNumber));
      if (p.donorNumber) ids.push(String(p.donorNumber));
      if (p.id) ids.push(String(p.id));

      if (p.rejoinHistory && Array.isArray(p.rejoinHistory)) {
        p.rejoinHistory.forEach((stay: any) => {
          if (stay.patientId) ids.push(String(stay.patientId));
          if (stay.inpatientNumber) ids.push(String(stay.inpatientNumber));
          if (stay.rejoinDetails?.patientId) ids.push(String(stay.rejoinDetails.patientId));
          if (stay.rejoinDetails?.inpatientNumber) ids.push(String(stay.rejoinDetails.inpatientNumber));
        });
      }

      const queryMatch = (p.name || p.fullName || p.companyName || p.fatherName || '').toLowerCase().includes(q) ||
        ids.some(id => id.toLowerCase().includes(q)) ||
        String(p.serialNumber || '').toLowerCase().includes(q);
      
      if (!queryMatch) return false;

      if (searchType === 'patient') {
        return p._entityType === 'patient' || p._entityType === 'client' || p._entityType === 'donor';
      }
      if (searchType === 'student') {
        return (p._entityType === 'student' || p._deptCode === 'spims') && (p._entityType !== 'staff');
      }
      if (searchType === 'job seeker') {
        return p._entityType === 'seeker';
      }
      if (searchType === 'company') {
        return p._entityType === 'employer' || p.companyName;
      }
      if (searchType === 'staff') {
        return p._entityType === 'staff';
      }
      return true;
    });
    setSearchResults(matches.slice(0, 15));
    setSearchOpen(true);
  }, [searchQuery, allEntities, searchType]);



  async function createCategory() {
    const name = categorySearch.trim();
    if (!name) return;
    let slug = slugify(name);
    if (BASE_CATEGORIES.some((c) => c.id === slug)) {
      slug = slug + '_custom';
    }
    if (customCategories.some((c) => c.id === slug)) {
      setSelectedCategoryId(slug);
      return;
    }
    await addDoc(collection(db, 'hq_cashier_categories'), { name, slug, appliesTo: txnType, isCustom: true, createdBy: session?.uid, createdAt: Timestamp.now() });
    
    const updatedList = [...customCategories, { id: slug, name, appliesTo: txnType }];
    setCustomCategories(updatedList as any);
    setCached('hq_cashier_categories_list', updatedList, 600);
    
    setSelectedCategoryId(slug);
    setCategorySearch('');
    toast.success('Category created ✓');
  }

  async function submitTx(e: React.FormEvent) {
    e.preventDefault();
    if (processing) return;
    setMessage(null);

    const isHospitalDayClose = departmentCode === 'hospital' && hospitalMode === 'day_close';
    const isJobCenterDayClose = departmentCode === 'job-center' && jobCenterMode === 'day_close';
    const isHospitalCommonAllTx = departmentCode === 'hospital' && hospitalMode === 'all_transactions';
    const missingReason = proofReason.trim();

    if (!isHospitalDayClose && !isJobCenterDayClose) {
      if (!selectedEntity && departmentCode !== 'hospital' && !showGeneralTxForm) {
        const txt = 'Select account or enter a Target Person / Purpose Name.';
        toast.error(txt);
        return setMessage({ type: 'error', text: txt });
      }
      if (!selectedCategory && !isHospitalCommonAllTx) {
        const txt = 'Select category field.';
        toast.error(txt);
        return setMessage({ type: 'error', text: txt });
      }
      
      const amt = Number(amount) || 0;
      const disc = Number(discount) || 0;
      const ret = Number(returnAmount) || 0;
      if (amt <= 0 && disc <= 0 && ret <= 0) {
        const txt = 'Please enter a valid amount, discount, or refund.';
        toast.error(txt);
        return setMessage({ type: 'error', text: txt });
      }

      // Validate Common Hospital transactions
      if (isHospitalCommonAllTx) {
        if (txnType === 'expense') {
          if (!hospitalExpenseReceiver.trim()) {
            const txt = 'Please enter the name of the person taking the amount.';
            toast.error(txt);
            return setMessage({ type: 'error', text: txt });
          }
          if (!hospitalExpenseReason.trim()) {
            const txt = 'Please enter the reason why he is taking that amount.';
            toast.error(txt);
            return setMessage({ type: 'error', text: txt });
          }
          if (!hospitalExpenseTime.trim()) {
            const txt = 'Please enter the time.';
            toast.error(txt);
            return setMessage({ type: 'error', text: txt });
          }
        } else {
          if (hospitalIncomeType === 'none') {
            const txt = 'Please select Fee or Medicine.';
            toast.error(txt);
            return setMessage({ type: 'error', text: txt });
          }
          if (hospitalIncomeType === 'fee') {
            if (hospitalFeeType === 'none') {
              const txt = 'Please select a fee type.';
              toast.error(txt);
              return setMessage({ type: 'error', text: txt });
            }
            if (hospitalFeeType === 'custom' && !hospitalCustomFeeName.trim()) {
              const txt = 'Please enter a custom fee name.';
              toast.error(txt);
              return setMessage({ type: 'error', text: txt });
            }
            if (!hospitalFeePatientName.trim()) {
              const txt = "Please enter the patient's name.";
              toast.error(txt);
              return setMessage({ type: 'error', text: txt });
            }
            if (!hospitalFeeTime.trim()) {
              const txt = 'Please enter the time.';
              toast.error(txt);
              return setMessage({ type: 'error', text: txt });
            }
          } else if (hospitalIncomeType === 'medicine') {
            if (!hospitalMedicinePatientName.trim()) {
              const txt = "Please enter the patient's name.";
              toast.error(txt);
              return setMessage({ type: 'error', text: txt });
            }
            if (!hospitalMedicineTime.trim()) {
              const txt = 'Please enter the time.';
              toast.error(txt);
              return setMessage({ type: 'error', text: txt });
            }
          }
        }
      }
    } else {
      const inc = isHospitalDayClose ? (Number(hospitalIncomeAmount) || 0) : (Number(jobCenterIncomeAmount) || 0);
      const exp = isHospitalDayClose ? (Number(hospitalExpenseAmount) || 0) : (Number(jobCenterExpenseAmount) || 0);
      if (inc <= 0 && exp <= 0) {
        const txt = 'Enter a valid Income Amount or Expense Amount.';
        toast.error(txt);
        return setMessage({ type: 'error', text: txt });
      }
    }

    if (!proofFile && !missingReason) {
      const txt = 'Upload proof OR enter reason if proof is missing.';
      toast.error(txt);
      return setMessage({ type: 'error', text: txt });
    }

    setProcessing(true);
    setProofUploading(true);
    try {
      let proofUrl: string | undefined;
      if (proofFile) {
        proofUrl = await uploadToCloudinary(proofFile, 'Khan Hub/hq/receipts');
      }

      const isSuperadmin = session?.role === 'superadmin';

      const commonPayload: Record<string, any> = {
        departmentCode: activeDepartment.code,
        departmentName: activeDepartment.label,
        paymentMethod,
        referenceNo,
        status: (isSuperadmin || activeDepartment.code === 'welfare') ? 'approved' : 'pending',
        ...(isSuperadmin ? {
          approvedAt: Timestamp.now(),
          approvedBy: session?.customId || 'SUPERADMIN',
          processedAt: Timestamp.now(),
          processedBy: session?.customId || 'SUPERADMIN',
        } : {}),
        cashierId: session?.customId || 'HQ-CASHIER',
        proofRequired: true,
        date: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        transactionDate: Timestamp.fromDate(new Date(`${txDate}T00:00:00`)),
        createdBy: session?.uid,
        createdByName: session?.displayName || session?.name || 'HQ Cashier',
        createdAt: Timestamp.now(),
        discount: 0,
        returnAmount: 0,
      };
      if (proofUrl) commonPayload.proofUrl = proofUrl;
      if (!proofUrl && missingReason) commonPayload.proofMissingReason = missingReason;

      if (isJobCenterDayClose) {
        const inc = Number(jobCenterIncomeAmount) || 0;
        const exp = Number(jobCenterExpenseAmount) || 0;

        if (inc > 0) {
          const incPayload = {
            ...commonPayload,
            type: 'income',
            amount: inc,
            category: 'day_close',
            categoryName: 'Job Center Day Close',
            seekerId: 'jobcenter-day-close',
            seekerName: 'Day Close Transaction',
            description: description ? description : 'Job Center Day Close Income',
          };
          const txRef = await addDoc(collection(db, activeDepartment.txCollection), incPayload);

          if (!isSuperadmin) {
            void sendHqPushNotification({
              recipientId: superadminRecipient.customId,
              recipientUid: superadminRecipient.id,
              recipientRole: 'superadmin',
              type: 'tx_forwarded',
              title: 'New Transaction Submitted',
              body: `${session?.name || 'Cashier'} submitted a Rs ${inc.toLocaleString()} Day Close Income for Job Center.`,
              relatedId: txRef.id,
              actionUrl: '/hq/dashboard/superadmin/approvals',
            });
          } else {
            try {
              const { syncDirectApprovedTransaction } = await import('@/app/hq/actions/approvals');
              await syncDirectApprovedTransaction({ 
                dept: activeDepartment.code as any, 
                txId: txRef.id,
                approvedBy: session?.customId || 'SUPERADMIN'
              });
            } catch (syncErr) {
              console.error('[HQ Cashier] Sync direct approved transaction failed:', syncErr);
            }
          }
        }

        if (exp > 0) {
          const expPayload = {
            ...commonPayload,
            type: 'expense',
            amount: exp,
            category: 'day_close',
            categoryName: 'Job Center Day Close',
            seekerId: 'jobcenter-day-close',
            seekerName: 'Day Close Transaction',
            description: description ? description : 'Job Center Day Close Expense',
          };
          const txRef = await addDoc(collection(db, activeDepartment.txCollection), expPayload);

          if (!isSuperadmin) {
            void sendHqPushNotification({
              recipientId: superadminRecipient.customId,
              recipientUid: superadminRecipient.id,
              recipientRole: 'superadmin',
              type: 'tx_forwarded',
              title: 'New Transaction Submitted',
              body: `${session?.name || 'Cashier'} submitted a Rs ${exp.toLocaleString()} Day Close Expense for Job Center.`,
              relatedId: txRef.id,
              actionUrl: '/hq/dashboard/superadmin/approvals',
            });
          } else {
            try {
              const { syncDirectApprovedTransaction } = await import('@/app/hq/actions/approvals');
              await syncDirectApprovedTransaction({ 
                dept: activeDepartment.code as any, 
                txId: txRef.id,
                approvedBy: session?.customId || 'SUPERADMIN'
              });
            } catch (syncErr) {
              console.error('[HQ Cashier] Sync direct approved transaction failed:', syncErr);
            }
          }
        }

        toast.success(isSuperadmin ? 'Transaction approved & synced successfully ✓' : 'Transaction submitted successfully ✓');
        
        setJobCenterIncomeAmount('');
        setJobCenterExpenseAmount('');
        setJobCenterMode('none');
        setDescription('');
        setReferenceNo('');
        setProofFile(null);
        setProofReason('');
        setSearchQuery('');
        setProofUploading(false);
        await fetchHistory();
        setProcessing(false);
        return;
      }

      if (isHospitalDayClose) {
        const inc = Number(hospitalIncomeAmount) || 0;
        const exp = Number(hospitalExpenseAmount) || 0;

        if (inc > 0) {
          const incPayload = {
            ...commonPayload,
            type: 'income',
            amount: inc,
            category: 'day_close',
            categoryName: 'Hospital Day Close',
            patientId: 'hospital-day-close',
            patientName: 'Day Close Transaction',
            hospitalDayCloseShift: hospitalShift,
            description: description ? `${description} | Shift: ${hospitalShift === 'morning_shift' ? 'Morning' : hospitalShift === 'night_shift' ? 'Night' : 'Combine'}` : `Hospital Day Close Income - Shift: ${hospitalShift === 'morning_shift' ? 'Morning' : hospitalShift === 'night_shift' ? 'Night' : 'Combine'}`,
          };
          const txRef = await addDoc(collection(db, activeDepartment.txCollection), incPayload);

          if (!isSuperadmin) {
            void sendHqPushNotification({
              recipientId: superadminRecipient.customId,
              recipientUid: superadminRecipient.id,
              recipientRole: 'superadmin',
              type: 'tx_forwarded',
              title: 'New Transaction Submitted',
              body: `${session?.name || 'Cashier'} submitted a Rs ${inc.toLocaleString()} Day Close Income for Khan Hospital.`,
              relatedId: txRef.id,
              actionUrl: '/hq/dashboard/superadmin/approvals',
            });
          } else {
            try {
              const { syncDirectApprovedTransaction } = await import('@/app/hq/actions/approvals');
              await syncDirectApprovedTransaction({ 
                dept: activeDepartment.code as any, 
                txId: txRef.id,
                approvedBy: session?.customId || 'SUPERADMIN'
              });
            } catch (syncErr) {
              console.error('[HQ Cashier] Sync direct approved transaction failed:', syncErr);
            }
          }
        }

        if (exp > 0) {
          const expPayload = {
            ...commonPayload,
            type: 'expense',
            amount: exp,
            category: 'day_close',
            categoryName: 'Hospital Day Close',
            patientId: 'hospital-day-close',
            patientName: 'Day Close Transaction',
            hospitalDayCloseShift: hospitalShift,
            description: description ? `${description} | Shift: ${hospitalShift === 'morning_shift' ? 'Morning' : hospitalShift === 'night_shift' ? 'Night' : 'Combine'}` : `Hospital Day Close Expense - Shift: ${hospitalShift === 'morning_shift' ? 'Morning' : hospitalShift === 'night_shift' ? 'Night' : 'Combine'}`,
          };
          const txRef = await addDoc(collection(db, activeDepartment.txCollection), expPayload);

          if (!isSuperadmin) {
            void sendHqPushNotification({
              recipientId: superadminRecipient.customId,
              recipientUid: superadminRecipient.id,
              recipientRole: 'superadmin',
              type: 'tx_forwarded',
              title: 'New Transaction Submitted',
              body: `${session?.name || 'Cashier'} submitted a Rs ${exp.toLocaleString()} Day Close Expense for Khan Hospital.`,
              relatedId: txRef.id,
              actionUrl: '/hq/dashboard/superadmin/approvals',
            });
          } else {
            try {
              const { syncDirectApprovedTransaction } = await import('@/app/hq/actions/approvals');
              await syncDirectApprovedTransaction({ 
                dept: activeDepartment.code as any, 
                txId: txRef.id,
                approvedBy: session?.customId || 'SUPERADMIN'
              });
            } catch (syncErr) {
              console.error('[HQ Cashier] Sync direct approved transaction failed:', syncErr);
            }
          }
        }

        toast.success(isSuperadmin ? 'Transaction approved & synced successfully ✓' : 'Transaction submitted successfully ✓');
        
        setHospitalIncomeAmount('');
        setHospitalExpenseAmount('');
        setHospitalShift('combine');
        setDescription('');
        setReferenceNo('');
        setProofFile(null);
        setProofReason('');
        setSearchQuery('');
        setProofUploading(false);
        await fetchHistory();
        setProcessing(false);
        return;
      }

      let resolvedCategory = selectedCategory;
      if (isHospitalCommonAllTx) {
        if (txnType === 'expense') {
          resolvedCategory = { id: 'other_expense', name: 'Other Expense', appliesTo: 'expense' } as any;
        } else if (hospitalIncomeType === 'fee') {
          let feeName = 'Check-up Fee';
          if (hospitalFeeType === 'usg') feeName = 'USG Fee';
          else if (hospitalFeeType === 'bsr') feeName = 'BSR Fee';
          else if (hospitalFeeType === 'hb_test') feeName = 'HB Test Fee';
          else if (hospitalFeeType === 'custom') feeName = hospitalCustomFeeName.trim();
          resolvedCategory = { id: 'fee', name: feeName, appliesTo: 'income' } as any;
        } else if (hospitalIncomeType === 'medicine') {
          resolvedCategory = { id: 'medicine_charge', name: 'Medicine / Treatment', appliesTo: 'income' } as any;
        }
      }

      if (!resolvedCategory) return;

      let finalDescription = description;
      if (isHospitalCommonAllTx) {
        if (txnType === 'expense') {
          finalDescription = `Received by: ${hospitalExpenseReceiver} | Reason: ${hospitalExpenseReason} | Time: ${hospitalExpenseTime}${description ? ` | Note: ${description}` : ''}`;
        } else if (hospitalIncomeType === 'fee') {
          let feeName = 'Check-up Fee';
          if (hospitalFeeType === 'usg') feeName = 'USG Fee';
          else if (hospitalFeeType === 'bsr') feeName = 'BSR Fee';
          else if (hospitalFeeType === 'hb_test') feeName = 'HB Test Fee';
          else if (hospitalFeeType === 'custom') feeName = hospitalCustomFeeName.trim();
          finalDescription = `${feeName} for ${hospitalFeePatientName} | Time: ${hospitalFeeTime}${description ? ` | Note: ${description}` : ''}`;
        } else if (hospitalIncomeType === 'medicine') {
          finalDescription = `Medicine/Treatment for ${hospitalMedicinePatientName} | Time: ${hospitalMedicineTime} | Items: ${hospitalMedicineItems.map(i => `${i.name} (Rs ${i.price})`).join(', ')}${description ? ` | Note: ${description}` : ''}`;
        }
      } else if (!selectedEntity && itemizedList.length > 0) {
        finalDescription = `Items: ${itemizedList.map(i => `${i.name} (Rs ${i.price})`).join(', ')}${description ? ` | Note: ${description}` : ''}`;
      }

      const createPayload: Record<string, any> = {
        type: txnType,
        amount: Number(amount),
        category: resolvedCategory.id,
        categoryName: resolvedCategory.name,
        departmentCode: activeDepartment.code,
        departmentName: activeDepartment.label,
        ...(isStaffMode
          ? { 
              staffId: selectedEntity?.id, 
              staffName: selectedEntity?.name || selectedEntity?.employeeId || 'Unknown',
              patientName: selectedEntity?.name || selectedEntity?.employeeId || 'Unknown' 
            }
          : departmentCode === 'welfare' 
            ? { 
                donorId: selectedEntity?.id || 'welfare-general', 
                donorName: selectedEntity?.name || selectedEntity?.fullName || customTargetName.trim() || 'General Welfare Account',
                ...(selectedEntity?.linkedChildId ? { childId: selectedEntity.linkedChildId } : {}),
                ...(selectedEntity?.linkedChildName ? { childName: selectedEntity.linkedChildName } : {}),
                ...(selectedEntity?.donationScope ? { donationScope: selectedEntity.donationScope } : {}),
                ...(selectedEntity?.donationType ? { donationType: selectedEntity.donationType } : {})
              }
            : departmentCode === 'hospital'
              ? {
                  patientId: hospitalMode === 'all_transactions' ? (selectedEntity?.id || 'hospital-inline') : 'hospital-day-close',
                  patientName: hospitalMode === 'all_transactions' 
                    ? (selectedEntity?.name || 
                       (txnType === 'expense' 
                         ? hospitalExpenseReceiver.trim() 
                         : hospitalIncomeType === 'fee' 
                           ? hospitalFeePatientName.trim() 
                           : hospitalMedicinePatientName.trim()) || 'Inline Patient') 
                    : 'Day Close Transaction',
                  hospitalPatientDetails: hospitalMode === 'all_transactions' 
                    ? (isHospitalCommonAllTx 
                      ? (txnType === 'expense'
                        ? {
                            type: 'expense',
                            receiverName: hospitalExpenseReceiver,
                            reason: hospitalExpenseReason,
                            time: hospitalExpenseTime,
                            date: txDate
                          }
                        : hospitalIncomeType === 'fee'
                          ? {
                              type: 'fee',
                              feeType: hospitalFeeType,
                              ...(hospitalFeeType === 'custom' ? { customFeeName: hospitalCustomFeeName.trim() } : {}),
                              patientName: hospitalFeePatientName,
                              time: hospitalFeeTime,
                              date: txDate
                            }
                          : {
                              type: 'medicine',
                              patientName: hospitalMedicinePatientName,
                              time: hospitalMedicineTime,
                              items: hospitalMedicineItems,
                              date: txDate
                            }
                      )
                      : {
                          serialNumber: hospitalTxForm.serialNumber,
                          patientName: hospitalTxForm.patientName,
                          fatherName: hospitalTxForm.fatherName,
                          category: hospitalTxForm.category,
                          reason: hospitalTxForm.reason
                        }
                    ) 
                    : null
                }
            : { 
                patientId: selectedEntity?.id || `${departmentCode}-general`, 
                ...(departmentCode === 'spims' ? { studentId: selectedEntity?.id || 'spims-general' } : {}),
                ...(selectedEntity?._entityType === 'employer' ? { employerId: selectedEntity?.id } : {}),
                ...(selectedEntity?._entityType === 'seeker' ? { seekerId: selectedEntity?.id } : {}),
                patientName: selectedEntity?.name || selectedEntity?.companyName || selectedEntity?.fullName || customTargetName.trim() || `General ${activeDepartment.label} Account` 
              }),
        description: finalDescription,
        paymentMethod,
        referenceNo,
        status: (isSuperadmin || departmentCode === 'welfare') ? 'approved' : 'pending',
        ...((isSuperadmin || departmentCode === 'welfare') ? {
          approvedAt: Timestamp.now(),
          approvedBy: session?.customId || 'SUPERADMIN',
          processedAt: Timestamp.now(),
          processedBy: session?.customId || 'SUPERADMIN',
        } : {}),
        cashierId: session?.customId || 'HQ-CASHIER',
        proofRequired: true,
        date: (() => {
          const [y, m, d] = txDate.split('-').map(Number);
          return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
        })(),
        transactionDate: (() => {
          const [y, m, d] = txDate.split('-').map(Number);
          return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
        })(),
        createdBy: session?.uid,
        createdByName: session?.displayName || session?.name || 'HQ Cashier',
        createdAt: Timestamp.now(),
        discount: Number(discount) || 0,
        returnAmount: Number(returnAmount) || 0,
        ...(stayDurationIndex !== '' ? { stayDurationIndex: Number(stayDurationIndex) } : {}),
        ...(departmentCode === 'spims' && resolvedCategory.id === 'fee' ? { spimsFeeSubtype } : {}),
        ...(txnType === 'expense' && isHold ? {
          isHold: true,
          holdStatus: 'held',
          holdOriginalAmount: Number(amount),
          holdReturnedAmount: 0,
          holdSpentAmount: 0,
        } : {}),
      };
      if (itemizedList.length > 0) {
        createPayload.items = itemizedList;
      }
      if (proofUrl) createPayload.proofUrl = proofUrl;
      if (!proofUrl && missingReason) createPayload.proofMissingReason = missingReason;



      let targetTxCollection = activeDepartment.txCollection;
      let targetDeptCode = activeDepartment.code;

      if (isStaffMode && selectedEntity) {
        const staffDeptStr = String(selectedEntity.department || selectedEntity.dept || activeDepartment.code).toLowerCase();
        const deptMap: Record<string, string> = {
          rehab: 'rehab_transactions',
          hospital: 'hospital_transactions',
          spims: 'spims_transactions',
          it: 'it_transactions',
          'social-media': 'media_transactions',
          media: 'media_transactions',
          'sukoon-center': 'sukoon_transactions',
          sukoon: 'sukoon_transactions',
          welfare: 'welfare_transactions',
          'job-center': 'jobcenter_transactions',
          hq: 'hq_transactions',
        };
        if (deptMap[staffDeptStr]) {
          targetTxCollection = deptMap[staffDeptStr];
          targetDeptCode = staffDeptStr;
          createPayload.departmentCode = targetDeptCode;
          createPayload.departmentName = staffDeptStr.toUpperCase();
        }
      }

      const txRef = await addDoc(collection(db, targetTxCollection), createPayload);

      if (isStaffMode && selectedEntity && (resolvedCategory.id === 'staff_salary' || resolvedCategory.id === 'staff_advance')) {
        try {
          const monthStr = txDate.slice(0, 7); // 'YYYY-MM'
          const getPrefix = (d: string) => {
            const low = String(d || '').toLowerCase();
            if (low === 'job-center' || low === 'job_center') return 'jobcenter';
            if (low === 'social-media' || low === 'social_media') return 'media';
            if (low === 'sukoon-center' || low === 'sukoon_center') return 'sukoon';
            return low.replace('-', '_');
          };
          const prefix = getPrefix(targetDeptCode);
          const salaryColName = `${prefix}_salary_records`;

          const existingSnap = await getDocs(query(
            collection(db, salaryColName),
            where('staffId', '==', selectedEntity.id),
            where('month', '==', monthStr)
          ));

          if (resolvedCategory.id === 'staff_advance') {
            if (!existingSnap.empty) {
              const existingDoc = existingSnap.docs[0];
              await updateDoc(doc(db, salaryColName, existingDoc.id), {
                advance: increment(Number(amount)),
                updatedAt: Timestamp.now(),
              });
            } else {
              await addDoc(collection(db, salaryColName), {
                staffId: selectedEntity.id,
                employeeId: selectedEntity.employeeId || selectedEntity.customId || selectedEntity.id,
                staffName: selectedEntity.name || 'Staff',
                department: targetDeptCode,
                month: monthStr,
                basicSalary: Number(selectedEntity.monthlySalary || 0),
                dailyWage: Number(selectedEntity.monthlySalary || 0) / 26,
                workingDays: 26,
                presentDays: 26,
                absentDays: 0,
                leaveDays: 0,
                absentDeduction: 0,
                bonus: 0,
                otherDeductions: 0,
                advance: Number(amount),
                netSalary: Math.max(0, Number(selectedEntity.monthlySalary || 0) - Number(amount)),
                status: 'draft',
                createdAt: Timestamp.now(),
                createdBy: session?.uid,
              });
            }
          } else if (resolvedCategory.id === 'staff_salary') {
            if (!existingSnap.empty) {
              const existingDoc = existingSnap.docs[0];
              await updateDoc(doc(db, salaryColName, existingDoc.id), {
                status: 'paid',
                netSalary: Number(amount),
                paidAt: Timestamp.now(),
                paidBy: session?.displayName || 'Cashier',
                linkedTxId: txRef.id,
              });
            } else {
              await addDoc(collection(db, salaryColName), {
                staffId: selectedEntity.id,
                employeeId: selectedEntity.employeeId || selectedEntity.customId || selectedEntity.id,
                staffName: selectedEntity.name || 'Staff',
                department: targetDeptCode,
                month: monthStr,
                basicSalary: Number(selectedEntity.monthlySalary || 0),
                dailyWage: Number(selectedEntity.monthlySalary || 0) / 26,
                workingDays: 26,
                presentDays: 26,
                absentDays: 0,
                leaveDays: 0,
                absentDeduction: 0,
                bonus: 0,
                otherDeductions: 0,
                advance: 0,
                netSalary: Number(amount),
                status: 'paid',
                paidAt: Timestamp.now(),
                paidBy: session?.displayName || 'Cashier',
                createdAt: Timestamp.now(),
                createdBy: session?.uid,
                linkedTxId: txRef.id,
              });
            }
          }
        } catch (syncErr) {
          console.error('[HQ Cashier] Staff salary/advance sync error:', syncErr);
        }
      }

      if (departmentCode === 'spims' && resolvedCategory.id === 'fee' && selectedEntity) {
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
            status: isSuperadmin ? 'approved' : 'pending', 
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

      if (!isSuperadmin && departmentCode !== 'welfare') {
        let bodyAmountText = `Rs ${Number(amount).toLocaleString()}`;
        if (Number(amount) <= 0 && Number(discount) > 0) {
          bodyAmountText = `Rs ${Number(discount).toLocaleString()} discount`;
        } else if (Number(amount) <= 0 && Number(returnAmount) > 0) {
          bodyAmountText = `Rs ${Number(returnAmount).toLocaleString()} refund`;
        } else if (Number(discount) > 0) {
          bodyAmountText += ` (with Rs ${Number(discount).toLocaleString()} discount)`;
        }
        void sendHqPushNotification({
          recipientId: superadminRecipient.customId,
          recipientUid: superadminRecipient.id,
          recipientRole: 'superadmin',
          type: 'tx_forwarded',
          title: 'New Transaction Submitted',
          body: `${session?.name || 'Cashier'} submitted a ${bodyAmountText} transaction for ${selectedEntity?.name || customTargetName.trim() || `General ${activeDepartment.label}`}.`,
          relatedId: txRef.id,
          actionUrl: '/hq/dashboard/superadmin/approvals',
        });
      } else {
        try {
          const { syncDirectApprovedTransaction } = await import('@/app/hq/actions/approvals');
          await syncDirectApprovedTransaction({ 
            dept: activeDepartment.code as any, 
            txId: txRef.id,
            approvedBy: session?.customId || 'SUPERADMIN'
          });
        } catch (syncErr) {
          console.error('[HQ Cashier] Sync direct approved transaction failed:', syncErr);
        }
      }

      toast.success((isSuperadmin || departmentCode === 'welfare') ? 'Transaction approved & synced successfully ✓' : 'Transaction submitted successfully ✓');
      
      setSelectedEntity(null);
      setAmount('');
      setDiscount('');
      setReturnAmount('');
      setStayDurationIndex('');
      setDescription('');
      setReferenceNo('');
      setProofFile(null);
      setProofReason('');
      setCategorySearch('');
      setSearchQuery('');
      setEntityResults([]);
      setItemizedList([]);
      setNewItemName('');
      setNewItemPrice('');
      setShowGeneralTxForm(false);
      setHospitalMode('none');
      setHospitalIncomeType('none');
      setHospitalFeeType('none');
      setHospitalCustomFeeName('');
      setHospitalExpenseReceiver('');
      setHospitalExpenseReason('');
      setHospitalExpenseTime('');
      setHospitalFeePatientName('');
      setHospitalFeeTime('');
      setHospitalMedicinePatientName('');
      setHospitalMedicineTime('');
      setHospitalMedicineItems([]);
      setNewMedItemName('');
      setNewMedItemPrice('');

      setProofUploading(false);
      setIsHold(false);
      await fetchHistory();
      await fetchActiveHolds();
    } catch (err: any) {
      console.error('[HQ Cashier] submitTx error:', err);
      toast.error(err?.message || 'Transaction failed');
      setMessage({ type: 'error', text: `${err?.code || 'error'}: ${err?.message || 'Failed to submit transaction.'}` });
    } finally {
      setProcessing(false);
      setProofUploading(false);
    }
  }

  const handleSaveDetailEdit = async () => {
    if (!detailModalTx) return;
    const amt = Number(editDetailForm.amount) || 0;
    if (amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setUpdatingDetail(true);
    try {
      const deptCode = detailModalTx.departmentCode;
      const dept = findDept(deptCode);

      const isApproved = detailModalTx.status === 'approved';

      let finalDescription = editDetailForm.description;
      let finalHospitalDetails = detailModalTx.hospitalPatientDetails ? { ...detailModalTx.hospitalPatientDetails } : null;

      if (deptCode === 'hospital' && detailModalTx.hospitalPatientDetails) {
        const details = detailModalTx.hospitalPatientDetails;
        const isCommonTx = detailModalTx.patientId === 'hospital-inline' || (detailModalTx.patientName && String(detailModalTx.patientName).toLowerCase().includes('common')) || detailModalTx.departmentCode === 'hospital';
        
        if (isCommonTx) {
          if (detailModalTx.type === 'expense') {
            finalHospitalDetails = {
              ...details,
              receiverName: editDetailForm.hospitalReceiverName.trim(),
              reason: editDetailForm.hospitalReason.trim(),
              time: editDetailForm.hospitalTime.trim(),
              date: editDetailForm.date,
            };
            finalDescription = `Received by: ${editDetailForm.hospitalReceiverName.trim()} | Reason: ${editDetailForm.hospitalReason.trim()} | Time: ${editDetailForm.hospitalTime.trim()}${editDetailForm.description ? ` | Note: ${editDetailForm.description}` : ''}`;
          } else if (editDetailForm.hospitalIncomeType === 'fee') {
            if (editDetailForm.hospitalFeeType === 'custom' && !editDetailForm.hospitalCustomFeeName.trim()) {
              toast.error('Please enter a custom fee name');
              setUpdatingDetail(false);
              return;
            }
            finalHospitalDetails = {
              ...details,
              feeType: editDetailForm.hospitalFeeType,
              patientName: editDetailForm.hospitalPatientName.trim(),
              time: editDetailForm.hospitalTime.trim(),
              date: editDetailForm.date,
            };
            if (editDetailForm.hospitalFeeType === 'custom') {
              finalHospitalDetails.customFeeName = editDetailForm.hospitalCustomFeeName.trim();
            } else {
              delete finalHospitalDetails.customFeeName;
            }
            let feeName = 'Check-up Fee';
            if (editDetailForm.hospitalFeeType === 'usg') feeName = 'USG Fee';
            else if (editDetailForm.hospitalFeeType === 'bsr') feeName = 'BSR Fee';
            else if (editDetailForm.hospitalFeeType === 'hb_test') feeName = 'HB Test Fee';
            else if (editDetailForm.hospitalFeeType === 'custom') feeName = editDetailForm.hospitalCustomFeeName.trim();

            finalDescription = `${feeName} for ${editDetailForm.hospitalPatientName.trim()} | Time: ${editDetailForm.hospitalTime.trim()}${editDetailForm.description ? ` | Note: ${editDetailForm.description}` : ''}`;
          } else if (editDetailForm.hospitalIncomeType === 'medicine') {
            finalHospitalDetails = {
              ...details,
              patientName: editDetailForm.hospitalPatientName.trim(),
              time: editDetailForm.hospitalTime.trim(),
              date: editDetailForm.date,
            };
            const itemsStr = details.items?.map((i: any) => `${i.name} (Rs ${i.price || i.amount})`).join(', ') || '';
            finalDescription = `Medicine/Treatment for ${editDetailForm.hospitalPatientName.trim()} | Time: ${editDetailForm.hospitalTime.trim()}${itemsStr ? ` | Items: ${itemsStr}` : ''}${editDetailForm.description ? ` | Note: ${editDetailForm.description}` : ''}`;
          }
        } else {
          finalHospitalDetails = {
            ...details,
            patientName: editDetailForm.hospitalPatientName.trim() || details.patientName,
            receiverName: editDetailForm.hospitalReceiverName.trim() || details.receiverName,
            reason: editDetailForm.hospitalReason.trim() || details.reason,
            time: editDetailForm.hospitalTime.trim() || details.time,
          };
        }
      }

      let feeCategoryName = editDetailForm.categoryName;
      if (deptCode === 'hospital' && editDetailForm.hospitalIncomeType === 'fee') {
        let feeName = 'Check-up Fee';
        if (editDetailForm.hospitalFeeType === 'usg') feeName = 'USG Fee';
        else if (editDetailForm.hospitalFeeType === 'bsr') feeName = 'BSR Fee';
        else if (editDetailForm.hospitalFeeType === 'hb_test') feeName = 'HB Test Fee';
        else if (editDetailForm.hospitalFeeType === 'custom') feeName = editDetailForm.hospitalCustomFeeName.trim();
        feeCategoryName = feeName;
      }

      if (isApproved) {
        // If it is approved, call the server action
        const { editApprovedTransaction } = await import('@/app/hq/actions/approvals');
        const res = await editApprovedTransaction({
          dept: deptCode as any,
          txId: detailModalTx.id,
          amount: amt,
          date: editDetailForm.date,
          description: finalDescription,
          category: editDetailForm.category || undefined,
          categoryName: feeCategoryName || undefined,
          hospitalDayCloseShift: detailModalTx.hospitalDayCloseShift ? editDetailForm.hospitalShift : undefined,
          hospitalPatientDetails: finalHospitalDetails || undefined,
          _collection: detailModalTx._collection,
        });
        if (!res.success) {
          throw new Error(res.error || 'Failed to update approved transaction');
        }
      } else {
        // If it is not approved, update it directly in firestore
        const coll = detailModalTx._collection || dept.txCollection;
        const docRef = doc(db, coll, detailModalTx.id);
        const [y, m, d] = editDetailForm.date.split('-').map(Number);
        const newDate = new Date(y, m - 1, d, 12, 0, 0);
        const updatePayload: Record<string, any> = {
          amount: amt,
          date: Timestamp.fromDate(newDate),
          transactionDate: Timestamp.fromDate(newDate),
          description: finalDescription,
          updatedAt: Timestamp.now(),
        };
        if (editDetailForm.category) {
          updatePayload.category = editDetailForm.category;
        }
        if (feeCategoryName) {
          updatePayload.categoryName = feeCategoryName;
        }
        if (detailModalTx.hospitalDayCloseShift) {
          updatePayload.hospitalDayCloseShift = editDetailForm.hospitalShift;
        }
        if (finalHospitalDetails) {
          updatePayload.hospitalPatientDetails = finalHospitalDetails;
          updatePayload.patientName = finalHospitalDetails.patientName || finalHospitalDetails.receiverName || 'Inline Patient';
        }
        await updateDoc(docRef, updatePayload);
      }

      // Update local state
      const updatedTx = {
        ...detailModalTx,
        amount: amt,
        date: (() => {
          const [y, m, d] = editDetailForm.date.split('-').map(Number);
          return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
        })(),
        transactionDate: (() => {
          const [y, m, d] = editDetailForm.date.split('-').map(Number);
          return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
        })(),
        description: finalDescription,
        ...(detailModalTx.hospitalDayCloseShift ? { hospitalDayCloseShift: editDetailForm.hospitalShift } : {}),
        ...(editDetailForm.category ? { category: editDetailForm.category } : {}),
        ...(feeCategoryName ? { categoryName: feeCategoryName } : {}),
        ...(finalHospitalDetails ? { 
          hospitalPatientDetails: finalHospitalDetails,
          patientName: finalHospitalDetails.patientName || finalHospitalDetails.receiverName || 'Inline Patient'
        } : {}),
      };

      setDetailModalTx(updatedTx);
      setIsEditingDetail(false);
      toast.success('Transaction updated successfully ✓');
      await fetchHistory();
    } catch (err: any) {
      console.error('[Cashier] Edit detail error:', err);
      toast.error('Update failed: ' + (err.message || 'Error'));
    } finally {
      setUpdatingDetail(false);
    }
  };

  const todayStr = getLocalDateString(new Date());
  
  useEffect(() => {
    const today = getLocalDateString(new Date());
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
      pendingCount: 0,
      topDept
    });
  }, [historyTxns]);

  const totals = useMemo(() => {
    if (historyStats.count > 0 && historyFiltered.length === historyTxns.length) {
      return { income: historyStats.income, expense: historyStats.expense, net: historyStats.income - historyStats.expense };
    }
    const income = historyFiltered.filter((x) => x.type === 'income').reduce((s, x) => s + Number(x.amount || 0), 0);
    const expense = historyFiltered.filter((x) => x.type === 'expense').reduce((s, x) => s + Number(x.amount || 0), 0);
    return { income, expense, net: income - expense };
  }, [historyFiltered, historyStats, historyTxns.length]);

  const departmentBreakdown = useMemo(() => {
    const breakdown: Record<string, { income: number; expense: number }> = {};
    DEPARTMENTS.forEach(d => {
      breakdown[d.code] = { income: 0, expense: 0 };
    });

    historyFiltered.forEach(tx => {
      const code = tx.departmentCode;
      if (breakdown[code]) {
        if (tx.type === 'income') {
          breakdown[code].income += Number(tx.amount || 0);
        } else if (tx.type === 'expense') {
          breakdown[code].expense += Number(tx.amount || 0);
        }
      }
    });

    return breakdown;
  }, [historyFiltered]);

  if (sessionLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF8]">
        <LogoLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] py-6 md:py-16 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto px-4 md:px-12">
        
        <div className="space-y-12 mb-16 animate-in fade-in slide-in-from-top-12 duration-1000">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8 text-center sm:text-left">
              <div className="relative group">
                <div className="absolute -inset-4 bg-indigo-600/20 rounded-[2.5rem] blur-2xl group-hover:bg-indigo-600/40 transition-all duration-700" />
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-indigo-600 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl relative">
                  <Terminal className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" strokeWidth={2.5} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                  <p className="text-[10px] md:text-xs font-black text-indigo-600 uppercase tracking-[0.5em]">Station: 001</p>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-[1000] text-zinc-900 tracking-tighter uppercase leading-none">
                  Cashier
                </h1>
                <p className="text-zinc-400 font-bold flex items-center justify-center sm:justify-start gap-2">
                  <User size={14} className="text-zinc-300" />
                  Logged in as <span className="text-zinc-900">{session?.name || 'Authorized Personnel'}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link 
                href="/hq/dashboard/cashier/pending"
                className="px-6 py-4 bg-amber-100 border border-amber-200 rounded-2xl shadow-xl flex items-center gap-4 group hover:bg-amber-200 transition-all"
              >
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Approvals</p>
                  <p className="text-sm font-black text-amber-900 tracking-tight">Pending Queue</p>
                </div>
              </Link>
              <div className="hidden sm:flex px-6 py-4 bg-white border border-zinc-100 rounded-2xl shadow-xl items-center gap-4 group hover:border-indigo-200 transition-all">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Connection</p>
                  <p className="text-sm font-black text-zinc-900 tracking-tight">Active</p>
                </div>
              </div>
              <button 
                onClick={() => fetchHistory()}
                className="w-16 h-16 bg-zinc-900 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-indigo-600 transition-all active:scale-90 shadow-xl flex-shrink-0"
              >
                <RefreshCw size={24} className={cn(historyLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
            <div className="bg-white rounded-3xl border border-zinc-100 p-6 md:p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Direction</label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setTxnType('income')}
                  className={cn(
                    "h-16 sm:h-20 md:h-24 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-3 transition-all border-2 md:border-4 relative overflow-hidden group/flow",
                    txnType === 'income' 
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-500/30 -translate-y-1" 
                      : "bg-white border-zinc-100 text-zinc-400 hover:border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  <TrendingUp className={cn("w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 transition-transform group-hover/flow:scale-125", txnType === 'income' && "scale-110")} />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Income</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxnType('expense')}
                  className={cn(
                    "h-16 sm:h-20 md:h-24 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-3 transition-all border-2 md:border-4 relative overflow-hidden group/flow",
                    txnType === 'expense' 
                      ? "bg-rose-600 border-rose-500 text-white shadow-2xl shadow-rose-500/30 -translate-y-1" 
                      : "bg-white border-zinc-100 text-zinc-400 hover:border-rose-200 hover:bg-rose-50"
                  )}
                >
                  <TrendingDown className={cn("w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 transition-transform group-hover/flow:scale-125", txnType === 'expense' && "scale-110")} />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Expense</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-100 p-6 md:p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] space-y-6">
              <div className="flex items-center justify-between px-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Department</label>
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Required</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.code}
                    type="button"
                    onClick={() => {
                      setDepartmentCode(dept.code);
                      setSelectedEntity(null);
                      setShowGeneralTxForm(false);
                      setItemizedList([]);
                      setNewItemName('');
                      setNewItemPrice('');
                      setAmount('');
                      setHospitalMode('none');
                      setHospitalIncomeType('none');
                      setHospitalFeeType('none');
                      setHospitalExpenseReceiver('');
                      setHospitalExpenseReason('');
                      setHospitalExpenseTime('');
                      setHospitalFeePatientName('');
                      setHospitalFeeTime('');
                      setHospitalMedicinePatientName('');
                      setHospitalMedicineTime('');
                      setHospitalMedicineItems([]);
                      setNewMedItemName('');
                      setNewMedItemPrice('');
                      setJobCenterMode('none');
                      setJobCenterIncomeAmount('');
                      setJobCenterExpenseAmount('');
                    }}
                    className={cn(
                      "h-14 sm:h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all border-2 group/dept",
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
          </div>

          {((departmentCode !== 'hospital' && departmentCode !== 'job-center') || (departmentCode === 'job-center' && jobCenterMode === 'all_transactions')) ? (
          <div className="bg-white rounded-3xl border border-zinc-100 p-5 md:p-8 xl:p-10 shadow-[0_64px_96px_-32px_rgba(0,0,0,0.08)] relative overflow-hidden group/search">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 rounded-full -mr-96 -mt-96 blur-[120px] group-hover/search:bg-indigo-600/10 transition-all duration-1000" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 md:w-16 md:h-16 bg-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl group-hover/search:scale-110 transition-transform duration-700 flex-shrink-0">
                    <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl md:text-3xl font-[1000] text-zinc-900 uppercase tracking-tighter">Search</h3>
                    <p className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-0.5 sm:mt-1">Search patients, students or others</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 p-1 bg-zinc-100 rounded-xl sm:rounded-2xl w-full sm:w-auto shrink-0">
                  {(['patient', 'student', 'company', 'job seeker', 'staff', 'other'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSearchType(t)}
                      className={cn(
                        "py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer text-center",
                        searchType === t 
                          ? "bg-white text-indigo-600 shadow-xl" 
                          : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/30"
                      )}
                    >
                      {t === 'patient' && departmentCode === 'welfare' ? 'donor' : t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 sm:pl-6 flex items-center pointer-events-none">
                  <User size={20} className="text-indigo-600/30" />
                </div>
                <input
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search for a ${departmentCode === 'welfare' && searchType === 'patient' ? 'donor' : searchType} by name, ID, CNIC or phone...`}
                  className="w-full h-12 sm:h-16 bg-zinc-50 border-2 border-transparent rounded-2xl pl-12 sm:pl-16 pr-10 text-sm sm:text-base font-bold text-zinc-900 outline-none focus:ring-8 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner placeholder:text-zinc-200"
                />
                {entitiesLoading && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <Loader2 size={20} className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>

              {searchOpen && searchQuery.trim() && searchResults.length > 0 && (
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
                         setShowGeneralTxForm(false);
                         setItemizedList([]);
                         setNewItemName('');
                         setNewItemPrice('');
                      }}
                      className="group p-8 bg-zinc-50 border-2 border-transparent rounded-[2.5rem] hover:border-indigo-500 hover:bg-white hover:shadow-[0_32px_64px_-16px_rgba(79,70,229,0.15)] transition-all flex items-center justify-between text-left relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl group-hover:rotate-6">
                           <User size={28} />
                        </div>
                        <div>
                          <h4 className="text-xl font-[1000] text-zinc-900 uppercase tracking-tight truncate max-w-[180px]">{p.name || p.fullName || p.companyName || 'Unknown'}</h4>
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{p._deptLabel}</span>
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                ID: {p.patientId || p.studentId || p.customId || p.donorNumber || p.id.slice(0, 8)}
                                {p.inpatientNumber && p.inpatientNumber !== p.patientId && ` / ${p.inpatientNumber}`}
                              </span>
                            </div>
                            {(() => {
                              const histIds: string[] = [];
                              if (p.rejoinHistory && Array.isArray(p.rejoinHistory)) {
                                p.rejoinHistory.forEach((stay: any) => {
                                  const sid = stay.patientId || stay.inpatientNumber || stay.rejoinDetails?.patientId || stay.rejoinDetails?.inpatientNumber;
                                  if (sid && sid !== p.patientId && sid !== p.inpatientNumber && !histIds.includes(String(sid))) {
                                    histIds.push(String(sid));
                                  }
                                });
                              }
                              if (histIds.length > 0) {
                                return (
                                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Prev IDs: {histIds.join(', ')}
                                  </span>
                                );
                              }
                              return null;
                            })()}
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
          ) : (departmentCode === 'hospital' && hospitalMode === 'none') || (departmentCode === 'job-center' && jobCenterMode === 'none') ? (
            <div className="bg-white rounded-3xl border border-zinc-100 p-5 md:p-8 xl:p-10 shadow-[0_64px_96px_-32px_rgba(0,0,0,0.08)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 rounded-full -mr-96 -mt-96 blur-[120px] transition-all duration-1000" />
              <div className="relative z-10 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 md:w-16 md:h-16 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl">
                      <Plus className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl md:text-3xl font-[1000] text-zinc-900 uppercase tracking-tighter">
                        {departmentCode === 'hospital' ? 'Hospital Cashier' : 'Job Center Cashier'}
                      </h3>
                      <p className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-0.5 sm:mt-1">Select Entry Mode</p>
                    </div>
                  </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (departmentCode === 'hospital') {
                        setHospitalMode('day_close');
                      } else {
                        setJobCenterMode('day_close');
                      }
                    }}
                    className="p-6 rounded-2xl border-2 text-left transition-all bg-white border-zinc-100 hover:border-indigo-200"
                  >
                    <h4 className="text-lg font-black uppercase tracking-tight text-zinc-900">Day Close</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Enter final daily Income/Expense totals</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (departmentCode === 'hospital') {
                        setHospitalMode('all_transactions');
                      } else {
                        setJobCenterMode('all_transactions');
                      }
                    }}
                    className="p-6 rounded-2xl border-2 text-left transition-all bg-white border-zinc-100 hover:border-indigo-200"
                  >
                    <h4 className="text-lg font-black uppercase tracking-tight text-zinc-900">
                      {departmentCode === 'hospital' ? 'Enter All Transactions' : 'Search & Record'}
                    </h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">
                      {departmentCode === 'hospital' 
                        ? 'Record individual patient transactions inline' 
                        : 'Search jobseekers/users and record individual transactions'}
                    </p>
                  </button>
                </div>          </div>
              </div>
            </div>
          ) : null}
        </div>

      <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-xl shadow-zinc-200/40 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 relative z-10">
              {historyDateMode === 'today' ? 'Revenue Today' : 
               historyDateMode === 'yesterday' ? 'Revenue Yesterday' : 
               historyDateMode === 'range' ? 'Revenue (Selected Range)' : 
               'Total Revenue (All Time)'}
            </p>
            <h4 className="text-xl md:text-3xl font-[1000] text-zinc-900 tracking-tighter relative z-10">Rs {totals.income.toLocaleString()}</h4>
          </div>
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-xl shadow-zinc-200/40 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 relative z-10">
              {historyDateMode === 'today' ? 'Payouts Today' : 
               historyDateMode === 'yesterday' ? 'Payouts Yesterday' : 
               historyDateMode === 'range' ? 'Payouts (Selected Range)' : 
               'Total Payouts (All Time)'}
            </p>
            <h4 className="text-xl md:text-3xl font-[1000] text-zinc-900 tracking-tighter relative z-10">Rs {totals.expense.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-xl shadow-zinc-200/40">
          <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6">
            Department Breakdown ({
              historyDateMode === 'today' ? 'Today' : 
              historyDateMode === 'yesterday' ? 'Yesterday' : 
              historyDateMode === 'range' ? 'Custom Range' : 
              'All Time'
            })
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEPARTMENTS.map(dept => {
              const stats = departmentBreakdown[dept.code] || { income: 0, expense: 0 };
              if (historyDepartment !== 'all' && historyDepartment !== dept.code) return null;
              if (stats.income === 0 && stats.expense === 0) return null;
              return (
                <div key={dept.code} className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase text-zinc-700 tracking-wider">{dept.label}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase">
                      {((stats.income - stats.expense) >= 0 ? '+' : '')}Rs {(stats.income - stats.expense).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-400">Income:</span>
                      <span className="text-emerald-600 font-extrabold">Rs {stats.income.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-400">Expense:</span>
                      <span className="text-rose-500 font-extrabold">Rs {stats.expense.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {(() => {
              const activeStats = historyDepartment === 'all' 
                ? Object.values(departmentBreakdown)
                : [departmentBreakdown[historyDepartment]];
              const hasActivity = activeStats.some(s => s && (s.income > 0 || s.expense > 0));
              if (!hasActivity) {
                return (
                  <div className="col-span-full py-4 text-center">
                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">No transaction records found for the selected department and date range.</p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        
        <div className="min-w-0 overflow-hidden space-y-12">
          <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-zinc-100 p-4 sm:p-6 md:p-8 xl:p-10 shadow-[0_64px_96px_-32px_rgba(0,0,0,0.08)] relative overflow-hidden group/console">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-zinc-50 rounded-full -mr-64 -mt-64 blur-3xl group-hover/console:bg-indigo-50 transition-all duration-1000" />
            
            <div className="relative z-10 space-y-8 md:space-y-10">
              {(selectedEntity || (departmentCode === 'hospital' && hospitalMode !== 'none') || showGeneralTxForm) ? (
                <div className="space-y-8 md:space-y-10 animate-in fade-in zoom-in-95 duration-700">
                  {selectedEntity ? (
                    <div className="w-full p-4 sm:p-6 xl:p-8 rounded-2xl sm:rounded-[2rem] bg-zinc-900 text-white min-w-0 shadow-[0_48px_80px_-24px_rgba(0,0,0,0.3)] group/profile relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -mr-64 -mt-64 blur-[100px] group-hover/profile:bg-white/10 transition-all duration-1000" />
                      
                      <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 md:gap-8">
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 xl:w-24 xl:h-24 bg-white/10 backdrop-blur-2xl rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 border-white/20 shadow-2xl relative group/avatar overflow-hidden flex-shrink-0">
                              <User className="w-8 h-8 sm:w-10 sm:h-10 xl:w-12 xl:h-12 text-white/40 group-hover/avatar:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-lg flex items-center justify-center border sm:border-2 border-zinc-900 shadow-xl">
                                <ShieldCheck className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-white" />
                              </div>
                            </div>
                            <div className="text-center sm:text-left space-y-4 min-w-0">
                              <div className="flex items-center justify-center sm:justify-start gap-2">
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Active Protocol Target</p>
                                </div>
                              </div>
                              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-[1000] tracking-tighter leading-tight uppercase break-words">{selectedEntity.name || selectedEntity.fullName || selectedEntity.companyName || 'Unknown'}</h2>
                              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 md:gap-3">
                                <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest truncate max-w-full">
                                  ID: <span className="text-indigo-400">{selectedEntity.patientId || selectedEntity.studentId || selectedEntity.employeeId || selectedEntity.rollNo || selectedEntity.donorNumber || selectedEntity.id.slice(0, 8)}</span>
                                </div>
                                <div className="px-4 py-2 bg-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl truncate">
                                  {departmentCode}
                                </div>
                                <button 
                                  onClick={() => setShowProfileModal(true)}
                                  className="px-4 py-2 bg-white text-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-2xl flex items-center gap-2 truncate cursor-pointer"
                                >
                                  <Eye size={14} />
                                  Full Ledger
                                </button>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => { setSelectedEntity(null); setAmount(''); }} 
                            className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 hover:bg-rose-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center transition-all backdrop-blur-xl border border-white/10 shadow-2xl group/btn active:scale-90 self-center sm:self-start flex-shrink-0 cursor-pointer"
                          >
                            <X size={18} className="group-hover/btn:rotate-90 transition-transform" />
                          </button>
                        </div>
   
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 md:mt-8">
                          <div className="p-3 sm:p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl group/card hover:bg-white/10 transition-all">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Total Protocol Value</p>
                            <h4 className="text-sm sm:text-base md:text-lg xl:text-xl font-[1000] tracking-tighter tabular-nums">Rs {(selectedEntity.totalPackage || selectedEntity.packageAmount || 0).toLocaleString()}</h4>
                          </div>
                          <div className="p-3 sm:p-4 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-xl sm:rounded-2xl group/card hover:bg-emerald-500/20 transition-all">
                            <p className="text-[9px] font-black text-emerald-400/60 uppercase tracking-[0.2em] mb-2">Total Settled</p>
                            <h4 className="text-sm sm:text-base md:text-lg xl:text-xl font-[1000] text-emerald-400 tracking-tighter tabular-nums">Rs {(selectedEntity.totalReceived || selectedEntity.totalReceivedFees || 0).toLocaleString()}</h4>
                          </div>
                          <div className="p-3 sm:p-4 bg-rose-500/10 backdrop-blur-sm border border-rose-500/20 rounded-xl sm:rounded-2xl group/card hover:bg-rose-500/20 transition-all">
                            <p className="text-[9px] font-black text-rose-400/60 uppercase tracking-[0.2em] mb-2">Current Exposure</p>
                            <h4 className="text-sm sm:text-base md:text-lg xl:text-xl font-[1000] text-rose-400 tracking-tighter tabular-nums">Rs {(selectedEntity.remaining || ((selectedEntity.totalPackage || selectedEntity.packageAmount || 0) - (selectedEntity.totalReceived || 0))).toLocaleString()}</h4>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full p-4 sm:p-6 xl:p-8 rounded-2xl sm:rounded-[2rem] bg-zinc-900 text-white min-w-0 shadow-[0_48px_80px_-24px_rgba(0,0,0,0.3)] group/profile relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -mr-64 -mt-64 blur-[100px] group-hover/profile:bg-white/10 transition-all duration-1000" />
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6 md:gap-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 xl:w-24 xl:h-24 bg-white/10 backdrop-blur-2xl rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 border-white/20 shadow-2xl relative overflow-hidden flex-shrink-0">
                            <Activity className="w-8 h-8 sm:w-10 sm:h-10 xl:w-12 xl:h-12 text-white/40" />
                          </div>
                          <div className="text-center sm:text-left space-y-4 min-w-0">
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Hospital Cashier Session</p>
                            </div>
                            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-[1000] tracking-tighter leading-tight uppercase break-words">
                              {hospitalMode === 'day_close' ? 'Hospital Day Close' : 'Hospital Transactions'}
                            </h2>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 md:gap-3">
                              <div className="px-4 py-2 bg-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl">
                                {hospitalMode === 'day_close' ? 'Day Close Mode' : 'All Transactions Mode'}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setHospitalMode('none');
                                  setAmount('');
                                  setHospitalIncomeType('none');
                                  setHospitalFeeType('none');
                                }}
                                className="px-4 py-2 bg-white text-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-2xl flex items-center gap-2 cursor-pointer"
                              >
                                Change Mode
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEntity && entityHistory.length > 0 && (
                    <div className="space-y-8 px-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xl font-[1000] text-zinc-900 uppercase tracking-tighter flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                            <History size={20} />
                          </div>
                          Recent Transactions
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
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">{tx.categoryName || 'General'}</p>
                                <p className="text-xs font-bold text-zinc-500 mt-1 truncate max-w-[120px]">{tx.description || '-'}</p>
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
                  <h3 className="text-3xl md:text-5xl font-[1000] text-zinc-900 uppercase tracking-tighter">
                    Select {departmentCode === 'spims' ? 'a Student' : departmentCode === 'welfare' ? 'a Donor' : departmentCode === 'job-center' ? 'a Seeker' : departmentCode === 'sukoon-center' ? 'a Client' : 'a Patient'} to Begin
                  </h3>
                  <p className="text-xs md:text-base font-black text-zinc-400 uppercase tracking-[0.3em] mt-6 max-w-xl mx-auto leading-relaxed opacity-60">
                    Search and select above, or create a general transaction without linking a user.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGeneralTxForm(true)}
                    className="mt-8 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10 cursor-pointer"
                  >
                    Direct / General Entry (No User)
                  </button>
                </div>
              )}

              {(departmentCode !== 'hospital' || hospitalMode !== 'none') && (
              <form onSubmit={submitTx} className="space-y-10 pt-10 border-t border-zinc-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-8">
                    {!selectedEntity && departmentCode !== 'hospital' && (
                      <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
                              <User size={16} />
                            </div>
                            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider">Unregistered/General Target</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowGeneralTxForm(false);
                              setCustomTargetName('');
                              setItemizedList([]);
                              setNewItemName('');
                              setNewItemPrice('');
                            }}
                            className="text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Select User instead
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Person Name / Purpose / Narrative Target</label>
                          <input
                            value={customTargetName}
                            onChange={(e) => setCustomTargetName(e.target.value)}
                            placeholder="e.g., General Welfare, Walk-in Seeker, Utility Bill payment, Rent..."
                            className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all shadow-inner text-gray-900"
                          />
                        </div>
                      </div>
                    )}

                    {departmentCode === 'hospital' && hospitalMode === 'all_transactions' && (
                      <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
                            <Activity size={16} />
                          </div>
                          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider">Hospital Transaction</h4>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Flow Type</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setTxnType('income');
                                setHospitalIncomeType('none');
                                setHospitalFeeType('none');
                                setAmount('');
                              }}
                              className={cn(
                                "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                txnType === 'income' ? "bg-emerald-600 border-emerald-600 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                              )}
                            >
                              Income
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTxnType('expense');
                                setHospitalIncomeType('none');
                                setHospitalFeeType('none');
                                setAmount('');
                              }}
                              className={cn(
                                "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                txnType === 'expense' ? "bg-rose-600 border-rose-600 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                              )}
                            >
                              Expense
                            </button>
                          </div>
                        </div>

                        {/* Expense Fields */}
                        {txnType === 'expense' && (
                          <div className="space-y-4 pt-4 border-t border-zinc-200/60 animate-in fade-in duration-300">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Receiver Name (Who is taking?)</label>
                              <input
                                value={hospitalExpenseReceiver}
                                onChange={(e) => setHospitalExpenseReceiver(e.target.value)}
                                placeholder="e.g. Aqsa Nasreen, Dr. Khan, Staff Member..."
                                className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Reason / Purpose</label>
                              <input
                                value={hospitalExpenseReason}
                                onChange={(e) => setHospitalExpenseReason(e.target.value)}
                                placeholder="e.g. Medicine purchase, Petty cash, Equipment..."
                                className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Time</label>
                              <input
                                type="time"
                                value={hospitalExpenseTime}
                                onChange={(e) => setHospitalExpenseTime(e.target.value)}
                                className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                              />
                            </div>
                          </div>
                        )}

                        {/* Income Fields */}
                        {txnType === 'income' && (
                          <div className="space-y-6 pt-4 border-t border-zinc-200/60 animate-in fade-in duration-300">
                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Income Classification</label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHospitalIncomeType('fee');
                                    setHospitalFeeType('none');
                                    setAmount('');
                                  }}
                                  className={cn(
                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                    hospitalIncomeType === 'fee' ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-indigo-200"
                                  )}
                                >
                                  Fee
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHospitalIncomeType('medicine');
                                    setHospitalFeeType('none');
                                    setAmount('');
                                    setHospitalMedicineItems([]);
                                  }}
                                  className={cn(
                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                    hospitalIncomeType === 'medicine' ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-indigo-200"
                                  )}
                                >
                                  Medicine
                                </button>
                              </div>
                            </div>

                            {/* Income Subcategory: Fee */}
                            {hospitalIncomeType === 'fee' && (
                              <div className="space-y-4 pt-4 border-t border-zinc-200/60 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Fee Category</label>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {([
                                      { id: 'checkup', label: 'Checkup' },
                                      { id: 'usg', label: 'USG' },
                                      { id: 'bsr', label: 'BSR' },
                                      { id: 'hb_test', label: 'HB Test' },
                                      { id: 'custom', label: 'Custom' },
                                    ] as const).map((t) => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setHospitalFeeType(t.id)}
                                        className={cn(
                                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                          hospitalFeeType === t.id
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                            : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                                        )}
                                      >
                                        {t.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {hospitalFeeType === 'custom' && (
                                  <div className="space-y-2 pt-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Custom Fee Name</label>
                                    <input
                                      type="text"
                                      value={hospitalCustomFeeName}
                                      onChange={(e) => setHospitalCustomFeeName(e.target.value)}
                                      className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                                      placeholder="e.g. Drip Fee..."
                                    />
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Patient Name</label>
                                  <input
                                    value={hospitalFeePatientName}
                                    onChange={(e) => setHospitalFeePatientName(e.target.value)}
                                    placeholder="e.g. Patient Name..."
                                    className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Time</label>
                                  <input
                                    type="time"
                                    value={hospitalFeeTime}
                                    onChange={(e) => setHospitalFeeTime(e.target.value)}
                                    className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Income Subcategory: Medicine */}
                            {hospitalIncomeType === 'medicine' && (
                              <div className="space-y-6 pt-4 border-t border-zinc-200/60 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Patient Name</label>
                                  <input
                                    value={hospitalMedicinePatientName}
                                    onChange={(e) => setHospitalMedicinePatientName(e.target.value)}
                                    placeholder="e.g. Patient Name..."
                                    className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Time</label>
                                  <input
                                    type="time"
                                    value={hospitalMedicineTime}
                                    onChange={(e) => setHospitalMedicineTime(e.target.value)}
                                    className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all text-gray-900"
                                  />
                                </div>

                                {/* Dynamic Item Builder */}
                                <div className="space-y-4 pt-4 border-t border-zinc-100">
                                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Medicine & Drips List</label>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <input
                                        placeholder="Item Name (e.g. Drip)"
                                        value={newMedItemName}
                                        onChange={(e) => setNewMedItemName(e.target.value)}
                                        className="w-full h-10 bg-white border border-zinc-200 rounded-lg px-3 text-xs font-bold outline-none text-gray-900"
                                      />
                                    </div>
                                    <div className="space-y-1 flex gap-2">
                                      <input
                                        type="number"
                                        placeholder="Price (PKR)"
                                        value={newMedItemPrice}
                                        onChange={(e) => setNewMedItemPrice(e.target.value)}
                                        className="w-full h-10 bg-white border border-zinc-200 rounded-lg px-3 text-xs font-bold outline-none text-gray-900"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!newMedItemName.trim() || !newMedItemPrice.trim()) return;
                                          const item = {
                                            id: Math.random().toString(),
                                            name: newMedItemName.trim(),
                                            price: Number(newMedItemPrice) || 0
                                          };
                                          const updated = [...hospitalMedicineItems, item];
                                          setHospitalMedicineItems(updated);
                                          setNewMedItemName('');
                                          setNewMedItemPrice('');
                                          const total = updated.reduce((sum, item) => sum + item.price, 0);
                                          setAmount(String(total));
                                        }}
                                        className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>

                                  {hospitalMedicineItems.length > 0 && (
                                    <div className="bg-white rounded-xl border border-zinc-100 p-4 space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                      {hospitalMedicineItems.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center text-xs font-bold border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
                                          <span className="text-zinc-700">{item.name}</span>
                                          <div className="flex items-center gap-3">
                                            <span className="text-zinc-900">Rs {item.price.toLocaleString()}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = hospitalMedicineItems.filter(i => i.id !== item.id);
                                                setHospitalMedicineItems(updated);
                                                const total = updated.reduce((sum, item) => sum + item.price, 0);
                                                setAmount(String(total));
                                              }}
                                              className="text-[9px] text-rose-500 hover:underline uppercase tracking-wider"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Date</label>
                      </div>
                      <BrutalistCalendar
                        value={txDate}
                        onChange={(iso) => setTxDate(iso)}
                        className="bg-white"
                      />
                    </div>
 
                    {isHospitalDayClose || isJobCenterDayClose ? (
                      <>
                        {/* Shift Selector */}
                        {isHospitalDayClose && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Shift</label>
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Required</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {([
                                { id: 'morning_shift', label: 'Morning Shift' },
                                { id: 'night_shift', label: 'Night Shift' },
                                { id: 'combine', label: 'Combine' },
                              ] as const).map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setHospitalShift(s.id)}
                                  className={cn(
                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                    hospitalShift === s.id ? "bg-zinc-900 border-zinc-900 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                                  )}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Income and Expense Amounts */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Income Amount (PKR)</label>
                            </div>
                            <div className="relative group/income-amount">
                              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-6 flex items-center pointer-events-none">
                                <DollarSign size={20} className="sm:w-6 sm:h-6 text-emerald-600/20 group-focus-within/income-amount:text-emerald-600 transition-colors" />
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                value={isHospitalDayClose ? hospitalIncomeAmount : jobCenterIncomeAmount}
                                onChange={(e) => isHospitalDayClose ? setHospitalIncomeAmount(e.target.value) : setJobCenterIncomeAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-12 sm:h-14 bg-zinc-50 border-2 border-transparent rounded-2xl pl-12 sm:pl-14 pr-6 text-sm sm:text-base font-black text-zinc-900 outline-none focus:ring-8 focus:ring-emerald-600/5 focus:bg-white focus:border-emerald-600/20 transition-all shadow-inner tracking-tighter placeholder:text-zinc-200 tabular-nums"
                              />
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Expense Amount (PKR)</label>
                            </div>
                            <div className="relative group/expense-amount">
                              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-6 flex items-center pointer-events-none">
                                <DollarSign size={20} className="sm:w-6 sm:h-6 text-rose-600/20 group-focus-within/expense-amount:text-rose-600 transition-colors" />
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                value={isHospitalDayClose ? hospitalExpenseAmount : jobCenterExpenseAmount}
                                onChange={(e) => isHospitalDayClose ? setHospitalExpenseAmount(e.target.value) : setJobCenterExpenseAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-12 sm:h-14 bg-zinc-50 border-2 border-transparent rounded-2xl pl-12 sm:pl-14 pr-6 text-sm sm:text-base font-black text-zinc-900 outline-none focus:ring-8 focus:ring-rose-600/5 focus:bg-white focus:border-rose-600/20 transition-all shadow-inner tracking-tighter placeholder:text-zinc-200 tabular-nums"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-6">
                          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Payment Method</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {([
                              { id: 'cash', label: 'Cash' },
                              { id: 'bank_transfer', label: 'Bank Transfer' },
                              { id: 'jazzcash', label: 'JazzCash' },
                              { id: 'easypaisa', label: 'EasyPaisa' },
                              { id: 'credit', label: 'Credit' },
                              { id: 'other', label: 'Other' },
                            ] as const).map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setPaymentMethod(m.id)}
                                className={cn(
                                  "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                  paymentMethod === m.id ? "bg-zinc-900 border-zinc-900 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                                )}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {!selectedEntity && (
                          <div className="space-y-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-200/60 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Itemized Details (Optional)</label>
                              {itemizedList.length > 0 && (
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                                  {itemizedList.length} Item(s) Added
                                </span>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Item Name (e.g. Utility Bill, Tea, Supplies)"
                                className="flex-1 h-10 bg-white border border-zinc-200 rounded-lg px-3 text-xs font-bold outline-none focus:border-indigo-500 text-zinc-900"
                              />
                              <input
                                type="number"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                                placeholder="Price"
                                className="w-24 h-10 bg-white border border-zinc-200 rounded-lg px-3 text-xs font-bold outline-none focus:border-indigo-500 text-zinc-900"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newItemName.trim() || !newItemPrice) return;
                                  const item = {
                                    id: Math.random().toString(),
                                    name: newItemName.trim(),
                                    price: Number(newItemPrice) || 0
                                  };
                                  const updated = [...itemizedList, item];
                                  setItemizedList(updated);
                                  setNewItemName('');
                                  setNewItemPrice('');
                                  const total = updated.reduce((sum, item) => sum + item.price, 0);
                                  setAmount(String(total));
                                }}
                                className="px-4 bg-zinc-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Add
                              </button>
                            </div>

                            {itemizedList.length > 0 && (
                              <div className="bg-white rounded-xl border border-zinc-100 p-4 space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                {itemizedList.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center text-xs font-bold border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-zinc-700">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-zinc-900">Rs {item.price.toLocaleString()}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = itemizedList.filter(i => i.id !== item.id);
                                          setItemizedList(updated);
                                          const total = updated.reduce((sum, item) => sum + item.price, 0);
                                          setAmount(total > 0 ? String(total) : '');
                                        }}
                                        className="text-[9px] text-rose-500 hover:underline uppercase tracking-wider cursor-pointer"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-6">
                          <div className="flex items-center justify-between px-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Amount (PKR)</label>
                            {(((departmentCode === 'hospital' || selectedEntity?.name?.toLowerCase().includes('common')) && txnType === 'income' && hospitalIncomeType === 'medicine') || (!selectedEntity && itemizedList.length > 0)) ? (
                              <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Auto Summed From Items</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Auto Calculated</span>
                              </div>
                            )}
                          </div>
                          <div className="relative group/amount">
                            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-6 flex items-center pointer-events-none">
                              <DollarSign size={20} className="sm:w-6 sm:h-6 text-indigo-600/20 group-focus-within/amount:text-indigo-600 transition-colors" />
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              value={amount}
                              disabled={((departmentCode === 'hospital' || selectedEntity?.name?.toLowerCase().includes('common')) && txnType === 'income' && hospitalIncomeType === 'medicine') || (!selectedEntity && itemizedList.length > 0)}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full h-12 sm:h-14 xl:h-16 bg-zinc-50 border-2 border-transparent rounded-2xl pl-12 sm:pl-14 pr-6 text-base sm:text-lg md:text-xl xl:text-2xl font-black text-zinc-900 outline-none focus:ring-8 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner tracking-tighter placeholder:text-zinc-200 tabular-nums disabled:opacity-75"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Discount</label>
                            </div>
                            <input
                              type="number"
                              value={discount}
                              onChange={(e) => setDiscount(e.target.value)}
                              placeholder="0.00"
                              className="w-full h-12 bg-zinc-50 border-2 border-transparent rounded-xl px-4 text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner tabular-nums"
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Refund</label>
                            </div>
                            <input
                              type="number"
                              value={returnAmount}
                              onChange={(e) => setReturnAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full h-12 bg-zinc-50 border-2 border-transparent rounded-xl px-4 text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner tabular-nums"
                            />
                          </div>
                          {mainStayOptions.length > 1 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between px-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Stay Duration</label>
                              </div>
                              <select
                                value={stayDurationIndex}
                                onChange={(e) => setStayDurationIndex(e.target.value)}
                                className="w-full h-12 bg-zinc-50 border-2 border-transparent rounded-xl px-4 text-xs font-bold outline-none focus:ring-8 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner"
                              >
                                <option value="">Select Stay...</option>
                                {mainStayOptions.map((opt: any) => (
                                  <option key={opt.index} value={opt.index}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Payment Method</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {([
                              { id: 'cash', label: 'Cash' },
                              { id: 'bank_transfer', label: 'Bank Transfer' },
                              { id: 'jazzcash', label: 'JazzCash' },
                              { id: 'easypaisa', label: 'EasyPaisa' },
                              { id: 'credit', label: 'Credit' },
                              { id: 'other', label: 'Other' },
                            ] as const).map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setPaymentMethod(m.id)}
                                className={cn(
                                  "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                  paymentMethod === m.id ? "bg-zinc-900 border-zinc-900 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                                )}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {((departmentCode !== 'hospital' && !selectedEntity?.name?.toLowerCase().includes('common')) || hospitalMode === 'none') && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Category</label>
                              <button type="button" onClick={() => createCategory()} className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-widest">+ Custom</button>
                            </div>
                            <div className="relative">
                              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                              <input 
                                value={categorySearch} 
                                onChange={(e) => setCategorySearch(e.target.value)} 
                                placeholder="Search classification..." 
                                className="w-full h-14 md:h-16 bg-zinc-50 border-2 border-transparent rounded-[1.2rem] md:rounded-[1.5rem] pl-16 pr-6 text-sm font-bold outline-none focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner" 
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-36 md:max-h-48 overflow-y-auto pr-2 no-scrollbar">
                              {categorySearch.trim() && !visibleCategories.some(c => c.name.toLowerCase() === categorySearch.trim().toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => createCategory()}
                                  className="px-4 md:px-6 py-2.5 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border-2 bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white cursor-pointer"
                                >
                                  + Create "{categorySearch}"
                                </button>
                              )}
                              {visibleCategories.map((c) => (
                                <button 
                                  key={c.id} 
                                  type="button" 
                                  onClick={() => setSelectedCategoryId(c.id)} 
                                  className={cn(
                                    'px-4 md:px-6 py-2.5 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border-2', 
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
                        )}
                      </>
                    )}
 
                    <div className="space-y-8 pt-6 border-t border-zinc-100">
                      {/* Proof File and Compliance Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Proof File (IMG/PDF)</label>
                          <div className="relative group/proof">
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
                              className="w-full opacity-0 absolute inset-0 cursor-pointer z-10 h-28"
                            />
                            <div className="w-full bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[1.5rem] px-6 py-6 text-center transition-all group-hover/proof:border-indigo-500 group-hover/proof:bg-indigo-500/5 h-28 flex flex-col justify-center items-center">
                              <p className="text-xs font-[1000] text-zinc-900 truncate max-w-xs px-2">
                                {proofFile ? proofFile.name : 'Upload Receipt/Proof'}
                              </p>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Max Payload: 5MB (.webp / .pdf)</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Proof Missing Reason</label>
                          <textarea
                            value={proofReason}
                            onChange={(e) => setProofReason(e.target.value)}
                            placeholder="Enter reason if proof is not uploaded..."
                            className="w-full h-28 bg-zinc-50 border border-zinc-205 rounded-[1.5rem] px-6 py-4 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 resize-none transition-all placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Notes / Description</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Add a note for this transaction..."
                          className="w-full bg-zinc-50 border-2 border-transparent rounded-[1.5rem] md:rounded-[2rem] px-6 md:px-8 py-6 md:py-8 text-sm md:text-base font-bold text-zinc-900 outline-none focus:ring-8 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner min-h-[120px] md:min-h-[140px] resize-none"
                        />
                      </div>

                      {/* Hold Cash Checkbox */}
                      {txnType === 'expense' && (
                        <div className="p-6 bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-[1.5rem] space-y-3 animate-in fade-in duration-300">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="isHold"
                              checked={isHold}
                              onChange={(e) => setIsHold(e.target.checked)}
                              className="w-5 h-5 text-amber-600 border-zinc-300 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer"
                            />
                            <label htmlFor="isHold" className="text-xs font-black text-amber-900 uppercase tracking-wider cursor-pointer select-none">
                              Hold Cash Amount (Temporary Cash Hold/Advance)
                            </label>
                          </div>
                          <p className="text-[10px] font-bold text-amber-700/80 leading-relaxed pl-8">
                            Check this if you are giving this cash to someone for future purchases. You can settle the exact spent amount and get the remaining cash back later from the dashboard.
                          </p>
                        </div>
                      )}

                      {message && (
                        <div className={cn(
                          "p-5 rounded-[1.5rem] border-2 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2",
                          message.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"
                        )}>
                          {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                          <span className="text-xs font-black uppercase tracking-wider">{message.text}</span>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        disabled={processing || (!isHospitalDayClose && !isJobCenterDayClose && !selectedEntity && departmentCode !== 'hospital' && !showGeneralTxForm)} 
                        className="w-full h-16 md:h-32 bg-zinc-900 hover:bg-indigo-600 text-white font-[1000] text-sm md:text-xl uppercase tracking-[0.4em] rounded-[1.5rem] md:rounded-[3.5rem] transition-all shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] disabled:opacity-20 flex items-center justify-center gap-4 md:gap-8 group/submit active:scale-[0.98]"
                      >
                        {processing ? <Loader2 size={24} className="animate-spin md:w-8 md:h-8" /> : (
                          <>
                            Save Transaction
                            <ArrowRight size={24} className="md:w-8 md:h-8 group-hover:translate-x-4 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-16 md:mt-24 space-y-12 lg:col-span-12">
          {/* Active Cash Holds Section */}
          {activeHolds.length > 0 && (
            <div className="space-y-8 pb-12 border-b-2 border-dashed border-zinc-150 animate-in fade-in duration-700">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
                  <Clock size={24} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-[1000] text-zinc-900 uppercase tracking-tight leading-none">
                    Active <span className="text-amber-600">Cash Holds</span>
                  </h2>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-2">
                    Temporary cash advances awaiting settlement details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeHolds.map((tx) => (
                  <div key={tx.id} className="bg-white p-6 rounded-3xl border-2 border-amber-100 shadow-lg shadow-amber-500/[0.02] hover:border-amber-300 transition-all flex flex-col justify-between gap-4 group">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate max-w-[150px]">
                            {tx.patientName || tx.staffName || 'General'}
                          </h4>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                            {formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}
                          </p>
                        </div>
                        <span className="text-lg font-[1000] text-amber-600 tabular-nums">
                          Rs {Number(tx.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-zinc-500 line-clamp-2 italic">
                        "{tx.description || 'No description provided'}"
                      </p>
                    </div>
                    <div className="pt-4 border-t border-zinc-50 flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-widest border border-amber-100">
                        On Hold
                      </span>
                      <button
                        type="button"
                        onClick={() => openSettleModal(tx)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                      >
                        Settle Hold
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-900 rounded-[2rem] md:rounded-[3rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/10">
                <FileText size={32} className="md:w-10 md:h-10" />
              </div>
              <div>
                <h2 className="text-4xl md:text-6xl font-[1000] text-zinc-900 uppercase tracking-tighter leading-none">
                  Live <span className="text-indigo-600">Transactions</span>
                </h2>
                <p className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-[0.5em] mt-3">Live updates, auto refreshing</p>
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
                        const s = getLocalDateString(d);
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
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>

              <div className="relative group min-w-[240px]">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
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
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Date</span>
                        {sortConfig.key === 'date' && (
                          <div className="text-indigo-600 animate-in fade-in zoom-in duration-300">
                            {sortConfig.direction === 'asc' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="px-12 text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Name</span>
                    </th>
                    <th className="px-12 text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Type</span>
                    </th>
                    <th className="px-12 text-right cursor-pointer hover:bg-zinc-100 transition-colors group/h" onClick={() => setSortConfig({key: 'amount', direction: sortConfig.key === 'amount' && sortConfig.direction === 'desc' ? 'asc' : 'desc'})}>
                      <div className="flex items-center justify-end gap-2">
                        {sortConfig.key === 'amount' && (
                          <div className="text-indigo-600 animate-in fade-in zoom-in duration-300">
                            {sortConfig.direction === 'asc' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
                          </div>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Amount</span>
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
                          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.5em]">Loading...</p>
                        </div>
                      </td>
                    </tr>
                  ) : historyFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-12 py-40 text-center">
                        <p className="text-zinc-300 text-sm font-black uppercase tracking-[0.5em]">No transactions found</p>
                      </td>
                    </tr>
                  ) : historyFiltered.map((tx: any) => (
                    <tr key={tx.id} onClick={() => setDetailModalTx(tx)} className="hover:bg-zinc-50 transition-all cursor-pointer group h-28">
                      <td className="px-12 py-8">
                        <div className="text-xs font-black text-zinc-900 tabular-nums">{formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}</div>
                        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">UTC {new Date(tx.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="px-12 py-8">
                        <div className="text-lg font-[1000] text-zinc-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{tx.patientName || tx.staffName || 'General'}</div>
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

          <div className="block md:hidden space-y-4">
            {historyLoading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">Loading...</p>
              </div>
            ) : historyFiltered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-zinc-300 text-sm font-black uppercase tracking-widest">No transactions found</p>
              </div>
            ) : (
              historyFiltered.map((tx: any) => (
                <div
                  key={tx.id}
                  onClick={() => setDetailModalTx(tx)}
                  className="p-5 bg-white border border-zinc-100 rounded-2xl shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                        {tx.patientName || tx.staffName || 'General'}
                      </h4>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                        {formatDateDMY(tx.transactionDate || tx.date || tx.createdAt)}
                      </p>
                    </div>
                    <span className={cn(
                      'text-lg font-[1000] tracking-tighter tabular-nums',
                      tx.type === 'income' ? 'text-indigo-600' : 'text-rose-500'
                    )}>
                      {tx.type === 'income' ? '+' : '-'} {Number(tx.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-50">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-[9px] font-black uppercase tracking-widest">
                      {tx.categoryName || tx.category}
                    </span>
                    <span className={cn(
                      'px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                      tx.status === 'approved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                      tx.status === 'rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                      'bg-zinc-50 text-zinc-400 border-zinc-100'
                    )}>
                      {tx.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
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

      {settleModalTx && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#FCFBF8]/85 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-xl bg-white border border-zinc-100 rounded-[4rem] overflow-hidden shadow-2xl shadow-amber-500/10">
            <div className="relative p-12">
              <button 
                type="button"
                onClick={() => setSettleModalTx(null)}
                className="absolute top-10 right-10 w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all group"
              >
                <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
              </button>

              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-amber-500/20">
                  <Calculator size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl md:text-3xl font-[1000] text-zinc-900 uppercase tracking-tighter">
                  Settle Cash Hold
                </h3>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em] mt-3">
                  Original Hold: Rs {Number(settleModalTx.amount || 0).toLocaleString()}
                </p>
              </div>

              <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                {/* Hold Details Summary */}
                <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase text-amber-900 tracking-wider">
                    <span>Given To:</span>
                    <span>{settleModalTx.patientName || settleModalTx.staffName || 'General'}</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-800/80">
                    {settleModalTx.description}
                  </div>
                </div>

                {/* Actual Spent Amount Input */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Actual Spent Amount (Rs)</label>
                  <input
                    type="number"
                    max={settleModalTx.amount}
                    value={settleSpentAmount}
                    onChange={(e) => setSettleSpentAmount(e.target.value)}
                    className="w-full h-16 bg-zinc-50 border-2 border-transparent rounded-[1.5rem] px-6 text-sm font-bold text-zinc-900 outline-none focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner"
                    placeholder="Enter actual spent amount..."
                  />
                </div>

                {/* Returned Cash Display */}
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cash Returned to Drawer:</span>
                  <span className="text-lg font-[1000] text-indigo-600 tabular-nums">
                    Rs {Math.max(0, Number(settleModalTx.amount || 0) - (Number(settleSpentAmount) || 0)).toLocaleString()}
                  </span>
                </div>

                {/* Spent Details Input */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Expense Details / Purchase Items</label>
                  <textarea
                    value={settleDescription}
                    onChange={(e) => setSettleDescription(e.target.value)}
                    placeholder="e.g. Bought office stationery, tea and snacks for meeting..."
                    className="w-full h-24 bg-zinc-50 border-2 border-transparent rounded-[1.5rem] px-6 py-4 text-xs font-bold text-zinc-900 outline-none focus:bg-white focus:border-indigo-600/20 resize-none transition-all shadow-inner"
                  />
                </div>

                {/* Proof Upload in settlement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-4">Receipt Image (.webp/.pdf)</label>
                    <div className="relative group/settleproof">
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
                          setSettleProofFile(file || null);
                        }}
                        className="w-full opacity-0 absolute inset-0 cursor-pointer z-10 h-20"
                      />
                      <div className="w-full bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl px-4 py-4 text-center transition-all group-hover/settleproof:border-indigo-500 group-hover/settleproof:bg-indigo-500/5 h-20 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-[1000] text-zinc-900 truncate max-w-[180px]">
                          {settleProofFile ? settleProofFile.name : 'Upload Receipt'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-4">Missing Receipt Reason</label>
                    <input
                      type="text"
                      value={settleProofReason}
                      onChange={(e) => setSettleProofReason(e.target.value)}
                      placeholder="Why is receipt missing..."
                      className="w-full h-20 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setSettleModalTx(null)}
                  className="flex-1 h-14 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={settlingHold || !settleSpentAmount || Number(settleSpentAmount) > settleModalTx.amount || Number(settleSpentAmount) < 0}
                  onClick={handleSettleHoldSubmit}
                  className="flex-1 h-14 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md disabled:opacity-20 active:scale-[0.98]"
                >
                  {settlingHold ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Confirm Settlement'}
                </button>
              </div>
            </div>
          </div>
        </div>
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

      {detailModalTx && (() => {
        const isHospitalTx = detailModalTx.departmentCode === 'hospital';
        const isOwner = detailModalTx.cashierId === session?.customId;
        const isSuperadmin = session?.role === 'superadmin';
        const canEditHospitalTx = isHospitalTx && (isSuperadmin || isOwner);
        const canEdit = !['approved', 'rejected'].includes(detailModalTx.status) || isSuperadmin || canEditHospitalTx;
        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#FCFBF8]/80 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="w-full max-w-xl bg-white border border-zinc-100 rounded-[4rem] overflow-hidden shadow-2xl shadow-indigo-600/10">
              <div className="relative p-12">
                <button 
                  onClick={() => { setDetailModalTx(null); setIsEditingDetail(false); }}
                  className="absolute top-10 right-10 w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all group"
                >
                  <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                </button>

                <div className="flex flex-col items-center text-center mb-12">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-600/20">
                    <FileText size={32} className="md:w-10 md:h-10" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-[1000] text-zinc-900 uppercase tracking-tighter">
                    {isEditingDetail ? 'Edit Transaction' : 'Transaction Details'}
                  </h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em] mt-3">{detailModalTx.id}</p>
                </div>

                {isEditingDetail ? (
                  <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                    {/* Date Input */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Transaction Date</label>
                      <BrutalistCalendar
                        value={editDetailForm.date}
                        onChange={(iso) => setEditDetailForm({ ...editDetailForm, date: iso })}
                        className="bg-zinc-50 border border-zinc-100 rounded-2xl"
                      />
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Amount (Rs)</label>
                      <input
                        type="number"
                        value={editDetailForm.amount}
                        onChange={(e) => setEditDetailForm({ ...editDetailForm, amount: e.target.value })}
                        className="w-full h-16 bg-zinc-50 border-2 border-transparent rounded-[1.5rem] px-6 text-sm font-bold text-zinc-900 outline-none focus:bg-white focus:border-indigo-600/20 transition-all shadow-inner"
                        placeholder="Enter amount..."
                      />
                    </div>

                    {/* Description Input */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Notes / Description</label>
                      <textarea
                        value={editDetailForm.description}
                        onChange={(e) => setEditDetailForm({ ...editDetailForm, description: e.target.value })}
                        placeholder="Enter notes..."
                        className="w-full h-28 bg-zinc-50 border-2 border-transparent rounded-[1.5rem] px-6 py-4 text-xs font-bold text-zinc-900 outline-none focus:bg-white focus:border-indigo-600/20 resize-none transition-all shadow-inner"
                      />
                    </div>

                    {/* Hospital Transaction Specific Inputs */}
                    {detailModalTx.departmentCode === 'hospital' && detailModalTx.hospitalPatientDetails && (
                      <div className="space-y-6 p-6 bg-zinc-50 border border-zinc-100 rounded-3xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity size={16} className="text-indigo-600" />
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Hospital Patient Details</h4>
                        </div>

                        {/* If Fee or Medicine (Income) */}
                        {detailModalTx.type === 'income' && (
                          <>
                            {/* Patient Name */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Patient Name</label>
                              <input
                                type="text"
                                value={editDetailForm.hospitalPatientName}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, hospitalPatientName: e.target.value })}
                                className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20"
                                placeholder="Enter patient name..."
                              />
                            </div>

                            {/* Fee Type selection if fee */}
                             {editDetailForm.hospitalIncomeType === 'fee' && (
                               <div className="space-y-4">
                                 <div className="space-y-2">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Fee Sub-type</label>
                                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                     {([
                                       { id: 'checkup', label: 'Checkup' },
                                       { id: 'usg', label: 'USG' },
                                       { id: 'bsr', label: 'BSR' },
                                       { id: 'hb_test', label: 'HB Test' },
                                       { id: 'custom', label: 'Custom' },
                                     ] as const).map((t) => (
                                       <button
                                         key={t.id}
                                         type="button"
                                         onClick={() => setEditDetailForm({ ...editDetailForm, hospitalFeeType: t.id })}
                                         className={cn(
                                           "py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                                           editDetailForm.hospitalFeeType === t.id
                                             ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                             : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                         )}
                                       >
                                         {t.label}
                                       </button>
                                     ))}
                                   </div>
                                 </div>

                                 {editDetailForm.hospitalFeeType === 'custom' && (
                                   <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                     <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Custom Fee Name</label>
                                     <input
                                       type="text"
                                       value={editDetailForm.hospitalCustomFeeName}
                                       onChange={(e) => setEditDetailForm({ ...editDetailForm, hospitalCustomFeeName: e.target.value })}
                                       className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20"
                                       placeholder="e.g. Drip Fee..."
                                     />
                                   </div>
                                 )}
                               </div>
                             )}
                          </>
                        )}

                        {/* If Expense */}
                        {detailModalTx.type === 'expense' && (
                          <>
                            {/* Receiver Name */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Receiver Name</label>
                              <input
                                type="text"
                                value={editDetailForm.hospitalReceiverName}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, hospitalReceiverName: e.target.value })}
                                className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20"
                                placeholder="Receiver name..."
                              />
                            </div>

                            {/* Expense Reason */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Reason</label>
                              <input
                                type="text"
                                value={editDetailForm.hospitalReason}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, hospitalReason: e.target.value })}
                                className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20"
                                placeholder="Reason..."
                              />
                            </div>
                          </>
                        )}

                        {/* Common Time Field */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Transaction Time</label>
                          <input
                            type="text"
                            value={editDetailForm.hospitalTime}
                            onChange={(e) => setEditDetailForm({ ...editDetailForm, hospitalTime: e.target.value })}
                            className="w-full h-12 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20"
                            placeholder="e.g., 10:00 AM"
                          />
                        </div>
                      </div>
                    )}

                    {/* Shift Selector (Only for Hospital Day Close) */}
                    {detailModalTx.hospitalDayCloseShift && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 ml-4">Hospital Day Close Shift</label>
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            { id: 'morning_shift', label: 'Morning' },
                            { id: 'night_shift', label: 'Night' },
                            { id: 'combine', label: 'Combine' },
                          ] as const).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setEditDetailForm({ ...editDetailForm, hospitalShift: s.id })}
                              className={cn(
                                "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                editDetailForm.hospitalShift === s.id ? "bg-zinc-900 border-zinc-900 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                              )}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className={cn("grid gap-6", detailModalTx.hospitalDayCloseShift ? "grid-cols-3" : "grid-cols-2")}>
                      <div className="p-6 rounded-[2rem] bg-zinc-50 border border-zinc-100">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">Date</p>
                        <p className="text-sm font-[1000] text-zinc-900">{formatDateDMY(detailModalTx.createdAt || detailModalTx.date)}</p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-zinc-50 border border-zinc-100">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">Department</p>
                        <p className="text-sm font-[1000] text-zinc-900 uppercase">{detailModalTx.departmentCode || 'HQ-MAIN'}</p>
                      </div>
                      {detailModalTx.hospitalDayCloseShift && (
                        <div className="p-6 rounded-[2rem] bg-zinc-50 border border-zinc-100">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">Shift</p>
                          <p className="text-sm font-[1000] text-zinc-900 uppercase">
                            {detailModalTx.hospitalDayCloseShift === 'morning_shift' ? 'Morning' : detailModalTx.hospitalDayCloseShift === 'night_shift' ? 'Night' : 'Combine'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-indigo-600 shadow-2xl shadow-indigo-600/30 group text-white">
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-3">Name</p>
                      <p className="text-2xl font-[1000] text-white tracking-tight">{detailModalTx.patientName || detailModalTx.staffName || 'General'}</p>
                      <p className="text-xs font-black text-white/60 mt-2 font-mono uppercase tracking-widest">{detailModalTx.patientId || detailModalTx.staffId || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 px-4">
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-2">Category</p>
                        <p className="text-base font-[1000] text-zinc-900">{detailModalTx.categoryName || detailModalTx.category || 'Undefined'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-2">Amount</p>
                        <p className="text-2xl font-[1000] text-zinc-900 tabular-nums">Rs {Number(detailModalTx.amount || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    {detailModalTx.description && (
                      <div className="p-8 rounded-[2.5rem] bg-zinc-50 border-2 border-dashed border-zinc-200">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-4 text-center">Notes / Description</p>
                        <p className="text-sm font-black text-zinc-600 text-center leading-relaxed italic">
                          "{detailModalTx.description}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {isEditingDetail ? (
                  <div className="mt-12 grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={updatingDetail}
                      onClick={() => setIsEditingDetail(false)}
                      className="h-16 bg-zinc-100 text-zinc-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updatingDetail}
                      onClick={handleSaveDetailEdit}
                      className="h-16 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {updatingDetail ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-12 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingDetail(true);
                            const details = detailModalTx.hospitalPatientDetails || {};
                            const desc = detailModalTx.description || '';
                            let extractedNote = desc;
                            if (detailModalTx.departmentCode === 'hospital' && detailModalTx.hospitalPatientDetails) {
                              const noteIndex = desc.indexOf('| Note:');
                              if (noteIndex !== -1) {
                                extractedNote = desc.substring(noteIndex + 7).trim(); // skip "| Note:" length (7 chars)
                              } else if (desc.includes('for ') || desc.includes('Received by:') || desc.includes('Medicine/Treatment ')) {
                                extractedNote = '';
                              }
                            }
                            setEditDetailForm({
                              amount: String(detailModalTx.amount || 0),
                              date: getLocalDateString(detailModalTx.date || detailModalTx.transactionDate || detailModalTx.createdAt),
                              description: extractedNote,
                              category: detailModalTx.category || '',
                              categoryName: detailModalTx.categoryName || '',
                              hospitalShift: detailModalTx.hospitalDayCloseShift || 'combine',
                              hospitalPatientName: details.patientName || '',
                              hospitalReceiverName: details.receiverName || '',
                              hospitalReason: details.reason || '',
                              hospitalTime: details.time || '',
                              hospitalFeeType: details.feeType || 'none',
                              hospitalCustomFeeName: details.customFeeName || '',
                              hospitalIncomeType: details.type || 'none',
                            });
                          }}
                          className="h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-600 hover:text-white transition-all shadow-xl shadow-indigo-600/5"
                        >
                          Edit Details
                        </button>
                      )}
                      {((['pending', 'pending_cashier'].includes(detailModalTx.status)) ||
                        ((detailModalTx.status === 'approved' || detailModalTx.status === 'rejected') && 
                         (detailModalTx.cashierId === session?.customId || session?.role === 'superadmin'))) && (
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
                    </div>
                    {detailModalTx.status === 'pending_cashier' ? (
                      <button 
                        onClick={() => {
                          setDetailModalTx(null);
                          setIsEditingDetail(false);
                          openForwardModal(detailModalTx);
                        }}
                        className="w-full h-16 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all"
                      >
                        Authorize Node
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setDetailModalTx(null); setIsEditingDetail(false); }}
                        className="w-full h-16 bg-zinc-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-xl"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  </div>
);
}

function EntityProfileModal({ 
  entity: propEntity, 
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
  const [entity, setEntity] = useState(propEntity);

  useEffect(() => {
    setEntity(propEntity);
  }, [propEntity]);

  useEffect(() => {
    const deptCode = propEntity._deptCode || propEntity.department || 'rehab';
    const dept = findDept(deptCode);

    const unsub = onSnapshot(doc(db, dept.entityCollection, propEntity.id), (snap) => {
      if (snap.exists()) {
        setEntity((prev: any) => ({
          ...prev,
          ...snap.data()
        }));
      }
    });
    return () => unsub();
  }, [propEntity]);
  const [localTxns, setLocalTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [profileSortConfig, setProfileSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [showAdjustDuesForm, setShowAdjustDuesForm] = useState(false);
  const [newDuesAmount, setNewDuesAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [duesLogs, setDuesLogs] = useState<any[]>([]);

  const todayIso = getLocalDateString(new Date());
  const yesterdayIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  })();

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: '',
    category: 'fee',
    categoryName: 'Admission Fee',
    date: todayIso,
    description: '',
    discount: '',
    returnAmount: '',
    stayDurationIndex: '',
  });

  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const { session } = useHqSession();

  const stayOptions = useMemo(() => {
    const deptCode = entity._deptCode || 'rehab';
    if (deptCode !== 'rehab') return [];
    const history = entity.rejoinHistory || [];
    const list = history.map((stay: any, idx: number) => ({
      index: idx,
      label: `Stay #${idx + 1} (Historical: ${getLocalDateString(stay.admissionDate)} to ${stay.dischargeDate ? getLocalDateString(stay.dischargeDate) : 'Present'})`
    }));
    list.push({
      index: history.length,
      label: `Stay #${history.length + 1} (Current Stay: ${getLocalDateString(entity.admissionDate)} to Present)`
    });
    return list;
  }, [entity]);

  const handleCreateCategory = async (isForEdit: boolean = false) => {
    const name = customCategoryName.trim();
    if (!name) return;
    let slug = slugify(name);
    if (BASE_CATEGORIES.some((c) => c.id === slug)) {
      slug = slug + '_custom';
    }
    
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
      
      // Update cache
      const cached = getCached<any[]>('hq_cashier_categories_list') || [];
      setCached('hq_cashier_categories_list', [...cached, catObj], 600);

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
    if (adding) return;
    const amt = Number(newTx.amount) || 0;
    const disc = Number(newTx.discount) || 0;
    const ret = Number(newTx.returnAmount) || 0;

    if (amt <= 0 && disc <= 0 && ret <= 0) {
      toast.error('Please enter a valid amount, discount, or return');
      return;
    }
    setAdding(true);
    try {
      const deptCode = entity._deptCode || entity.department || 'rehab';
      const dept = findDept(deptCode);

      const txDate = new Date(`${newTx.date}T12:00:00`);
      
      const isSuperadmin = session?.role === 'superadmin';

      const payload: any = {
        amount: Number(newTx.amount),
        category: newTx.category,
        categoryName: newTx.categoryName,
        date: Timestamp.fromDate(txDate),
        createdAt: Timestamp.now(),
        description: newTx.description,
        status: isSuperadmin ? 'approved' : 'pending_cashier',
        type: 'income',
        departmentCode: deptCode,
        cashierId: isSuperadmin ? (session?.customId || 'SUPERADMIN') : 'CASHIER',
        discount: Number(newTx.discount) || 0,
        returnAmount: Number(newTx.returnAmount) || 0,
        ...(isSuperadmin ? {
          approvedAt: Timestamp.now(),
          approvedBy: session?.customId || 'SUPERADMIN',
          processedAt: Timestamp.now(),
          processedBy: session?.customId || 'SUPERADMIN',
        } : {}),
      };
      if (newTx.stayDurationIndex !== '') {
        payload.stayDurationIndex = Number(newTx.stayDurationIndex);
      }

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
      
      if (isSuperadmin) {
        try {
          const { syncDirectApprovedTransaction } = await import('@/app/hq/actions/approvals');
          await syncDirectApprovedTransaction({ 
            dept: deptCode as any, 
            txId: docRef.id,
            approvedBy: session?.customId || 'SUPERADMIN'
          });
        } catch (syncErr) {
          console.error('[HQ Cashier] Sync direct approved transaction failed:', syncErr);
        }
      }

      const freshDoc = { id: docRef.id, ...payload, _collection: dept.txCollection };
      setLocalTxns(prev => [freshDoc, ...prev]);
      
      setShowAddForm(false);
      
      const nextHasPaidAdmission = [...localTxns, freshDoc].some(t => {
        const cat = (t.category || '').toLowerCase();
        const name = (t.categoryName || '').toLowerCase();
        return cat === 'fee' || name.includes('admission');
      }) || newTx.category === 'fee';

      setNewTx({
        amount: '',
        category: nextHasPaidAdmission ? 'monthly_fee' : 'fee',
        categoryName: nextHasPaidAdmission ? 'Monthly Fee' : 'Admission Fee',
        date: todayIso,
        description: '',
        discount: '',
        returnAmount: '',
        stayDurationIndex: ''
      });
      toast.success(isSuperadmin ? 'Transaction approved & synced successfully ✓' : 'Transaction added successfully ✓');
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
        discount: Number(editForm.discount) || 0,
        returnAmount: Number(editForm.returnAmount) || 0,
        stayDurationIndex: editForm.stayDurationIndex !== '' ? Number(editForm.stayDurationIndex) : null,
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const entityId = entity.id;
      const deptCode = entity._deptCode || entity.department || 'rehab';
      const dept = findDept(deptCode);

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
  }, [entity]);

  const fetchDuesLogs = useCallback(async () => {
    if (entity._deptCode !== 'rehab') return;
    try {
      const q = query(
        collection(db, 'rehab_remaining_logs'),
        where('patientId', '==', entity.id)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a: any, b: any) => {
        const tA = a.changedAt?.toDate?.() ? a.changedAt.toDate().getTime() : new Date(a.changedAt || 0).getTime();
        const tB = b.changedAt?.toDate?.() ? b.changedAt.toDate().getTime() : new Date(b.changedAt || 0).getTime();
        return tB - tA;
      });
      setDuesLogs(logs);
    } catch (err) {
      console.error("Could not fetch dues logs:", err);
    }
  }, [entity]);

  const handleAdjustDues = async () => {
    const newDues = Number(newDuesAmount);
    if (isNaN(newDues) || newDuesAmount.trim() === '') {
      toast.error('Please enter a valid number for dues');
      return;
    }

    setAdjusting(true);
    try {
      const patientId = entity.id;

      // 1. Fetch patient document to get current calculation parameters
      const patientRef = doc(db, 'rehab_patients', patientId);
      const patientSnap = await getDoc(patientRef);
      if (!patientSnap.exists()) {
        toast.error('Patient document not found');
        return;
      }
      const patientData = patientSnap.data() as any;

      // 2. Fetch approved transactions (excluding canteen) to get calculated values
      const txQ = query(
        collection(db, 'rehab_transactions'),
        where('patientId', '==', patientId),
        where('status', '==', 'approved')
      );
      const txSnap = await getDocs(txQ);

      let totalReceived = 0;
      let totalMedicineCharges = 0;
      let totalDiscount = 0;

      txSnap.docs.forEach((doc) => {
        const tx = doc.data();
        const amount = Number(tx.amount) || 0;
        const discount = Number(tx.discount || 0);
        const returnAmount = Number(tx.returnAmount || tx.return || 0);
        const netAmount = amount - returnAmount;

        if (tx.category === 'medicine_charge') {
          totalMedicineCharges += netAmount;
        } else if (tx.category === 'canteen_deposit' || tx.category === 'canteen' || tx.category === 'canteen_expense') {
          // Exclude canteen
        } else {
          totalReceived += netAmount;
          totalDiscount += discount;
        }
      });

      // Calculate stay package fee for current stay
      const monthlyPkg = Number(patientData.monthlyPackage || patientData.packageAmount || 0);
      
      const safeToDate = (d: any) => {
        if (!d) return new Date();
        if (d.toDate) return d.toDate();
        return new Date(d);
      };

      let admissionDate = safeToDate(patientData.admissionDate);
      let endDate = new Date();
      if (patientData.isActive === false && patientData.dischargeDate) {
        endDate = safeToDate(patientData.dischargeDate);
      }

      const rawMonths = (endDate.getFullYear() - admissionDate.getFullYear()) * 12 + (endDate.getMonth() - admissionDate.getMonth());
      let completedMonths = rawMonths;
      let hasExtraDays = false;

      if (endDate.getDate() < admissionDate.getDate()) {
        completedMonths = rawMonths - 1;
        hasExtraDays = true;
      } else if (endDate.getDate() > admissionDate.getDate()) {
        completedMonths = rawMonths;
        hasExtraDays = true;
      } else {
        completedMonths = rawMonths;
        hasExtraDays = false;
      }

      const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
      const currentStayPackage = billableMonths * monthlyPkg;

      // Calculate historical stays
      let historicalStayPackage = 0;
      const history = patientData.rejoinHistory || [];
      history.forEach((stay: any) => {
        const sAdmission = safeToDate(stay.admissionDate);
        const sDischarge = stay.dischargeDate ? safeToDate(stay.dischargeDate) : new Date();
        const sMonthlyPkg = Number(stay.monthlyPackage || stay.packageAmount || 0);

        const sRawMonths = (sDischarge.getFullYear() - sAdmission.getFullYear()) * 12 + (sDischarge.getMonth() - sAdmission.getMonth());
        let sCompletedMonths = sRawMonths;
        let sHasExtraDays = false;

        if (sDischarge.getDate() < sAdmission.getDate()) {
          sCompletedMonths = sRawMonths - 1;
          sHasExtraDays = true;
        } else if (sDischarge.getDate() > sAdmission.getDate()) {
          sCompletedMonths = sRawMonths;
          sHasExtraDays = true;
        } else {
          sCompletedMonths = sRawMonths;
          sHasExtraDays = false;
        }

        const sBillableMonths = Math.max(1, sCompletedMonths + (sHasExtraDays ? 1 : 0));
        historicalStayPackage += sBillableMonths * sMonthlyPkg;
      });

      const totalStayPackage = currentStayPackage + historicalStayPackage;
      const finalMedicineCharges = typeof patientData.medicineCharges === 'number' ? patientData.medicineCharges : totalMedicineCharges;
      const totalObligation = totalStayPackage + finalMedicineCharges;

      // Calculate calculatedRemaining without manualAdjustment
      const calculatedRemaining = totalObligation - totalReceived - totalDiscount;

      // manualRemainingAdjustment = X - calculatedRemaining
      const adjustment = newDues - calculatedRemaining;
      const oldDues = Number(patientData.remaining ?? patientData.remainingBalance ?? patientData.overallRemaining ?? calculatedRemaining);

      // 3. Update patient document
      await updateDoc(patientRef, {
        manualRemainingAdjustment: adjustment,
        remaining: newDues,
        remainingBalance: newDues,
        overallRemaining: newDues
      });

      // 4. Record remaining dues change log
      const logData = {
        patientId,
        patientName: patientData.name || '',
        oldAmount: oldDues,
        newAmount: newDues,
        changedBy: session?.uid || 'unknown',
        changedByName: session?.displayName || session?.name || 'Cashier/Admin',
        changedAt: Timestamp.now(),
        reason: adjustReason.trim() || 'Manual adjustment'
      };

      // Write to flat log collection
      await addDoc(collection(db, 'rehab_remaining_logs'), logData);

      // Write to subcollection under patient
      await addDoc(collection(db, 'rehab_patients', patientId, 'remaining_logs'), logData);

      // 5. Trigger sync action to make sure everything is completely aligned
      const { syncRehabPatientFinance } = await import('@/app/hq/actions/approvals');
      await syncRehabPatientFinance(patientId);

      toast.success('Remaining dues adjusted successfully ✓');
      setNewDuesAmount('');
      setAdjustReason('');
      setShowAdjustDuesForm(false);

      // Refresh data
      fetchAll();
      fetchDuesLogs();
      if (onRefetch) onRefetch();

    } catch (err: any) {
      console.error('Failed to adjust dues:', err);
      toast.error('Adjustment failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAdjusting(false);
    }
  };

  useEffect(() => {
    if (showAdjustDuesForm) {
      fetchDuesLogs();
    }
  }, [showAdjustDuesForm, fetchDuesLogs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (tx: any) => {
    const isProcessed = tx.status === 'approved' || tx.status === 'rejected' || tx.status === 'rejected_cashier';
    if (session?.role !== 'superadmin' && isProcessed) {
      toast.error('Processed transactions can only be deleted by the Super Admin.');
      return;
    }

    if (!window.confirm(`Delete this ${tx.status} transaction of Rs ${Number(tx.amount).toLocaleString()}? This cannot be undone.`)) return;
    
    let targetCollection = tx._collection;
    const deptCode = tx.departmentCode || entity?._deptCode || entity?.department;
    if (!targetCollection) {
      const dept = findDept(deptCode);
      if (dept) targetCollection = dept.txCollection;
    }

    if (!targetCollection) {
      toast.error('Critical Error: Source collection undefined. Deletion aborted for safety.');
      return;
    }

    setDeletingId(tx.id);
    try {
      if (tx.status === 'approved') {
        await reverseEntityTotals(db, deptCode, tx).catch((err) => {
          console.error('[Cashier Profile Modal] Failed to reverse entity totals:', err);
        });
      }

      await deleteDoc(doc(db, targetCollection, tx.id));
      
      if (deptCode === 'spims' && tx.feePaymentId) {
        await deleteDoc(doc(db, 'spims_fees', tx.feePaymentId)).catch(() => {});
      }

      if (deptCode === 'rehab') {
        const patientId = tx.patientId || tx.studentId || tx.seekerId || entity?.id;
        if (patientId) {
          try {
            const { syncRehabPatientFinance } = await import('@/app/hq/actions/approvals');
            await syncRehabPatientFinance(patientId);
          } catch (syncErr) {
            console.error('[HQ Cashier] Failed to sync patient finance after delete:', syncErr);
          }
        }
      }

      setLocalTxns(prev => prev.filter(t => t.id !== tx.id));
      toast.success('Transaction deleted ✓');
      if (onRefetch) onRefetch();
    } catch (err: any) {
      toast.error('Delete failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedTxIds.size;
    if (count === 0) return;
    
    const hasProcessed = Array.from(selectedTxIds).some(id => {
      const tx = localTxns.find(t => t.id === id);
      return tx && (tx.status === 'approved' || tx.status === 'rejected' || tx.status === 'rejected_cashier');
    });

    if (session?.role !== 'superadmin' && hasProcessed) {
      toast.error('Processed transactions can only be deleted by the Super Admin.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete the ${count} selected transaction(s)? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const ids = Array.from(selectedTxIds);
      let rehabPatientId = null;
      for (const id of ids) {
        const tx = localTxns.find(t => t.id === id);
        if (!tx) continue;
        
        let targetCollection = tx._collection;
        const deptCode = tx.departmentCode || entity?._deptCode || entity?.department;
        if (!targetCollection) {
          const dept = findDept(deptCode);
          if (dept) targetCollection = dept.txCollection;
        }
        
        if (!targetCollection) continue;
        
        if (tx.status === 'approved') {
          await reverseEntityTotals(db, deptCode, tx).catch((err) => {
            console.error('[Cashier Profile Modal Bulk] Failed to reverse totals:', err);
          });
        }
        
        await deleteDoc(doc(db, targetCollection, tx.id));
        
        if (deptCode === 'spims' && tx.feePaymentId) {
          await deleteDoc(doc(db, 'spims_fees', tx.feePaymentId)).catch(() => {});
        }

        if (deptCode === 'rehab') {
          rehabPatientId = tx.patientId || tx.studentId || tx.seekerId || entity?.id;
        }
      }

      if (rehabPatientId) {
        try {
          const { syncRehabPatientFinance } = await import('@/app/hq/actions/approvals');
          await syncRehabPatientFinance(rehabPatientId);
        } catch (syncErr) {
          console.warn('[Cashier Profile Modal Bulk] syncRehabPatientFinance failed:', syncErr);
        }
      }

      toast.success(`${count} transaction(s) deleted ✓`);
      setSelectedTxIds(new Set());
      setIsSelectMode(false);
      if (onRefetch) onRefetch();
      await fetchAll();
    } catch (err: any) {
      toast.error('Bulk deletion failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
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

  const isStaffEntity = !!(
    entity.monthlySalary !== undefined || 
    entity.staffId !== undefined || 
    entity.designation !== undefined || 
    (entity.customId && String(entity.customId).includes('STF')) || 
    entity.employeeId !== undefined || 
    (entity._deptLabel && String(entity._deptLabel).toLowerCase().includes('staff')) ||
    localTxns.some(t => t.category === 'advance_salary' || t.categoryName === 'Staff Advance')
  );

  const totalPackage = isStaffEntity 
    ? Number(entity.monthlySalary || entity.salary || entity.totalPackage || entity.packageAmount || 0)
    : Number(entity.totalPackage || entity.packageAmount || 0);

  const totalApproved = localTxns
    .filter(t => (isStaffEntity ? (t.category === 'advance_salary' || t.category === 'advance' || t.categoryName?.toLowerCase().includes('advance') || t.type === 'expense' || t.type === 'income') : t.type === 'income') && t.status === 'approved')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalPending = localTxns
    .filter(t => (isStaffEntity ? (t.category === 'advance_salary' || t.category === 'advance' || t.categoryName?.toLowerCase().includes('advance') || t.type === 'expense' || t.type === 'income') : t.type === 'income') && ['pending', 'pending_cashier'].includes(t.status))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const remaining = isStaffEntity 
    ? (totalPackage > 0 ? (totalPackage - totalApproved) : 0)
    : (entity._deptCode === 'rehab' 
        ? (entity.remainingBalance ?? entity.overallRemaining ?? entity.remaining ?? (totalPackage - totalApproved)) 
        : (totalPackage - totalApproved));

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-10 lg:p-12 bg-zinc-950/80 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-5xl h-[98vh] md:h-[90vh] lg:h-[86vh] bg-white rounded-t-[2rem] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-zinc-100">
        
        <div className="bg-zinc-900 px-4 sm:px-6 py-4 sm:py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <User size={18} className="sm:hidden text-white" />
                <User size={22} className="hidden sm:block text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate leading-tight">
                  {entity.name || entity.fullName}
                </h2>
                <p className="text-[9px] sm:text-xs text-white/50 font-bold mt-0.5 truncate">
                  {entity._deptLabel} • ID: {entity.patientId || entity.studentId || entity.id?.slice(0,8)}
                  {entity.rollNumber && ` • Roll: ${entity.rollNumber}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer" title="Print Ledger">
                <Printer size={16} />
              </button>
              <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-zinc-100 flex-shrink-0 overflow-hidden text-gray-900">
          <div className="p-2 sm:p-3 border-r border-b md:border-b-0 border-zinc-100">
            <p className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">
              {isStaffEntity ? 'Monthly Base Salary' : 'Total Package'}
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-tight">Rs {totalPackage.toLocaleString()}</p>
          </div>
          <div className="p-2 sm:p-3 border-r border-b md:border-b-0 border-zinc-100 bg-emerald-50/30">
            <p className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">
              {isStaffEntity ? 'Approved Advance' : 'Approved Paid'}
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-emerald-700 tracking-tight">Rs {totalApproved.toLocaleString()}</p>
          </div>
          <div className="p-2 sm:p-3 border-r border-zinc-100 bg-amber-50/30">
            <p className="text-[8px] sm:text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">
              {isStaffEntity ? 'Pending Advance' : 'Pending Review'}
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-amber-700 tracking-tight">Rs {totalPending.toLocaleString()}</p>
          </div>
          <div className="p-2 sm:p-3 bg-rose-50/30">
            <p className="text-[8px] sm:text-[9px] font-black text-rose-600 uppercase tracking-widest mb-0.5">
              {isStaffEntity ? 'Salary Remaining' : 'Still Remaining'}
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-rose-700 tracking-tight">Rs {remaining.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-100 flex-shrink-0 bg-zinc-50 gap-3">
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedTxIds(new Set());
              }}
              className={cn(
                "flex-1 md:flex-none px-6 py-3 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                isSelectMode ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400"
              )}
            >
              <CheckCircle2 size={14} />
              {isSelectMode ? "Exit Select" : "Select"}
            </button>

            {entity._deptCode === 'rehab' && (
              <button
                onClick={() => {
                  setShowAdjustDuesForm(!showAdjustDuesForm);
                  setShowAddForm(false);
                }}
                className={cn(
                  "flex-1 md:flex-none px-6 py-3 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  showAdjustDuesForm ? "bg-rose-100 text-rose-600" : "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                )}
              >
                {showAdjustDuesForm ? <X size={14} /> : <Calculator size={14} />}
                {showAdjustDuesForm ? "Dismiss Adjust" : "Adjust Dues"}
              </button>
            )}

            <button
              onClick={() => {
                const isOpening = !showAddForm;
                if (isOpening) {
                  const hasPaidAdmission = localTxns.some(t => {
                    const cat = (t.category || '').toLowerCase();
                    const name = (t.categoryName || '').toLowerCase();
                    return cat === 'fee' || name.includes('admission');
                  });
                  setNewTx(prev => ({
                    ...prev,
                    category: hasPaidAdmission ? 'monthly_fee' : 'fee',
                    categoryName: hasPaidAdmission ? 'Monthly Fee' : 'Admission Fee'
                  }));
                  setShowAdjustDuesForm(false);
                }
                setShowAddForm(isOpening);
              }}
              className={cn(
                "flex-1 md:flex-none px-6 py-3 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                showAddForm ? "bg-rose-100 text-rose-600" : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              )}
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              {showAddForm ? "Dismiss Panel" : "Quick Entry"}
            </button>
          </div>
        </div>

        {showAdjustDuesForm && entity._deptCode === 'rehab' && (
          <div className="p-6 bg-purple-50 border-b border-purple-100 animate-in slide-in-from-top-4 duration-500 overflow-y-auto max-h-[300px] text-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-purple-400">Current Dues</label>
                <div className="w-full h-12 bg-white border border-purple-100 rounded-xl px-4 flex items-center text-xs font-black text-purple-700">
                  Rs {remaining.toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-purple-400">New Dues Amount (Rs)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newDuesAmount}
                  onChange={(e) => setNewDuesAmount(e.target.value)}
                  className="w-full h-12 bg-white border border-purple-100 rounded-xl px-4 text-xs font-black outline-none focus:border-purple-400 tabular-nums bg-white text-zinc-900"
                />
              </div>
              <button 
                onClick={handleAdjustDues}
                disabled={adjusting}
                className="h-12 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
              >
                {adjusting ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                Adjust Balance
              </button>
            </div>
            <div className="mt-4">
              <input 
                placeholder="Reason for manual adjustment (e.g. Package discount, manual waiver)..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-10 bg-white/50 border border-purple-100 rounded-xl px-4 text-[10px] font-bold outline-none focus:bg-white bg-white text-zinc-900"
              />
            </div>

            {duesLogs.length > 0 && (
              <div className="mt-6 border-t border-purple-100 pt-4">
                <p className="text-[9px] font-black uppercase text-purple-400 mb-2">Adjustment Audit Logs</p>
                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                  {duesLogs.map((log) => (
                    <div key={log.id} className="bg-white/80 p-2.5 rounded-lg border border-purple-100/50 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] gap-2">
                      <div>
                        <span className="font-bold text-zinc-900">Rs {log.oldAmount?.toLocaleString()}</span>
                        <span className="text-zinc-400 mx-1">→</span>
                        <span className="font-black text-purple-700">Rs {log.newAmount?.toLocaleString()}</span>
                        {log.reason && (
                          <span className="text-zinc-500 ml-2 font-medium">({log.reason})</span>
                        )}
                      </div>
                      <div className="text-[9px] text-zinc-400 font-bold self-end sm:self-auto">
                        by {log.changedByName} on {log.changedAt?.toDate?.() ? log.changedAt.toDate().toLocaleDateString('en-PK') : new Date(log.changedAt || 0).toLocaleDateString('en-PK')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showAddForm && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-indigo-400">Date</label>
                <input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                  className="w-full h-12 bg-white border border-indigo-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-indigo-400"
                />
                <div className="flex gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewTx({...newTx, date: todayIso})}
                    className={cn(
                      "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border",
                      newTx.date === todayIso 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                        : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({...newTx, date: yesterdayIso})}
                    className={cn(
                      "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border",
                      newTx.date === yesterdayIso 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                        : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    Yesterday
                  </button>
                </div>
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
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-indigo-400">Discount (Rs)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newTx.discount}
                  onChange={(e) => setNewTx({...newTx, discount: e.target.value})}
                  className="w-full h-12 bg-white border border-indigo-100 rounded-xl px-4 text-xs font-black outline-none focus:border-indigo-400 tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-indigo-400">Return (Rs)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newTx.returnAmount}
                  onChange={(e) => setNewTx({...newTx, returnAmount: e.target.value})}
                  className="w-full h-12 bg-white border border-indigo-100 rounded-xl px-4 text-xs font-black outline-none focus:border-indigo-400 tabular-nums"
                />
              </div>
              {stayOptions.length > 1 && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-indigo-400">Stay Duration</label>
                  <select 
                    value={newTx.stayDurationIndex}
                    onChange={(e) => setNewTx({...newTx, stayDurationIndex: e.target.value})}
                    className="w-full h-12 bg-white border border-indigo-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-indigo-400"
                  >
                    <option value="">Select Stay...</option>
                    {stayOptions.map((opt: any) => (
                      <option key={opt.index} value={opt.index}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
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
              <LogoLoader size="sm" />
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
                      {isSelectMode && (
                        <th className="px-6 py-4 text-center w-12">
                          <input 
                            type="checkbox"
                            checked={filtered.length > 0 && filtered.every(tx => selectedTxIds.has(tx.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTxIds(new Set(filtered.map(tx => tx.id)));
                              } else {
                                setSelectedTxIds(new Set());
                              }
                            }}
                            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                          />
                        </th>
                      )}
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
                          {isSelectMode && (
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedTxIds.has(tx.id)}
                                onChange={(e) => {
                                  const next = new Set(selectedTxIds);
                                  if (e.target.checked) {
                                    next.add(tx.id);
                                  } else {
                                    next.delete(tx.id);
                                  }
                                  setSelectedTxIds(next);
                                }}
                                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                              />
                            </td>
                          )}
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
                                    {stayOptions.length > 1 && (
                                      <div className="space-y-1 mt-1">
                                        <label className="text-[8px] font-black uppercase text-zinc-400">Stay Duration</label>
                                        <select 
                                          className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs font-bold outline-none"
                                          value={editForm.stayDurationIndex}
                                          onChange={(e) => setEditForm({ ...editForm, stayDurationIndex: e.target.value })}
                                        >
                                          <option value="">Select Stay...</option>
                                          {stayOptions.map((opt: any) => (
                                            <option key={opt.index} value={opt.index}>{opt.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs sm:text-sm font-black text-zinc-900 truncate uppercase tracking-tight">{tx.categoryName || tx.category}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                      {tx.stayDurationIndex !== undefined && tx.stayDurationIndex !== null && (
                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-wider">
                                          Stay #{Number(tx.stayDurationIndex) + 1}
                                        </span>
                                      )}
                                      {Number(tx.discount || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-wider">
                                          Discount: Rs {Number(tx.discount).toLocaleString()}
                                        </span>
                                      )}
                                      {Number(tx.returnAmount || tx.return || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-wider">
                                          Returned: Rs {Number(tx.returnAmount || tx.return).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                    {tx.description && (
                                      <p className="text-[10px] text-zinc-400 truncate max-w-[200px] font-bold italic mt-1">{tx.description}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="space-y-2 text-left min-w-[120px]">
                                <div>
                                  <label className="text-[8px] font-black uppercase text-zinc-400">Amount (Rs)</label>
                                  <input 
                                    type="number" 
                                    className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-right text-sm font-black outline-none"
                                    value={editForm.amount}
                                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black uppercase text-zinc-400">Discount (Rs)</label>
                                  <input 
                                    type="number" 
                                    className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-right text-sm font-black outline-none"
                                    value={editForm.discount}
                                    onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black uppercase text-zinc-400">Return (Rs)</label>
                                  <input 
                                    type="number" 
                                    className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-right text-sm font-black outline-none"
                                    value={editForm.returnAmount}
                                    onChange={(e) => setEditForm({ ...editForm, returnAmount: e.target.value })}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className={cn(
                                'text-sm sm:text-base font-black tabular-nums tracking-tighter',
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
                                <div className="flex items-center justify-center gap-2">
                                  {['pending', 'pending_cashier'].includes(tx.status) && (
                                    <button
                                      onClick={() => {
                                        setEditingId(tx.id);
                                        setEditForm({
                                          amount: tx.amount,
                                          category: tx.category || 'fee',
                                          categoryName: tx.categoryName || 'Admission / Fees',
                                          date: getLocalDateString(tx.transactionDate || tx.date || tx.createdAt)
                                        });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100"
                                    >
                                      <Terminal size={14} />
                                    </button>
                                  )}
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
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-2.5">
                {filtered.map((tx) => {
                  const isEditing = editingId === tx.id;
                  const dateLabel = formatDateDMY(tx.transactionDate || tx.date || tx.createdAt);
                  return (
                    <div key={tx.id} className={cn(
                      "bg-white rounded-xl border border-zinc-100 p-3.5 shadow-sm transition-all",
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
                          <div className="space-y-2">
                            <div>
                              <label className="text-[8px] font-black text-zinc-400 uppercase">Amount (Rs)</label>
                              <input 
                                type="number" 
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-sm font-black outline-none"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-zinc-400 uppercase">Discount (Rs)</label>
                              <input 
                                type="number" 
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-sm font-black outline-none"
                                value={editForm.discount}
                                onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-zinc-400 uppercase">Return Amount (Rs)</label>
                              <input 
                                type="number" 
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-sm font-black outline-none"
                                value={editForm.returnAmount}
                                onChange={(e) => setEditForm({ ...editForm, returnAmount: e.target.value })}
                              />
                            </div>
                            {stayOptions.length > 1 && (
                              <div>
                                <label className="text-[8px] font-black text-zinc-400 uppercase">Stay Duration</label>
                                <select 
                                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-xs font-bold outline-none"
                                  value={editForm.stayDurationIndex}
                                  onChange={(e) => setEditForm({ ...editForm, stayDurationIndex: e.target.value })}
                                >
                                  <option value="">Select Stay...</option>
                                  {stayOptions.map((opt: any) => (
                                    <option key={opt.index} value={opt.index}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
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
                              {isSelectMode && (
                                <input 
                                  type="checkbox"
                                  checked={selectedTxIds.has(tx.id)}
                                  onChange={(e) => {
                                    const next = new Set(selectedTxIds);
                                    if (e.target.checked) {
                                      next.add(tx.id);
                                    } else {
                                      next.delete(tx.id);
                                    }
                                    setSelectedTxIds(next);
                                  }}
                                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer flex-shrink-0"
                                />
                              )}
                              <div className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              )}>
                                {tx.type === 'income' ? <Plus size={18} /> : <Minus size={18} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">{tx.categoryName || tx.category}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {tx.stayDurationIndex !== undefined && tx.stayDurationIndex !== null && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-wider">
                                      Stay #{Number(tx.stayDurationIndex) + 1}
                                    </span>
                                  )}
                                  {Number(tx.discount || 0) > 0 && (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-wider">
                                      Discount: Rs {Number(tx.discount).toLocaleString()}
                                    </span>
                                  )}
                                  {Number(tx.returnAmount || tx.return || 0) > 0 && (
                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-black uppercase tracking-wider">
                                      Returned: Rs {Number(tx.returnAmount || tx.return).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-zinc-400 mt-1">{dateLabel}</p>
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

                          <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-50">
                            {['pending', 'pending_cashier'].includes(tx.status) && (
                              <button
                                onClick={() => {
                                  setEditingId(tx.id);
                                  setEditForm({
                                    amount: tx.amount,
                                    category: tx.category || 'fee',
                                    categoryName: tx.categoryName || 'Admission / Fees',
                                    date: getLocalDateString(tx.transactionDate || tx.date || tx.createdAt),
                                    discount: tx.discount || 0,
                                    returnAmount: tx.returnAmount || tx.return || 0,
                                    stayDurationIndex: tx.stayDurationIndex !== undefined ? String(tx.stayDurationIndex) : '',
                                  });
                                }}
                                className="flex-1 bg-indigo-50 text-indigo-600 h-9 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                              >
                                <Terminal size={12} /> Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(tx)}
                              disabled={deletingId === tx.id}
                              className="flex-1 bg-rose-50 text-rose-500 h-9 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              {deletingId === tx.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Floating Bulk Actions Bar - shared across desktop and mobile */}
              {isSelectMode && selectedTxIds.size > 0 && (
                <div className="sticky bottom-0 left-0 right-0 z-30 mt-4 px-4 pb-3">
                  <div className="bg-zinc-900 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-2xl shadow-zinc-900/40 animate-in slide-in-from-bottom-4 duration-300">
                    <span className="text-xs font-black uppercase tracking-widest">
                      {selectedTxIds.size} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedTxIds(new Set(filtered.map(tx => tx.id)));
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={loading}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Delete Selected
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
