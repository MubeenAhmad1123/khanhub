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
import { formatDateDMY, parseDateDMY, toDate } from '@/lib/utils';
import { BrutalistCalendar } from '@/components/ui/BrutalistCalendar';

import DailySheetTab from '@/components/welfare/child-profile/DailySheetTab';
import ProgressTab from '@/components/welfare/child-profile/ProgressTab';
import TherapyTab from '@/components/welfare/child-profile/TherapyTab';
import MedicationTab from '@/components/welfare/child-profile/MedicationTab';
import AdmissionTab from '@/components/welfare/child-profile/AdmissionTab';

export default function ChildDetailPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.role === 'admin';
  
  // Data
  const [child, setChild] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [canteenRecord, setCanteenRecord] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);

  // State
  const [activeTab, setActiveTab] = useState<'profile' | 'admission' | 'daily' | 'progress' | 'therapy' | 'meds' | 'fees' | 'canteen' | 'videos' | 'visits'>('profile');
  const [visits, setVisits] = useState<any[]>([]);
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
    name: '', diagnosis: '', packageAmount: 0, photoUrl: ''
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
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) {
      router.push('/departments/welfare/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/welfare/login');
      return;
    }
    setSession(parsed);
  }, [router]);


  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Child Profile
      const pDoc = await getDoc(doc(db, 'welfare_children', childId));
      if (!pDoc.exists()) {
        toast.error('Child not found');
        router.push('/departments/welfare/dashboard/admin/children');
        return;
      }
      const data = pDoc.data();
      
      // Calculate Remaining Days
      let remainingDays = 0;
      let daysAdmitted = 0;
      if (data.admissionDate) {
        const admission = toDate(data.admissionDate);
        const diffTimeMs = new Date().getTime() - admission.getTime();
        // Days admitted should count from admission date until "today"
        daysAdmitted = diffTimeMs > 0 ? Math.floor(diffTimeMs / (1000 * 60 * 60 * 24)) : 0;
        remainingDays = Math.max(0, 100 - daysAdmitted);
      }

      setChild({ id: pDoc.id, ...data, remainingDays, daysAdmitted });
      setEditForm({
        name: data.name || '',
        diagnosis: data.diagnosis || '',
        packageAmount: data.packageAmount || 0,
        photoUrl: data.photoUrl || ''
      });
      setPhotoPreview(data.photoUrl || '');

      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 2. Fees (Initial current month)
      const feesQ = query(
        collection(db, 'welfare_fees'),
        where('childId', '==', childId),
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
        collection(db, 'welfare_canteen'),
        where('childId', '==', childId),
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
        collection(db, 'welfare_videos'),
        where('childId', '==', childId),
        orderBy('createdAt', 'desc')
      );
      const vidSnap = await getDocs(videosQ);
      setVideos(vidSnap.docs.map(v => ({ id: v.id, ...v.data() })));

      // 5. Visits
      const visitsQ = query(
        collection(db, 'welfare_visits'),
        where('childId', '==', childId),
        orderBy('date', 'desc')
      );
      const visitSnap = await getDocs(visitsQ);
      setVisits(visitSnap.docs.map(v => ({ id: v.id, ...v.data() })));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load child data');
    } finally {
      setLoading(false);
    }
  }, [childId, router]);

  useEffect(() => {
    if (!session || !childId) return;
    fetchData();
  }, [session, childId, fetchData]);

  useEffect(() => {
    if (!childId || !session) return;
    fetchFeeRecord();
  }, [feeMonth]);

  useEffect(() => {
    if (!childId || !session) return;
    fetchCanteenRecord();
  }, [canteenMonth]);

  const fetchFeeRecord = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'welfare_fees'),
          where('childId', '==', childId),
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

      const setupSnap = await getDoc(doc(db, 'welfare_meta', 'setup'));
      const setupData = setupSnap.data() as any;
      const cashierCustomId = String(setupData?.cashierCustomId || '').toUpperCase();

      if (!cashierCustomId) {
        toast.error('Cashier is not configured (missing welfare_meta/setup.cashierCustomId).');
        return;
      }

      await addDoc(collection(db, 'welfare_transactions'), {
        type: 'income',
        amount,
        category: 'fee',
        categoryName: 'Admission / Fees',
        departmentCode: 'welfare',
        departmentName: 'Welfare Foundation',
        childId: childId,
        childName: child?.name || '',
        status: 'pending_cashier',
        cashierId: cashierCustomId,
        proofRequired: true,
        description: paymentNote || '',
        date: Timestamp.fromDate(new Date(paymentDate)),
        transactionDate: Timestamp.fromDate(new Date(paymentDate)),
        createdBy: session.uid,
        createdByName: session?.displayName || session?.name || 'Welfare Admin',
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

      const setupSnap = await getDoc(doc(db, 'welfare_meta', 'setup'));
      const setupData = setupSnap.data() as any;
      const cashierCustomId = String(setupData?.cashierCustomId || '').toUpperCase();

      if (!cashierCustomId) {
        toast.error('Cashier is not configured (missing welfare_meta/setup.cashierCustomId).');
        return;
      }

      await addDoc(collection(db, 'welfare_transactions'), {
        type: 'income',
        amount,
        category: 'fee',
        categoryName: 'Admission / Fees',
        departmentCode: 'welfare',
        departmentName: 'Welfare Foundation',
        childId: childId,
        childName: child?.name || '',
        status: 'pending_cashier',
        cashierId: cashierCustomId,
        proofRequired: true,
        description: payNote || '',
        date: Timestamp.fromDate(new Date(payDate)),
        transactionDate: Timestamp.fromDate(new Date(payDate)),
        createdBy: session.uid,
        createdByName: session?.displayName || session?.name || 'Welfare Admin',
        createdAt: Timestamp.now()
      });
      setShowAddPaymentModal(false);
      setPayAmt('');
      setPayNote('');
      toast.success('Payment request sent to cashier for approval ✓');
      // Important: do not update welfare_fees here; it syncs only after superadmin approval.
    } catch (error) {
      console.error("Add Payment error", error);
      toast.error('Failed to record payment');
    }
  };

  const fetchCanteenRecord = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'welfare_canteen'),
          where('childId', '==', childId),
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
        await addDoc(collection(db, 'welfare_canteen'), {
          childId: childId,
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
        
        await updateDoc(doc(db, 'welfare_canteen', canteenRecord.id), {
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
          const url = await uploadToCloudinary(photoFile, 'khanhub/welfare/children');
          photoUrl = url;
        } catch (err) {
          console.error("Photo upload failed", err);
          toast.error('Photo upload failed, keeping old photo');
        }
        setPhotoUploading(false);
      }

      await updateDoc(doc(db, 'welfare_children', childId), {
        name: editForm.name,
        diagnosis: editForm.diagnosis,
        packageAmount: Number(editForm.packageAmount),
        photoUrl: photoUrl || null
      });

      setChild((prev: any) => ({ 
        ...prev, 
        name: editForm.name,
        diagnosis: editForm.diagnosis,
        packageAmount: Number(editForm.packageAmount),
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
    if (!window.confirm("Are you sure you want to deactivate this child?")) return;
    try {
      setDeactivating(true);
      await updateDoc(doc(db, 'welfare_children', childId), { isActive: false });
      toast.success('Child deactivated');
      router.push('/departments/welfare/dashboard/admin/children');
    } catch (error) {
      console.error("Deactivate error", error);
      toast.error('Deactivation failed');
      setDeactivating(false);
    }
  };

  const handleDischarge = async () => {
    if (!window.confirm("Are you sure you want to discharge this child?")) return;
    try {
      setDeactivating(true);
      await updateDoc(doc(db, 'welfare_children', childId), {
        isActive: false,
        dischargeDate: Timestamp.now(),
        dischargeReason: null
      });
      toast.success('Child discharged');
      router.push('/departments/welfare/dashboard/admin/children');
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
      const secureUrl = await uploadToCloudinary(selectedFile, 'khanhub/welfare/children');
      
      await addDoc(collection(db, 'welfare_videos'), {
        childId: childId,
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
      const videosQ = query(collection(db, 'welfare_videos'), where('childId', '==', childId), orderBy('createdAt', 'desc'));
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
      await deleteDoc(doc(db, 'welfare_videos', videoId));
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
        childId,
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

      await addDoc(collection(db, 'welfare_visits'), visitData);
      
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
      const visitsQ = query(collection(db, 'welfare_visits'), where('childId', '==', childId), orderBy('date', 'desc'));
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
      const d = toDate(visit.date);
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
      await updateDoc(doc(db, 'welfare_visits', editVisitModal.id), {
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
      const visitsQ = query(collection(db, 'welfare_visits'), where('childId', '==', childId), orderBy('date', 'desc'));
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

  if (!child) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8 overflow-x-hidden w-full max-w-full">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Link */}
        <Link 
          href="/departments/welfare/dashboard/admin/children" 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Children
        </Link>
        
        {/* Header Profile Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full p-4 md:p-8 flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full opacity-50 -z-0"></div>
          
          <div className="relative z-10">
            {child.photoUrl ? (
              <img src={child.photoUrl} alt={child.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-md bg-gray-100" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-4xl border-4 border-white shadow-md">
                {child.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          
          <div className="relative z-10 flex-1 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{child.name}</h1>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 mb-4">
              <span className="flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4" /> 
                Admitted: {formatDateDMY(child.admissionDate)}
              </span>
              <span className="flex items-center justify-center gap-1 text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-full">
                PKR {child.packageAmount?.toLocaleString()} / m
              </span>
              <span className="flex items-center justify-center gap-1 text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded-full animate-pulse shadow-sm border border-orange-100">
                ⏳ {child.remainingDays} Days Left
              </span>
            </div>
            {child.diagnosis && (
              <p className="text-gray-600 max-w-2xl bg-gray-50 px-4 py-3 rounded-xl text-sm border border-gray-100">
                <span className="font-bold text-gray-800">Diagnosis/Notes:</span><br/>
                {child.diagnosis}
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
                        accept="image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.type.startsWith('image/') && file.type !== 'image/webp') {
                            toast.error('Only WebP images are allowed');
                            return;
                          }
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
                      {(child.remainingDays || 0) > 0 ? child.remainingDays : (child.daysAdmitted || 0)}
                    </p>
                    <p className="text-xs font-bold text-orange-500 mt-1">
                      {(child.remainingDays || 0) > 0 ? 'Days remaining in 100-day program' : 'Days admitted in welfare program'}
                    </p>
                    <div className="w-full bg-orange-200 h-2 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (100 - (child.remainingDays || 0)))}%` }}
                      ></div>
                    </div>
                    {child.isActive && (
                      <button
                        type="button"
                        onClick={handleDischarge}
                        disabled={deactivating}
                        className="mt-4 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
                      >
                        {deactivating ? 'Discharging...' : 'Discharge Child'}
                      </button>
                    )}
                  </div>
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Package</span>
                    <span className="font-black text-gray-900 border border-gray-100 bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-sm">
                      PKR {child.packageAmount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Assigned Staff ID</span>
                    <span className="font-mono font-bold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-sm border border-gray-100">
                      {child.assignedStaffId || 'None'}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Child Doc ID</span>
                    <span className="text-sm font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100 w-full break-all">
                      {child.id}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-red-50 w-full">
                <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">Deactivating a child hides them from the active list. Data remains intact.</p>
                <button 
                  onClick={handleDeactivate} 
                  disabled={deactivating}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                  {deactivating ? 'Deactivating...' : 'Deactivate Child'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: ADMISSION */}
          {activeTab === 'admission' && (
            <AdmissionTab child={child} onUpdate={(updated) => setChild({...child, ...updated})} />
          )}

          {/* TAB: DAILY SHEET */}
          {activeTab === 'daily' && (
            <DailySheetTab childId={childId} session={session} />
          )}

          {/* TAB: PROGRESS */}
          {activeTab === 'progress' && (
            <ProgressTab childId={childId} session={session} />
          )}

          {/* TAB: THERAPY */}
          {activeTab === 'therapy' && (
            <TherapyTab childId={childId} session={session} />
          )}

          {/* TAB: MEDICATION */}
          {activeTab === 'meds' && (
            <MedicationTab childId={childId} session={session} />
          )}

          {/* TAB: FEES */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => changeMonth(-1)} 
                    className="p-2 rounded-xl hover:bg-gray-100 transition">
                    <ChevronLeft size={20} className="text-gray-400" />
                  </button>
                  <span className="font-black text-gray-900 text-lg min-w-[160px] text-center">
                    {formatDateDMY(new Date(feeMonth + '-01'))}
                  </span>
                  <button onClick={() => changeMonth(1)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition">
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>
                </div>
                {feeRecord && !isAdmin && (
                  <button 
                    onClick={() => {
                      setPayAmt('');
                      setPayDate(new Date().toISOString().split('T')[0]);
                      setPayNote('');
                      setShowAddPaymentModal(true);
                    }}
                    className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-600 shadow-sm transition-all active:scale-95"
                  >
                    <Plus size={14} /> Add Payment
                  </button>
                )}
              </div>
              
              {!feeRecord ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-12 rounded-3xl text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <DollarSign className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-bold mb-1">No fee record for this month</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    You can initialize a fee record manually with the child's base package amount.
                  </p>
                  {!isAdmin && (
                  <button 
                    onClick={() => {
                      setPackageAmt(child.packageAmount?.toString() || '');
                      setInitialPayment('');
                      setPaymentNote('');
                      setShowAddFeeModal(true);
                    }}
                    className="inline-flex items-center gap-2 bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-teal-600 transition shadow-lg shadow-teal-100"
                  >
                    <Plus size={16} /> Initialize Fee Record
                  </button>
                  )}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-100 p-4 md:p-6 rounded-2xl shadow-sm">
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Monthly Package</div>
                      <div className="text-2xl font-black text-gray-900">PKR {feeRecord.packageAmount.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 border border-green-100 p-4 md:p-6 rounded-2xl shadow-sm">
                      <div className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1">Total Paid</div>
                      <div className="text-2xl font-black text-green-700">PKR {feeRecord.amountPaid.toLocaleString()}</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-4 md:p-6 rounded-2xl shadow-sm">
                      <div className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">Remaining</div>
                      <div className="text-2xl font-black text-red-700">PKR {feeRecord.amountRemaining.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-gray-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-500 h-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, (feeRecord.amountPaid / feeRecord.packageAmount) * 100))}%` }}
                    />
                  </div>

                  {feeRecord.amountRemaining <= 0 && (
                     <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100 font-bold text-sm flex items-center gap-2">
                       <Shield className="w-5 h-5" /> PAID IN FULL
                     </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                      <h3 className="text-lg font-black text-gray-900">Payment History</h3>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{feeRecord.payments?.length || 0} Entries</span>
                    </div>
                    
                    {!feeRecord.payments || feeRecord.payments.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm font-medium">No payments recorded for this month.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {feeRecord.payments
                          ?.sort((a: any, b: any) => {
                            const aT = toDate(a.date).getTime();
                            const bT = toDate(b.date).getTime();
                            return bT - aT;
                          })
                          .map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-teal-100 transition-colors">
                            <div className="flex-1">
                              <p className="font-black text-gray-900">
                                PKR {Number(p.amount).toLocaleString('en-PK')}
                              </p>
                              {p.note && (
                                <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Verified by {p.cashierId}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-700 font-bold">
                                {formatDateDMY(p.date)}
                              </p>
                              <span className="inline-block mt-1 text-[9px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                                APPROVED
                              </span>
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
                            const aT = toDate(a.date).getTime();
                            const bT = toDate(b.date).getTime();
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
                                  {formatDateDMY(t.date)}
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
                            <span>{formatDateDMY(visit.date)}</span>
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
                    accept="video/*,image/webp,application/pdf"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file && file.type.startsWith('image/') && file.type !== 'image/webp') {
                        toast.error('Only WebP images are allowed');
                        return;
                      }
                      setSelectedFile(file || null);
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
              <div className="space-y-1.5">
                <BrutalistCalendar
                  label="Transaction Date *"
                  value={canteenDate}
                  onChange={setCanteenDate}
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
