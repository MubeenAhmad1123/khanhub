'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { 
  User, Camera, Save, Loader2, Shield, UserCog, 
  CreditCard, Heart, Users, Edit3, CheckCircle, Phone, X 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [profile, setProfile] = useState<any>(null);
  const [staffData, setStaffData] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Core User Doc
      const userDoc = await getDoc(doc(db, 'spims_users', session.uid));
      if (!userDoc.exists()) {
        toast.error('Profile not found.');
        router.push('/departments/spims/login');
        return;
      }
      const data = userDoc.data();
      setProfile({ id: userDoc.id, ...data });
      setEditForm({ 
        displayName: data.displayName || '', 
        phone: data.phone || '' 
      });

      // 2. Role Specific Data
      if (session.role === 'staff') {
        const staffQ = query(collection(db, 'spims_staff'), where('loginUserId', '==', session.uid));
        const staffSnap = await getDocs(staffQ);
        if (!staffSnap.empty) {
          setStaffData(staffSnap.docs[0].data());
        }
      } else if (session.role === 'family') {
        if (data.patientId) {
          const patDoc = await getDoc(doc(db, 'spims_patients', data.patientId));
          if (patDoc.exists()) {
            setFamilyData(patDoc.data());
          }
        }
      }

    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  useEffect(() => {
    const sessionData = localStorage.getItem('spims_session');
    if (!sessionData) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    fetchProfileData();
  }, [session, fetchProfileData]);

  const handleSaveEdit = async () => {
    if (!editForm.displayName.trim()) {
      toast.error('Display Name cannot be empty');
      return;
    }

    try {
      setSavingEdit(true);
      await updateDoc(doc(db, 'spims_users', session.uid), {
        displayName: editForm.displayName,
        phone: editForm.phone
      });

      setProfile((prev: any) => ({ ...prev, displayName: editForm.displayName, phone: editForm.phone }));
      
      // Update session Storage too
      const newSession = { ...session, displayName: editForm.displayName };
      localStorage.setItem('spims_session', JSON.stringify(newSession));
      setSession(newSession);

      setIsEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      console.error("Save error:", error);
      toast.error('Failed to update profile');
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const url = await uploadToCloudinary(file, 'khanhub/spims/profiles');
      
      await updateDoc(doc(db, 'spims_users', session.uid), { photoUrl: url });
      
      setProfile((prev: any) => ({ ...prev, photoUrl: url }));
      toast.success('Photo updated');
    } catch (error) {
      console.error("Upload error", error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!profile) return null;

  const roleColors: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
    admin: 'bg-blue-100 text-blue-700 border-blue-200',
    cashier: 'bg-amber-100 text-amber-700 border-amber-200',
    staff: 'bg-teal-100 text-teal-700 border-teal-200',
    family: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* PROFILE HEADER & INFO CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="h-32 bg-gradient-to-r from-teal-500 to-teal-700 relative">
             <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
          </div>
          
          <div className="px-6 md:px-10 pb-8 relative text-center md:text-left">
            {/* Avatar block */}
            <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8 -mt-16 mb-6">
              <div className="relative mx-auto md:mx-0 inline-block group">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-teal-100 text-teal-700 flex items-center justify-center text-5xl font-bold">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-1 right-1 w-10 h-10 bg-gray-900 border-2 border-white text-white rounded-full flex items-center justify-center shadow-md hover:bg-teal-600 transition-colors disabled:opacity-50 z-10"
                >
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload}
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              <div className="flex-1 pb-2">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                  <h1 className="text-3xl font-black text-gray-900">{profile.displayName}</h1>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${roleColors[profile.role] || 'bg-gray-100'}`}>
                    {profile.role}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{profile.customId}</span>
                  {profile.isActive ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle className="w-4 h-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 font-medium"><X className="w-4 h-4" /> Inactive</span>
                  )}
                </div>
              </div>

              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="hidden md:flex bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>

            {/* Edit / Details Section */}
            <div className="bg-gray-50 rounded-2xl p-5 md:p-6 border border-gray-100 mt-2">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                 <h3 className="font-bold text-gray-900">Personal Details</h3>
                 {isEditing && (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg transition-colors hidden sm:block">Cancel</button>
                      <button onClick={handleSaveEdit} disabled={savingEdit} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm text-sm font-medium px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                        {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                      </button>
                    </div>
                 )}
              </div>
              
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Display Name</label>
                    <input type="text" value={editForm.displayName} onChange={e => setEditForm({...editForm, displayName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Phone className="w-4 h-4" /></div>
                      <input type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Optional" />
                    </div>
                  </div>
                   <div className="sm:col-span-2 pt-2 sm:hidden flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="flex-1 text-sm bg-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-xl">Cancel</button>
                      <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 bg-teal-600 text-white shadow-sm text-sm font-medium px-4 py-2.5 rounded-xl flex items-center justify-center gap-2">
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 text-left">
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5"/> Display Name</span>
                    <span className="text-gray-900 font-medium">{profile.displayName}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> Phone Number</span>
                    <span className="text-gray-900 font-medium">{profile.phone || <em className="text-gray-400 font-normal">Not provided</em>}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Shield className="w-3.5 h-3.5"/> System Role</span>
                    <span className="text-gray-900 font-medium capitalize">{profile.role}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Joined Portal</span>
                    <span className="text-gray-900 font-medium">{profile.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</span>
                  </div>
                  <div className="sm:hidden pt-3 w-full">
                     <button onClick={() => setIsEditing(true)} className="w-full bg-white border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2">
                       <Edit3 className="w-4 h-4"/> Edit Profile
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROLE SPECIFIC OVERVIEW SECTION */}
        
        {session.role === 'staff' && staffData && (
          <div className="bg-white rounded-3xl shadow-sm border border-teal-100 p-6 md:p-8 flex items-start gap-4">
            <div className="bg-teal-50 p-3 rounded-2xl hidden sm:block"><UserCog className="w-8 h-8 text-teal-600"/></div>
            <div className="flex-1 text-left">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex justify-between items-center w-full">
                Staff Employment Summary
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider border border-gray-200">Read Only</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="text-xs font-bold text-gray-400 uppercase mb-1">Department</div><div className="font-medium text-gray-900">{staffData.departmentRole}</div></div>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="text-xs font-bold text-gray-400 uppercase mb-1">Gender</div><div className="font-medium text-gray-900 capitalize">{staffData.gender}</div></div>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="text-xs font-bold text-gray-400 uppercase mb-1">Monthly Salary</div><div className="font-bold text-teal-700 text-lg">Rs. {staffData.salary?.toLocaleString()}</div></div>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="text-xs font-bold text-gray-400 uppercase mb-1">Joined Center</div><div className="font-medium text-gray-900">{staffData.joiningDate?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', year: 'numeric'}) || 'N/A'}</div></div>
              </div>
              {staffData.duties && staffData.duties.length > 0 && (
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">Assigned Duties</h4>
                  <ul className="list-decimal pl-5 space-y-1.5 text-sm text-gray-600">
                    {staffData.duties.map((duty: any, i: number) => (
                      <li key={duty.id || i}>{duty.description || duty}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {session.role === 'family' && familyData && (
          <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6 md:p-8 flex items-start flex-col sm:flex-row gap-4">
            <div className="bg-green-50 p-3 rounded-2xl hidden sm:block"><Heart className="w-8 h-8 text-green-600"/></div>
            <div className="flex-1 text-left w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex justify-between items-center w-full">
                Linked Patient Profile
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider border border-gray-200">Read Only</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="text-xs font-bold text-gray-400 uppercase mb-1">Patient Name</div><div className="font-bold text-gray-900 text-lg">{familyData.name}</div></div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="text-xs font-bold text-gray-400 uppercase mb-1">Admitted On</div><div className="font-medium text-gray-900">{familyData.admissionDate?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'})}</div></div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-200"><div className="text-xs font-bold text-green-700/70 uppercase mb-1">Package / Month</div><div className="font-black text-green-800 text-lg">Rs. {familyData.packageAmount?.toLocaleString()}</div></div>
              </div>
              <p className="mt-4 text-xs text-gray-400 text-center sm:text-left bg-gray-50 p-3 rounded-lg">To update patient information, diagnosis, or package amounts, please contact the center administration directly.</p>
            </div>
          </div>
        )}

        {session.role === 'cashier' && (
          <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-6 flex items-center gap-5">
            <div className="bg-amber-50 p-4 rounded-2xl flex-shrink-0"><CreditCard className="w-8 h-8 text-amber-600"/></div>
            <div className="text-left w-full">
               <h3 className="text-lg font-bold text-gray-900 mb-1">Cashier Station Access</h3>
               <p className="text-sm text-gray-500 mb-2">You have dedicated access to record all incoming and outgoing financial transactions for the spims center.</p>
               <button onClick={() => router.push('/departments/spims/dashboard/cashier')} className="text-sm font-semibold text-amber-600 hover:text-amber-800">Go to Cashier Station &rarr;</button>
            </div>
          </div>
        )}

        {(session.role === 'admin' || session.role === 'superadmin') && (
          <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className={`${session.role === 'superadmin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'} p-4 rounded-2xl flex-shrink-0`}><Shield className="w-8 h-8"/></div>
            <div>
               <h3 className="text-lg font-bold text-gray-900 mb-1">{session.role === 'superadmin' ? 'Super Administrator Access' : 'Administrator Access'}</h3>
               <p className="text-sm text-gray-600">
                 {session.role === 'superadmin' 
                   ? 'You have complete oversight of the system. This includes approving all cashier financial entries, deleting historical records, verifying org reports, and comprehensive management.'
                   : 'You can manage all patients, register staff, assign duties, and view overall financial reports and daily logs.'}
               </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

