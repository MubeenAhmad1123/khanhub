'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  doc, getDoc, collection, getDocs, query, where,
  orderBy, updateDoc, Timestamp, deleteDoc, addDoc, onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  ArrowLeft, User, DollarSign, ShoppingCart, Video,
  Edit3, Save, X, Loader2, Heart, Calendar, Upload, Trash2, Play, FileText, Camera,
  ChevronLeft, ChevronRight, Plus, Minus, Shield, Users, Phone, Activity, TrendingUp, Brain, Pill, ClipboardList, CheckCircle2,
  Clock, Printer
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { toast } from 'react-hot-toast';
import { syncRehabPatientFinance } from '@/app/hq/actions/approvals';
import { formatDateDMY, parseDateDMY, toDate, downloadElementAsPng } from '@/lib/utils';
import { BrutalistCalendar } from '@/components/ui';

import type { MonthRecord, Payment as PaymentType } from '@/components/rehab/patient-profile/FinanceHistory';
import dynamic from 'next/dynamic';

const DailySheetTab = dynamic(() => import('@/components/rehab/patient-profile/DailySheetTab'), { ssr: false }) as any;
const FinanceHistory = dynamic(() => import('@/components/rehab/patient-profile/FinanceHistory'), { ssr: false }) as any;
const ProgressTab = dynamic(() => import('@/components/rehab/patient-profile/ProgressTab'), { ssr: false }) as any;
const TherapyTab = dynamic(() => import('@/components/rehab/patient-profile/TherapyTab'), { ssr: false }) as any;
const MedicationTab = dynamic(() => import('@/components/rehab/patient-profile/MedicationTab'), { ssr: false }) as any;
const AdmissionTab = dynamic(() => import('@/components/rehab/patient-profile/AdmissionTab'), { ssr: false }) as any;
import { SuperAdminPortalToolbar } from '@/components/hq/superadmin/SuperAdminPortalToolbar';
import VisibilityManager from '@/components/shared/VisibilityManager';
import { saveVisibleSections } from '@/lib/visibilityManager';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'admission', label: 'Admission', icon: FileText },
  { id: 'daily', label: 'Daily Sheets', icon: ClipboardList },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'therapy', label: 'Therapy', icon: Activity },
  { id: 'meds', label: 'Medication', icon: Pill },
  { id: 'fees', label: 'Financials', icon: DollarSign },
  { id: 'canteen', label: 'Canteen', icon: ShoppingCart },
  { id: 'videos', label: 'Files', icon: Video },
  { id: 'visits', label: 'Visits', icon: Users },
];

const formatStayDuration = (days: number) => {
  if (days <= 0) return '0 Days';
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (months > 0) {
    return `${months} ${months === 1 ? 'Month' : 'Months'}${remainingDays > 0 ? `, ${remainingDays} ${remainingDays === 1 ? 'Day' : 'Days'}` : ''}`;
  }
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
};

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.role === 'admin';

  // Data
  const [patient, setPatient] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [canteenRecord, setCanteenRecord] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [videoStates, setVideoStates] = useState<Record<string, { status: 'normal' | 'confirm' | 'deleting'; timeLeft: number; intervalId?: any; timeoutId?: any }>>({});

  // State
  const [activeTab, setActiveTab] = useState<'profile' | 'admission' | 'daily' | 'progress' | 'therapy' | 'meds' | 'fees' | 'canteen' | 'videos' | 'visits'>('profile');
  const [visits, setVisits] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [showAddVisitModal, setShowAddVisitModal] = useState(false);
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [editVisitModal, setEditVisitModal] = useState<any | null>(null);
  const [isUpdatingVisit, setIsUpdatingVisit] = useState(false);

  // Visit Form State
  const [vName, setVName] = useState('');
  const [vRelation, setVRelation] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vCnic, setVCnic] = useState('');
  const [vNotes, setVNotes] = useState('');
  const [vDate, setVDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    patientId: '',
    diagnosis: '',
    packageAmount: 0,
    photoUrl: '',
    admissionDate: new Date().toISOString().split('T')[0],
    dischargeDate: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [directApproveLoading, setDirectApproveLoading] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [showRejoinCheckModal, setShowRejoinCheckModal] = useState(false);
  const [matchingPatients, setMatchingPatients] = useState<any[]>([]);

  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fee Tab State
  const [feeMonth, setFeeMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Fee Form State
  const [packageAmt, setPackageAmt] = useState('');
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Payment Form State
  const [payAmt, setPayAmt] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Canteen Tab State
  const [canteenMonth, setCanteenMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [canteenModal, setCanteenModal] = useState<'deposit' | 'expense' | null>(null);

  // Canteen Form State
  const [canteenAmt, setCanteenAmt] = useState('');
  const [canteenDesc, setCanteenDesc] = useState('');
  const [canteenDate, setCanteenDate] = useState(new Date().toISOString().split('T')[0]);
  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);

  // Discharge Modal State
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dDate, setDDate] = useState(new Date().toISOString().split('T')[0]);
  const [dDateInput, setDDateInput] = useState('');
  const [dAmount, setDAmount] = useState('');
  const [dNote, setDNote] = useState('Final Settlement');
  const [isDischarging, setIsDischarging] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Profile deletion state
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [deleteProfileConfirmName, setDeleteProfileConfirmName] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  // Rejoin Details State
  const [showRejoinDetailsModal, setShowRejoinDetailsModal] = useState(false);
  const [rejoinForm, setRejoinForm] = useState({
    duration: '',
    totalFee: '',
    familyVisit: '',
    admissionDate: new Date().toISOString().split('T')[0],
    dischargeDate: '',
    visitorName: '',
    visitorRelation: '',
    visitorPhone: '',
    visitorCnic: '',
    visitorNotes: '',
    visitDate: new Date().toISOString().split('T')[0]
  });
  // Selected stay for historical filtering
  const [selectedStayIndex, setSelectedStayIndex] = useState<number>(-1);

  // Edit previous stay states
  const [editingStayIdx, setEditingStayIdx] = useState<number | null>(null);
  const [stayForm, setStayForm] = useState<any>({
    admissionDate: '',
    dischargeDate: '',
    monthlyPackage: 0,
    rejoinedAt: '',
    visitorName: '',
    visitorRelation: '',
    visitorPhone: '',
    visitorCnic: '',
    visitorNotes: ''
  });
  const [savingStay, setSavingStay] = useState(false);

  // Compute date filter bounds for the active stay
  const dateFilter = useMemo(() => {
    if (!patient) return null;
    if (selectedStayIndex === -1) {
      return {
        admissionDate: patient.admissionDate,
        dischargeDate: patient.dischargeDate
      };
    }
    const stay = patient.rejoinHistory?.[selectedStayIndex];
    if (!stay) return null;
    return {
      admissionDate: stay.admissionDate,
      dischargeDate: stay.dischargeDate
    };
  }, [patient, selectedStayIndex]);

  // Filter visits based on date bounds
  const filteredVisits = useMemo(() => {
    if (!dateFilter) return visits;
    return visits.filter((v: any) => {
      const vDateStr = v.date;
      if (!vDateStr) return true;
      const d = new Date(vDateStr + 'T00:00:00');

      let start = dateFilter.admissionDate;
      if (start) {
        if (typeof start.toDate === 'function') start = start.toDate();
        else start = new Date(start);
        start.setHours(0, 0, 0, 0);
      }

      let end = dateFilter.dischargeDate;
      if (end) {
        if (typeof end.toDate === 'function') end = end.toDate();
        else end = new Date(end);
        end.setHours(23, 59, 59, 999);
      }

      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [visits, dateFilter]);

  const filteredPayments = useMemo(() => {
    if (!dateFilter || selectedStayIndex === -1) return allPayments;
    return allPayments.filter((p: any) => {
      if (p.stayDurationIndex !== undefined && p.stayDurationIndex !== null) {
        return p.stayDurationIndex === selectedStayIndex;
      }
      const pDate = toDate(p.date);

      let start = dateFilter.admissionDate;
      if (start) {
        if (typeof start.toDate === 'function') start = start.toDate();
        else start = new Date(start);
        start.setHours(0, 0, 0, 0);
      }

      let end = dateFilter.dischargeDate;
      if (end) {
        if (typeof end.toDate === 'function') end = end.toDate();
        else end = new Date(end);
        end.setHours(23, 59, 59, 999);
      }

      if (start && pDate < start) return false;
      if (end && pDate > end) return false;
      return true;
    });
  }, [allPayments, dateFilter, selectedStayIndex]);

  useEffect(() => {
    let sessionData = localStorage.getItem('rehab_session');

    if (!sessionData) {
      const hqRaw = localStorage.getItem('hq_session');
      if (hqRaw) {
        const parsedHq = JSON.parse(hqRaw);
        if (parsedHq.role === 'superadmin') {
          sessionData = JSON.stringify({
            ...parsedHq,
            displayName: parsedHq.displayName || parsedHq.name,
            role: 'superadmin'
          });
        }
      }
    }

    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/rehab/login');
      return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    return () => {
      Object.values(videoStates).forEach(state => {
        if (state.intervalId) clearInterval(state.intervalId);
        if (state.timeoutId) clearTimeout(state.timeoutId);
      });
    };
  }, [videoStates]);

  const isScrollingRef = useRef(false);

  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveTab(id as any);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  };

  useEffect(() => {
    if (loading) return;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingRef.current) return;

      let maxRatio = 0;
      let visibleSectionId: any = null;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          visibleSectionId = entry.target.id.replace('section-', '');
        }
      });

      if (visibleSectionId && TABS.some(t => t.id === visibleSectionId)) {
        setActiveTab(visibleSectionId);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '-15% 0px -65% 0px',
      threshold: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    });

    TABS.forEach((t) => {
      const el = document.getElementById(`section-${t.id}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      await syncRehabPatientFinance(patientId).catch((err) => {
        console.warn("Failed to sync patient finance on load:", err);
      });

      // 1. Patient Profile
      const pDoc = await getDoc(doc(db, 'rehab_patients', patientId));
      if (!pDoc.exists()) {
        toast.error('Patient not found');
        router.push('/departments/rehab/dashboard/admin/patients');
        return;
      }
      const data = pDoc.data();

      // Calculate Financial Stats & Remaining Days
      const admission = toDate(data.admissionDate);
      const endDate = data.isActive === false && data.dischargeDate
        ? toDate(data.dischargeDate)
        : new Date();

      const diffTimeMs = endDate.getTime() - admission.getTime();
      const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;

      // Calculate Billable Months (Completed month cycle + 1 day above counts as full next month)
      const rawMonths = (endDate.getFullYear() - admission.getFullYear()) * 12 + (endDate.getMonth() - admission.getMonth());
      let completedMonths = rawMonths;
      let hasExtraDays = false;

      if (endDate.getDate() < admission.getDate()) {
        completedMonths = rawMonths - 1;
        hasExtraDays = true;
      } else if (endDate.getDate() > admission.getDate()) {
        completedMonths = rawMonths;
        hasExtraDays = true;
      } else {
        completedMonths = rawMonths;
        hasExtraDays = false;
      }

      const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
      const durationFormatted = formatStayDuration(daysAdmitted);

      // Fetch all fees to calculate total received
      let overallReceived = 0;
      let totalMedicineCharges = 0;
      const aggregatedPayments: any[] = [];
      try {
        const allFeesQ = query(
          collection(db, 'rehab_fees'),
          where('patientId', '==', patientId)
        );
        const allFeesSnap = await getDocs(allFeesQ);

        const syncedTxIds = new Set<string>();
        allFeesSnap.docs.forEach(doc => {
          const feeData = doc.data();
          const docPayments = feeData.payments || [];
          docPayments.forEach((p: any) => {
            const status = p.status || 'approved';
            if (p.transactionId) syncedTxIds.add(p.transactionId);
            if (p.id) syncedTxIds.add(p.id); // Support legacy/manual entry ID field for deduplication
            aggregatedPayments.push({
              id: `${doc.id}_${p.transactionId || p.id || p.date?.seconds || p.date?.nanoseconds || p.date || Math.random()}`,
              ...p,
              status,
              month: feeData.month,
              _collection: 'rehab_fees'
            });
          });
        });

        // Fetch ALL transactions from rehab_transactions to display in ledger
        const txQ = query(
          collection(db, 'rehab_transactions'),
          where('patientId', '==', patientId)
        );
        const txSnap = await getDocs(txQ);
        txSnap.docs.forEach(doc => {
          const txData = doc.data();
          const txId = doc.id;
          
          const isApproved = txData.status === 'approved';
          const isSynced = syncedTxIds.has(txId);
          const isMedicineCharge = txData.category === 'medicine_charge';
          
          if (isMedicineCharge) {
            if (isApproved) {
              totalMedicineCharges += Number(txData.amount || 0);
            }
            aggregatedPayments.push({
              id: txId,
              amount: Number(txData.amount || 0),
              date: txData.date || txData.createdAt,
              cashierId: txData.cashierId || txData.createdByName || 'Office',
              note: txData.description || txData.categoryName || 'Medicine / Treatment Charge',
              status: txData.status || 'approved',
              isMedicineCharge: true,
              isPendingTransaction: txData.status !== 'approved' && txData.status !== 'rejected' && txData.status !== 'rejected_cashier',
              method: txData.paymentMethod || txData.method || 'Credit',
              _collection: 'rehab_transactions'
            });
          } else if (isApproved && !isSynced) {
            aggregatedPayments.push({
              id: txId,
              amount: Number(txData.amount || 0),
              date: txData.date || txData.createdAt,
              cashierId: txData.cashierId || txData.createdByName || 'Office',
              note: txData.description || txData.categoryName || '',
              status: 'approved',
              method: txData.paymentMethod || txData.method || 'Cash',
              _collection: 'rehab_transactions'
            });
          } else if (!isApproved && !isSynced) {
            aggregatedPayments.push({
              id: txId,
              amount: Number(txData.amount || 0),
              date: txData.date || txData.createdAt,
              cashierId: txData.cashierId || txData.createdByName || 'Office',
              note: txData.description || txData.categoryName || '',
              status: txData.status || 'pending',
              isPendingTransaction: txData.status !== 'rejected' && txData.status !== 'rejected_cashier',
              method: txData.paymentMethod || txData.method || 'Cash',
              _collection: 'rehab_transactions'
            });
          }
        });
      } catch (err) {
        console.warn("Error fetching aggregated fees", err);
      }

      // Deduplicate consolidated array
      const seen = new Set<string>();
      const deduped = aggregatedPayments.filter(tx => {
        if (!tx.id) return true;
        const txIdentifier = tx._collection === 'rehab_transactions' ? tx.id : (tx.transactionId || tx.id);
        if (seen.has(tx.id)) return false;
        if (txIdentifier && seen.has(txIdentifier)) return false;
        seen.add(tx.id);
        if (txIdentifier) seen.add(txIdentifier);
        return true;
      });

      // Calculate total approved received amount from the deduplicated entries
      const approvedTxs = deduped.filter(tx => tx.status === 'approved');
      overallReceived = approvedTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

      deduped.sort((a, b) => {
        const dateA = a.date?.toDate?.() ? a.date.toDate() : new Date(a.date || 0);
        const dateB = b.date?.toDate?.() ? b.date.toDate() : new Date(b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setAllPayments(deduped);

      const monthlyPkg = Number(data.monthlyPackage || data.packageAmount || 0);
      const dailyRate = Math.floor(monthlyPkg / 30);
      const dueTillDate = billableMonths * monthlyPkg;

      let historicalStayPackage = 0;
      const history = data.rejoinHistory || [];
      history.forEach((stay: any) => {
        let sAdmission = new Date();
        const sa = stay.admissionDate;
        if (sa) {
          if (typeof sa.toDate === 'function') sAdmission = sa.toDate();
          else if (typeof sa.seconds === 'number') sAdmission = new Date(sa.seconds * 1000);
          else if (typeof sa._seconds === 'number') sAdmission = new Date(sa._seconds * 1000);
          else {
            const parsed = new Date(sa);
            if (!isNaN(parsed.getTime())) sAdmission = parsed;
          }
        }

        let sDischarge = new Date();
        const sd = stay.dischargeDate;
        if (sd) {
          if (typeof sd.toDate === 'function') sDischarge = sd.toDate();
          else if (typeof sd.seconds === 'number') sDischarge = new Date(sd.seconds * 1000);
          else if (typeof sd._seconds === 'number') sDischarge = new Date(sd._seconds * 1000);
          else {
            const parsed = new Date(sd);
            if (!isNaN(parsed.getTime())) sDischarge = parsed;
          }
        } else {
          sDischarge = new Date();
        }

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

      const totalStayPackage = dueTillDate + historicalStayPackage;
      const finalMedicineCharges = typeof data.medicineCharges === 'number' ? data.medicineCharges : totalMedicineCharges;
      const overallRemaining = (totalStayPackage + finalMedicineCharges) - overallReceived;

      setPatient({
        id: pDoc.id,
        ...data,
        daysAdmitted,
        durationFormatted,
        overallReceived,
        medicineCharges: finalMedicineCharges,
        overallRemaining,
        dailyRate,
        dueTillDate,
        billableMonths,
      });
      setEditForm({
        name: data.name || '',
        patientId: data.patientId || '',
        diagnosis: data.diagnosis || '',
        packageAmount: data.packageAmount || data.monthlyPackage || 0,
        photoUrl: data.photoUrl || '',
        admissionDate: toDate(data.admissionDate).toISOString().split('T')[0],
        dischargeDate: data.dischargeDate ? toDate(data.dischargeDate).toISOString().split('T')[0] : ''
      });
      setPhotoPreview(data.photoUrl || '');

      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 2. Fees (Initial current month)
      try {
        const feesQ = query(
          collection(db, 'rehab_fees'),
          where('patientId', '==', patientId),
          where('month', '==', monthStr)
        );
        const feeSnap = await getDocs(feesQ);
        if (!feeSnap.empty) {
          setFeeRecord({ id: feeSnap.docs[0].id, ...feeSnap.docs[0].data() });
        } else {
          setFeeRecord(null);
        }
      } catch (err) {
        console.warn("Fees fetch error (Permissions?)", err);
      }

      // 3. Canteen (Initial current month)
      try {
        const canteenQ = query(
          collection(db, 'rehab_canteen'),
          where('patientId', '==', patientId),
          where('month', '==', monthStr)
        );
        const canteenSnap = await getDocs(canteenQ);
        if (!canteenSnap.empty) {
          setCanteenRecord({ id: canteenSnap.docs[0].id, ...canteenSnap.docs[0].data() });
        } else {
          setCanteenRecord(null);
        }
      } catch (err) {
        console.warn("Canteen fetch error (Permissions?)", err);
      }

      // 4. Videos
      try {
        const videosQ = query(
          collection(db, 'rehab_videos'),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );
        const vidSnap = await getDocs(videosQ);
        setVideos(vidSnap.docs.map(v => ({ id: v.id, ...v.data() })));
      } catch (err) {
        console.warn("Videos permission/fetch error", err);
      }

      // 5. Visits
      try {
        const visitsQ = query(
          collection(db, 'rehab_visits'),
          where('patientId', '==', patientId),
          orderBy('date', 'desc')
        );
        const visitSnap = await getDocs(visitsQ);
        setVisits(visitSnap.docs.map(v => ({ id: v.id, ...v.data() })));
      } catch (err) {
        console.warn("Visits permission/fetch error", err);
      }

    } catch (error) {
      console.error("Error fetching patient profile:", error);
      toast.error('Permission denied or network error loading profile');
    } finally {
      setLoading(false);
    }
  }, [patientId, router]);

  useEffect(() => {
    if (!session || !patientId) return;

    setLoading(true);

    // 1. Patient Real-time Listener
    const patientRef = doc(db, 'rehab_patients', patientId);
    
    let currentPatientData: any = null;
    let currentFeesDocs: any[] = [];
    let currentTxDocs: any[] = [];

    const computeAndSetStats = () => {
      if (!currentPatientData) return;

      const admission = toDate(currentPatientData.admissionDate);
      const endDate = currentPatientData.isActive === false && currentPatientData.dischargeDate
        ? toDate(currentPatientData.dischargeDate)
        : new Date();

      const diffTimeMs = endDate.getTime() - admission.getTime();
      const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;

      const rawMonths = (endDate.getFullYear() - admission.getFullYear()) * 12 + (endDate.getMonth() - admission.getMonth());
      let completedMonths = rawMonths;
      let hasExtraDays = false;

      if (endDate.getDate() < admission.getDate()) {
        completedMonths = rawMonths - 1;
        hasExtraDays = true;
      } else if (endDate.getDate() > admission.getDate()) {
        completedMonths = rawMonths;
        hasExtraDays = true;
      } else {
        completedMonths = rawMonths;
        hasExtraDays = false;
      }

      const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
      const durationFormatted = formatStayDuration(daysAdmitted);

      let overallReceived = 0;
      let totalMedicineCharges = 0;
      const aggregatedPayments: any[] = [];
      const syncedTxIds = new Set<string>();

      currentFeesDocs.forEach(d => {
        const feeData = d.data();
        const docPayments = feeData.payments || [];
        docPayments.forEach((p: any) => {
          const status = p.status || 'approved';
          if (p.transactionId) syncedTxIds.add(p.transactionId);
          if (p.id) syncedTxIds.add(p.id);
          aggregatedPayments.push({
            id: `${d.id}_${p.transactionId || p.id || p.date?.seconds || p.date?.nanoseconds || p.date || Math.random()}`,
            ...p,
            status,
            month: feeData.month,
            _collection: 'rehab_fees'
          });
        });
      });

      currentTxDocs.forEach(d => {
        const txData = d.data();
        const txId = d.id;
        
        const isApproved = txData.status === 'approved';
        const isSynced = syncedTxIds.has(txId);
        const isMedicineCharge = txData.category === 'medicine_charge';
        
        if (isMedicineCharge) {
          if (isApproved) {
            totalMedicineCharges += Number(txData.amount || 0);
          }
          aggregatedPayments.push({
            id: txId,
            amount: Number(txData.amount || 0),
            date: txData.date || txData.createdAt,
            cashierId: txData.cashierId || txData.createdByName || 'Office',
            note: txData.description || txData.categoryName || 'Medicine / Treatment Charge',
            status: txData.status || 'approved',
            isMedicineCharge: true,
            isPendingTransaction: txData.status !== 'approved' && txData.status !== 'rejected' && txData.status !== 'rejected_cashier',
            method: txData.paymentMethod || txData.method || 'Credit',
            _collection: 'rehab_transactions'
          });
        } else if (isApproved && !isSynced) {
          aggregatedPayments.push({
            id: txId,
            amount: Number(txData.amount || 0),
            date: txData.date || txData.createdAt,
            cashierId: txData.cashierId || txData.createdByName || 'Office',
            note: txData.description || txData.categoryName || '',
            status: 'approved',
            method: txData.paymentMethod || txData.method || 'Cash',
            _collection: 'rehab_transactions'
          });
        } else if (!isApproved && !isSynced) {
          aggregatedPayments.push({
            id: txId,
            amount: Number(txData.amount || 0),
            date: txData.date || txData.createdAt,
            cashierId: txData.cashierId || txData.createdByName || 'Office',
            note: txData.description || txData.categoryName || '',
            status: txData.status || 'pending',
            isPendingTransaction: txData.status !== 'rejected' && txData.status !== 'rejected_cashier',
            method: txData.paymentMethod || txData.method || 'Cash',
            _collection: 'rehab_transactions'
          });
        }
      });

      // Deduplicate consolidated array
      const seen = new Set<string>();
      const deduped = aggregatedPayments.filter(tx => {
        if (!tx.id) return true;
        const txIdentifier = tx._collection === 'rehab_transactions' ? tx.id : (tx.transactionId || tx.id);
        if (seen.has(tx.id)) return false;
        if (txIdentifier && seen.has(txIdentifier)) return false;
        seen.add(tx.id);
        if (txIdentifier) seen.add(txIdentifier);
        return true;
      });

      // Calculate total approved received amount from the deduplicated entries
      const approvedTxs = deduped.filter(tx => tx.status === 'approved');
      overallReceived = approvedTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

      deduped.sort((a, b) => {
        const dateA = a.date?.toDate?.() ? a.date.toDate() : new Date(a.date || 0);
        const dateB = b.date?.toDate?.() ? b.date.toDate() : new Date(b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setAllPayments(deduped);

      const monthlyPkg = Number(currentPatientData.monthlyPackage || currentPatientData.packageAmount || 0);
      const dailyRate = Math.floor(monthlyPkg / 30);
      const dueTillDate = billableMonths * monthlyPkg;

      let historicalStayPackage = 0;
      const history = currentPatientData.rejoinHistory || [];
      history.forEach((stay: any) => {
        let sAdmission = new Date();
        const sa = stay.admissionDate;
        if (sa) {
          if (typeof sa.toDate === 'function') sAdmission = sa.toDate();
          else if (typeof sa.seconds === 'number') sAdmission = new Date(sa.seconds * 1000);
          else if (typeof sa._seconds === 'number') sAdmission = new Date(sa._seconds * 1000);
          else {
            const parsed = new Date(sa);
            if (!isNaN(parsed.getTime())) sAdmission = parsed;
          }
        }

        let sDischarge = new Date();
        const sd = stay.dischargeDate;
        if (sd) {
          if (typeof sd.toDate === 'function') sDischarge = sd.toDate();
          else if (typeof sd.seconds === 'number') sDischarge = new Date(sd.seconds * 1000);
          else if (typeof sd._seconds === 'number') sDischarge = new Date(sd._seconds * 1000);
          else {
            const parsed = new Date(sd);
            if (!isNaN(parsed.getTime())) sDischarge = parsed;
          }
        } else {
          sDischarge = new Date();
        }

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

      const totalStayPackage = dueTillDate + historicalStayPackage;
      const finalMedicineCharges = typeof currentPatientData.medicineCharges === 'number' ? currentPatientData.medicineCharges : totalMedicineCharges;
      const overallRemaining = (totalStayPackage + finalMedicineCharges) - overallReceived;

      setPatient({
        id: patientId,
        ...currentPatientData,
        daysAdmitted,
        durationFormatted,
        overallReceived,
        medicineCharges: finalMedicineCharges,
        overallRemaining,
        dailyRate,
        dueTillDate,
        billableMonths,
      });

      setEditForm(prev => ({
        ...prev,
        name: currentPatientData.name || '',
        patientId: currentPatientData.patientId || '',
        diagnosis: currentPatientData.diagnosis || '',
        packageAmount: currentPatientData.packageAmount || currentPatientData.monthlyPackage || 0,
        photoUrl: currentPatientData.photoUrl || '',
        admissionDate: toDate(currentPatientData.admissionDate).toISOString().split('T')[0],
        dischargeDate: currentPatientData.dischargeDate ? toDate(currentPatientData.dischargeDate).toISOString().split('T')[0] : ''
      }));
      setPhotoPreview(currentPatientData.photoUrl || '');
    };

    const unsubPatient = onSnapshot(patientRef, (snap) => {
      if (!snap.exists()) {
        toast.error('Patient not found');
        router.push('/departments/rehab/dashboard/admin/patients');
        return;
      }
      currentPatientData = snap.data();
      computeAndSetStats();
      setLoading(false);
    }, (err) => {
      console.error("Patient stream error:", err);
    });

    // 2. Fees stream
    const feesQ = query(collection(db, 'rehab_fees'), where('patientId', '==', patientId));
    const unsubFees = onSnapshot(feesQ, (snap) => {
      currentFeesDocs = snap.docs;
      computeAndSetStats();
    });

    // 3. Transactions stream
    const txQ = query(collection(db, 'rehab_transactions'), where('patientId', '==', patientId));
    const unsubTx = onSnapshot(txQ, (snap) => {
      currentTxDocs = snap.docs;
      computeAndSetStats();
    });

    // 4. Videos stream
    const videosQ = query(collection(db, 'rehab_videos'), where('patientId', '==', patientId), orderBy('createdAt', 'desc'));
    const unsubVideos = onSnapshot(videosQ, (snap) => {
      setVideos(snap.docs.map(v => ({ id: v.id, ...v.data() })));
    }, (err) => console.warn("Videos stream err", err));

    // 5. Visits stream
    const visitsQ = query(collection(db, 'rehab_visits'), where('patientId', '==', patientId), orderBy('date', 'desc'));
    const unsubVisits = onSnapshot(visitsQ, (snap) => {
      setVisits(snap.docs.map(v => ({ id: v.id, ...v.data() })));
    }, (err) => console.warn("Visits stream err", err));

    return () => {
      unsubPatient();
      unsubFees();
      unsubTx();
      unsubVideos();
      unsubVisits();
    };
  }, [session, patientId, router]);

  useEffect(() => {
    if (!patientId || !session) return;
    fetchFeeRecord();
  }, [feeMonth]);

  useEffect(() => {
    if (!patientId || !session) return;
    fetchCanteenRecord();
  }, [canteenMonth]);

  const fetchFeeRecord = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'rehab_fees'),
          where('patientId', '==', patientId),
          where('month', '==', feeMonth)
        )
      );
      setFeeRecord(snap.empty ? null : {
        id: snap.docs[0].id,
        ...snap.docs[0].data()
      } as any);
    } catch (err) {
      console.error("Fetch fee error", err);
    }
  };

  const changeMonth = (dir: number) => {
    const [y, m] = feeMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setFeeMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const changeCanteenMonth = (dir: number) => {
    const [y, m] = canteenMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCanteenMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleInitializeFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      toast.error('Admins are not allowed to create fee/payment requests.');
      return;
    }
    try {
      const amount = Number(initialPayment) || 0;

      if (amount <= 0) {
        toast.error('Initial payment amount is required to send fee request to cashier.');
        return;
      }

      const setupSnap = await getDoc(doc(db, 'rehab_meta', 'setup'));
      const setupData = setupSnap.data() as any;
      const cashierCustomId = String(setupData?.cashierCustomId || '').toUpperCase();

      if (!cashierCustomId) {
        toast.error('Cashier is not configured (missing rehab_meta/setup.cashierCustomId).');
        return;
      }

      await addDoc(collection(db, 'rehab_transactions'), {
        type: 'income',
        amount,
        category: 'fee',
        categoryName: 'Admission / Fees',
        departmentCode: 'rehab',
        departmentName: 'Rehab Center',
        patientId: patientId,
        patientName: patient?.name || '',
        status: 'pending_cashier',
        cashierId: cashierCustomId,
        proofRequired: true,
        description: paymentNote || '',
        date: Timestamp.fromDate(new Date(paymentDate)),
        transactionDate: Timestamp.fromDate(new Date(paymentDate)),
        createdBy: session.uid,
        createdByName: session?.displayName || session?.name || 'Rehab Admin',
        createdAt: Timestamp.now()
      });
      setShowAddFeeModal(false);
      setInitialPayment('');
      setPaymentNote('');
      toast.success('Fee request sent to cashier for approval ✓');
    } catch (error) {
      console.error("Initialize Fee error", error);
      toast.error('Failed to create fee record');
    }
  };

  const handleDirectApprove = async (txId: string) => {
    try {
      setDirectApproveLoading(txId);

      // 1. Update the transaction status first
      await updateDoc(doc(db, 'rehab_transactions', txId), {
        status: 'approved',
        approvedBy: session.uid,
        approvedAt: Timestamp.now()
      });

      // ── SYNC TO PATIENT RECORDS AFTER APPROVAL ──
      const txDoc = await getDoc(doc(db, 'rehab_transactions', txId));
      if (txDoc.exists()) {
        const tx = { id: txDoc.id, ...txDoc.data() as any };
        if (tx.patientId) {
          try {
            const txDate = tx.date?.toDate ? tx.date.toDate() : new Date();
            const year = txDate.getFullYear();
            const mm = String(txDate.getMonth() + 1).padStart(2, '0');
            const month = `${year}-${mm}`;

            const isFeeCategory = 
              tx.type === 'income' ||
              tx.category === 'patient_fee' || 
              tx.category === 'fee' || 
              String(tx.category || '').toLowerCase().includes('fee') ||
              String(tx.categoryName || '').toLowerCase().includes('fee') ||
              String(tx.categoryName || '').toLowerCase().includes('admission');

            if (isFeeCategory) {
              // Find or CREATE the fee record for this patient+month
              const feesQ = query(
                collection(db, 'rehab_fees'),
                where('patientId', '==', tx.patientId),
                where('month', '==', month)
              );
              const feesSnap = await getDocs(feesQ);

              if (feesSnap.empty) {
                // Auto-create fee record — fetch patient package amount first
                const patientSnap = await getDoc(doc(db, 'rehab_patients', tx.patientId));
                const packageAmount = patientSnap.exists()
                  ? (patientSnap.data().packageAmount || 60000)
                  : 60000;
                const amountPaid = tx.amount;
                const amountRemaining = Math.max(0, packageAmount - amountPaid);
                await addDoc(collection(db, 'rehab_fees'), {
                  patientId: tx.patientId,
                  patientName: tx.patientName || '',
                  month,
                  packageAmount,
                  amountPaid,
                  amountRemaining,
                  payments: [{
                    amount: tx.amount,
                    date: txDate,
                    transactionId: txId,
                    approvedBy: session?.uid,
                    status: 'approved',
                  }],
                  lastPaymentDate: Timestamp.now(),
                  lastPaymentAmount: tx.amount,
                  createdAt: Timestamp.now(),
                });
              } else {
                // Update existing fee record
                const feeDoc = feesSnap.docs[0];
                const current = feeDoc.data();
                const newPaid = (current.amountPaid || 0) + tx.amount;
                const newRemaining = Math.max(0, (current.packageAmount || 60000) - newPaid);
                const existingPayments = current.payments || [];
                await updateDoc(doc(db, 'rehab_fees', feeDoc.id), {
                  amountPaid: newPaid,
                  amountRemaining: newRemaining,
                  lastPaymentDate: Timestamp.now(),
                  lastPaymentAmount: tx.amount,
                  payments: [...existingPayments, {
                    amount: tx.amount,
                    date: txDate,
                    transactionId: txId,
                    approvedBy: session?.uid,
                    status: 'approved',
                  }],
                });
              }
            }
          } catch (syncErr) {
            console.error('Sync error after approval:', syncErr);
          }
        }
      }

      toast.success('Approved ✓');
      fetchData(); // Refresh patient profile and ledger data
    } catch (error) {
      console.error("Approve error", error);
      toast.error("Failed to approve");
    } finally {
      setDirectApproveLoading(null);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeRecord) return;
    if (isAdmin) {
      toast.error('Admins are not allowed to create fee/payment requests.');
      return;
    }
    try {
      const amount = Number(payAmt) || 0;
      if (amount <= 0) {
        toast.error('Enter a valid payment amount.');
        return;
      }

      const setupSnap = await getDoc(doc(db, 'rehab_meta', 'setup'));
      const setupData = setupSnap.data() as any;
      const cashierCustomId = String(setupData?.cashierCustomId || '').toUpperCase();

      if (!cashierCustomId) {
        toast.error('Cashier is not configured (missing rehab_meta/setup.cashierCustomId).');
        return;
      }

      await addDoc(collection(db, 'rehab_transactions'), {
        type: 'income',
        amount,
        category: 'fee',
        categoryName: 'Admission / Fees',
        departmentCode: 'rehab',
        departmentName: 'Rehab Center',
        patientId: patientId,
        patientName: patient?.name || '',
        status: 'pending_cashier',
        cashierId: cashierCustomId,
        proofRequired: true,
        description: payNote || '',
        date: Timestamp.fromDate(new Date(payDate)),
        transactionDate: Timestamp.fromDate(new Date(payDate)),
        createdBy: session.uid,
        createdByName: session?.displayName || session?.name || 'Rehab Admin',
        createdAt: Timestamp.now()
      });
      setShowAddPaymentModal(false);
      setPayAmt('');
      setPayNote('');
      toast.success('Payment request sent to cashier for approval ✓');
      // Important: do not update rehab_fees here; it syncs only after superadmin approval.
    } catch (error) {
      console.error("Add Payment error", error);
      toast.error('Failed to record payment');
    }
  };

  const fetchCanteenRecord = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'rehab_canteen'),
          where('patientId', '==', patientId),
          where('month', '==', canteenMonth)
        )
      );
      setCanteenRecord(snap.empty ? null : {
        id: snap.docs[0].id,
        ...snap.docs[0].data()
      } as any);
    } catch (err) {
      console.error("Fetch canteen error", err);
    }
  };

  const resetCanteenForm = () => {
    setCanteenAmt('');
    setCanteenDesc('');
    setCanteenDate(new Date().toISOString().split('T')[0]);
  };

  const handleCanteenEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canteenModal) return;
    if (isAdmin) {
      toast.error('Admins are not allowed to record canteen deposits/expenses.');
      return;
    }
    try {
      const entry = {
        id: Date.now().toString(),
        type: canteenModal,
        amount: Number(canteenAmt),
        description: canteenDesc,
        date: Timestamp.fromDate(new Date(canteenDate)),
        cashierId: session.uid
      };

      if (!canteenRecord) {
        await addDoc(collection(db, 'rehab_canteen'), {
          patientId: patientId,
          month: canteenMonth,
          totalDeposited: canteenModal === 'deposit' ? Number(canteenAmt) : 0,
          totalSpent: canteenModal === 'expense' ? Number(canteenAmt) : 0,
          balance: canteenModal === 'deposit'
            ? Number(canteenAmt)
            : -Number(canteenAmt),
          transactions: [entry],
          createdAt: Timestamp.now(),
          createdBy: session.uid
        });
      } else {
        const newDeposited = Number(canteenRecord.totalDeposited) +
          (canteenModal === 'deposit' ? Number(canteenAmt) : 0);
        const newSpent = Number(canteenRecord.totalSpent) +
          (canteenModal === 'expense' ? Number(canteenAmt) : 0);

        await updateDoc(doc(db, 'rehab_canteen', canteenRecord.id), {
          totalDeposited: newDeposited,
          totalSpent: newSpent,
          balance: newDeposited - newSpent,
          transactions: [...(canteenRecord.transactions || []), entry]
        });
      }

      setCanteenModal(null);
      resetCanteenForm();
      fetchCanteenRecord();
      toast.success(canteenModal === 'deposit'
        ? 'Deposit recorded ✓'
        : 'Expense recorded ✓');
    } catch (error) {
      console.error("Canteen entry error", error);
      toast.error('Failed to record transaction');
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);

      let photoUrl = editForm.photoUrl;

      // Upload new photo if selected
      if (photoFile) {
        setPhotoUploading(true);
        try {
          const url = await uploadToCloudinary(photoFile, 'khanhub/rehab/patients');
          photoUrl = url;
        } catch (err) {
          console.error("Photo upload failed", err);
          toast.error('Photo upload failed, keeping old photo');
        }
        setPhotoUploading(false);
      }

      const monthlyPkg = Number(editForm.packageAmount);

      await updateDoc(doc(db, 'rehab_patients', patientId), {
        name: editForm.name,
        patientId: editForm.patientId || null,
        diagnosis: editForm.diagnosis,
        packageAmount: monthlyPkg,
        monthlyPackage: monthlyPkg,
        admissionDate: Timestamp.fromDate(new Date(editForm.admissionDate)),
        dischargeDate: editForm.dischargeDate ? Timestamp.fromDate(new Date(editForm.dischargeDate)) : null,
        photoUrl: photoUrl || null
      });

      setPatient((prev: any) => {
        const admission = new Date(editForm.admissionDate);
        const endDate = prev.isActive === false && prev.dischargeDate
          ? toDate(prev.dischargeDate)
          : new Date();

        const diffTimeMs = endDate.getTime() - admission.getTime();
        const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;

        const rawMonths = (endDate.getFullYear() - admission.getFullYear()) * 12 + (endDate.getMonth() - admission.getMonth());
        let completedMonths = rawMonths;
        let hasExtraDays = false;

        if (endDate.getDate() < admission.getDate()) {
          completedMonths = rawMonths - 1;
          hasExtraDays = true;
        } else if (endDate.getDate() > admission.getDate()) {
          completedMonths = rawMonths;
          hasExtraDays = true;
        } else {
          completedMonths = rawMonths;
          hasExtraDays = false;
        }

        const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
        const durationFormatted = formatStayDuration(daysAdmitted);
        const dailyRate = Math.floor(monthlyPkg / 30);
        const dueTillDate = billableMonths * monthlyPkg;

        return {
          ...prev,
          name: editForm.name,
          patientId: editForm.patientId || null,
          diagnosis: editForm.diagnosis,
          packageAmount: monthlyPkg,
          monthlyPackage: monthlyPkg,
          daysAdmitted,
          durationFormatted,
          dailyRate,
          dueTillDate,
          billableMonths,
          overallRemaining: (dueTillDate + Number(prev.medicineCharges || 0)) - (prev.overallReceived || 0),
          photoUrl: photoUrl,
          dischargeDate: editForm.dischargeDate ? Timestamp.fromDate(new Date(editForm.dischargeDate)) : null
        };
      });
      setEditForm(prev => ({ ...prev, photoUrl }));
      setPhotoFile(null);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      console.error("Save error", error);
      toast.error('Failed to update profile');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveStay = async () => {
    try {
      setSavingStay(true);
      const docRef = doc(db, 'rehab_patients', patientId);

      const parsedAdmissionDate = stayForm.admissionDate ? Timestamp.fromDate(new Date(`${stayForm.admissionDate}T00:00:00`)) : null;
      const parsedDischargeDate = stayForm.dischargeDate ? Timestamp.fromDate(new Date(`${stayForm.dischargeDate}T00:00:00`)) : null;
      const parsedRejoinedAt = stayForm.rejoinedAt ? Timestamp.fromDate(new Date(`${stayForm.rejoinedAt}T00:00:00`)) : null;
      const parsedPackage = Number(stayForm.monthlyPackage || 0);

      if (editingStayIdx === -1) {
        const updatePayload: any = {
          admissionDate: parsedAdmissionDate,
          dischargeDate: parsedDischargeDate,
          monthlyPackage: parsedPackage,
          packageAmount: parsedPackage
        };
        await updateDoc(docRef, updatePayload);
        setPatient((prev: any) => ({
          ...prev,
          admissionDate: parsedAdmissionDate,
          dischargeDate: parsedDischargeDate,
          monthlyPackage: parsedPackage,
          packageAmount: parsedPackage
        }));
      } else if (editingStayIdx !== null && editingStayIdx >= 0) {
        const updatedHistory = [...(patient.rejoinHistory || [])];
        updatedHistory[editingStayIdx] = {
          ...updatedHistory[editingStayIdx],
          admissionDate: parsedAdmissionDate,
          dischargeDate: parsedDischargeDate,
          monthlyPackage: parsedPackage,
          packageAmount: parsedPackage,
          rejoinedAt: parsedRejoinedAt,
          rejoinDetails: {
            visitorName: stayForm.visitorName,
            visitorRelation: stayForm.visitorRelation,
            visitorPhone: stayForm.visitorPhone,
            visitorCnic: stayForm.visitorCnic,
            visitorNotes: stayForm.visitorNotes
          }
        };

        await updateDoc(docRef, { rejoinHistory: updatedHistory });
        setPatient((prev: any) => ({
          ...prev,
          rejoinHistory: updatedHistory
        }));
      }

      setEditingStayIdx(null);
      toast.success('Stay details saved successfully ✓');
    } catch (error) {
      console.error('Failed to save stay details', error);
      toast.error('Failed to save stay details');
    } finally {
      setSavingStay(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Are you sure you want to deactivate this patient?")) return;
    try {
      setDeactivating(true);
      await updateDoc(doc(db, 'rehab_patients', patientId), { isActive: false });
      toast.success('Patient deactivated');
      router.push('/departments/rehab/dashboard/admin/patients');
    } catch (error) {
      console.error("Deactivate error", error);
      toast.error('Deactivation failed');
      setDeactivating(false);
    }
  };

  const executeRejoin = async (targetId?: string, rejoinData?: any) => {
    try {
      const tid = patientId; // Keep the current active patient profile as primary
      setDeactivating(true);

      const updatePayload: any = {
        isActive: true,
        rejoinDate: Timestamp.now(),
      };

      if (rejoinData?.admissionDate) {
        updatePayload.admissionDate = Timestamp.fromDate(new Date(`${rejoinData.admissionDate}T00:00:00`));
      } else {
        updatePayload.admissionDate = Timestamp.now();
      }

      if (rejoinData?.dischargeDate) {
        updatePayload.dischargeDate = Timestamp.fromDate(new Date(`${rejoinData.dischargeDate}T00:00:00`));
      } else {
        updatePayload.dischargeDate = null;
      }

      const currentHistory = patient?.rejoinHistory || [];
      const previousStay = {
        patientId: patient.patientId || null,
        inpatientNumber: patient.inpatientNumber || null,
        admissionDate: patient.admissionDate,
        dischargeDate: patient.dischargeDate,
        duration: patient.durationFormatted,
        daysAdmitted: patient.daysAdmitted,
        monthlyPackage: patient.monthlyPackage || patient.packageAmount,
        finalBalance: patient.overallRemaining,
        rejoinedAt: Timestamp.now(),
        rejoinDetails: rejoinData || null
      };

      if (!targetId || targetId === patientId) {
        updatePayload.rejoinHistory = [...currentHistory, previousStay];
      } else {
        // MERGING CASE: Fetch target profile's history, append its current stay, and merge with current history & previousStay
        const targetDocRef = doc(db, 'rehab_patients', targetId);
        const targetDocSnap = await getDoc(targetDocRef);
        if (!targetDocSnap.exists()) {
          throw new Error("Target patient profile not found");
        }
        const targetData = targetDocSnap.data() as any;

        const targetHistory = targetData.rejoinHistory || [];
        const targetCurrentStay = {
          patientId: targetData.patientId || null,
          inpatientNumber: targetData.inpatientNumber || null,
          admissionDate: targetData.admissionDate || null,
          dischargeDate: targetData.dischargeDate || null,
          duration: targetData.durationFormatted || null,
          daysAdmitted: targetData.daysAdmitted || null,
          monthlyPackage: targetData.monthlyPackage || targetData.packageAmount || null,
          finalBalance: targetData.overallRemaining || 0,
          rejoinedAt: targetData.rejoinDate || null,
          rejoinDetails: { notes: `Imported from merged duplicate profile ID: ${targetId}` }
        };

        updatePayload.rejoinHistory = [
          ...targetHistory,
          targetCurrentStay,
          ...currentHistory,
          previousStay
        ];
      }

      if (rejoinData) {
        // Also update main fields based on new rejoin info
        if (rejoinData.totalFee) {
          updatePayload.monthlyPackage = Number(rejoinData.totalFee);
          updatePayload.packageAmount = Number(rejoinData.totalFee);
        }
      }

      await updateDoc(doc(db, 'rehab_patients', tid), updatePayload);

      // Log the family visit if visitor details are filled
      if (rejoinData && rejoinData.visitorName && rejoinData.visitorRelation && rejoinData.visitorPhone) {
        try {
          const visitData = {
            patientId: tid,
            visitorName: rejoinData.visitorName,
            relation: rejoinData.visitorRelation,
            phone: rejoinData.visitorPhone,
            cnic: rejoinData.visitorCnic || null,
            notes: rejoinData.visitorNotes || rejoinData.familyVisit || null,
            date: Timestamp.fromDate(new Date(`${rejoinData.visitDate || rejoinData.admissionDate}T00:00:00`)),
            loggedBy: session?.uid || 'system',
            createdAt: Timestamp.now()
          };
          await addDoc(collection(db, 'rehab_visits'), visitData);
        } catch (visitErr) {
          console.error("Error logging visit during rejoin:", visitErr);
        }
      }

      // If merging occurred, transfer all sub-collection details from targetId to patientId and delete targetId
      if (targetId && targetId !== patientId) {
        const collectionsToMerge = [
          'rehab_fees',
          'rehab_canteen',
          'rehab_videos',
          'rehab_visits',
          'rehab_transactions',
          'rehab_daily_activities',
          'rehab_therapy_sessions',
          'rehab_medication_records',
          'rehab_weekly_progress',
          'rehab_attendance'
        ];

        for (const colName of collectionsToMerge) {
          const q = query(collection(db, colName), where('patientId', '==', targetId));
          const snap = await getDocs(q);
          const updates = snap.docs.map(d => updateDoc(doc(db, colName, d.id), { patientId: patientId }));
          await Promise.all(updates);
        }

        // Handle rehab_users which has both patientId and customId fields
        const qUsersPatientId = query(collection(db, 'rehab_users'), where('patientId', '==', targetId));
        const snapUsersPatientId = await getDocs(qUsersPatientId);
        const updatesUsersPatientId = snapUsersPatientId.docs.map(d => updateDoc(doc(db, 'rehab_users', d.id), { patientId: patientId }));
        await Promise.all(updatesUsersPatientId);

        const qUsersCustomId = query(collection(db, 'rehab_users'), where('customId', '==', targetId));
        const snapUsersCustomId = await getDocs(qUsersCustomId);
        const updatesUsersCustomId = snapUsersCustomId.docs.map(d => updateDoc(doc(db, 'rehab_users', d.id), { customId: patientId }));
        await Promise.all(updatesUsersCustomId);

        // Delete the duplicate patient profile document (targetId)
        await deleteDoc(doc(db, 'rehab_patients', targetId));
      }

      toast.success('Patient profile merged and rejoined successfully ✓');
      setShowRejoinCheckModal(false);
      setShowRejoinDetailsModal(false);

      fetchData();
    } catch (error) {
      console.error("Rejoin error", error);
      toast.error('Rejoin failed');
    } finally {
      setDeactivating(false);
    }
  };

  const handleRejoin = async () => {
    if (!patient?.name) {
      toast.error("Patient name not found");
      return;
    }
    try {
      setDeactivating(true);
      const q = query(collection(db, 'rehab_patients'), where('name', '==', patient.name));
      const snap = await getDocs(q);
      const matching = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(p => p.id !== patientId);

      setRejoinForm({
        duration: patient?.duration || '',
        totalFee: String(patient?.monthlyPackage || patient?.packageAmount || ''),
        familyVisit: '',
        admissionDate: new Date().toISOString().split('T')[0],
        dischargeDate: '',
        visitorName: patient?.guardianName || '',
        visitorRelation: patient?.guardianRelation || '',
        visitorPhone: patient?.guardianPhone || '',
        visitorCnic: patient?.guardianCnic || '',
        visitorNotes: '',
        visitDate: new Date().toISOString().split('T')[0]
      });

      if (matching.length > 0) {
        setMatchingPatients(matching);
        setShowRejoinCheckModal(true);
        setDeactivating(false);
        return;
      }

      setDeactivating(false);
      setShowRejoinDetailsModal(true);
    } catch (error) {
      console.error("Rejoin error during search", error);
      toast.error('Failed to search duplicate profiles');
      setDeactivating(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (deleteProfileConfirmName.trim() !== patient?.name?.trim()) {
      toast.error("The typed name does not match the patient's name.");
      return;
    }

    try {
      setIsDeletingProfile(true);

      const deleteFromQuery = async (colName: string, fieldName: string, value: string) => {
        const q = query(collection(db, colName), where(fieldName, "==", value));
        const snap = await getDocs(q);
        const deletes = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletes);
      };

      // 1. Delete linked sub-data/transactions across collections
      await Promise.all([
        deleteFromQuery('rehab_fees', 'patientId', patientId),
        deleteFromQuery('rehab_canteen', 'patientId', patientId),
        deleteFromQuery('rehab_videos', 'patientId', patientId),
        deleteFromQuery('rehab_visits', 'patientId', patientId),
        deleteFromQuery('rehab_transactions', 'patientId', patientId),
        deleteFromQuery('rehab_daily_activities', 'patientId', patientId),
        deleteFromQuery('rehab_therapy_sessions', 'patientId', patientId),
        deleteFromQuery('rehab_medication_records', 'patientId', patientId),
        deleteFromQuery('rehab_weekly_progress', 'patientId', patientId),
        deleteFromQuery('rehab_attendance', 'patientId', patientId),
        deleteFromQuery('rehab_users', 'patientId', patientId),
        deleteFromQuery('rehab_users', 'customId', patientId),
      ]);

      // 2. Delete the main patient document last
      await deleteDoc(doc(db, 'rehab_patients', patientId));

      toast.success('Patient profile and all associated records deleted successfully ✓');
      setShowDeleteProfileModal(false);
      router.push('/departments/rehab/dashboard/admin/patients');
    } catch (error) {
      console.error("Delete profile error", error);
      toast.error('Failed to delete patient profile completely');
    } finally {
      setIsDeletingProfile(false);
    }
  };


  const handleDischarge = () => {
    // Reset modal and open
    const today = new Date().toISOString().split('T')[0];
    setDDate(today);
    setDDateInput(formatDateDMY(today));
    setDAmount('');
    setShowDischargeModal(true);
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Confirm discharge? This will mark the patient as inactive.")) return;

    try {
      setIsDischarging(true);

      const dischargeDateObj = parseDateDMY(dDateInput) || new Date(dDate);
      const admissionDateObj = toDate(patient.admissionDate);

      const diffTimeMs = dischargeDateObj.getTime() - admissionDateObj.getTime();
      const actualDays = diffTimeMs > 0 ? Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;

      // 1. If there's an amount, record it as a transaction
      const amount = Number(dAmount) || 0;
      if (amount > 0) {
        const setupSnap = await getDoc(doc(db, 'rehab_meta', 'setup'));
        const setupData = setupSnap.data() as any;
        const cashierId = String(setupData?.cashierCustomId || '').toUpperCase() || 'CASHIER';

        await addDoc(collection(db, 'rehab_transactions'), {
          type: 'income',
          amount,
          category: 'fee',
          categoryName: 'Discharge Settlement',
          departmentCode: 'rehab',
          departmentName: 'Rehab Center',
          patientId: patientId,
          patientName: patient?.name || '',
          status: 'approved', // Auto-approve discharge payments since it's a final step
          cashierId: cashierId,
          description: dNote || 'Final Settlement',
          date: Timestamp.fromDate(dischargeDateObj),
          transactionDate: Timestamp.now(),
          createdBy: session.uid,
          createdByName: session?.displayName || session?.name || 'Rehab Admin',
          createdAt: Timestamp.now()
        });
      }

      // 2. Update patient record
      await updateDoc(doc(db, 'rehab_patients', patientId), {
        isActive: false,
        dischargeDate: Timestamp.fromDate(dischargeDateObj),
        dischargeAmount: amount,
        dischargeNote: dNote || null,
        totalStayDays: actualDays
      });

      toast.success('Patient discharged successfully ✓');
      setShowDischargeModal(false);
      router.push('/departments/rehab/dashboard/admin/patients');
    } catch (error) {
      console.error("Discharge error", error);
      toast.error('Discharge failed');
    } finally {
      setIsDischarging(false);
    }
  };

  const handleDeletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingPayment || !deleteReason) {
      toast.error("Reason is mandatory");
      return;
    }

    try {
      setIsDeletingTransaction(true);

      const sourceCollection = deletingPayment._collection || (deletingPayment.id.includes('_') ? 'rehab_fees' : 'rehab_transactions');

      if (sourceCollection === 'rehab_transactions') {
        // Delete directly from rehab_transactions collection
        await deleteDoc(doc(db, 'rehab_transactions', deletingPayment.id));
      } else {
        // 1. Find the fee doc id
        const [feeDocId] = deletingPayment.id.split('_');
        const feeRef = doc(db, 'rehab_fees', feeDocId);
        const feeSnap = await getDoc(feeRef);

        if (!feeSnap.exists()) {
          toast.error("Original fee record not found");
          return;
        }

        const feeData = feeSnap.data();
        const currentPayments = feeData.payments || [];

        // 2. Filter out the payment
        const newPayments = currentPayments.filter((p: any) => {
          // Match by date and amount exactly as they are in the database
          const pDateStr = p.date;
          const pAmount = Number(p.amount);

          const isMatch = pAmount === Number(deletingPayment.amount) && pDateStr === deletingPayment.date;
          return !isMatch;
        });

        if (newPayments.length === currentPayments.length) {
          toast.error("Payment not found in the record");
          return;
        }

        // 3. Update the fee record
        const totalPaid = newPayments.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
        await updateDoc(feeRef, {
          payments: newPayments,
          totalPaid: totalPaid,
          remaining: Math.max(0, Number(feeData.package || 0) - totalPaid)
        });
      }

      // 4. Log the deletion in a separate collection for audit
      await addDoc(collection(db, 'rehab_deletion_logs'), {
        patientId,
        patientName: patient?.name,
        type: 'payment_deletion',
        originalPayment: deletingPayment,
        reason: deleteReason,
        deletedBy: session.uid,
        deletedByName: session.name || session.displayName || 'Super Admin',
        createdAt: Timestamp.now()
      });

      toast.success("Transaction deleted successfully");
      setShowDeleteModal(false);
      setDeleteReason('');
      setDeletingPayment(null);

      // 5. Refresh data
      fetchData();

    } catch (err) {
      console.error("Delete payment error:", err);
      toast.error("Failed to delete transaction");
    } finally {
      setIsDeletingTransaction(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle || !selectedFile) {
      toast.error('Please provide a title and select a file');
      return;
    }

    try {
      setIsUploading(true);
      const secureUrl = await uploadToCloudinary(selectedFile, 'khanhub/rehab/patients');

      await addDoc(collection(db, 'rehab_videos'), {
        patientId: patientId,
        title: videoTitle,
        url: secureUrl,
        fileType: selectedFile.type,
        uploadedBy: session.uid,
        createdAt: Timestamp.now()
      });

      toast.success('Uploaded ✓');
      setIsUploadModalOpen(false);
      setVideoTitle('');
      setSelectedFile(null);
      // Refresh videos
      const videosQ = query(collection(db, 'rehab_videos'), where('patientId', '==', patientId), orderBy('createdAt', 'desc'));
      const vidSnap = await getDocs(videosQ);
      setVideos(vidSnap.docs.map(v => ({ id: v.id, ...v.data() })));

    } catch (error) {
      console.error("Upload error", error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteDoc(doc(db, 'rehab_videos', videoId));
      toast.success('Deleted');
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error("Delete error", error);
      toast.error('Failed to delete');
    }
  };

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName || !vRelation || !vPhone) {
      toast.error('Name, Relation and Phone are required');
      return;
    }

    try {
      setIsSavingVisit(true);
      const visitData = {
        patientId,
        visitorName: vName,
        relation: vRelation,
        phone: vPhone,
        cnic: vCnic || null,
        notes: vNotes || null,
        // Use explicit local midnight to avoid date shifting issues
        date: Timestamp.fromDate(new Date(`${vDate}T00:00:00`)),
        loggedBy: session.uid,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'rehab_visits'), visitData);

      toast.success('Visit logged ✓');
      setShowAddVisitModal(false);

      // Reset form
      setVName('');
      setVRelation('');
      setVPhone('');
      setVCnic('');
      setVNotes('');
      setVDate(new Date().toISOString().split('T')[0]);

      // Refresh visits
      const visitsQ = query(collection(db, 'rehab_visits'), where('patientId', '==', patientId), orderBy('date', 'desc'));
      const visitSnap = await getDocs(visitsQ);
      setVisits(visitSnap.docs.map(v => ({ id: v.id, ...v.data() })));

    } catch (error) {
      console.error("Add visit error", error);
      toast.error('Failed to log visit');
    } finally {
      setIsSavingVisit(false);
    }
  };

  const openEditVisit = (visit: any) => {
    setEditVisitModal(visit);
    setVName(visit.visitorName || '');
    setVRelation(visit.relation || '');
    setVPhone(visit.phone || '');
    setVCnic(visit.cnic || '');
    setVNotes(visit.notes || '');
    try {
      const d = visit.date?.toDate?.() ? visit.date.toDate() : new Date(visit.date);
      setVDate(d.toISOString().slice(0, 10));
    } catch {
      setVDate(new Date().toISOString().slice(0, 10));
    }
  };

  const handleUpdateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVisitModal?.id) return;
    if (!vName || !vRelation || !vPhone) {
      toast.error('Name, Relation and Phone are required');
      return;
    }
    try {
      setIsUpdatingVisit(true);
      await updateDoc(doc(db, 'rehab_visits', editVisitModal.id), {
        visitorName: vName,
        relation: vRelation,
        phone: vPhone,
        cnic: vCnic || null,
        notes: vNotes || null,
        date: Timestamp.fromDate(new Date(`${vDate}T00:00:00`)),
        updatedAt: Timestamp.now(),
        updatedBy: session.uid
      });

      toast.success('Visit updated ✓');
      setEditVisitModal(null);
      const visitsQ = query(collection(db, 'rehab_visits'), where('patientId', '==', patientId), orderBy('date', 'desc'));
      const visitSnap = await getDocs(visitsQ);
      setVisits(visitSnap.docs.map(v => ({ id: v.id, ...v.data() })));
    } catch (error) {
      console.error("Update visit error", error);
      toast.error('Failed to update visit');
    } finally {
      setIsUpdatingVisit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFAF2] transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="w-full overflow-x-hidden pb-20 bg-[#FCFAF2] transition-colors duration-300 min-h-screen patient-detail-root">
      <div className="no-print">
        <SuperAdminPortalToolbar
          dept="rehab"
          entityId={patientId}
          entityType="patient"
          entityName={patient?.name}
        />
      </div>
      <div className="max-w-5xl mx-auto w-full space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-0 no-print">

        {/* Top Link - Back Navigation */}
        <div className="mt-4 leading-none">
          <Link
            href="/departments/rehab/dashboard/admin/patients"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-gray-500 hover:text-teal-600 transition-all uppercase tracking-widest group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Patients
          </Link>
        </div>

        {/* Header Profile Summary - Premium Floating Card */}
        <div className="bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-white w-full p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative transition-all duration-500 overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full transition-colors group-hover:bg-teal-100 -mr-4 -mt-4"></div>

          <div className="relative z-10 shrink-0">
            {patient.photoUrl ? (
              <div className="relative">
                <img src={patient.photoUrl} alt={patient.name} className="w-24 h-24 md:w-36 md:h-36 rounded-2xl sm:rounded-[2rem] object-cover border-4 border-white shadow-xl bg-gray-100" />
                <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-emerald-500 border-4 border-white" />
              </div>
            ) : (
              <div className="relative">
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-2xl sm:rounded-[2rem] bg-teal-600 text-white flex items-center justify-center font-black text-4xl sm:text-6xl border-4 border-white shadow-xl shadow-teal-600/20">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-emerald-500 border-4 border-white" />
              </div>
            )}
          </div>

          <div className="relative z-10 flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tighter truncate leading-tight">
                  {patient.name}
                </h1>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="self-center sm:self-start p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-lg shadow-teal-600/20 active:scale-95 flex items-center gap-2 px-4"
                    title="Generate Report"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Report</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsEditing(true);
                    }}
                    className="self-center sm:self-start p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-all border border-slate-200/50 active:scale-90"
                    title="Edit Profile"
                  >
                    <Edit3 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 font-medium max-w-full">
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-200 text-[10px] sm:text-xs break-words">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-600" />
                  <span className="font-bold">Admitted:</span> {formatDateDMY(patient.admissionDate?.toDate?.() || patient.admissionDate)}
                </span>

                <span className="flex items-center gap-1 text-teal-700 font-black bg-teal-50 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm border border-teal-100 text-[10px] sm:text-xs break-words">
                  <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {patient.monthlyPackage?.toLocaleString() || patient.packageAmount?.toLocaleString()} / month
                </span>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-3 mt-2 max-w-full">
                <div className="flex items-center gap-1 text-orange-700 font-black bg-orange-50 px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl border border-orange-100 italic text-[10px] sm:text-xs uppercase tracking-tight break-words">
                  <span className="text-xs">📅</span> {patient.durationFormatted}
                </div>
                <div className="flex items-center gap-1 text-blue-700 font-black bg-blue-50 px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl border border-blue-100 text-[10px] sm:text-xs uppercase tracking-tight break-words">
                  <span className="text-xs">💰</span> Pkg Due: PKR {patient.dueTillDate?.toLocaleString()}
                </div>
                {Number(patient.medicineCharges || 0) > 0 && (
                  <div className="flex items-center gap-1 text-purple-700 font-black bg-purple-50 px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl border border-purple-100 text-[10px] sm:text-xs uppercase tracking-tight break-words flex-wrap text-left max-w-full">
                    <span className="text-xs">💊</span> Medicine / Extra Treatment: PKR {patient.medicineCharges?.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation - Premium Sticky Glass Header */}
        <div className="w-full sticky top-0 z-40 bg-[#FCFAF2]/80 backdrop-blur-md py-2 no-print">
          <div 
            className="w-full overflow-x-auto px-2 sm:px-0 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="inline-flex gap-1.5 border border-slate-200/50 bg-white/60 backdrop-blur-md rounded-2xl p-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => scrollToSection(t.id)}
                  className={`px-3.5 py-2.5 text-[10px] sm:px-5 sm:py-3 sm:text-[11px] whitespace-nowrap font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-xl shrink-0 ${activeTab === t.id
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 active:scale-95'
                    : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  <t.icon className={`h-4 w-4 ${activeTab === t.id ? 'animate-pulse' : ''}`} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stay Period / Readmission Selector */}
        {patient?.rejoinHistory && patient.rejoinHistory.length > 0 && (
          <div className="w-full px-2 sm:px-0 mt-2 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-500/5 border border-teal-500/10 rounded-2xl p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Viewing Stay Context</p>
                <h4 className="text-sm font-black text-gray-800 mt-0.5">
                  {selectedStayIndex === -1 ? (
                    <span>Current Active Stay (Since {formatDateDMY(patient.admissionDate)})</span>
                  ) : (
                    <span>Previous Stay #{patient.rejoinHistory.length - selectedStayIndex} ({formatDateDMY(patient.rejoinHistory[selectedStayIndex].admissionDate)} - {patient.rejoinHistory[selectedStayIndex].dischargeDate ? formatDateDMY(patient.rejoinHistory[selectedStayIndex].dischargeDate) : 'Present'})</span>
                  )}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  All transaction history, daily sheets, medication, progress, and therapy logs are filtered to this stay.
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedStayIndex(-1)}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${selectedStayIndex === -1
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 active:scale-95'
                      : 'bg-white/60 border border-gray-100 text-gray-600 hover:bg-white hover:text-teal-600 active:scale-95'
                    }`}
                >
                  Current Stay
                </button>
                {patient.rejoinHistory.map((stay: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedStayIndex(idx)}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${selectedStayIndex === idx
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 active:scale-95'
                        : 'bg-white/60 border border-gray-100 text-gray-600 hover:bg-white hover:text-teal-600 active:scale-95'
                      }`}
                  >
                    Stay #{patient.rejoinHistory.length - idx}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content Areas Stacked */}
        <div className="w-full flex flex-col gap-10">

          {/* TAB: PROFILE */}
          <div id="section-profile" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            {session && (session.role === 'admin' || session.role === 'superadmin') && (
              <VisibilityManager
                entityType="patient"
                entityId={patientId}
                department="rehab"
                currentSections={patient?.visibleSections || {}}
                onSave={async (updated) => {
                  await saveVisibleSections('rehab', 'patients', patientId, updated);
                  setPatient((prev: any) => prev ? { ...prev, visibleSections: updated } : null);
                }}
              />
            )}
            <div className="space-y-8 w-full">
              <div className="flex items-center justify-between w-full border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-800">Basic Details</h3>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="text-teal-600 hover:bg-teal-50 p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg text-sm font-medium transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSaveEdit} disabled={savingEdit} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm">
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient ID</label>
                    <input type="text" value={editForm.patientId} onChange={e => setEditForm({ ...editForm, patientId: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all overflow-hidden flex-shrink-0"
                      >
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            className="w-full h-full object-cover"
                            alt="Preview"
                          />
                        ) : (
                          <>
                            <Camera size={20} className="text-gray-400 mb-1" />
                            <span className="text-[9px] text-gray-400 font-bold text-center leading-tight px-1">
                              Upload
                            </span>
                          </>
                        )}
                      </div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.type !== 'image/webp') {
                            toast.error('Only WebP images are allowed');
                            return;
                          }
                          setPhotoFile(file);
                          setPhotoPreview(URL.createObjectURL(file));
                        }}
                      />
                      <div>
                        {photoFile ? (
                          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">
                            ✓ New photo selected
                          </p>
                        ) : photoPreview ? (
                          <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                            Current photo
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Click to upload a photo
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400">JPG, PNG up to 5MB</p>
                        {photoPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview('');
                              setEditForm(prev => ({ ...prev, photoUrl: '' }));
                            }}
                            className="text-[10px] text-red-400 hover:text-red-500 mt-1 font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Package (PKR)</label>
                    <input
                      type="number"
                      value={editForm.packageAmount}
                      onChange={e => setEditForm({ ...editForm, packageAmount: Number(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <BrutalistCalendar
                      label="Admission Date"
                      value={editForm.admissionDate}
                      onChange={iso => setEditForm({ ...editForm, admissionDate: iso })}
                    />
                  </div>

                  {!patient.isActive && (
                    <div className="md:col-span-2">
                      <BrutalistCalendar
                        label="Discharge Date"
                        value={editForm.dischargeDate}
                        onChange={iso => setEditForm({ ...editForm, dischargeDate: iso })}
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnosis / Notes</label>
                    <textarea value={editForm.diagnosis} onChange={e => setEditForm({ ...editForm, diagnosis: e.target.value })} rows={3} className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none text-gray-900 dark:text-white" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 w-full">
                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/50 w-full p-6 rounded-2xl flex flex-col items-center justify-center text-center sm:col-span-2 shadow-sm">
                    <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Total Stay Duration</p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-teal-700 dark:text-teal-300">
                      {patient.daysAdmitted || 0} Days
                    </p>
                    <p className="text-xs font-bold text-teal-500 dark:text-teal-400/80 mt-1 italic">
                      {patient.durationFormatted}
                    </p>
                    {!patient.isActive && patient.dischargeDate && (
                      <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-teal-200/30 dark:border-teal-800/30">
                        <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Discharged On</p>
                        <p className="text-xl font-black text-teal-700 dark:text-teal-300">
                          {formatDateDMY(patient.dischargeDate?.toDate?.() || patient.dischargeDate)}
                        </p>
                      </div>
                    )}
                    {patient.isActive && (
                      <button
                        type="button"
                        onClick={handleDischarge}
                        disabled={deactivating}
                        className="mt-6 bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-700 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-60"
                      >
                        {deactivating ? 'Discharging...' : 'Discharge Patient'}
                      </button>
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 lowercase tracking-widest font-black uppercase">Current Balance Due</span>
                    <span className="font-black text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg inline-block text-sm max-w-full break-all">
                      PKR {patient.overallRemaining?.toLocaleString()}
                    </span>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 space-y-1 max-w-full break-words">
                      <p className="leading-tight">Package Due: PKR {patient.dueTillDate?.toLocaleString()}</p>
                      {Number(patient.medicineCharges || 0) > 0 && (
                        <p className="font-bold text-amber-600 dark:text-amber-400 leading-tight">Medicine / Extra Treatment: PKR {patient.medicineCharges?.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-full min-w-0">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 lowercase tracking-widest font-black uppercase">Assigned Staff ID</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg inline-block text-sm border border-gray-100 dark:border-white/5 max-w-full break-all">
                      {patient.assignedStaffId || 'None'}
                    </span>
                  </div>
                  <div className="w-full min-w-0">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 lowercase tracking-widest font-black uppercase">Patient ID</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg inline-block text-sm border border-gray-100 dark:border-white/5 max-w-full break-all">
                      {patient.patientId || 'None'}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 w-full min-w-0">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 lowercase tracking-widest font-black uppercase">Patient Doc ID</span>
                    <div className="text-xs sm:text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-white/5 w-full break-all">
                      {patient.id}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-red-50 dark:border-red-900/20 w-full flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Actions here can be destructive. Please proceed with extreme caution.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={patient.isActive !== false ? handleDeactivate : handleRejoin}
                    disabled={deactivating}
                    className={`bg-white dark:bg-gray-900 border px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 w-full sm:w-auto ${patient.isActive !== false
                      ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                  >
                    {deactivating ? 'Processing...' : (patient.isActive !== false ? 'Deactivate Patient' : 'Rejoin Patient')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteProfileConfirmName('');
                      setShowDeleteProfileModal(true);
                    }}
                    className="bg-red-55 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full sm:w-auto active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Patient Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TAB: ADMISSION */}
          <div id="section-admission" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
              <FileText className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Admission Details</h2>
            </div>

            {/* Stays & Rejoining History Timeline */}
            {patient?.rejoinHistory && patient.rejoinHistory.length > 0 && (
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-pulse" />
                      Stay & Readmission History ({patient.rejoinHistory.length + 1} Stays Total)
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Chronological record of patient admissions & stays</p>
                  </div>
                  <span className="text-[10px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                    {patient.isActive ? "Currently Active" : "Discharged"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Current Active/Recent Stay Card */}
                  <div className="relative overflow-hidden bg-white dark:bg-gray-900 border-2 border-teal-500 rounded-2xl p-5 shadow-lg shadow-teal-500/5">
                    <div className="absolute top-0 right-0 bg-teal-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        <span>Current Stay Overview</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingStayIdx(-1);
                          setStayForm({
                            admissionDate: patient.admissionDate?.toDate?.() ? patient.admissionDate.toDate().toISOString().split('T')[0] : (patient.admissionDate || ''),
                            dischargeDate: patient.dischargeDate?.toDate?.() ? patient.dischargeDate.toDate().toISOString().split('T')[0] : (patient.dischargeDate || ''),
                            monthlyPackage: patient.monthlyPackage || patient.packageAmount || 0,
                            rejoinedAt: '',
                            visitorName: '',
                            visitorRelation: '',
                            visitorPhone: '',
                            visitorCnic: '',
                            visitorNotes: ''
                          });
                        }}
                        className="border-l border-white/30 pl-2 py-0.5 flex items-center gap-1 text-white hover:text-teal-200 transition-all font-black"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> EDIT STAY
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Admission Date</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white mt-1">
                          {formatDateDMY(patient.admissionDate?.toDate?.() || patient.admissionDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Expected Discharge</p>
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mt-1">
                          {patient.dischargeDate ? formatDateDMY(patient.dischargeDate?.toDate?.() || patient.dischargeDate) : "Not Decided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Monthly Package</p>
                        <p className="text-sm font-black text-teal-600 dark:text-teal-400 mt-1">
                          PKR {(patient.monthlyPackage || patient.packageAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Duration Elapsed</p>
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mt-1">
                          {patient.durationFormatted || `${patient.daysAdmitted || 0} Days`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Past Stays Timeline */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Previous Stays ({patient.rejoinHistory.length})</p>
                    {patient.rejoinHistory.map((stay: any, idx: number) => (
                      <div key={idx} className="bg-white/60 dark:bg-gray-900/40 border border-gray-100 dark:border-white/5 rounded-2xl p-4 transition-all hover:bg-white dark:hover:bg-gray-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-50 dark:border-white/5 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-black text-gray-500">
                              {patient.rejoinHistory.length - idx}
                            </span>
                            <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Stay Record</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-[10px] font-bold text-gray-400">
                              Rejoined On: {formatDateDMY(stay.rejoinedAt?.toDate?.() || stay.rejoinedAt)}
                            </p>
                            <button
                              onClick={() => {
                                setEditingStayIdx(idx);
                                setStayForm({
                                  admissionDate: stay.admissionDate?.toDate?.() ? stay.admissionDate.toDate().toISOString().split('T')[0] : (stay.admissionDate || ''),
                                  dischargeDate: stay.dischargeDate?.toDate?.() ? stay.dischargeDate.toDate().toISOString().split('T')[0] : (stay.dischargeDate || ''),
                                  monthlyPackage: stay.monthlyPackage || stay.packageAmount || 0,
                                  rejoinedAt: stay.rejoinedAt?.toDate?.() ? stay.rejoinedAt.toDate().toISOString().split('T')[0] : (stay.rejoinedAt || ''),
                                  visitorName: stay.rejoinDetails?.visitorName || '',
                                  visitorRelation: stay.rejoinDetails?.visitorRelation || '',
                                  visitorPhone: stay.rejoinDetails?.visitorPhone || '',
                                  visitorCnic: stay.rejoinDetails?.visitorCnic || '',
                                  visitorNotes: stay.rejoinDetails?.visitorNotes || ''
                                });
                              }}
                              className="text-teal-600 hover:text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95"
                            >
                              <Edit3 className="w-3 h-3" /> Edit Stay
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Admission Date</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                              {formatDateDMY(stay.admissionDate?.toDate?.() || stay.admissionDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Discharge Date</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                              {stay.dischargeDate ? formatDateDMY(stay.dischargeDate?.toDate?.() || stay.dischargeDate) : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Stay Package</p>
                            <p className="font-black text-teal-600 dark:text-teal-400 mt-0.5">
                              PKR {(stay.monthlyPackage || stay.packageAmount || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Stay Duration</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                              {stay.duration || `${stay.daysAdmitted || 0} Days`}
                            </p>
                          </div>
                        </div>
                        {stay.rejoinDetails?.visitorName && (
                          <div className="mt-3 pt-3 border-t border-dashed border-gray-100 dark:border-white/5 text-xs text-gray-500 bg-teal-500/5 rounded-xl p-3">
                            <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Guardian/Visitor at Readmission</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>Name: <span className="font-black text-gray-700 dark:text-gray-300">{stay.rejoinDetails.visitorName}</span></div>
                              <div>Relation: <span className="font-bold text-gray-700 dark:text-gray-300">{stay.rejoinDetails.visitorRelation}</span></div>
                              <div>Phone: <span className="font-mono text-gray-700 dark:text-gray-300">{stay.rejoinDetails.visitorPhone}</span></div>
                              {stay.rejoinDetails.visitorCnic && <div>CNIC: <span className="font-mono text-gray-700 dark:text-gray-300">{stay.rejoinDetails.visitorCnic}</span></div>}
                            </div>
                            {stay.rejoinDetails.visitorNotes && (
                              <p className="mt-1.5 pt-1.5 border-t border-teal-500/10 italic text-[11px] text-gray-400">
                                Notes: {stay.rejoinDetails.visitorNotes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <AdmissionTab patient={patient} onUpdate={(updated: any) => setPatient({ ...patient, ...updated })} />
          </div>

          {/* TAB: DAILY SHEET */}
          <div id="section-daily" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
              <ClipboardList className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Daily Sheets Log</h2>
            </div>
            <DailySheetTab patientId={patientId} session={session} dateFilter={dateFilter} />
          </div>

          {/* TAB: PROGRESS */}
          <div id="section-progress" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
              <TrendingUp className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Progress Chart & Details</h2>
            </div>
            <ProgressTab patientId={patientId} session={session} dateFilter={dateFilter} />
          </div>

          {/* TAB: THERAPY */}
          <div id="section-therapy" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
              <Activity className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Therapy Sessions</h2>
            </div>
            <TherapyTab patientId={patientId} session={session} dateFilter={dateFilter} />
          </div>

          {/* TAB: MEDICATION */}
          <div id="section-meds" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
              <Pill className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Medications Schedule</h2>
            </div>
            <MedicationTab patientId={patientId} session={session} dateFilter={dateFilter} />
          </div>

          {/* TAB: FEES */}
          <div id="section-fees" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
              <DollarSign className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Financials & Payments History</h2>
            </div>

            <div className="space-y-6">
              {/* Premium Journey Section */}
              <FinanceHistory
                patientName={patient?.name || "Patient"}
                totalPackage={(patient?.dueTillDate || 0) + (patient?.medicineCharges || 0)}
                records={(() => {
                  const records: MonthRecord[] = [];
                  const monthlyPkg = Number(patient?.monthlyPackage || 40000);

                  // Group payments by month
                  const groups: { [key: string]: PaymentType[] } = {};
                  filteredPayments.forEach((p: any) => {
                    const date = p.date?.toDate?.() ? p.date.toDate() : new Date(p.date || Date.now());
                    const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
                    if (!groups[monthLabel]) groups[monthLabel] = [];
                    groups[monthLabel].push({
                      date: date.toLocaleDateString('en-PK'),
                      amount: Number(p.amount),
                      receivedBy: p.cashierId || p.receivedBy || p.receiver || "Office",
                      note: p.note || p.receivedByNote || "",
                      verifiedByHQ: p.status === 'approved',
                      status: p.status === 'approved' ? "Approved" : "Pending"
                    });
                  });

                  // Create MonthRecord from groups
                  Object.keys(groups).forEach(label => {
                    const monthPayments = groups[label];
                    const totalPaid = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);
                    records.push({
                      label,
                      package: monthlyPkg,
                      totalPaid,
                      remaining: Math.max(0, monthlyPkg - totalPaid),
                      payments: monthPayments
                    });
                  });

                  return records.length > 0 ? records : [{
                    label: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase(),
                    package: monthlyPkg,
                    totalPaid: 0,
                    remaining: monthlyPkg,
                    payments: []
                  }];
                })()}
              />

              {/* Detailed Transaction Log */}
              <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-[#1a3a5c] dark:text-blue-400 tracking-tight">Payment Transaction Log</h3>
                    <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Full audit trail of all entries</p>
                  </div>
                  {!isAdmin && (
                    <button
                      onClick={() => {
                        setPackageAmt(patient?.packageAmount?.toString() || '');
                        setInitialPayment('');
                        setPaymentNote('');
                        setShowAddFeeModal(true);
                      }}
                      className="bg-[#1a3a5c] dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:translate-y-[-2px] transition-all active:scale-95 shadow-lg shadow-blue-900/10 dark:shadow-none flex items-center gap-2"
                    >
                      <Plus size={16} /> Add Payment
                    </button>
                  )}
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                    <DollarSign size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-xs tracking-widest">No transactions found</p>
                  </div>
                ) : (
                  <div className="w-full">
                    {/* Mobile transaction cards layout */}
                    <div className="block lg:hidden space-y-4">
                      {filteredPayments.map((p: any) => {
                        const dateObj = toDate(p.date);
                        return (
                          <div key={p.id} className="bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                              <div>
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{dateObj.toLocaleDateString()}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                              <span className="text-base font-black text-[#1a3a5c] dark:text-blue-400">₨{Number(p.amount).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                              <span className="text-gray-500 dark:text-gray-400">Method: {p.method || 'Cash'}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                                p.status === 'approved' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : p.status === 'rejected' || p.status === 'rejected_cashier'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {String(p.status || 'pending').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p.stayDurationIndex !== undefined && p.stayDurationIndex !== null && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[8px] font-black uppercase tracking-wider">
                                  Stay #{Number(p.stayDurationIndex) + 1}
                                </span>
                              )}
                              {Number(p.discount || 0) > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-[8px] font-black uppercase tracking-wider">
                                  Discount: Rs {Number(p.discount).toLocaleString()}
                                </span>
                              )}
                              {Number(p.returnAmount || p.return || 0) > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[8px] font-black uppercase tracking-wider">
                                  Returned: Rs {Number(p.returnAmount || p.return).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                              Verifier: {p.cashierId || 'Admin'}
                              {p.note && <p className="text-[#1a3a5c] dark:text-blue-400 font-black italic mt-1 break-words">&quot;{p.note}&quot;</p>}
                            </div>
                            {session?.role === 'superadmin' && (
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                {p.isPendingTransaction && (
                                  <button
                                    onClick={() => handleDirectApprove(p.id)}
                                    disabled={directApproveLoading === p.id}
                                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-black text-xs transition-all active:scale-95 flex-1"
                                  >
                                    {directApproveLoading === p.id ? '...' : 'Approve ✓'}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setDeletingPayment(p);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/10 flex items-center justify-center gap-1.5 text-xs font-bold w-full"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop transaction log table */}
                    <div className="hidden lg:block overflow-x-auto w-full [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className="text-left text-gray-500 dark:text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100 dark:border-white/10">
                            <th className="pb-4">Date</th>
                            <th className="pb-4">Amount</th>
                            <th className="pb-4">Method</th>
                            <th className="pb-4">Status</th>
                            <th className="pb-4">Details</th>
                            {session?.role === 'superadmin' && <th className="pb-4">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                          {filteredPayments.map((p: any) => {
                            const dateObj = toDate(p.date);
                            return (
                              <tr key={p.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-5">
                                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{dateObj.toLocaleDateString()}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </td>
                                <td className="py-5">
                                  <span className="text-base font-black text-[#1a3a5c] dark:text-blue-400">₨{Number(p.amount).toLocaleString()}</span>
                                </td>
                                <td className="py-5 font-bold text-xs text-gray-500 dark:text-gray-400">{p.method || 'Cash'}</td>
                                <td className="py-5">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${
                                    p.status === 'approved' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : p.status === 'rejected' || p.status === 'rejected_cashier'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  }`}>
                                    {String(p.status || 'pending').toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-5">
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Verifier: {p.cashierId || 'Admin'}</p>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {p.stayDurationIndex !== undefined && p.stayDurationIndex !== null && (
                                      <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[8px] font-black uppercase tracking-wider">
                                        Stay #{Number(p.stayDurationIndex) + 1}
                                      </span>
                                    )}
                                    {Number(p.discount || 0) > 0 && (
                                      <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-[8px] font-black uppercase tracking-wider">
                                        Discount: Rs {Number(p.discount).toLocaleString()}
                                      </span>
                                    )}
                                    {Number(p.returnAmount || p.return || 0) > 0 && (
                                      <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[8px] font-black uppercase tracking-wider">
                                        Returned: Rs {Number(p.returnAmount || p.return).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {p.note && <p className="text-[10px] text-[#1a3a5c] dark:text-blue-400 font-black italic mt-1 truncate max-w-[150px]">&quot;{p.note}&quot;</p>}
                                </td>
                                {session?.role === 'superadmin' && (
                                  <td className="py-5 flex items-center gap-2">
                                    {p.isPendingTransaction && (
                                      <button
                                        onClick={() => handleDirectApprove(p.id)}
                                        disabled={directApproveLoading === p.id}
                                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-black text-xs transition-all active:scale-95"
                                      >
                                        {directApproveLoading === p.id ? '...' : 'Approve ✓'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setDeletingPayment(p);
                                        setShowDeleteModal(true);
                                      }}
                                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                      title="Delete Transaction"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TAB: CANTEEN */}
          <div id="section-canteen" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
              <ShoppingCart className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Canteen Wallet & Transactions</h2>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => changeCanteenMonth(-1)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    <ChevronLeft size={20} className="text-gray-400" />
                  </button>
                  <span className="font-black text-gray-900 dark:text-white text-lg min-w-[160px] text-center">
                    {formatDateDMY(new Date(canteenMonth + '-01'))}
                  </span>
                  <button onClick={() => changeCanteenMonth(1)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>
                </div>
                {!isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
                    <button onClick={() => setCanteenModal('deposit')}
                      className="flex items-center justify-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-green-600 transition shadow-sm active:scale-95">
                      <Plus size={14} /> Deposit
                    </button>
                    <button onClick={() => setCanteenModal('expense')}
                      className="flex items-center justify-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-red-600 transition shadow-sm active:scale-95">
                      <Minus size={14} /> Expense
                    </button>
                  </div>
                )}
              </div>

              {!canteenRecord ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-white/10 p-6 sm:p-8 lg:p-12 rounded-3xl text-center">
                  <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShoppingCart className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 className="text-gray-900 dark:text-white font-bold mb-1">No canteen record for this month</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                    Add a deposit or expense to get started with this month's wallet.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Balance Card */}
                  <div className="text-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-900/30 rounded-[2rem] border border-teal-200/50 dark:border-teal-800/50 shadow-sm">
                    <p className="text-[10px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest mb-1">Available Balance</p>
                    <p className={`text-2xl sm:text-4xl lg:text-5xl font-black ${canteenRecord.balance >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-red-600 dark:text-red-400'}`}>
                      PKR {Number(canteenRecord.balance).toLocaleString('en-PK')}
                    </p>
                    <div className="flex justify-center gap-8 mt-6">
                      <div className="text-left">
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-black uppercase tracking-widest">↑ Deposited</p>
                        <p className="text-sm font-black text-green-700 dark:text-green-300">PKR {Number(canteenRecord.totalDeposited).toLocaleString('en-PK')}</p>
                      </div>
                      <div className="w-px h-8 bg-teal-200/50 dark:bg-teal-800/50"></div>
                      <div className="text-left">
                        <p className="text-[10px] text-red-500 dark:text-red-400 font-black uppercase tracking-widest">↓ Spent</p>
                        <p className="text-sm font-black text-red-600 dark:text-red-400">PKR {Number(canteenRecord.totalSpent).toLocaleString('en-PK')}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/10 pb-2">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">Transaction History</h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{canteenRecord.transactions?.length || 0} Events</span>
                    </div>

                    {!canteenRecord.transactions || canteenRecord.transactions.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-10 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">No transactions recorded.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {canteenRecord.transactions
                          ?.sort((a: any, b: any) => {
                            const aT = a.date?.toDate?.()?.getTime() || 0;
                            const bT = b.date?.toDate?.()?.getTime() || 0;
                            return bT - aT;
                          })
                          .map((t: any) => (
                            <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl border-l-4 transition-all hover:translate-x-1 ${t.type === 'deposit'
                              ? 'bg-green-50/50 dark:bg-green-900/10 border-l-green-400'
                              : 'bg-red-50/50 dark:bg-red-900/10 border-l-red-400'
                              }`}>
                              <div>
                                <p className="text-sm font-black text-gray-900 dark:text-white">{t.description}</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">
                                  {formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}
                                  <span className="mx-2">•</span>
                                  Verifier: {t.cashierId}
                                </p>
                              </div>
                              <p className={`font-black text-base ${t.type === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {t.type === 'deposit' ? '+' : '-'} {Number(t.amount).toLocaleString('en-PK')}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TAB: VIDEOS */}
          <div id="section-videos" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-5 sm:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <Video className="w-6 h-6 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Files & Media Progress</h2>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>

            <div className="space-y-6">
              {videos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                  <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No files uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map(vid => {
                    const isVideo = vid.fileType?.startsWith('video/') || vid.url?.includes('.mp4');
                    const isImage = vid.fileType?.startsWith('image/');
                    const isPdf = vid.fileType === 'application/pdf';
                    const vidState = videoStates[vid.id]?.status || 'normal';
                    const timeLeft = videoStates[vid.id]?.timeLeft || 0;

                    if (vidState === 'deleting') {
                      return (
                        <div key={vid.id} className="border border-red-200 rounded-2xl overflow-hidden bg-red-50/10 p-6 flex flex-col items-center justify-center min-h-[220px] text-center w-full animate-in fade-in duration-300 relative">
                          <div className="w-10 h-10 rounded-full border-4 border-rose-500 border-t-transparent animate-spin mb-3"></div>
                          <p className="text-xs font-black uppercase tracking-wider text-rose-700">Deleting File...</p>
                          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">Permanently in {timeLeft}s</p>
                          <button
                            onClick={() => {
                              const state = videoStates[vid.id];
                              if (state) {
                                if (state.intervalId) clearInterval(state.intervalId);
                                if (state.timeoutId) clearTimeout(state.timeoutId);
                              }
                              setVideoStates(prev => ({
                                ...prev,
                                [vid.id]: { status: 'normal', timeLeft: 0 }
                              }));
                              toast.success("Deletion cancelled");
                            }}
                            className="mt-4 bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 z-20"
                          >
                            Undo Delete
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={vid.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 group hover:border-teal-300 transition-colors shadow-sm relative">
                        {vidState === 'confirm' ? (
                          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in duration-300">
                            <p className="text-white text-xs font-black uppercase tracking-widest mb-4 leading-relaxed">
                              Are you sure you want to delete this file?
                            </p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  let currentSeconds = 6;
                                  const intervalId = setInterval(() => {
                                    currentSeconds -= 1;
                                    setVideoStates(prev => {
                                      if (!prev[vid.id] || prev[vid.id].status !== 'deleting') {
                                        clearInterval(intervalId);
                                        return prev;
                                      }
                                      return {
                                        ...prev,
                                        [vid.id]: { ...prev[vid.id], timeLeft: currentSeconds }
                                      };
                                    });
                                  }, 1000);

                                  const timeoutId = setTimeout(async () => {
                                    clearInterval(intervalId);
                                    try {
                                      await handleDeleteVideo(vid.id);
                                      setVideoStates(prev => {
                                        const copy = { ...prev };
                                        delete copy[vid.id];
                                        return copy;
                                      });
                                    } catch (error) {
                                      console.error("Delete error", error);
                                      setVideoStates(prev => ({
                                        ...prev,
                                        [vid.id]: { status: 'normal', timeLeft: 0 }
                                      }));
                                    }
                                  }, 6000);

                                  setVideoStates(prev => ({
                                    ...prev,
                                    [vid.id]: {
                                      status: 'deleting',
                                      timeLeft: currentSeconds,
                                      intervalId,
                                      timeoutId
                                    }
                                  }));
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md"
                              >
                                Yes, Delete
                              </button>
                              <button 
                                onClick={() => {
                                  setVideoStates(prev => ({ ...prev, [vid.id]: { status: 'normal', timeLeft: 0 } }));
                                }}
                                className="bg-gray-200 hover:bg-gray-300 text-black font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {session?.role === 'superadmin' && vidState === 'normal' && (
                          <button
                            onClick={() => {
                              setVideoStates(prev => ({ ...prev, [vid.id]: { status: 'confirm', timeLeft: 0 } }));
                            }}
                            className="absolute top-2 right-2 z-20 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                          {isImage ? (
                            <img src={vid.url} alt={vid.title} className="w-full h-full object-cover opacity-80" />
                          ) : isPdf ? (
                            <FileText className="w-10 h-10 text-gray-600 z-0" />
                          ) : (
                            <Video className="w-10 h-10 text-gray-600 z-0" />
                          )}

                          <a href={vid.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-teal-600 transform scale-90 group-hover:scale-100 transition-transform">
                              <Play className="w-5 h-5 ml-1" />
                            </div>
                          </a>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 dark:text-white truncate mb-1" title={vid.title}>{vid.title || 'Untitled'}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">
                              {formatDateDMY(vid.createdAt)}
                            </p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isVideo ? 'bg-purple-50 text-purple-600' : isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                              {isVideo ? 'Video' : isPdf ? 'Document' : 'Image'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2 truncate">Uploaded by staff ({vid.uploadedBy})</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* TAB: VISITS */}
          <div id="section-visits" className="scroll-mt-24 bg-white backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-gray-100 w-full p-5 sm:p-8 flex flex-col gap-6 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-gray-100 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Family Visit Log</h2>
              </div>
              <button
                onClick={() => setShowAddVisitModal(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 w-full sm:w-auto"
              >
                <Plus size={16} /> Log New Visit
              </button>
            </div>

            <div className="space-y-6">
              {filteredVisits.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-[2rem] bg-gray-50/30">
                  <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No visits recorded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredVisits.map(visit => (
                    <div key={visit.id} className="bg-white dark:bg-gray-850 border border-gray-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:border-teal-100 dark:hover:border-teal-900 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                        <div className="bg-gray-900 dark:bg-gray-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg shadow-gray-200/10 flex flex-col items-center leading-tight">
                          <span>{formatDateDMY(visit.date?.toDate?.() ? visit.date.toDate() : visit.date)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="space-y-1 pr-16">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-gray-900 dark:text-white text-xl tracking-tight">{visit.visitorName}</h4>
                            <span className="text-[10px] font-black bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-full uppercase tracking-widest shadow-inner">{visit.relation}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5"><Phone size={14} className="text-teal-500" /> {visit.phone}</span>
                            {visit.cnic && <span className="flex items-center gap-1.5"><Shield size={14} className="text-blue-500" /> {visit.cnic}</span>}
                          </div>
                        </div>

                        {visit.notes && (
                          <div className="bg-gray-50/80 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100/50 dark:border-white/5 italic text-sm text-gray-600 dark:text-gray-300 relative">
                            <div className="absolute -top-2 left-6 bg-white dark:bg-gray-900 px-2 text-[10px] font-black text-gray-300 dark:text-gray-500 uppercase tracking-widest">Observation Notes</div>
                            "{visit.notes}"
                          </div>
                        )}

                        <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logged by Admin: {visit.loggedBy}</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditVisit(visit)}
                              className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950 px-3 py-2 rounded-xl transition"
                            >
                              Edit
                            </button>
                            <User size={14} className="text-gray-200 dark:text-gray-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-600" />
                Upload File
              </h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white"
                  placeholder="e.g. Weekly Progress Video"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
                <input
                  type="file"
                  accept="video/*,image/webp,.pdf"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type.startsWith('image/') && file.type !== 'image/webp') {
                      toast.error('Only WebP images are allowed');
                      return;
                    }
                    setSelectedFile(file);
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">Supported: Images, Videos, PDFs.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Initialize Fee Modal */}
      {showAddFeeModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Initialize Fee</h2>
              <button onClick={() => setShowAddFeeModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInitializeFee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Package Amount (PKR) *</label>
                <input required type="number" value={packageAmt} onChange={e => setPackageAmt(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. 50000" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Initial Payment</label>
                  <input type="number" value={initialPayment} onChange={e => setInitialPayment(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <BrutalistCalendar
                    label="Payment Date"
                    value={paymentDate}
                    onChange={setPaymentDate}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Note (Optional)</label>
                <input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Received by hand" />
              </div>
              <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-100">
                <Plus size={18} /> Create Fee Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Add Payment</h2>
              <button onClick={() => setShowAddPaymentModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Amount (PKR) *</label>
                  <input required type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Amount" />
                </div>
                <div className="space-y-1.5">
                  <BrutalistCalendar
                    label="Payment Date *"
                    value={payDate}
                    onChange={setPayDate}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Note (Optional)</label>
                <input value={payNote} onChange={e => setPayNote(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Received via bank" />
              </div>
              <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-100">
                <Plus size={18} /> Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Canteen Entry Modal */}
      {canteenModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">
                {canteenModal === 'deposit' ? 'Add Deposit' : 'Add Expense'}
              </h2>
              <button onClick={() => setCanteenModal(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCanteenEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Amount (PKR) *</label>
                <input required type="number" value={canteenAmt} onChange={e => setCanteenAmt(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Amount" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Description *</label>
                <input
                  required
                  value={canteenDesc}
                  onChange={e => setCanteenDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder={canteenModal === 'deposit' ? 'e.g. Cash deposit by family' : 'e.g. Snacks and drinks'}
                />
              </div>
              <div className="space-y-1.5">
                <BrutalistCalendar
                  label="Transaction Date *"
                  value={canteenDate}
                  onChange={setCanteenDate}
                />
              </div>
              <button
                type="submit"
                className={`w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg ${canteenModal === 'deposit' ? 'bg-green-500 hover:bg-green-600 shadow-green-100' : 'bg-red-500 hover:bg-red-600 shadow-red-100'
                  }`}
              >
                {canteenModal === 'deposit' ? <Plus size={18} /> : <Minus size={18} />}
                Record {canteenModal === 'deposit' ? 'Deposit' : 'Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Visit Modal */}
      {showAddVisitModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-teal-600" /> Log Family Visit
              </h2>
              <button onClick={() => setShowAddVisitModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddVisit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Visitor Name *</label>
                  <input required value={vName} onChange={e => setVName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Full Name" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Relation *</label>
                  <input required value={vRelation} onChange={e => setVRelation(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Father" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone *</label>
                  <input required value={vPhone} onChange={e => setVPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="+92..." />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">CNIC (Optional)</label>
                  <input value={vCnic} onChange={e => setVCnic(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="XXXXX-XXXXXXX-X" />
                </div>
              </div>
              <div className="space-y-1.5">
                <BrutalistCalendar
                  label="Visit Date *"
                  value={vDate}
                  onChange={setVDate}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea rows={2} value={vNotes} onChange={e => setVNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="What was discussed? items brought?"></textarea>
              </div>
              <button type="submit" disabled={isSavingVisit} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-100 disabled:opacity-70">
                {isSavingVisit ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {isSavingVisit ? 'Saving...' : 'Log Visit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Visit Modal */}
      {editVisitModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-teal-600" /> Edit Visit
              </h2>
              <button onClick={() => setEditVisitModal(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateVisit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Visitor Name *</label>
                  <input required value={vName} onChange={e => setVName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Full Name" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Relation *</label>
                  <input required value={vRelation} onChange={e => setVRelation(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Father" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone *</label>
                  <input required value={vPhone} onChange={e => setVPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="+92..." />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">CNIC (Optional)</label>
                  <input value={vCnic} onChange={e => setVCnic(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="XXXXX-XXXXXXX-X" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Visit Date *</label>
                <input required type="text"
                  placeholder="DD MM YYYY"
                  value={formatDateDMY(vDate)}
                  onChange={e => setVDate(e.target.value)}
                  onBlur={e => {
                    const parsed = parseDateDMY(e.target.value);
                    if (parsed) setVDate(parsed.toISOString().split('T')[0]);
                  }}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea rows={2} value={vNotes} onChange={e => setVNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="What was discussed? items brought?"></textarea>
              </div>
              <button type="submit" disabled={isUpdatingVisit} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-100 disabled:opacity-70">
                {isUpdatingVisit ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {isUpdatingVisit ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Transaction Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-8 sm:pt-16 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Transaction
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason('');
                  setDeletingPayment(null);
                }}
                className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-6">
                <p className="text-xs font-bold text-rose-700 mb-1 uppercase tracking-widest">Warning</p>
                <p className="text-sm text-rose-600">
                  You are about to delete a transaction of <span className="font-black">PKR {Number(deletingPayment?.amount).toLocaleString()}</span>.
                  This will update the patient's balance and cannot be undone.
                </p>
              </div>

              <form onSubmit={handleDeletePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Reason for Deletion *</label>
                  <textarea
                    required
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                    placeholder="e.g. Duplicate entry, Wrong amount entered..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingTransaction}
                    className="flex-2 bg-rose-500 hover:bg-rose-600 text-white font-black py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-rose-100 disabled:opacity-50"
                  >
                    {isDeletingTransaction ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 size={18} />}
                    Confirm Delete
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Discharge Patient</h2>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Final Settlement & Checkout</p>
                </div>
                <button onClick={() => setShowDischargeModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDischargeSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Discharge Date</label>
                    <input
                      type="date"
                      value={dDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDDate(val);
                        setDDateInput(formatDateDMY(val));
                      }}
                      required
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Settlement Amount (₨)</label>
                    <input
                      type="number"
                      value={dAmount}
                      onChange={(e) => setDAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all"
                    />
                  </div>
                </div>

                {/* Calculation Box */}
                <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100/50 space-y-2">
                  {(() => {
                    const parsed = parseDateDMY(dDateInput) || new Date(dDate);
                    const dDateObj = isNaN(parsed.getTime()) ? new Date() : parsed;
                    const admDateObj = patient.admissionDate?.toDate?.() ? patient.admissionDate.toDate() : new Date(patient.admissionDate);
                    const diff = dDateObj.getTime() - admDateObj.getTime();
                    const days = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
                    const due = days * (patient.dailyRate || 0);
                    const remainingBefore = due - (patient.overallReceived || 0);
                    const remainingAfter = remainingBefore - (Number(dAmount) || 0);

                    return (
                      <>
                        <div className="flex justify-between text-[10px] font-bold text-teal-700/60 uppercase tracking-wider">
                          <span>Total Stay:</span>
                          <span className="font-black text-teal-700">{days} Days</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-teal-700/60 uppercase tracking-wider">
                          <span>Dues till {dDate}:</span>
                          <span className="font-black text-teal-700">₨{due.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-teal-700/60 uppercase tracking-wider pt-2 border-t border-teal-100">
                          <span>Remaining Balance:</span>
                          <span className={`font-black ${remainingBefore > 0 ? 'text-red-600' : 'text-green-600'}`}>₨{remainingBefore.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-teal-900 pt-1">
                          <span>Balance After Payment:</span>
                          <span className={remainingAfter > 0 ? 'text-red-600' : 'text-green-600'}>₨{remainingAfter.toLocaleString()}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Notes / Reason</label>
                  <textarea
                    value={dNote}
                    onChange={(e) => setDNote(e.target.value)}
                    placeholder="E.g. Full recovery, Discharged on request..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all min-h-[80px] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDischargeModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDischarging}
                    className="flex-[2] bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20"
                  >
                    {isDischarging ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Final Discharge
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Premium Profile Deletion Confirmation Modal */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-red-600 dark:text-red-400 uppercase tracking-tight flex items-center gap-2">
                    <Shield className="w-6 h-6" />
                    Confirm Deletion
                  </h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">This action cannot be undone</p>
                </div>
                <button onClick={() => setShowDeleteProfileModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 text-xs font-bold text-red-700 dark:text-red-400 space-y-2">
                  <p>Warning: This will permanently cascade delete the patient profile and all linked records across 12 database collections, including:</p>
                  <ul className="list-disc pl-5 space-y-1 lowercase font-mono">
                    <li>financial/fee records</li>
                    <li>canteen records</li>
                    <li>uploaded files/videos</li>
                    <li>visits & attendance logs</li>
                    <li>therapy sessions</li>
                    <li>medication records</li>
                    <li>daily sheets & weekly progress logs</li>
                    <li>user accounts</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                    Type <span className="text-red-600 dark:text-red-400 font-black">"{patient?.name}"</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteProfileConfirmName}
                    onChange={(e) => setDeleteProfileConfirmName(e.target.value)}
                    placeholder="Enter patient's full name"
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-red-500 dark:focus:border-red-500 transition-all text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteProfileModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProfile}
                    disabled={isDeletingProfile || deleteProfileConfirmName.trim() !== patient?.name?.trim()}
                    className="flex-[2] bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-95"
                  >
                    {isDeletingProfile ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Rejoin Duplicate Check Modal */}
      {showRejoinCheckModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-teal-600 dark:text-teal-400 uppercase tracking-tight flex items-center gap-2">
                    <Shield className="w-6 h-6 animate-pulse text-amber-500" />
                    Duplicate Detected
                  </h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
                    Verify before rejoining to avoid duplicate active profiles
                  </p>
                </div>
                <button
                  onClick={() => setShowRejoinCheckModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 text-xs font-bold text-amber-700 dark:text-amber-400 space-y-2">
                  <p>Warning: We detected {matchingPatients.length} existing profile(s) with the exact same name <span className="font-mono text-sm underline text-red-600 dark:text-red-400">"{patient?.name}"</span> in the system. Please verify if you already have an active profile for this patient:</p>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {matchingPatients.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-teal-500/30 transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-800 dark:text-white uppercase">
                            {p.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${p.isActive
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                            }`}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide">
                          <div>Patient ID: <span className="font-mono text-gray-700 dark:text-gray-300 normal-case">{p.patientId || 'None'}</span></div>
                          <div>Serial No: <span className="font-mono text-gray-700 dark:text-gray-300 normal-case">{p.serialNumber || 'None'}</span></div>
                          <div className="col-span-2">Admitted: <span className="font-mono text-gray-700 dark:text-gray-300 normal-case">{formatDateDMY(p.admissionDate?.toDate?.() || p.admissionDate)}</span></div>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                          href={`/departments/rehab/dashboard/admin/patients/${p.id}`}
                          target="_blank"
                          className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-400 dark:text-gray-500 font-black text-[9px] uppercase tracking-widest border border-gray-100 dark:border-white/5 rounded-xl transition-all text-center flex items-center justify-center"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => executeRejoin(p.id)}
                          disabled={deactivating}
                          className="flex-1 sm:flex-none px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/20 active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} />
                          Rejoin This
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRejoinCheckModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejoinCheckModal(false);
                      setShowRejoinDetailsModal(true);
                    }}
                    disabled={deactivating}
                    className="flex-[2] bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20 active:scale-95"
                  >
                    {deactivating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Rejoin Current
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Premium Rejoin Details Modal */}
      {/* Premium Rejoin Details Modal */}
      {showRejoinDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-gradient-to-br from-white to-[#FAF8F5] rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl border border-orange-100/60">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-teal-600 uppercase tracking-tight flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Patient Rejoin Details & Stay Setup
                  </h2>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Setup the new stay parameters and log the initial family visit</p>
                </div>
                <button onClick={() => setShowRejoinDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Stay & Financial Details */}
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs font-bold text-amber-700">
                    <p className="uppercase tracking-widest text-[9px] mb-1 opacity-70">Previous Stay Summary</p>
                    <p>Last Duration: <span className="font-black">{patient?.durationFormatted || `${patient?.daysAdmitted || 0} Days`}</span></p>
                    <p>Last Active Package: <span className="font-black">PKR {(patient?.monthlyPackage || patient?.packageAmount || 0).toLocaleString()} / Month</span></p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-500" />
                      Admission Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={rejoinForm.admissionDate}
                      onChange={(e) => setRejoinForm({ ...rejoinForm, admissionDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" />
                      Discharge Date <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={rejoinForm.dischargeDate}
                      onChange={(e) => setRejoinForm({ ...rejoinForm, dischargeDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-teal-500" />
                      Decided Monthly Package Fee (PKR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs uppercase tracking-widest">PKR</span>
                      <input
                        type="number"
                        required
                        value={rejoinForm.totalFee}
                        onChange={(e) => setRejoinForm({ ...rejoinForm, totalFee: e.target.value })}
                        placeholder="0"
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-500" />
                      Stay Duration <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={rejoinForm.duration}
                      onChange={(e) => setRejoinForm({ ...rejoinForm, duration: e.target.value })}
                      placeholder="E.g. 3 Months"
                      className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                    />
                  </div>
                </div>

                {/* Column 2: Family Visit Information */}
                <div className="space-y-4">
                  <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-xs font-bold text-teal-700">
                    <p className="uppercase tracking-widest text-[9px] mb-1 opacity-70">Readmission Family Visit Log</p>
                    <p>Enter guardian/visitor details to automatically log their stay-opening visit record.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1">Visitor Name</label>
                      <input
                        type="text"
                        value={rejoinForm.visitorName}
                        onChange={(e) => setRejoinForm({ ...rejoinForm, visitorName: e.target.value })}
                        placeholder="E.g. Muhammad Ahmad"
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1">Relation</label>
                      <input
                        type="text"
                        value={rejoinForm.visitorRelation}
                        onChange={(e) => setRejoinForm({ ...rejoinForm, visitorRelation: e.target.value })}
                        placeholder="E.g. Father"
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1">Phone Number</label>
                      <input
                        type="text"
                        value={rejoinForm.visitorPhone}
                        onChange={(e) => setRejoinForm({ ...rejoinForm, visitorPhone: e.target.value })}
                        placeholder="03001234567"
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1">CNIC (Optional)</label>
                      <input
                        type="text"
                        value={rejoinForm.visitorCnic}
                        onChange={(e) => setRejoinForm({ ...rejoinForm, visitorCnic: e.target.value })}
                        placeholder="35201-XXXXXXX-X"
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1">Visit Date</label>
                    <input
                      type="date"
                      value={rejoinForm.visitDate}
                      onChange={(e) => setRejoinForm({ ...rejoinForm, visitDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-450 ml-1">Visit Notes / Family Policy</label>
                    <textarea
                      value={rejoinForm.visitorNotes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRejoinForm(prev => ({ ...prev, visitorNotes: val, familyVisit: val }));
                      }}
                      placeholder="Details about family visit policy, agreement or history during this stay..."
                      className="w-full bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all min-h-[90px] resize-none text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-100 mt-6 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRejoinDetailsModal(false)}
                  className="px-6 py-4 rounded-2xl border border-gray-150 text-gray-450 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeRejoin(undefined, rejoinForm)}
                  disabled={deactivating || !rejoinForm.admissionDate || !rejoinForm.totalFee || (!!(rejoinForm.visitorName || rejoinForm.visitorRelation || rejoinForm.visitorPhone) && (!rejoinForm.visitorName || !rejoinForm.visitorRelation || !rejoinForm.visitorPhone))}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-teal-900/20 active:scale-95"
                >
                  {deactivating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Confirm Rejoin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingStayIdx !== null && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-md p-4 pt-8 sm:pt-16 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-white/5 rounded-[2rem] w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all scale-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-teal-600" />
                  {editingStayIdx === -1 ? 'Edit Current Stay' : 'Edit Historical Stay'}
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {editingStayIdx === -1 ? 'Modify current admission & package parameters' : 'Modify historical record details'}
                </p>
              </div>
              <button
                onClick={() => setEditingStayIdx(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Admission Date *</label>
                  <input
                    type="date"
                    required
                    value={stayForm.admissionDate}
                    onChange={(e) => setStayForm({ ...stayForm, admissionDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Discharge Date</label>
                  <input
                    type="date"
                    value={stayForm.dischargeDate}
                    onChange={(e) => setStayForm({ ...stayForm, dischargeDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Monthly Stay Package (PKR) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">PKR</span>
                  <input
                    type="number"
                    required
                    value={stayForm.monthlyPackage}
                    onChange={(e) => setStayForm({ ...stayForm, monthlyPackage: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm font-black outline-none focus:border-teal-500 transition-all text-teal-600 dark:text-teal-400"
                  />
                </div>
              </div>

              {editingStayIdx !== -1 && (
                <>
                  <div className="border-t border-gray-100 dark:border-white/5 pt-6 space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Readmission Details</h4>

                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Rejoin Date *</label>
                      <input
                        type="date"
                        required
                        value={stayForm.rejoinedAt}
                        onChange={(e) => setStayForm({ ...stayForm, rejoinedAt: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Visitor / Guardian Name</label>
                        <input
                          type="text"
                          value={stayForm.visitorName}
                          onChange={(e) => setStayForm({ ...stayForm, visitorName: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Relation with Patient</label>
                        <input
                          type="text"
                          value={stayForm.visitorRelation}
                          onChange={(e) => setStayForm({ ...stayForm, visitorRelation: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Visitor Phone</label>
                        <input
                          type="tel"
                          value={stayForm.visitorPhone}
                          onChange={(e) => setStayForm({ ...stayForm, visitorPhone: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Visitor CNIC</label>
                        <input
                          type="text"
                          value={stayForm.visitorCnic}
                          onChange={(e) => setStayForm({ ...stayForm, visitorCnic: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5 tracking-wider">Admission / Visitor Notes</label>
                      <textarea
                        value={stayForm.visitorNotes}
                        onChange={(e) => setStayForm({ ...stayForm, visitorNotes: e.target.value })}
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-gray-800 dark:text-white resize-none"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingStayIdx(null)}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStay}
                disabled={savingStay || !stayForm.admissionDate}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-teal-500/10 active:scale-95"
              >
                {savingStay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          patient={patient}
          allPayments={allPayments}
          onClose={() => setShowReportModal(false)}
        />
      )}

    </div>

  );
}

const ReportModal = ({ patient, allPayments, onClose }: { patient: any, allPayments: any[], onClose: () => void }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [reportData, setReportData] = useState({
    name: patient.name,
    patientId: patient.patientId || 'None',
    stayDuration: patient.durationFormatted || formatStayDuration(patient.daysAdmitted || 0),
    admissionDate: formatDateDMY(patient.admissionDate?.toDate?.() || patient.admissionDate),
    dischargeDate: patient.dischargeDate ? formatDateDMY(patient.dischargeDate?.toDate?.() || patient.dischargeDate) : '',
    status: patient.isActive === false ? 'discharged' : 'active',
    fatherName: patient.fatherName || '',
    guardianName: patient.guardianName 
      ? (patient.guardianRelation || patient.guardianRelationship 
        ? `${patient.guardianName} (${patient.guardianRelation || patient.guardianRelationship})` 
        : patient.guardianName)
      : '',
    contactNumber: patient.contactNumber || '',
    address: patient.address || '',
    monthlyPackage: Number(patient.monthlyPackage || patient.packageAmount || 0),
    billableMonths: patient.billableMonths || 1,
    medicineCharges: patient.medicineCharges || 0,
    totalDue: patient.dueTillDate || 0,
    receivedAmount: patient.overallReceived || 0,
    remainingAmount: patient.overallRemaining || 0,
    transactions: allPayments
      .filter(p => p.status === 'approved')
      .sort((a, b) => {
        const dateA = a.date instanceof Object ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Object ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      })
  });

  const downloadReport = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      await downloadElementAsPng(reportRef.current, `Report-${reportData.name}-${new Date().toLocaleDateString()}.png`, {
        scale: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node.classList && (node.classList.contains('no-print') || node.classList.contains('no-download'))) {
            return false;
          }
          return true;
        }
      });
    } catch (err) {
      console.error('Download failed', err);
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-md p-4 pt-8 sm:pt-16 overflow-y-auto report-modal-root">
      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          
          /* Isolation: Hide only known UI elements instead of hiding everything via body > * */
          .no-print, 
          button, 
          .close-button, 
          header, 
          nav,
          .fixed.inset-0:not(.report-modal-root) {
            display: none !important;
          }

          /* Reset root layout for print */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
          }

          /* Ensure the root containers are visible */
          .patient-detail-root {
            display: block !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          /* Hide everything inside patient-detail-root EXCEPT our modal */
          .patient-detail-root > *:not(.report-modal-root) {
            display: none !important;
          }

          /* Force the modal into a standard block flow instead of fixed/absolute */
          .report-modal-root {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .modal-box-container {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .report-scroll-wrapper {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .printable-report {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 297mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 1cm !important;
            border: none !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* EXTREME CLARITY: Force all text to DEEP BLACK */
          .printable-report * {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            border-color: #000000 !important;
            background-color: transparent !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }

          /* Reset input styles for print */
          input, textarea {
            border-bottom: 1px solid #000 !important;
            padding: 2px 0 !important;
          }

          /* Ensure table borders are thick and black */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 1.5pt solid black !important;
          }
          th, td {
            border: 1pt solid black !important;
            padding: 6pt 8pt !important;
            color: black !important;
          }
          thead {
            display: table-header-group !important;
          }

          /* Maintain section backgrounds but in LIGHT GRAYSCALE for readability */
          .bg-blue-50\/50, .bg-teal-50\/50, .bg-rose-50\/60, .bg-emerald-50\/60, .bg-gray-50, .bg-gray-50\/50 {
            background-color: #f0f0f0 !important;
            border: 1pt solid black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Force specific headings that might be colored */
          .text-teal-600, .text-blue-600, .text-rose-600, .text-emerald-700 {
            color: #000000 !important;
          }

          /* Page break handling */
          .grid, tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .hide-if-zero-print[data-value="0"] {
            display: none !important;
          }
        }
      `}</style>
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/20 modal-box-container">
        <div className="p-8 border-b dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 no-print">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Report Preview</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Review and Edit Before Downloading</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-200 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 bg-slate-100 dark:bg-black/20 md:flex md:justify-center report-scroll-wrapper">
          <div ref={reportRef} className="printable-report bg-white shadow-2xl rounded-[1.5rem] p-10 w-[794px] min-w-[794px] text-gray-900 font-sans min-h-[1123px] flex flex-col justify-between border border-gray-100">
            <div>
              {/* Report Header */}
              <div className="flex justify-between items-start border-b-4 border-gray-900 pb-5 mb-6">
              <div className="space-y-1">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Financial</h1>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-teal-600 leading-none">Statement</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-4">Khan Hub Rehabilitation Center</p>
              </div>
              <div className="text-right">
                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg inline-block font-black text-xs uppercase tracking-widest">
                  Official Report
                </div>
                <p className="text-xs font-bold text-gray-500 mt-4 uppercase">Date: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

              {/* Patient Details Section */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 border-b border-teal-100 pb-2 flex items-center gap-2">
                    <User className="w-3 h-3" /> Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Full Name</label>
                      <input
                        className="text-lg font-black w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1"
                        value={reportData.name}
                        onChange={e => setReportData({ ...reportData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Patient ID</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1 text-gray-800"
                        value={reportData.patientId}
                        onChange={e => setReportData({ ...reportData, patientId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Father's Name</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1"
                        value={reportData.fatherName}
                        onChange={e => setReportData({ ...reportData, fatherName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Address</label>
                      <textarea
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1 resize-none"
                        rows={2}
                        value={reportData.address}
                        onChange={e => setReportData({ ...reportData, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 border-b border-teal-100 pb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Stay & Contact Info
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Admission Date</label>
                        <input
                          className="text-sm font-bold w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1"
                          value={reportData.admissionDate}
                          onChange={e => setReportData({ ...reportData, admissionDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Status</label>
                        <div className="flex items-center mt-1">
                          <span className={`text-[9px] px-2.5 py-0.5 font-black rounded-full uppercase tracking-wider border ${reportData.status === 'discharged' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                            {reportData.status}
                          </span>
                        </div>
                        {reportData.status === 'discharged' && (
                          <div className="mt-2">
                            <label className="text-[9px] font-black uppercase text-rose-500 block mb-1">Discharge Date</label>
                            <input
                              className="text-sm font-black w-full border-b border-rose-200 text-rose-700 focus:border-rose-500 outline-none transition-colors py-1"
                              value={reportData.dischargeDate}
                              onChange={e => setReportData({ ...reportData, dischargeDate: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Stay Duration</label>
                      <input
                        className="text-sm font-black w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1 text-teal-600"
                        value={reportData.stayDuration}
                        onChange={e => setReportData({ ...reportData, stayDuration: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Guardian Name</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1"
                        value={reportData.guardianName}
                        onChange={e => setReportData({ ...reportData, guardianName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Guardian Contact</label>
                      <input
                        className="text-sm font-bold w-full border-b border-gray-200 focus:border-teal-500 outline-none transition-colors py-1"
                        value={reportData.contactNumber}
                        onChange={e => setReportData({ ...reportData, contactNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown - Inputs Section */}
              <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 border-b border-teal-100 pb-2 mb-5 flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  Financial Parameter Configuration
                </h3>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="relative pr-4">
                    <label className="text-[9px] font-black uppercase text-gray-500 block mb-1.5">Base Monthly Package</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">PKR</span>
                      <input
                        type="number"
                        className="text-xl font-black w-full bg-transparent border-b-2 border-gray-200 focus:border-teal-500 outline-none py-1"
                        value={reportData.monthlyPackage}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setReportData(prev => {
                            const newTotal = (val * prev.billableMonths) + Number(prev.medicineCharges);
                            return {
                              ...prev,
                              monthlyPackage: val,
                              totalDue: newTotal,
                              remainingAmount: newTotal - prev.receivedAmount
                            };
                          });
                        }}
                      />
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gray-200/60"></div>
                  </div>

                  <div className="relative px-4 text-center">
                    <label className="text-[9px] font-black uppercase text-gray-500 block mb-1.5">Billable Months</label>
                    <input
                      type="number"
                      className="text-xl font-black w-24 bg-transparent border-b-2 border-gray-200 focus:border-teal-500 outline-none py-1 text-center mx-auto"
                      value={reportData.billableMonths}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setReportData(prev => {
                          const newTotal = (prev.monthlyPackage * val) + Number(prev.medicineCharges);
                          return {
                            ...prev,
                            billableMonths: val,
                            totalDue: newTotal,
                            remainingAmount: newTotal - prev.receivedAmount
                          };
                        });
                      }}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gray-200/60"></div>
                  </div>

                  <div className={`pl-4 hide-if-zero-print`} data-value={reportData.medicineCharges}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[9px] font-black uppercase text-amber-600 flex items-center gap-1">
                        <span>💊</span> Medicine / Extra Treatment
                      </label>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReportData(prev => {
                            const pkg = Number(prev.monthlyPackage || 0);
                            const months = Number(prev.billableMonths || 0);
                            const received = Number(prev.receivedAmount || 0);
                            const newTotal = pkg * months;
                            return {
                              ...prev,
                              medicineCharges: 0,
                              totalDue: newTotal,
                              remainingAmount: newTotal - received
                            };
                          });
                        }}
                        className="p-1 hover:bg-amber-100 rounded text-amber-600 transition-all no-print flex items-center justify-center z-50 cursor-pointer"
                        title="Remove Medicine Charges"
                      >
                        <X className="w-3 h-3 pointer-events-none" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">PKR</span>
                      <input
                        type="number"
                        className="text-xl font-black w-full bg-transparent border-b-2 border-amber-200 focus:border-amber-500 text-amber-700 outline-none py-1"
                        value={reportData.medicineCharges}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setReportData(prev => {
                            const newTotal = (Number(prev.monthlyPackage) * Number(prev.billableMonths)) + val;
                            return {
                              ...prev,
                              medicineCharges: val,
                              totalDue: newTotal,
                              remainingAmount: newTotal - Number(prev.receivedAmount)
                            };
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Summary Statistics Box Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-5 bg-blue-50/50 border-2 border-blue-100/50 rounded-[1.5rem] flex flex-col">
                  <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-1">Total Computed Due</span>
                  <span className="text-[8px] text-blue-400 mb-2 uppercase tracking-wider">(Package × Months) + Extra</span>
                  <span className="text-xl lg:text-2xl font-black text-blue-950 tracking-tight mt-auto">PKR {reportData.totalDue.toLocaleString()}</span>
                </div>

                <div className="p-5 bg-teal-50/50 border-2 border-teal-100/50 rounded-[1.5rem] flex flex-col">
                  <span className="text-[9px] font-black uppercase text-teal-600 tracking-widest mb-1">Consolidated Received</span>
                  <span className="text-[8px] text-teal-400 mb-2 uppercase tracking-wider">All Approved Ledger Payments</span>
                  <span className="text-xl lg:text-2xl font-black text-teal-950 tracking-tight mt-auto">PKR {reportData.receivedAmount.toLocaleString()}</span>
                </div>

                <div className={`p-5 border-2 rounded-[1.5rem] flex flex-col ${reportData.remainingAmount > 0 ? 'bg-rose-50/60 border-rose-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${reportData.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {reportData.remainingAmount >= 0 ? 'Net Remaining Balance' : 'Surplus Credit Balance'}
                  </span>
                  <span className={`text-[8px] mb-2 uppercase tracking-wider ${reportData.remainingAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Total Due − Total Received
                  </span>
                  <span className={`text-xl lg:text-2xl font-black tracking-tight mt-auto ${reportData.remainingAmount > 0 ? 'text-rose-950' : 'text-emerald-950'}`}>
                    PKR {Math.abs(reportData.remainingAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Transaction Log Table */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 border-b-2 border-gray-100 pb-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Payment Transaction Log</h3>
                <div className="text-[9px] font-black text-gray-400 uppercase">{reportData.transactions.length} Entries</div>
              </div>
              <div className="overflow-x-auto w-full no-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="text-gray-400 uppercase text-[9px] font-black tracking-widest border-b border-gray-100">
                      <th className="py-4 px-2">Date</th>
                      <th className="py-4 px-2">Description / Note</th>
                      <th className="py-4 px-2 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reportData.transactions.map((p, idx) => (
                      <tr key={idx} className="font-bold text-gray-700 hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 px-2 whitespace-nowrap text-xs">{formatDateDMY(p.date)}</td>
                        <td className="py-2.5 px-2 text-[11px] text-gray-500 uppercase tracking-tight">{p.note || 'Monthly Fee Payment'}</td>
                        <td className="py-2.5 px-2 text-right text-teal-600 font-black tracking-tighter">PKR {Number(p.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                    {reportData.transactions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-16 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest italic">No payment records found</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-4 border-gray-900 font-black text-gray-900">
                      <td colSpan={2} className="py-4 px-2 uppercase tracking-[0.2em] text-[10px]">Total Consolidated Received</td>
                      <td className="py-4 px-2 text-right text-xl tracking-tighter">PKR {reportData.receivedAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </div>
            </div>

            {/* Signature & Footer */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-900 uppercase">Khan Hub</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Rehabilitation & Recovery Center</p>
                </div>
                <div className="w-48 border-b-2 border-gray-200 pb-2 text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.4em]">This statement is for informational purposes only</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t dark:border-white/5 bg-white dark:bg-gray-900 flex justify-end gap-4 no-print">
          <button onClick={onClose} className="px-8 py-4 rounded-2xl font-black text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all uppercase tracking-widest active:scale-95">
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-10 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
          >
            <Printer className="w-5 h-5" />
            Print Report
          </button>
          <button
            onClick={downloadReport}
            disabled={isDownloading}
            className="px-10 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-2xl shadow-teal-600/30 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            {isDownloading ? 'Generating...' : 'Download Image'}
          </button>
        </div>
      </div>
    </div>
  );
};
