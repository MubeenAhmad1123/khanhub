'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, Building, User, MapPin, Globe, Mail, Phone, 
  Settings, Loader2, Save, X, Camera, CheckCircle, 
  Briefcase, AlertCircle, Trash2, LayoutDashboard, Sparkles,
  Search, Info, Heart, Rocket
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

// Unified Profile Type for Editing
interface UnifiedProfile {
  id: string;
  type: 'employer' | 'seeker';
  name: string;
  subtext: string; // Industry for employer, Career Goals for seeker
  photoUrl: string;
  status: string;
  phone: string;
  email: string;
  address: string;
  // Specific fields
  website?: string;
  contactPerson?: string;
  salaryExpectation?: number;
  skills?: string[];
  description?: string;
}

export default function UniversalEditProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UnifiedProfile | null>(null);
  
  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    fetchProfile();
  }, [id, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Try fetching as Employer first
      const empRef = doc(db, 'jobcenter_employers', id);
      const empSnap = await getDoc(empRef);
      
      if (empSnap.exists()) {
        const data = empSnap.data();
        setProfile({
          id: empSnap.id,
          type: 'employer',
          name: data.companyName || '',
          subtext: data.industry || '',
          photoUrl: data.logoUrl || '',
          status: data.hiringStatus || (data.isActive ? 'hiring' : 'closed'),
          phone: data.contactPerson?.phone || data.phone || '',
          email: data.email || '',
          address: data.address || '',
          website: data.website || '',
          contactPerson: data.contactPerson?.name || '',
          description: data.description || ''
        });
        setPhotoPreview(data.logoUrl || '');
      } else {
        // Try fetching as Seeker
        const seekerRef = doc(db, 'jobcenter_seekers', id);
        const seekerSnap = await getDoc(seekerRef);
        
        if (seekerSnap.exists()) {
          const data = seekerSnap.data();
          setProfile({
            id: seekerSnap.id,
            type: 'seeker',
            name: data.name || '',
            subtext: data.careerGoals || data.diagnosis || '',
            photoUrl: data.photoUrl || '',
            status: data.status || (data.isActive ? 'actively_looking' : 'on_hold'),
            phone: data.phone || data.contactNumber || '',
            email: data.email || '',
            address: data.address || '',
            salaryExpectation: data.salaryExpectation || 0,
            skills: data.skills || [],
            description: data.notes || ''
          });
          setPhotoPreview(data.photoUrl || '');
        } else {
          toast.error('Profile not found in any registry');
          router.back();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error fetching profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      let finalPhotoUrl = profile.photoUrl;

      // Handle Photo Upload
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          const folder = profile.type === 'employer' ? 'khanhub/job-center/employers' : 'khanhub/job-center/seekers';
          finalPhotoUrl = await uploadToCloudinary(photoFile, folder);
        } catch (err) {
          console.error('Upload failed', err);
          toast.error('Photo upload failed');
        } finally {
          setUploadingPhoto(false);
        }
      }

      const collectionName = profile.type === 'employer' ? 'jobcenter_employers' : 'jobcenter_seekers';
      const docRef = doc(db, collectionName, id);

      let updateData: any = {};
      
      if (profile.type === 'employer') {
        updateData = {
          companyName: profile.name,
          industry: profile.subtext,
          logoUrl: finalPhotoUrl,
          hiringStatus: profile.status,
          isActive: profile.status !== 'closed',
          email: profile.email,
          address: profile.address,
          website: profile.website,
          description: profile.description,
          'contactPerson.name': profile.contactPerson,
          'contactPerson.phone': profile.phone,
        };
      } else {
        updateData = {
          name: profile.name,
          careerGoals: profile.subtext,
          photoUrl: finalPhotoUrl,
          status: profile.status,
          isActive: profile.status !== 'on_hold',
          phone: profile.phone,
          email: profile.email,
          address: profile.address,
          salaryExpectation: Number(profile.salaryExpectation),
          notes: profile.description
        };
      }

      await updateDoc(docRef, updateData);
      toast.success('Profile updated successfully ✓');
      
      // Redirect back after a short delay
      setTimeout(() => {
        router.push(`/departments/job-center/dashboard/admin/${profile.type === 'employer' ? 'employers' : 'seekers'}/${id}`);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 w-6 h-6 animate-pulse" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Initializing Interface...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isEmployer = profile.type === 'employer';
  const accentColor = isEmployer ? 'indigo' : 'orange';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all border border-transparent hover:border-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                Edit {isEmployer ? 'Company' : 'Candidate'} Profile
                <span className={`text-[9px] px-2 py-0.5 rounded-full bg-${accentColor}-50 text-${accentColor}-600 border border-${accentColor}-100`}>
                  {profile.type}
                </span>
              </h1>
              <p className="text-[10px] font-mono text-gray-400 mt-0.5">ID: {profile.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-all"
             >
               Discard
             </button>
             <button 
              onClick={handleSave}
              disabled={saving}
              className={`bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.1em] flex items-center gap-2 shadow-xl shadow-${accentColor}-900/20 active:scale-95 transition-all disabled:opacity-50`}
             >
               {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
               {saving ? 'Publishing...' : 'Save Changes'}
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: IDENTITY & STATUS */}
        <div className="lg:col-span-4 space-y-8">
           {/* Profile Picture / Logo */}
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-full h-1 bg-${accentColor}-600`} />
              
              <div className="relative inline-block mb-6">
                <div className={`w-32 h-32 rounded-[2.5rem] bg-gray-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-4xl font-black text-${accentColor}-600`}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <button 
                  onClick={() => photoInputRef.current?.click()}
                  className={`absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-${accentColor}-600 shadow-xl hover:scale-110 transition-transform active:scale-90`}
                >
                  <Camera size={18} />
                </button>
                <input 
                  type="file" 
                  ref={photoInputRef} 
                  className="hidden" 
                  accept="image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type.startsWith('image/') && file.type !== 'image/webp') {
                        toast.error('Only WebP images are allowed');
                        return;
                      }
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>

              <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{profile.name || 'Set Name'}</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                {profile.subtext || (isEmployer ? 'No Industry Set' : 'No Objectives Set')}
              </p>

              <div className="mt-8 pt-8 border-t border-gray-50 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Availability Tag</label>
                <div className="grid grid-cols-1 gap-2">
                  {(isEmployer ? ['hiring', 'urgent_hiring', 'partnered', 'closed'] : ['actively_looking', 'interviewing', 'placed', 'on_hold']).map((status) => (
                    <button
                      key={status}
                      onClick={() => setProfile({...profile, status})}
                      className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between group ${
                        profile.status === status 
                        ? `bg-${accentColor}-600 text-white shadow-lg shadow-${accentColor}-900/10` 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                    >
                      {status.replace(/_/g, ' ')}
                      {profile.status === status && <CheckCircle size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-xl bg-${accentColor}-50 flex items-center justify-center text-${accentColor}-600`}>
                  <AlertCircle size={16} />
                </div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Admin Note</h4>
             </div>
             <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
               This information is public facing. Ensure all details are verified before publishing to the KhanHub network.
             </p>
           </div>
        </div>

        {/* RIGHT COLUMN: CORE FIELDS */}
        <div className="lg:col-span-8 space-y-6 pb-20">
          
          {/* Section: Basic Information */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
               <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-3">
                 <Info size={16} className={`text-${accentColor}-600`} />
                 Profile Parameters
               </h3>
               <Sparkles size={16} className="text-gray-200" />
            </div>
            
            <div className="p-10 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isEmployer ? 'Company Legal Name' : 'Full Name'}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                        {isEmployer ? <Building size={16} /> : <User size={16} />}
                      </div>
                      <input 
                        type="text" 
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-300"
                        placeholder={isEmployer ? "e.g. Google Pakistan" : "e.g. Abdullah Khan"}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isEmployer ? 'Industry Category' : 'Primary Career Goal'}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                        <Briefcase size={16} />
                      </div>
                      <input 
                        type="text" 
                        value={profile.subtext}
                        onChange={(e) => setProfile({...profile, subtext: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-300"
                        placeholder={isEmployer ? "e.g. Technology & Logistics" : "e.g. Senior Frontend Developer"}
                      />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Phone</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                        <Phone size={16} />
                      </div>
                      <input 
                        type="tel" 
                        value={profile.phone}
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Email</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                        <Mail size={16} />
                      </div>
                      <input 
                        type="email" 
                        value={profile.email}
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                  </div>
               </div>

               {isEmployer ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Website URL</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                          <Globe size={16} />
                        </div>
                        <input 
                          type="url" 
                          value={profile.website}
                          onChange={(e) => setProfile({...profile, website: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Point of Contact (Name)</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                          <User size={16} />
                        </div>
                        <input 
                          type="text" 
                          value={profile.contactPerson}
                          onChange={(e) => setProfile({...profile, contactPerson: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all"
                          placeholder="HR Manager Name"
                        />
                      </div>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Salary Expectation (PKR / Month)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors font-black text-sm">
                        Rs.
                      </div>
                      <input 
                        type="number" 
                        value={profile.salaryExpectation}
                        onChange={(e) => setProfile({...profile, salaryExpectation: Number(e.target.value)})}
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                  </div>
               )}

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                      <MapPin size={16} />
                    </div>
                    <input 
                      type="text" 
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all"
                      placeholder="e.g. Block 4, Gulshan-e-Iqbal, Karachi"
                    />
                  </div>
               </div>
            </div>
          </div>

          {/* Section: Narrative / Description */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
             <div className="px-10 py-8 border-b border-gray-50">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Rocket size={16} className={`text-${accentColor}-600`} />
                  {isEmployer ? 'Company Bio' : 'Professional Summary'}
                </h3>
             </div>
             <div className="p-10">
                <textarea 
                  rows={6}
                  value={profile.description}
                  onChange={(e) => setProfile({...profile, description: e.target.value})}
                  className="w-full p-6 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all resize-none leading-relaxed"
                  placeholder={isEmployer ? "Tell us about your company's mission and values..." : "Write a brief summary of your skills and career objectives..."}
                />
             </div>
          </div>

          <div className="flex items-center justify-between p-10 bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
             <div className="relative z-10">
                <h4 className="text-white font-black text-lg mb-1 uppercase tracking-tight">Finalize Deployment</h4>
                <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest">Double check all fields before saving to cloud storage.</p>
             </div>
             <button 
                onClick={handleSave}
                disabled={saving}
                className={`relative z-10 bg-white text-gray-900 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 flex items-center gap-3`}
             >
                {saving ? 'Syncing...' : 'Push Updates'}
                {!saving && <Rocket size={16} className={`text-${accentColor}-600`} />}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
