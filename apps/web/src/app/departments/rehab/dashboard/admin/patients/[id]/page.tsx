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
  ChevronLeft, ChevronRight, Plus, Minus, Shield, Users, Phone, Activity, TrendingUp, Brain, Pill, ClipboardList
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { toast } from 'react-hot-toast';
import { formatDateDMY } from '@/lib/utils';

import DailySheetTab from '@/components/rehab/patient-profile/DailySheetTab';
import FinanceHistory, { MonthRecord, Payment as PaymentType } from '@/components/rehab/patient-profile/FinanceHistory';
import ProgressTab from '@/components/rehab/patient-profile/ProgressTab';
import TherapyTab from '@/components/rehab/patient-profile/TherapyTab';
import MedicationTab from '@/components/rehab/patient-profile/MedicationTab';
import AdmissionTab from '@/components/rehab/patient-profile/AdmissionTab';

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
    durationMonths: 1,
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

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
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
      const diffTimeMs = new Date().getTime() - admission.getTime();
      const daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;
      
      const durationMonthsValue = data.durationMonths || 1;
      const totalDays = durationMonthsValue * 30;
      const remainingDays = Math.max(0, totalDays - daysAdmitted);

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
      const totalPkg = (monthlyPkg * Number(data.durationMonths || 1));
      const overallRemaining = totalPkg - overallReceived;
      const dailyRate = Math.floor(monthlyPkg / 30);
      const dueTillDate = daysAdmitted * dailyRate;
      const remainingTillDate = dueTillDate - overallReceived;

      setPatient({ 
        id: pDoc.id, 
        ...data, 
        remainingDays, 
        daysAdmitted,
        overallReceived,
        overallRemaining,
        totalPkg,
        dailyRate,
        dueTillDate,
        remainingTillDate
      });
      setEditForm({
        name: data.name || '',
        diagnosis: data.diagnosis || '',
        packageAmount: data.packageAmount || data.monthlyPackage || 0,
        photoUrl: data.photoUrl || '',
        durationMonths: data.durationMonths || 1,
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
      const duration = Number(editForm.durationMonths);
      const totalPkgValue = monthlyPkg * duration;

      await updateDoc(doc(db, 'rehab_patients', patientId), {
        name: editForm.name,
        diagnosis: editForm.diagnosis,
        packageAmount: monthlyPkg,
        monthlyPackage: monthlyPkg,
        durationMonths: duration,
        totalPackageAmount: totalPkgValue,
        admissionDate: Timestamp.fromDate(new Date(editForm.admissionDate)),
        photoUrl: photoUrl || null
      });

      setPatient((prev: any) => ({ 
        ...prev, 
        name: editForm.name,
        diagnosis: editForm.diagnosis,
        packageAmount: monthlyPkg,
        monthlyPackage: monthlyPkg,
        durationMonths: duration,
        totalPkg: totalPkgValue,
        overallRemaining: totalPkgValue - (prev.overallReceived || 0),
        photoUrl: photoUrl 
      }));
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

  const handleDischarge = async () => {
    if (!window.confirm("Are you sure you want to discharge this patient?")) return;
    try {
      setDeactivating(true);
      await updateDoc(doc(db, 'rehab_patients', patientId), {
        isActive: false,
        dischargeDate: Timestamp.now(),
        dischargeReason: null
      });
      toast.success('Patient discharged');
      router.push('/departments/rehab/dashboard/admin/patients');
    } catch (error) {
      console.error("Discharge error", error);
      toast.error('Discharge failed');
      setDeactivating(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8 overflow-x-hidden w-full max-w-full">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Link */}
        <Link 
          href="/departments/rehab/dashboard/admin/patients" 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </Link>
        
        {/* Header Profile Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full p-4 md:p-8 flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full opacity-50 -z-0"></div>
          
          <div className="relative z-10">
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt={patient.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-md bg-gray-100" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-4xl border-4 border-white shadow-md">
                {patient.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="relative z-10 flex-1 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{patient.name}</h1>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 mb-4">
              <span className="flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4" /> 
                Admitted: {formatDateDMY(patient.admissionDate?.toDate?.() || patient.admissionDate)}
              </span>
              <span className="flex items-center justify-center gap-1 text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-full">
                PKR {patient.packageAmount?.toLocaleString()} / m
              </span>
              <span className="flex items-center justify-center gap-1 text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded-full animate-pulse shadow-sm border border-orange-100">
                ⏳ {patient.remainingDays} Days Left
              </span>
            </div>
            {patient.diagnosis && (
              <p className="text-gray-600 max-w-2xl bg-gray-50 px-4 py-3 rounded-xl text-sm border border-gray-100">
                <span className="font-bold text-gray-800">Diagnosis/Notes:</span><br/>
                {patient.diagnosis}
              </p>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="w-full -mx-4 px-4">
          <div className="flex flex-wrap gap-1 border-b border-gray-100 bg-white rounded-t-2xl p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'profile' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('admission')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'admission' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Admission
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'daily' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" /> Daily Sheet
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'progress' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Progress
          </button>
          <button
            onClick={() => setActiveTab('therapy')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'therapy' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Brain className="w-4 h-4" /> Therapy
          </button>
          <button
            onClick={() => setActiveTab('meds')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'meds' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Pill className="w-4 h-4" /> Medication
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'fees' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Fees
          </button>
          <button
            onClick={() => setActiveTab('canteen')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'canteen' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Canteen
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'videos' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Video className="w-4 h-4" /> Videos ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'visits' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" /> Family Visits
          </button>
          </div>
        </div>

        {/* Tab Content Areas */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 border-t-0 w-full p-4 md:p-6 min-h-[400px]">
          
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-all overflow-hidden flex-shrink-0"
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
                          <p className="text-xs text-green-600 font-semibold mb-1">
                            ✓ New photo selected
                          </p>
                        ) : photoPreview ? (
                          <p className="text-xs text-teal-600 font-medium">
                            Current photo
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 font-medium">
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
                            className="text-[10px] text-red-400 hover:text-red-600 mt-1 font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Package (PKR)</label>
                    <input
                      type="number"
                      value={editForm.packageAmount}
                      onChange={e => setEditForm({...editForm, packageAmount: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                    <select 
                      value={editForm.durationMonths} 
                      onChange={e => setEditForm({...editForm, durationMonths: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 12].map(m => (
                        <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
                     <input 
                       type="date" 
                       value={editForm.admissionDate} 
                       onChange={e => setEditForm({...editForm, admissionDate: e.target.value})} 
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                     />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis / Notes</label>
                    <textarea value={editForm.diagnosis} onChange={e => setEditForm({...editForm, diagnosis: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 w-full">
                  <div className="bg-orange-50 border border-orange-100 w-full p-4 rounded-2xl flex flex-col items-center justify-center text-center sm:col-span-2">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Discharge Countdown</p>
                    <p className="text-4xl font-black text-orange-700">
                      {(patient.remainingDays || 0) > 0 ? patient.remainingDays : (patient.daysAdmitted || 0)}
                    </p>
                    <p className="text-xs font-bold text-orange-500 mt-1">
                      {(patient.remainingDays || 0) > 0 ? `Days remaining in ${(patient.durationMonths || 1) * 30}-day program` : 'Days admitted in rehab center'}
                    </p>
                    <div className="w-full bg-orange-200 h-2 rounded-full mt-4 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${patient.progressPct >= 100 ? 'bg-green-500' : 'bg-orange-500'}`} 
                        style={{ width: `${Math.min(100, Math.round(((patient.daysAdmitted || 0) / ((patient.durationMonths || 1) * 30)) * 100))}%` }}
                      ></div>
                    </div>
                    {patient.isActive && (
                      <button
                        type="button"
                        onClick={handleDischarge}
                        disabled={deactivating}
                        className="mt-4 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
                      >
                        {deactivating ? 'Discharging...' : 'Discharge Patient'}
                      </button>
                    )}
                  </div>
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Total Package ({patient.durationMonths || 1} M)</span>
                    <span className="font-black text-teal-700 border border-teal-100 bg-teal-50 px-3 py-1.5 rounded-lg inline-block text-sm">
                      PKR {((patient.monthlyPackage || patient.packageAmount || 0) * (patient.durationMonths || 1)).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">Monthly: PKR {(patient.monthlyPackage || patient.packageAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Assigned Staff ID</span>
                    <span className="font-mono font-bold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-sm border border-gray-100">
                      {patient.assignedStaffId || 'None'}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Patient Doc ID</span>
                    <span className="text-sm font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100 w-full break-all">
                      {patient.id}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-red-50 w-full">
                <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">Deactivating a patient hides them from the active list. Data remains intact.</p>
                <button 
                  onClick={handleDeactivate} 
                  disabled={deactivating}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 w-full sm:w-auto"
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
                      receivedBy: p.cashierId || "Admin Portal",
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
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-[#1a3a5c] tracking-tight">Payment Transaction Log</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Full audit trail of all entries</p>
                  </div>
                  {!isAdmin && (
                    <button 
                      onClick={() => {
                        setPackageAmt(patient?.packageAmount?.toString() || '');
                        setInitialPayment('');
                        setPaymentNote('');
                        setShowAddFeeModal(true);
                      }}
                      className="bg-[#1a3a5c] text-white px-5 py-2.5 rounded-xl font-black text-sm hover:translate-y-[-2px] transition-all active:scale-95 shadow-lg shadow-blue-900/10 flex items-center gap-2"
                    >
                      <Plus size={16} /> Add Payment
                    </button>
                  )}
                </div>

                {allPayments.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <DollarSign size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-500 text-[10px] uppercase font-black tracking-widest border-b border-gray-100">
                          <th className="pb-4">Date</th>
                          <th className="pb-4">Amount</th>
                          <th className="pb-4">Method</th>
                          <th className="pb-4">Status</th>
                          <th className="pb-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {allPayments.map((p: any) => {
                          const dateObj = p.date?.toDate?.() ? p.date.toDate() : new Date(p.date || Date.now());
                          return (
                          <tr key={p.id} className="group hover:bg-gray-50/80 transition-colors">
                            <td className="py-5">
                              <p className="text-sm font-bold text-gray-800">{dateObj.toLocaleDateString()}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="py-5">
                              <span className="text-base font-black text-[#1a3a5c]">₨{Number(p.amount).toLocaleString()}</span>
                            </td>
                            <td className="py-5 font-bold text-xs text-gray-500">{p.method || 'Cash'}</td>
                            <td className="py-5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {p.status === 'approved' ? 'APPROVED' : 'PENDING'}
                              </span>
                            </td>
                            <td className="py-5">
                              <p className="text-[10px] text-gray-400 font-medium">Verifier: {p.cashierId || 'Admin'}</p>
                              {p.note && <p className="text-[10px] text-[#1a3a5c] font-black italic mt-0.5 truncate max-w-[150px]">{p.note}</p>}
                            </td>
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
                    className="p-2 rounded-xl hover:bg-gray-100 transition">
                    <ChevronLeft size={20} className="text-gray-400" />
                  </button>
                  <span className="font-black text-gray-900 text-lg min-w-[160px] text-center">
                    {formatDateDMY(new Date(canteenMonth + '-01'))}
                  </span>
                  <button onClick={() => changeCanteenMonth(1)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition">
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
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-12 rounded-3xl text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShoppingCart className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-bold mb-1">No canteen record for this month</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    Add a deposit or expense to get started with this month's wallet.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Balance Card */}
                  <div className="text-center p-8 bg-gradient-to-br from-teal-50 to-teal-100 rounded-[2rem] border border-teal-200/50 shadow-sm">
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-1">Available Balance</p>
                    <p className={`text-5xl font-black ${canteenRecord.balance >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                      PKR {Number(canteenRecord.balance).toLocaleString('en-PK')}
                    </p>
                    <div className="flex justify-center gap-8 mt-6">
                      <div className="text-left">
                        <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">↑ Deposited</p>
                        <p className="text-sm font-black text-green-700">PKR {Number(canteenRecord.totalDeposited).toLocaleString('en-PK')}</p>
                      </div>
                      <div className="w-px h-8 bg-teal-200/50"></div>
                      <div className="text-left">
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">↓ Spent</p>
                        <p className="text-sm font-black text-red-600">PKR {Number(canteenRecord.totalSpent).toLocaleString('en-PK')}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                       <h3 className="text-lg font-black text-gray-900">Transaction History</h3>
                       <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{canteenRecord.transactions?.length || 0} Events</span>
                    </div>
                    
                    {!canteenRecord.transactions || canteenRecord.transactions.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">No transactions recorded.</p>
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
                                ? 'bg-green-50/50 border-l-green-400' 
                                : 'bg-red-50/50 border-l-red-400'
                            }`}>
                              <div>
                                <p className="text-sm font-black text-gray-900">{t.description}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                  {formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}
                                  <span className="mx-2">•</span>
                                  Verifier: {t.cashierId}
                                </p>
                              </div>
                              <p className={`font-black text-base ${t.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
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
              <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-4">
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
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
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
                  <input required type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
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
                <input required type="date" value={canteenDate} onChange={e => setCanteenDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
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
                <input required type="date" value={vDate} onChange={e => setVDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
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
                <input required type="date" value={vDate} onChange={e => setVDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
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
    </div>
  );
}
