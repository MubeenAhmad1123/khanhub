// d:\khanhub\apps\web\src\app\departments\job-center\dashboard\admin\seekers\[id]\page.tsx
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

import RegistrationTab from '@/components/job-center/seeker-profile/RegistrationTab';
import ActivityLogTab from '@/components/job-center/seeker-profile/ActivityLogTab';
import CareerProgressTab from '@/components/job-center/seeker-profile/CareerProgressTab';
import JobTrainingTab from '@/components/job-center/seeker-profile/JobTrainingTab';
import SupportRecordTab from '@/components/job-center/seeker-profile/SupportRecordTab';

export default function SeekerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const seekerId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.role === 'admin';
  
  // Data
  const [seeker, setSeeker] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);

  // State
  const [activeTab, setActiveTab] = useState<'profile' | 'registration' | 'activity' | 'progress' | 'training' | 'support' | 'fees' | 'meetings' | 'videos'>('profile');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [editMeetingModal, setEditMeetingModal] = useState<any | null>(null);
  const [isUpdatingMeeting, setIsUpdatingMeeting] = useState(false);

  // Placement Modal State
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [employers, setEmployers] = useState<any[]>([]);
  const [loadingEmployers, setLoadingEmployers] = useState(false);
  const [selectedEmployerId, setSelectedEmployerId] = useState('');

  // Meeting Form State
  const [mName, setMName] = useState('');
  const [mOrganization, setMOrganization] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPurpose, setMPurpose] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', careerGoals: '', salaryExpectation: 0, photoUrl: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Video Upload State
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

  // Canteen Form State
  const [canteenAmt, setCanteenAmt] = useState('');
  const [canteenDesc, setCanteenDesc] = useState('');
  const [canteenDate, setCanteenDate] = useState(new Date().toISOString().split('T')[0]);
  const [canteenMonth, setCanteenMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin' && parsed.role !== 'staff') {
      router.push('/departments/job-center/login');
      return;
    }
    setSession(parsed);
  }, [router]);


  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Seeker Profile
      const [seekerDoc, vids, meets] = await Promise.all([
        getDoc(doc(db, 'jobcenter_seekers', seekerId)),
        getDocs(query(collection(db, 'jobcenter_videos'), where('seekerId', '==', seekerId), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'jobcenter_meetings'), where('seekerId', '==', seekerId), orderBy('date', 'desc')))
      ]);

      if (!seekerDoc.exists()) {
        toast.error('Seeker not found');
        router.push('/departments/job-center/dashboard/admin/seekers');
        return;
      }

      const data = seekerDoc.data();
      setSeeker({ id: seekerDoc.id, ...data });
      setEditForm({ 
        name: data.name || '', 
        careerGoals: data.careerGoals || data.diagnosis || '', 
        salaryExpectation: data.salaryExpectation || data.packageAmount || 0,
        photoUrl: data.photoUrl || ''
      });
      setPhotoPreview(data.photoUrl || '');
      setVideos(vids.docs.map(v => ({ id: v.id, ...v.data() })));
      setMeetings(meets.docs.map(v => ({ id: v.id, ...v.data() })));

      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 2. Fees
      const feesQ = query(
        collection(db, 'jobcenter_fees'),
        where('seekerId', '==', seekerId),
        where('month', '==', monthStr)
      );
      const feeSnap = await getDocs(feesQ);
      if (!feeSnap.empty) {
        setFeeRecord({ id: feeSnap.docs[0].id, ...feeSnap.docs[0].data() });
      } else {
        setFeeRecord(null);
      }

      // 3. Fetch Employers for placement dropdown
      setLoadingEmployers(true);
      const employersSnap = await getDocs(query(collection(db, 'jobcenter_employers'), where('isActive', '==', true), orderBy('companyName', 'asc')));
      setEmployers(employersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingEmployers(false);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load seeker data');
    } finally {
      setLoading(false);
    }
  }, [seekerId, router]);

  useEffect(() => {
    if (!session || !seekerId) return;
    fetchData();
  }, [session, seekerId, fetchData]);

  useEffect(() => {
    if (!seekerId || !session) return;
    fetchFeeRecord();
  }, [feeMonth]);

  useEffect(() => {
    if (!seekerId || !session) return;
    fetchCanteenRecord();
  }, [canteenMonth]);

  const fetchFeeRecord = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'jobcenter_fees'),
          where('seekerId', '==', seekerId),
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

  const fetchCanteenRecord = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'jobcenter_canteen'),
          where('seekerId', '==', seekerId),
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

      const setupSnap = await getDoc(doc(db, 'jobcenter_meta', 'setup'));
      const setupData = setupSnap.data() as any;
      const cashierCustomId = String(setupData?.cashierCustomId || '').toUpperCase();

      if (!cashierCustomId) {
        toast.error('Cashier is not configured (missing jobcenter_meta/setup.cashierCustomId).');
        return;
      }

      await addDoc(collection(db, 'jobcenter_transactions'), {
        type: 'income',
        amount,
        category: 'fee',
        categoryName: 'Admission / Fees',
        departmentCode: 'job-center',
        departmentName: 'Job Center',
        seekerId: seekerId,
        seekerName: seeker?.name || '',
        status: 'pending_cashier',
        cashierId: cashierCustomId,
        proofRequired: true,
        description: paymentNote || '',
        date: Timestamp.fromDate(new Date(paymentDate)),
        transactionDate: Timestamp.fromDate(new Date(paymentDate)),
        createdBy: session.uid,
        createdByName: session?.displayName || session?.name || 'Job Center Admin',
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

      const setupSnap = await getDoc(doc(db, 'jobcenter_meta', 'setup'));
      const setupData = setupSnap.data() as any;
      const cashierCustomId = String(setupData?.cashierCustomId || '').toUpperCase();

      if (!cashierCustomId) {
        toast.error('Cashier is not configured (missing jobcenter_meta/setup.cashierCustomId).');
        return;
      }

      await addDoc(collection(db, 'jobcenter_transactions'), {
        type: 'income',
        amount,
        category: 'fee',
        categoryName: 'Admission / Fees',
        departmentCode: 'job-center',
        departmentName: 'Job Center',
        seekerId: seekerId,
        seekerName: seeker?.name || '',
        status: 'pending_cashier',
        cashierId: cashierCustomId,
        proofRequired: true,
        description: payNote || '',
        date: Timestamp.fromDate(new Date(payDate)),
        transactionDate: Timestamp.fromDate(new Date(payDate)),
        createdBy: session.uid,
        createdByName: session?.displayName || session?.name || 'Job Center Admin',
        createdAt: Timestamp.now()
      });
      setShowAddPaymentModal(false);
      setPayAmt('');
      setPayNote('');
      toast.success('Payment request sent to cashier for approval ✓');
      // Important: do not update jobcenter_fees here; it syncs only after superadmin approval.
    } catch (error) {
      console.error("Add Payment error", error);
      toast.error('Failed to record payment');
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
          const url = await uploadToCloudinary(photoFile, 'khanhub/job-center/seekers');
          photoUrl = url;
        } catch (err) {
          console.error("Photo upload failed", err);
          toast.error('Photo upload failed, keeping old photo');
        }
        setPhotoUploading(false);
      }

      const updatedData = {
        name: editForm.name,
        careerGoals: editForm.careerGoals,
        salaryExpectation: Number(editForm.salaryExpectation),
        photoUrl: photoUrl || seeker.photoUrl || null
      };

      await updateDoc(doc(db, 'jobcenter_seekers', seekerId), updatedData);

      setSeeker((prev: any) => ({ 
        ...prev, 
        ...updatedData
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
    if (!window.confirm("Are you sure you want to deactivate this seeker?")) return;
    try {
      setDeactivating(true);
      await updateDoc(doc(db, 'jobcenter_seekers', seekerId), { isActive: false });
      toast.success('Seeker deactivated');
      router.push('/departments/job-center/dashboard/admin/seekers');
    } catch (error) {
      console.error("Deactivate error", error);
      toast.error('Deactivation failed');
      setDeactivating(false);
    }
  };

  const handlePlacement = () => {
    setShowPlacementModal(true);
  };

  const confirmPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployerId) {
      toast.error("Please select a company");
      return;
    }

    const employer = employers.find(emp => emp.id === selectedEmployerId);
    if (!employer) return;

    try {
      setDeactivating(true);
      await updateDoc(doc(db, 'jobcenter_seekers', seekerId), {
        isActive: false,
        status: 'placed',
        placementDate: Timestamp.now(),
        placementCompany: employer.companyName,
        employerId: employer.id
      });
      toast.success('Seeker marked as Placed ✓');
      setShowPlacementModal(false);
      router.push('/departments/job-center/dashboard/admin/seekers');
    } catch (error) {
      console.error("Placement error", error);
      toast.error('Failed to mark as placed');
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
      const secureUrl = await uploadToCloudinary(selectedFile, 'khanhub/job-center/seekers');
      
      await addDoc(collection(db, 'jobcenter_videos'), {
        seekerId: seekerId,
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
      const videosQ = query(collection(db, 'jobcenter_videos'), where('seekerId', '==', seekerId), orderBy('createdAt', 'desc'));
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
      await deleteDoc(doc(db, 'jobcenter_videos', videoId));
      toast.success('Deleted');
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error("Delete error", error);
      toast.error('Failed to delete');
    }
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName || !mOrganization || !mPhone) {
      toast.error('Representative Name, Organization and Phone are required');
      return;
    }

    try {
      setIsSavingMeeting(true);
      const meetingData = {
        seekerId,
        representativeName: mName,
        organization: mOrganization,
        phone: mPhone,
        purpose: mPurpose || null,
        notes: mNotes || null,
        date: Timestamp.fromDate(new Date(`${mDate}T00:00:00`)),
        loggedBy: session.uid,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'jobcenter_meetings'), meetingData);
      
      toast.success('Meeting logged ✓');
      setShowAddMeetingModal(false);
      
      // Reset form
      setMName('');
      setMOrganization('');
      setMPhone('');
      setMPurpose('');
      setMNotes('');
      setMDate(new Date().toISOString().split('T')[0]);

      // Refresh meetings
      const meetsQ = query(collection(db, 'jobcenter_meetings'), where('seekerId', '==', seekerId), orderBy('date', 'desc'));
      const meetSnap = await getDocs(meetsQ);
      setMeetings(meetSnap.docs.map(v => ({ id: v.id, ...v.data() })));

    } catch (error) {
      console.error("Add meeting error", error);
      toast.error('Failed to log meeting');
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMeetingModal?.id) return;
    if (!mName || !mOrganization || !mPhone) {
      toast.error('Rep. Name, Organization and Phone are required');
      return;
    }
    try {
      setIsUpdatingMeeting(true);
      await updateDoc(doc(db, 'jobcenter_meetings', editMeetingModal.id), {
        representativeName: mName,
        organization: mOrganization,
        phone: mPhone,
        purpose: mPurpose || null,
        notes: mNotes || null,
        date: Timestamp.fromDate(new Date(`${mDate}T00:00:00`)),
        updatedAt: Timestamp.now(),
        updatedBy: session.uid
      });

      toast.success('Meeting updated ✓');
      setEditMeetingModal(null);
      const meetsQ = query(collection(db, 'jobcenter_meetings'), where('seekerId', '==', seekerId), orderBy('date', 'desc'));
      const meetSnap = await getDocs(meetsQ);
      setMeetings(meetSnap.docs.map(v => ({ id: v.id, ...v.data() })));
    } catch (error) {
      console.error("Update meeting error", error);
      toast.error('Failed to update meeting');
    } finally {
      setIsUpdatingMeeting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!seeker) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8 overflow-x-hidden w-full max-w-full">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Link */}
        <Link 
          href="/departments/job-center/dashboard/admin/seekers" 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Seekers
        </Link>
        
        {/* Header Profile Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full p-4 md:p-8 flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full opacity-50 -z-0"></div>
          
          <div className="relative z-10">
            {seeker.photoUrl ? (
              <img src={seeker.photoUrl} alt={seeker.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-md bg-gray-100" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-4xl border-4 border-white shadow-md">
                {seeker.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="relative z-10 flex-1 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{seeker.name}</h1>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 mb-4">
              <span className="flex items-center justify-center gap-1 text-orange-700 font-medium bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                Registered: {formatDateDMY(seeker.registrationDate || seeker.admissionDate?.toDate?.() || seeker.admissionDate)}
              </span>
              <span className={`flex items-center justify-center gap-1 font-bold px-3 py-1 rounded-full shadow-sm border ${
                seeker.status === 'placed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
              }`}>
                {seeker.status?.toUpperCase() || 'ACTIVE'}
              </span>
            </div>
            {seeker.diagnosis && (
              <p className="text-gray-600 max-w-2xl bg-gray-50 px-4 py-3 rounded-xl text-sm border border-gray-100">
                <span className="font-bold text-gray-800">Objectives/Notes:</span><br/>
                {seeker.diagnosis}
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
              activeTab === 'profile' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'registration' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Registration
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'activity' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" /> Activity Log
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'progress' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Career Progress
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'training' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Brain className="w-4 h-4" /> Job Training
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'support' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Heart className="w-4 h-4" /> Support Log
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'fees' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Financials
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'videos' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Video className="w-4 h-4" /> Portfolio ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-3 py-2.5 text-xs whitespace-nowrap font-medium flex items-center gap-1.5 transition-colors border-b-2 rounded-lg ${
              activeTab === 'meetings' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" /> Meeting Log
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
                  <button onClick={() => setIsEditing(true)} className="text-orange-600 hover:bg-orange-50 p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg text-sm font-medium transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSaveEdit} disabled={savingEdit} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm">
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all overflow-hidden flex-shrink-0"
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
                          <p className="text-xs text-orange-600 font-medium">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Career Goals & Objectives</label>
                    <textarea value={editForm.careerGoals} onChange={e => setEditForm({...editForm, careerGoals: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Expectation (Monthly)</label>
                    <input type="number" value={editForm.salaryExpectation} onChange={e => setEditForm({...editForm, salaryExpectation: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 w-full">
                  <div className="bg-orange-50 border border-orange-100 w-full p-4 rounded-2xl flex flex-col items-center justify-center text-center sm:col-span-2">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Career Journey</p>
                    <p className="text-4xl font-black text-orange-700">
                      {seeker.status === 'placed' ? 'Placed' : 'In Training'}
                    </p>
                    <p className="text-xs font-bold text-orange-500 mt-1">
                      Seeker is currently {seeker.status === 'placed' ? 'working at an organization' : 'developing skills for placement'}
                    </p>
                    {seeker.isActive && (
                      <button
                        type="button"
                        onClick={handlePlacement}
                        disabled={deactivating}
                        className="mt-4 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
                      >
                        {deactivating ? 'Processing...' : 'Mark as Placed'}
                      </button>
                    )}
                  </div>
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Salary Expectation</span>
                    <span className="font-black text-gray-900 border border-gray-100 bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-sm">
                      PKR {seeker.salaryExpectation?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Assigned Staff ID</span>
                    <span className="font-mono font-bold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-sm border border-gray-100">
                      {seeker.assignedStaffId || 'None'}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 w-full">
                    <span className="block text-[10px] text-gray-400 mb-1 lowercase tracking-widest font-black uppercase">Seeker Doc ID</span>
                    <span className="text-sm font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100 w-full break-all">
                      {seeker.id}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-red-50 w-full">
                <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">Deactivating a seeker hides them from the active list. Data remains intact.</p>
                <button 
                  onClick={handleDeactivate} 
                  disabled={deactivating}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                  {deactivating ? 'Deactivating...' : 'Deactivate Seeker'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: REGISTRATION */}
          {activeTab === 'registration' && (
            <RegistrationTab seeker={seeker} onUpdate={(updated) => setSeeker({...seeker, ...updated})} />
          )}

          {/* TAB: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <ActivityLogTab seekerId={seekerId} session={session} />
          )}

          {/* TAB: CAREER PROGRESS */}
          {activeTab === 'progress' && (
            <CareerProgressTab seekerId={seekerId} session={session} />
          )}

          {/* TAB: JOB TRAINING */}
          {activeTab === 'training' && (
            <JobTrainingTab seekerId={seekerId} session={session} />
          )}

          {/* TAB: SUPPORT */}
          {activeTab === 'support' && (
            <SupportRecordTab seekerId={seekerId} session={session} />
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
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 shadow-sm transition-all active:scale-95"
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
                    You can initialize a fee record manually with the seeker's fixed placement package or registration amount.
                  </p>
                  {!isAdmin && (
                  <button 
                    onClick={() => {
                      setPackageAmt(seeker.packageAmount?.toString() || '');
                      setInitialPayment('');
                      setPaymentNote('');
                      setShowAddFeeModal(true);
                    }}
                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-100"
                  >
                    <Plus size={16} /> Initialize Fee Record
                  </button>
                  )}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-100 p-4 md:p-6 rounded-2xl shadow-sm">
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Placement Package</div>
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
                      className="bg-orange-500 h-full transition-all duration-700 ease-out"
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
                            const aT = a.date?.toDate?.()?.getTime() || new Date(a.date).getTime();
                            const bT = b.date?.toDate?.()?.getTime() || new Date(b.date).getTime();
                            return bT - aT;
                          })
                          .map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-orange-100 transition-colors">
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
                                {formatDateDMY(p.date?.toDate?.() ? p.date.toDate() : p.date)}
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


          {/* TAB: VIDEOS */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <Video className="w-6 h-6 text-orange-600" />
                  <h2 className="text-xl font-bold text-gray-800">Files & Portfolio</h2>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
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
                      <div key={vid.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white group hover:border-orange-300 transition-colors shadow-sm relative">
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
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-orange-600 transform scale-90 group-hover:scale-100 transition-transform">
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

          {/* TAB: MEETINGS */}
          {activeTab === 'meetings' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-gray-100 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <Users size={20} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Meeting & Interview Log</h2>
                </div>
                <button
                  onClick={() => setShowAddMeetingModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/10 active:scale-95 w-full sm:w-auto"
                >
                  <Plus size={16} /> Log New Meeting
                </button>
              </div>

              {meetings.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/30">
                  <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No meetings recorded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {meetings.map((meeting: any) => (
                    <div key={meeting.id} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-orange-900/5 hover:border-orange-100 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                         <div className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg shadow-gray-200 flex flex-col items-center leading-tight">
                            <span>{formatDateDMY(meeting.date?.toDate?.() ? meeting.date.toDate() : meeting.date)}</span>
                         </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="space-y-1 pr-16">
                          <div className="flex items-center gap-2">
                             <h4 className="font-black text-gray-900 text-xl tracking-tight">{meeting.representativeName}</h4>
                             <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full uppercase tracking-widest shadow-inner">{meeting.organization}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5"><Phone size={14} className="text-orange-500" /> {meeting.phone}</span>
                            {meeting.purpose && <span className="flex items-center gap-1.5"><Shield size={14} className="text-blue-500" /> {meeting.purpose}</span>}
                          </div>
                        </div>

                        {meeting.notes && (
                          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/50 italic text-sm text-gray-600 relative">
                            <div className="absolute -top-2 left-6 bg-white px-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">Meeting Notes</div>
                            "{meeting.notes}"
                          </div>
                        )}
                        
                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logged by Staff: {meeting.loggedBy}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditMeetingModal(meeting);
                                  setMName(meeting.representativeName);
                                  setMOrganization(meeting.organization);
                                  setMPhone(meeting.phone);
                                  setMPurpose(meeting.purpose || '');
                                  setMNotes(meeting.notes || '');
                                  setMDate(meeting.date?.toDate?.() ? meeting.date.toDate().toISOString().split('T')[0] : meeting.date);
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-2 rounded-xl transition"
                              >
                                Edit
                              </button>
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
                <Upload className="w-5 h-5 text-orange-600" />
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white"
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
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 outline-none"
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
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
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
              <h2 className="text-xl font-black text-gray-900">Initialize Placement Package</h2>
              <button onClick={() => setShowAddFeeModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInitializeFee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Package Amount (PKR) *</label>
                <input required type="number" value={packageAmt} onChange={e => setPackageAmt(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. 50000" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Initial Payment</label>
                  <input type="number" value={initialPayment} onChange={e => setInitialPayment(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Payment Date</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Note (Optional)</label>
                <input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Received by hand" />
              </div>
              <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-100">
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
                  <input required type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Amount" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Payment Date *</label>
                  <input required type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Note (Optional)</label>
                <input value={payNote} onChange={e => setPayNote(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Received via bank" />
              </div>
              <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-100">
                <Plus size={18} /> Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Meeting Modal */}
      {showAddMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-600" /> Log Meeting/Interview
              </h2>
              <button onClick={() => setShowAddMeetingModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMeeting} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rep. Name *</label>
                  <input required value={mName} onChange={e => setMName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Contact Person" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Organization *</label>
                  <input required value={mOrganization} onChange={e => setMOrganization(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Company Name" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone *</label>
                  <input required value={mPhone} onChange={e => setMPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="+92..." />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Purpose</label>
                  <input value={mPurpose} onChange={e => setMPurpose(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Interview" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Meeting Date *</label>
                <input required type="date" value={mDate} onChange={e => setMDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea rows={2} value={mNotes} onChange={e => setMNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Key takeaways from the meeting..."></textarea>
              </div>
              <button type="submit" disabled={isSavingMeeting} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-100 disabled:opacity-70">
                {isSavingMeeting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {isSavingMeeting ? 'Saving...' : 'Log Meeting'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-600" /> Edit Meeting
              </h2>
              <button onClick={() => setEditMeetingModal(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateMeeting} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rep. Name *</label>
                  <input required value={mName} onChange={e => setMName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Contact Person" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Organization *</label>
                  <input required value={mOrganization} onChange={e => setMOrganization(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Company Name" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone *</label>
                  <input required value={mPhone} onChange={e => setMPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="+92..." />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Purpose</label>
                  <input value={mPurpose} onChange={e => setMPurpose(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Interview" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Meeting Date *</label>
                <input required type="date" value={mDate} onChange={e => setMDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea rows={2} value={mNotes} onChange={e => setMNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Key takeaways from the meeting..."></textarea>
              </div>
              <button type="submit" disabled={isUpdatingMeeting} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-100 disabled:opacity-70">
                {isUpdatingMeeting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {isUpdatingMeeting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Placement Modal */}
      {showPlacementModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-orange-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 leading-none">Confirm Placement</h2>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1.5">Official Employment Record</p>
                </div>
              </div>
              <button onClick={() => setShowPlacementModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={confirmPlacement} className="p-8 space-y-6">
              <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="text-xs text-orange-700 font-bold leading-relaxed mb-3">
                  Select the company where <span className="underline decoration-orange-300 decoration-2">{seeker.name}</span> has been officially hired.
                </p>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5">Registered Employers</label>
                  <select
                    required
                    value={selectedEmployerId}
                    onChange={e => setSelectedEmployerId(e.target.value)}
                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all shadow-sm appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23f97316\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                  >
                    <option value="">Choose a company...</option>
                    {employers.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.companyName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center px-4">
                  Note: Marking as placed will deactivate the active seeker profile and move them to history.
                </p>
                <button 
                  type="submit" 
                  disabled={deactivating || !selectedEmployerId}
                  className="w-full bg-gray-900 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 active:scale-95 group"
                >
                  {deactivating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield size={18} className="group-hover:rotate-12 transition-transform" />}
                  {deactivating ? 'Finalizing...' : 'Confirm Employment'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowPlacementModal(false)}
                  className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors py-2"
                >
                  Cancel & Go Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
