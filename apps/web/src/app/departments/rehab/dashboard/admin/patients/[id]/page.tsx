'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  doc, getDoc, collection, getDocs, query, where, 
  orderBy, updateDoc, Timestamp, deleteDoc, addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, User, DollarSign, ShoppingCart, Video, 
  Edit3, Save, X, Loader2, Heart, Calendar, Upload, Trash2, Play, FileText, Camera,
  ChevronLeft, ChevronRight, Plus, Minus, Shield, Users, Phone, Activity, TrendingUp, Brain, Pill, ClipboardList, CheckCircle2
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { toast } from 'react-hot-toast';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';

import DailySheetTab from '@/components/rehab/patient-profile/DailySheetTab';
import FinanceHistory, { MonthRecord, Payment as PaymentType } from '@/components/rehab/patient-profile/FinanceHistory';
import ProgressTab from '@/components/rehab/patient-profile/ProgressTab';
import TherapyTab from '@/components/rehab/patient-profile/TherapyTab';
import MedicationTab from '@/components/rehab/patient-profile/MedicationTab';
import AdmissionTab from '@/components/rehab/patient-profile/AdmissionTab';

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
    diagnosis: '', 
    packageAmount: 0, 
    photoUrl: '',
    admissionDate: new Date().toISOString().split('T')[0]
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

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


  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Patient Profile
      const pDoc = await getDoc(doc(db, 'rehab_patients', patientId));
      if (!pDoc.exists()) {
        toast.error('Patient not found');
        router.push('/departments/rehab/dashboard/admin/patients');
        return;
      }
      const data = pDoc.data();
      
      // Calculate Financial Stats & Remaining Days
      const admission = data.admissionDate?.toDate() || new Date();
      const endDate = data.isActive === false && data.dischargeDate 
        ? (data.dischargeDate?.toDate?.() || new Date(data.dischargeDate)) 
        : new Date();
      
      const diffTimeMs = endDate.getTime() - admission.getTime();
      const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;
      
      const monthsAdmitted = Math.floor(daysAdmitted / 30);
      const extraAdmittedDays = daysAdmitted % 30;
      const durationFormatted = `${daysAdmitted} Days (${monthsAdmitted > 0 ? `${monthsAdmitted} months ` : ''}${extraAdmittedDays} days)`;

      // Fetch all fees to calculate total received
      const allFeesQ = query(
        collection(db, 'rehab_fees'),
        where('patientId', '==', patientId)
      );
      const allFeesSnap = await getDocs(allFeesQ);
      let overallReceived = 0;
      const aggregatedPayments: any[] = [];
      
      allFeesSnap.docs.forEach(doc => {
        const feeData = doc.data();
        const docPayments = feeData.payments || [];
        docPayments.forEach((p: any) => {
          if (p.status === 'approved') overallReceived += Number(p.amount || 0);
          aggregatedPayments.push({
            id: `${doc.id}_${p.date}`,
            ...p,
            month: feeData.month // preserve month context if needed
          });
        });
      });
      setAllPayments(aggregatedPayments);

      const monthlyPkg = Number(data.monthlyPackage || data.packageAmount || 0);
      const dailyRate = Math.floor(monthlyPkg / 30);
      const dueTillDate = daysAdmitted * dailyRate;
      const overallRemaining = dueTillDate - overallReceived;

      setPatient({ 
        id: pDoc.id, 
        ...data, 
        daysAdmitted,
        durationFormatted,
        overallReceived,
        overallRemaining,
        dailyRate,
        dueTillDate,
      });
      setEditForm({
        name: data.name || '',
        diagnosis: data.diagnosis || '',
        packageAmount: data.packageAmount || data.monthlyPackage || 0,
        photoUrl: data.photoUrl || '',
        admissionDate: data.admissionDate?.toDate?.() 
          ? data.admissionDate.toDate().toISOString().split('T')[0] 
          : (typeof data.admissionDate === 'string' ? data.admissionDate : new Date().toISOString().split('T')[0])
      });
      setPhotoPreview(data.photoUrl || '');

      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 2. Fees (Initial current month)
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

      // 3. Canteen (Initial current month)
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

      // 4. Videos
      const videosQ = query(
        collection(db, 'rehab_videos'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      const vidSnap = await getDocs(videosQ);
      setVideos(vidSnap.docs.map(v => ({ id: v.id, ...v.data() })));

      // 5. Visits
      const visitsQ = query(
        collection(db, 'rehab_visits'),
        where('patientId', '==', patientId),
        orderBy('date', 'desc')
      );
      const visitSnap = await getDocs(visitsQ);
      setVisits(visitSnap.docs.map(v => ({ id: v.id, ...v.data() })));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  }, [patientId, router]);

  useEffect(() => {
    if (!session || !patientId) return;
    fetchData();
  }, [session, patientId, fetchData]);

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
      toast.success('Fee request sent to cashier for approval ✓');
    } catch (error) {
      console.error("Initialize Fee error", error);
      toast.error('Failed to create fee record');
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
        diagnosis: editForm.diagnosis,
        packageAmount: monthlyPkg,
        monthlyPackage: monthlyPkg,
        admissionDate: Timestamp.fromDate(new Date(editForm.admissionDate)),
        photoUrl: photoUrl || null
      });

      setPatient((prev: any) => {
        const admission = new Date(editForm.admissionDate);
        const endDate = prev.isActive === false && prev.dischargeDate 
          ? (prev.dischargeDate?.toDate?.() || new Date(prev.dischargeDate)) 
          : new Date();
          
        const diffTimeMs = endDate.getTime() - admission.getTime();
        const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;
        const monthsAdmitted = Math.floor(daysAdmitted / 30);
        const extraAdmittedDays = daysAdmitted % 30;
        const durationFormatted = `${daysAdmitted} Days (${monthsAdmitted > 0 ? `${monthsAdmitted} months ` : ''}${extraAdmittedDays} days)`;
        const dailyRate = Math.floor(monthlyPkg / 30);
        const dueTillDate = daysAdmitted * dailyRate;

        return { 
          ...prev, 
          name: editForm.name,
          diagnosis: editForm.diagnosis,
          packageAmount: monthlyPkg,
          monthlyPackage: monthlyPkg,
          daysAdmitted,
          durationFormatted,
          dailyRate,
          dueTillDate,
          overallRemaining: dueTillDate - (prev.overallReceived || 0),
          photoUrl: photoUrl 
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
      const admissionDateObj = patient.admissionDate?.toDate?.() ? patient.admissionDate.toDate() : new Date(patient.admissionDate);
      
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
    if (!window.confirm("Delete this file?")) return;
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="w-full overflow-x-hidden pb-20 bg-slate-50 dark:bg-gray-950 transition-colors duration-300 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-1 lg:px-0">
        
        {/* Top Link - Back Navigation */}
        <div className="px-4 sm:px-0 mt-4 leading-none">
          <Link 
            href="/departments/rehab/dashboard/admin/patients" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition-all uppercase tracking-widest group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Patients
          </Link>
        </div>
        
        {/* Header Profile Summary - Premium Floating Card */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/60 dark:shadow-none border border-white dark:border-white/5 w-full p-5 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 sticky top-[64px] z-[50] sm:relative sm:top-0 transition-all duration-500 overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 dark:bg-teal-500/5 rounded-bl-full transition-colors group-hover:bg-teal-100 dark:group-hover:bg-teal-500/10 -mr-4 -mt-4"></div>
          
          <div className="relative z-10 shrink-0">
            {patient.photoUrl ? (
              <div className="relative">
                <img src={patient.photoUrl} alt={patient.name} className="w-24 h-24 md:w-36 md:h-36 rounded-2xl sm:rounded-[2rem] object-cover border-4 border-white dark:border-gray-800 shadow-xl bg-gray-100 dark:bg-gray-800" />
                <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-emerald-500 border-4 border-white dark:border-gray-900" />
              </div>
            ) : (
              <div className="relative">
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-2xl sm:rounded-[2rem] bg-teal-600 text-white flex items-center justify-center font-black text-4xl sm:text-6xl border-4 border-white dark:border-gray-800 shadow-xl shadow-teal-600/20">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-emerald-500 border-4 border-white dark:border-gray-900" />
              </div>
            )}
          </div>
          
          <div className="relative z-10 flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate leading-tight">
                  {patient.name}
                </h1>
                <button 
                  onClick={() => {
                    setActiveTab('profile');
                    setIsEditing(true);
                  }}
                  className="self-center sm:self-start p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-teal-900/20 dark:hover:text-teal-400 transition-all border border-slate-200/50 dark:border-white/5 active:scale-90"
                  title="Edit Profile"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-sm text-slate-500 dark:text-gray-400 font-medium">
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" /> 
                  <span className="font-bold">Admitted:</span> {formatDateDMY(patient.admissionDate?.toDate?.() || patient.admissionDate)}
                </span>
                
                <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-black bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full shadow-sm border border-teal-100 dark:border-teal-500/20">
                  <DollarSign className="w-3.5 h-3.5" />
                  {patient.monthlyPackage?.toLocaleString() || patient.packageAmount?.toLocaleString()} / month
                </span>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-black bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-xl border border-orange-100 dark:border-orange-900/10 italic text-xs uppercase tracking-tight">
                  <span className="text-sm">📅</span> {patient.durationFormatted}
                </div>
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-black bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-900/10 text-xs uppercase tracking-tight">
                  <span className="text-sm">💰</span> Total Due: PKR {patient.dueTillDate?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation - Premium Glass Header */}
        <div className="w-full px-2 sm:px-0 mt-6 mb-4">
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 border border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl p-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-5 py-3 text-xs sm:text-[11px] whitespace-nowrap font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-xl min-w-fit flex-1 ${
                  activeTab === t.id 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 active:scale-95' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <t.icon className={`h-4 w-4 ${activeTab === t.id ? 'animate-pulse' : ''}`} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Areas */}
        <div className="bg-white dark:bg-gray-900 rounded-b-2xl shadow-sm border border-gray-100 dark:border-white/10 border-t-0 w-full p-4 md:p-6 min-h-[400px] transition-colors duration-300">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
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
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-white" />
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
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
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
                      onChange={e => setEditForm({...editForm, packageAmount: Number(e.target.value)})}
                      className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admission Date</label>
                     <input 
                       type="text" 
                       placeholder="DD MM YYYY"
                       value={formatDateDMY(editForm.admissionDate)} 
                       onChange={e => setEditForm({...editForm, admissionDate: e.target.value})} 
                       onBlur={e => {
                         const parsed = parseDateDMY(e.target.value);
                         if (parsed) setEditForm({...editForm, admissionDate: parsed.toISOString().split('T')[0]});
                       }}
                       className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-white" 
                     />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnosis / Notes</label>
                    <textarea value={editForm.diagnosis} onChange={e => setEditForm({...editForm, diagnosis: e.target.value})} rows={3} className="w-full border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none text-gray-900 dark:text-white" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 w-full">
                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/50 w-full p-6 rounded-2xl flex flex-col items-center justify-center text-center sm:col-span-2 shadow-sm">
                    <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Total Stay Duration</p>
                    <p className="text-4xl font-black text-teal-700 dark:text-teal-300">
                      {patient.daysAdmitted || 0} Days
                    </p>
                    <p className="text-xs font-bold text-teal-500 dark:text-teal-400/80 mt-1 italic">
                      {patient.durationFormatted}
                    </p>
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
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 lowercase tracking-widest font-black uppercase">Current Balance Due</span>
                    <span className="font-black text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg inline-block text-sm">
                      PKR {patient.overallRemaining?.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Total Due till today: PKR {patient.dueTillDate?.toLocaleString()}</p>
                  </div>
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 lowercase tracking-widest font-black uppercase">Assigned Staff ID</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg inline-block text-sm border border-gray-100 dark:border-white/5">
                      {patient.assignedStaffId || 'None'}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 w-full">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 lowercase tracking-widest font-black uppercase">Patient Doc ID</span>
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg inline-block border border-gray-100 dark:border-white/5 w-full break-all">
                      {patient.id}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-red-50 dark:border-red-900/20 w-full">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Deactivating a patient hides them from the active list. Data remains intact.</p>
                <button 
                  onClick={handleDeactivate} 
                  disabled={deactivating}
                  className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                  {deactivating ? 'Deactivating...' : 'Deactivate Patient'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: ADMISSION */}
          {activeTab === 'admission' && (
            <AdmissionTab patient={patient} onUpdate={(updated) => setPatient({...patient, ...updated})} />
          )}

          {/* TAB: DAILY SHEET */}
          {activeTab === 'daily' && (
            <DailySheetTab patientId={patientId} session={session} />
          )}

          {/* TAB: PROGRESS */}
          {activeTab === 'progress' && (
            <ProgressTab patientId={patientId} session={session} />
          )}

          {/* TAB: THERAPY */}
          {activeTab === 'therapy' && (
            <TherapyTab patientId={patientId} session={session} />
          )}

          {/* TAB: MEDICATION */}
          {activeTab === 'meds' && (
            <MedicationTab patientId={patientId} session={session} />
          )}

          {/* TAB: FEES */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              {/* Premium Journey Section */}
              <FinanceHistory 
                patientName={patient?.name || "Patient"}
                records={(() => {
                  const records: MonthRecord[] = [];
                  const monthlyPkg = Number(patient?.monthlyPackage || 40000);
                  
                  // Group payments by month
                  const groups: { [key: string]: PaymentType[] } = {};
                  allPayments.forEach((p: any) => {
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
              <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-white/10">
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

                {allPayments.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                    <DollarSign size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-xs tracking-widest">No transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full">
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
                        {allPayments.map((p: any) => {
                          const dateObj = p.date?.toDate?.() ? p.date.toDate() : new Date(p.date || Date.now());
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
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${p.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                {p.status === 'approved' ? 'APPROVED' : 'PENDING'}
                              </span>
                            </td>
                            <td className="py-5">
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Verifier: {p.cashierId || 'Admin'}</p>
                              {p.note && <p className="text-[10px] text-[#1a3a5c] dark:text-blue-400 font-black italic mt-0.5 truncate max-w-[150px]">{p.note}</p>}
                            </td>
                            {session?.role === 'superadmin' && (
                              <td className="py-5">
                                <button
                                  onClick={() => {
                                    setDeletingPayment(p);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 text-rose-50 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CANTEEN */}
          {activeTab === 'canteen' && (
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
                <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-white/10 p-12 rounded-3xl text-center">
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
                  <div className="text-center p-8 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-900/30 rounded-[2rem] border border-teal-200/50 dark:border-teal-800/50 shadow-sm">
                    <p className="text-[10px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest mb-1">Available Balance</p>
                    <p className={`text-5xl font-black ${canteenRecord.balance >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-red-600 dark:text-red-400'}`}>
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
                            <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl border-l-4 transition-all hover:translate-x-1 ${
                              t.type === 'deposit' 
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
          )}

          {/* TAB: VIDEOS */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2 border-b border-gray-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <Video className="w-6 h-6 text-teal-600" />
                  <h2 className="text-xl font-bold text-gray-800">Files & Progress</h2>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload
                </button>
              </div>

              {videos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                  <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No files uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {videos.map(vid => {
                    const isVideo = vid.fileType?.startsWith('video/') || vid.url?.includes('.mp4');
                    const isImage = vid.fileType?.startsWith('image/');
                    const isPdf = vid.fileType === 'application/pdf';

                    return (
                      <div key={vid.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white group hover:border-teal-300 transition-colors shadow-sm relative">
                        {session?.role === 'superadmin' && (
                          <button
                            onClick={() => handleDeleteVideo(vid.id)}
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
                          <h4 className="font-bold text-gray-900 truncate mb-1" title={vid.title}>{vid.title || 'Untitled'}</h4>
                          <div className="flex items-center justify-between mt-2">
                             <p className="text-xs text-gray-500">
                              {formatDateDMY(vid.createdAt)}
                            </p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isVideo ? 'bg-purple-50 text-purple-600' : isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
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
          )}

          {/* TAB: VISITS */}
          {activeTab === 'visits' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-gray-100 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <Users size={20} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Family Visit Log</h2>
                </div>
                <button
                  onClick={() => setShowAddVisitModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 active:scale-95 w-full sm:w-auto"
                >
                  <Plus size={16} /> Log New Visit
                </button>
              </div>

              {visits.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/30">
                  <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No visits recorded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {visits.map(visit => (
                    <div key={visit.id} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:border-teal-100 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                         <div className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg shadow-gray-200 flex flex-col items-center leading-tight">
                            <span>{formatDateDMY(visit.date?.toDate?.() ? visit.date.toDate() : visit.date)}</span>
                         </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="space-y-1 pr-16">
                          <div className="flex items-center gap-2">
                             <h4 className="font-black text-gray-900 text-xl tracking-tight">{visit.visitorName}</h4>
                             <span className="text-[10px] font-black bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full uppercase tracking-widest shadow-inner">{visit.relation}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5"><Phone size={14} className="text-teal-500" /> {visit.phone}</span>
                            {visit.cnic && <span className="flex items-center gap-1.5"><Shield size={14} className="text-blue-500" /> {visit.cnic}</span>}
                          </div>
                        </div>

                        {visit.notes && (
                          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/50 italic text-sm text-gray-600 relative">
                            <div className="absolute -top-2 left-6 bg-white px-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">Observation Notes</div>
                            "{visit.notes}"
                          </div>
                        )}
                        
                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logged by Admin: {visit.loggedBy}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditVisit(visit)}
                                className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-2 rounded-xl transition"
                              >
                                Edit
                              </button>
                              <User size={14} className="text-gray-200" />
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
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
                  accept="video/*,image/*,.pdf"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
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
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Payment Date</label>
                  <input
                    type="text"
                    placeholder="DD MM YYYY"
                    value={formatDateDMY(paymentDate)}
                    onChange={e => setPaymentDate(e.target.value)}
                    onBlur={e => {
                      const parsed = parseDateDMY(e.target.value);
                      if (parsed) setPaymentDate(parsed.toISOString().split('T')[0]);
                    }}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
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
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Payment Date *</label>
                  <input
                    required
                    type="text"
                    placeholder="DD MM YYYY"
                    value={formatDateDMY(payDate)}
                    onChange={e => setPayDate(e.target.value)}
                    onBlur={e => {
                      const parsed = parseDateDMY(e.target.value);
                      if (parsed) setPayDate(parsed.toISOString().split('T')[0]);
                    }}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
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
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Transaction Date *</label>
                <input
                  required
                  type="text"
                  placeholder="DD MM YYYY"
                  value={formatDateDMY(canteenDate)}
                  onChange={e => setCanteenDate(e.target.value)}
                  onBlur={e => {
                    const parsed = parseDateDMY(e.target.value);
                    if (parsed) setCanteenDate(parsed.toISOString().split('T')[0]);
                  }}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <button 
                type="submit" 
                className={`w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg ${
                  canteenModal === 'deposit' ? 'bg-green-500 hover:bg-green-600 shadow-green-100' : 'bg-red-500 hover:bg-red-600 shadow-red-100'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
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
                      type="text"
                      placeholder="DD MM YYYY"
                      value={dDateInput}
                      onChange={(e) => setDDateInput(e.target.value)}
                      onBlur={e => {
                        const parsed = parseDateDMY(e.target.value);
                        if (parsed) {
                          const iso = parsed.toISOString().split('T')[0];
                          setDDate(iso);
                          setDDateInput(formatDateDMY(iso));
                        }
                      }}
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 transition-all"
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
    </div>
  );
}
