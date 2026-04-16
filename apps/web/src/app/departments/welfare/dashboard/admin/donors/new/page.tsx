// src/app/departments/welfare/dashboard/admin/donors/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp, doc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createWelfareUserServer } from '@/app/departments/welfare/actions/createWelfareUser';
import { Child } from '@/types/welfare';
import { 
  ArrowLeft, Heart, Save, Loader2, User, Phone, MapPin, 
  Eye, EyeOff, Shield, Banknote, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RegisterDonorPage() {
  const router = useRouter();
  
  // Auth & UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [error, setError] = useState('');

  // SECTION 1: Login Credentials (Optional for portal access)
  const [enableLogin, setEnableLogin] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // SECTION 2: Donor Personal Information
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [cnic, setCnic] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  // SECTION 3: Donation Preferences
  const [donationScope, setDonationScope] = useState<'whole_welfare' | 'specific_child'>('whole_welfare');
  const [donationType, setDonationType] = useState<'monthly_retainer' | 'one_time' | 'variable'>('monthly_retainer');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  
  // Specific Child Link
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [notes, setNotes] = useState('');

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
    fetchChildren();
  }, [router]);

  const fetchChildren = async () => {
    try {
      const q = query(collection(db, 'welfare_children'), where('isActive', '==', true), orderBy('name'));
      const snap = await getDocs(q);
      setChildrenList(snap.docs.map(d => ({ id: d.id, ...d.data() } as Child)));
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load children list');
      setLoading(false);
    }
  };

  const generateDonorNumber = async () => {
    const dRef = collection(db, 'welfare_donors');
    const q = query(dRef, orderBy('serialNumber', 'desc'), limit(1));
    const snap = await getDocs(q);
    let nextSerial = 1;
    if (!snap.empty) {
      nextSerial = (snap.docs[0].data().serialNumber || 0) + 1;
    }
    const numStr = nextSerial.toString().padStart(3, '0');
    return { serial: nextSerial, number: `WLF-DNR-${numStr}` };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!fullName || !contactNumber) {
      setError('Name and Contact Number are required');
      toast.error('Missing required fields');
      return;
    }

    if (donationScope === 'specific_child' && !selectedChildId) {
      setError('Please select a child to sponsor');
      return;
    }

    if (enableLogin) {
      if (!loginId || !loginPassword) {
        setError('Login ID and password are required if login is enabled');
        return;
      }
      if (loginPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      setSubmitStatus('Generating Donor ID...');
      const { serial, number } = await generateDonorNumber();
      
      let linkedChildName = '';
      if (donationScope === 'specific_child') {
        const child = childrenList.find(c => c.id === selectedChildId);
        if (child) linkedChildName = child.name;
      }

      setSubmitStatus('Creating donor record...');
      const donorData: any = {
        serialNumber: serial,
        donorNumber: number,
        fullName,
        fatherName: fatherName || null,
        cnic: cnic || null,
        contactNumber,
        whatsappNumber: whatsappNumber || null,
        address: address || null,
        email: email || null,
        donationScope,
        linkedChildId: donationScope === 'specific_child' ? selectedChildId : null,
        linkedChildName: donationScope === 'specific_child' ? linkedChildName : null,
        donationType,
        monthlyAmount: donationType === 'monthly_retainer' ? Number(monthlyAmount) : null,
        notes: notes || null,
        isActive: true,
        loginUserId: enableLogin ? loginId.toUpperCase() : null,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'welfare_donors'), donorData);

      if (enableLogin) {
        setSubmitStatus('Creating portal access...');
        const result = await createWelfareUserServer(
          loginId.toUpperCase(),
          loginPassword,
          'donor',
          fullName,
          undefined,
          docRef.id
        );

        if (!result.success) {
          setError(`Account created, but portal login failed: ${result.error}.`);
          toast.success('Donor created without login access');
          router.push(`/departments/welfare/dashboard/admin/donors`);
          return;
        }
      }

      setSubmitStatus('Done!');
      toast.success('Donor registered successfully ✓');
      router.push(`/departments/welfare/dashboard/admin/donors`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong');
      toast.error('Submission failed');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <Icon size={16} className="text-teal-500" />
      <h3 className="font-black text-gray-700 text-sm uppercase tracking-widest">
        {title}
      </h3>
    </div>
  );

  const inputStyle = "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm transition-all";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/departments/welfare/dashboard/admin/donors" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Donors
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Banknote className="w-6 h-6 text-teal-600" />
              Register New Donor
            </h1>
            <p className="text-sm text-gray-500 mt-1">Enroll a new sponsor for the welfare home.</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            
            {/* SECTION 1: Personal Info */}
            <div className="space-y-4">
              <SectionHeader icon={User} title="Donor Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Full Name *</label>
                  <input required placeholder="Donor Name" className={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Father's Name</label>
                  <input placeholder="Optional" className={inputStyle} value={fatherName} onChange={e => setFatherName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Contact Number *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required className={`${inputStyle} pl-10`} placeholder="03XXXXXXXXX" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">WhatsApp</label>
                  <input className={inputStyle} placeholder="Optional" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">CNIC</label>
                  <input className={inputStyle} placeholder="XXXXX-XXXXXXX-X" value={cnic} onChange={e => setCnic(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Email Address</label>
                  <input type="email" className={inputStyle} placeholder="Optional" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Address</label>
                  <textarea rows={2} className={inputStyle} placeholder="Residential address" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
            </div>

            {/* SECTION 2: Donation Preferences */}
            <div className="space-y-4 mt-10">
              <SectionHeader icon={Heart} title="Donation Preferences" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Donation Scope</label>
                  <select className={inputStyle} value={donationScope} onChange={e => setDonationScope(e.target.value as any)}>
                    <option value="whole_welfare">General Welfare Support</option>
                    <option value="specific_child">Sponsor Specific Child</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Donation Type</label>
                  <select className={inputStyle} value={donationType} onChange={e => setDonationType(e.target.value as any)}>
                    <option value="monthly_retainer">Monthly Retainer</option>
                    <option value="one_time">One-Time Contribution</option>
                    <option value="variable">Variable/Occasional</option>
                  </select>
                </div>
              </div>

              {donationScope === 'specific_child' && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-3">
                  <label className="text-xs font-bold text-blue-800 uppercase flex items-center gap-2">
                    <Search size={14} /> Link to Child
                  </label>
                  <select 
                    className={inputStyle} 
                    value={selectedChildId}
                    onChange={e => setSelectedChildId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Child to Sponsor --</option>
                    {childrenList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.admissionNumber})</option>
                    ))}
                  </select>
                </div>
              )}

              {donationType === 'monthly_retainer' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase px-1">Monthly Pledged Amount (PKR)</label>
                  <input required type="number" min="0" placeholder="e.g. 5000" className={inputStyle} value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} />
                </div>
              )}
            </div>

            {/* SECTION 3: Portal Access (Optional) */}
            <div className="space-y-4 mt-10">
              <SectionHeader icon={Shield} title="Donor Portal Access" />
              
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={enableLogin}
                  onChange={e => setEnableLogin(e.target.checked)}
                  className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="font-bold text-gray-900 text-sm">Create Login Account</div>
                  <div className="text-xs text-gray-500">Allow donor to log in to see donation history and child progress</div>
                </div>
              </label>

              {enableLogin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-teal-100 bg-teal-50/30 rounded-xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase px-1">Login ID / Username *</label>
                    <input placeholder="e.g. DNR-AMIR" className={inputStyle} value={loginId} onChange={e => setLoginId(e.target.value.toUpperCase())} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase px-1">Login Password * (Min 6 chars)</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} placeholder="••••••••" className={inputStyle} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 mt-10">
              <label className="text-xs font-bold text-gray-500 uppercase px-1">Internal Notes</label>
              <textarea rows={3} className={inputStyle} placeholder="Any specific requirements or instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700 text-sm font-semibold">
                {error}
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-900/10 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="animate-pulse">{submitStatus}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                    Register Donor
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
