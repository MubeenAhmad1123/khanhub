'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  doc, getDoc, collection, getDocs, query, where, 
  orderBy, updateDoc, Timestamp, deleteDoc, addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, User, DollarSign, ShoppingCart, Video, 
  Edit3, Save, X, Loader2, Heart, Calendar, Upload, Trash2, Play, FileText
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { toast } from 'react-hot-toast';

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [patient, setPatient] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [canteenRecord, setCanteenRecord] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);

  // State
  const [activeTab, setActiveTab] = useState<'profile' | 'fees' | 'canteen' | 'videos'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', diagnosis: '', packageAmount: 0, photoUrl: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  useEffect(() => {
    if (!session || !patientId) return;
    fetchData();
  }, [session, patientId]);

  const fetchData = async () => {
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
      setPatient({ id: pDoc.id, ...data });
      setEditForm({
        name: data.name || '',
        diagnosis: data.diagnosis || '',
        packageAmount: data.packageAmount || 0,
        photoUrl: data.photoUrl || ''
      });

      // Current Month String (e.g. "2025-01")
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 2. Fees
      const feesQ = query(
        collection(db, 'rehab_fees'),
        where('patientId', '==', patientId),
        where('month', '==', monthStr)
      );
      const feeSnap = await getDocs(feesQ);
      if (!feeSnap.empty) setFeeRecord(feeSnap.docs[0].data());

      // 3. Canteen
      const canteenQ = query(
        collection(db, 'rehab_canteen'),
        where('patientId', '==', patientId),
        where('month', '==', monthStr)
      );
      const canteenSnap = await getDocs(canteenQ);
      if (!canteenSnap.empty) setCanteenRecord(canteenSnap.docs[0].data());

      // 4. Videos
      const videosQ = query(
        collection(db, 'rehab_videos'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      const vidSnap = await getDocs(videosQ);
      setVideos(vidSnap.docs.map(v => ({ id: v.id, ...v.data() })));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      await updateDoc(doc(db, 'rehab_patients', patientId), {
        name: editForm.name,
        diagnosis: editForm.diagnosis,
        packageAmount: Number(editForm.packageAmount),
        photoUrl: editForm.photoUrl || null
      });
      setPatient((prev: any) => ({ ...prev, ...editForm, packageAmount: Number(editForm.packageAmount) }));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
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
          
          <div className="relative z-10 flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{patient.name}</h1>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-gray-500 mb-4 justify-center md:justify-start">
              <span className="flex items-center justify-center md:justify-start gap-1">
                <Calendar className="w-4 h-4" /> 
                Admitted: {patient.admissionDate?.toDate?.()?.toLocaleDateString()}
              </span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center justify-center md:justify-start gap-1 text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-full">
                PKR {patient.packageAmount?.toLocaleString()} / month
              </span>
            </div>
            {patient.diagnosis && (
              <p className="text-gray-600 max-w-2xl bg-gray-50 px-4 py-3 rounded-xl text-sm border border-gray-100">
                <span className="font-medium text-gray-800">Diagnosis/Notes:</span><br/>
                {patient.diagnosis}
              </p>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto border-b border-gray-200 hide-scrollbar bg-white rounded-t-2xl px-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`whitespace-nowrap py-4 px-6 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'profile' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" /> Profile Info
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`whitespace-nowrap py-4 px-6 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'fees' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Fees ({new Date().toLocaleDateString('en-US', { month: 'short' })})
          </button>
          <button
            onClick={() => setActiveTab('canteen')}
            className={`whitespace-nowrap py-4 px-6 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'canteen' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Canteen
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`whitespace-nowrap py-4 px-6 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'videos' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Video className="w-4 h-4" /> Videos ({videos.length})
          </button>
        </div>

        {/* Tab Content Areas */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 border-t-0 p-6 md:p-8 min-h-[400px]">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-8 max-w-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package Amount</label>
                    <input type="number" value={editForm.packageAmount} onChange={e => setEditForm({...editForm, packageAmount: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
                    <input type="text" value={editForm.photoUrl} onChange={e => setEditForm({...editForm, photoUrl: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="https://..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis / Notes</label>
                    <textarea value={editForm.diagnosis} onChange={e => setEditForm({...editForm, diagnosis: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <span className="block text-sm text-gray-500 mb-1 lowercase tracking-widest font-bold">Package</span>
                    <span className="font-medium text-gray-900 border border-gray-100 bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-sm">
                      PKR {patient.packageAmount?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500 mb-1 lowercase tracking-widest font-bold">Assigned Staff ID</span>
                    <span className="font-mono text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg inline-block text-sm border border-gray-100">
                      {patient.assignedStaffId || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500 mb-1 lowercase tracking-widest font-bold">Patient Doc ID</span>
                    <span className="font-mono text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100">
                      {patient.id}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-red-50">
                <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">Deactivating a patient hides them from the active list. Data remains intact.</p>
                <button 
                  onClick={handleDeactivate} 
                  disabled={deactivating}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {deactivating ? 'Deactivating...' : 'Deactivate Patient'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: FEES */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="w-6 h-6 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              
              {!feeRecord ? (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-blue-800">
                  <p className="font-medium mb-1">No fee record generated for this month yet.</p>
                  <p className="text-sm opacity-80">Fee records are automatically created when the cashier logs the first fee payment for the month.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
                      <div className="text-sm text-gray-500 mb-1 font-medium">Monthly Package</div>
                      <div className="text-2xl font-bold text-gray-900">Rs. {feeRecord.packageAmount.toLocaleString()}</div>
                    </div>
                    <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl">
                      <div className="text-sm text-teal-700 mb-1 font-medium">Total Paid</div>
                      <div className="text-2xl font-bold text-teal-800">Rs. {feeRecord.amountPaid.toLocaleString()}</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-5 rounded-2xl">
                      <div className="text-sm text-red-700 mb-1 font-medium">Remaining</div>
                      <div className="text-2xl font-bold text-red-800">Rs. {feeRecord.amountRemaining.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-gray-100 h-4 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, (feeRecord.amountPaid / feeRecord.packageAmount) * 100))}%` }}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Payment History</h3>
                    {feeRecord.payments?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No payments recorded.</p>
                    ) : (
                      <div className="space-y-3">
                        {feeRecord.payments?.map((p: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-900">Rs. {p.amount.toLocaleString()}</span>
                              <span className="text-xs text-gray-400 font-mono">Tx ID: {p.transactionId}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-sm">
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase text-xs font-bold tracking-wider">Paid</span>
                              <span className="text-gray-500">
                                {p.date?.toDate?.() 
                                  ? p.date.toDate().toLocaleDateString('en-PK') 
                                  : p.date 
                                  ? new Date(p.date).toLocaleDateString('en-PK') 
                                  : '—'}
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
              <div className="flex items-center gap-3 mb-6">
                <ShoppingCart className="w-6 h-6 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>

              {!canteenRecord ? (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-blue-800">
                  <p className="font-medium mb-1">No canteen account for this month.</p>
                  <p className="text-sm opacity-80">A canteen record is generated when the first deposit is made via the Cashier.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                      <div className="text-sm text-blue-700 mb-1 font-medium">Total Deposited</div>
                      <div className="text-2xl font-bold text-blue-900">Rs. {canteenRecord.totalDeposited.toLocaleString()}</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-5 rounded-2xl">
                      <div className="text-sm text-red-700 mb-1 font-medium">Total Spent</div>
                      <div className="text-2xl font-bold text-red-900">Rs. {canteenRecord.totalSpent.toLocaleString()}</div>
                    </div>
                    <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl">
                      <div className="text-sm text-teal-700 mb-1 font-medium">Current Balance</div>
                      <div className="text-2xl font-bold text-teal-900">Rs. {canteenRecord.balance.toLocaleString()}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Transaction Log</h3>
                    {canteenRecord.transactions?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No canteen transactions.</p>
                    ) : (
                      <div className="space-y-3">
                        {canteenRecord.transactions?.map((tx: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                  tx.type === 'deposit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {tx.type}
                                </span>
                                <span className="text-gray-900 font-medium">Rs. {tx.amount.toLocaleString()}</span>
                              </div>
                              <div className="text-sm text-gray-500">{tx.description}</div>
                            </div>
                            <div className="text-right text-xs text-gray-400 space-y-1">
                              <div>
                                {tx.date?.toDate?.() 
                                  ? tx.date.toDate().toLocaleString('en-PK') 
                                  : tx.date 
                                  ? new Date(tx.date).toLocaleString('en-PK') 
                                  : '—'}
                              </div>
                              <div className="font-mono">{tx.cashierId}</div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                              {vid.createdAt?.toDate?.()?.toLocaleDateString()}
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
    </div>
  );
}
