'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { Donor, Transaction } from '@/types/welfare';
import { formatDateDMY } from '@/lib/utils';
import { 
  ArrowLeft, Heart, User, Phone, MapPin, 
  Banknote, Calendar, ShieldCheck, Mail, AlertTriangle, FileText, Loader2, ArrowRight,
  Edit3, Save, Trash2, X, Activity, UserCog, UserCheck, Briefcase, GraduationCap, Droplet
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DonorProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [donor, setDonor] = useState<Donor | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<Partial<Donor>>({});

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
    fetchDonorDetails();
    fetchChildren();
  }, [params.id, router]);

  const fetchDonorDetails = async () => {
    try {
      setLoading(true);
      // Fetch Donor
      const donorDoc = await getDoc(doc(db, 'welfare_donors', params.id));
      if (!donorDoc.exists()) {
        toast.error('Donor not found');
        router.push('/departments/welfare/dashboard/admin/donors');
        return;
      }
      const data = donorDoc.data() as Donor;
      setDonor({ ...data, id: donorDoc.id });
      setEditForm({ ...data, id: donorDoc.id });

      // Fetch Donor's Transactions (Donations)
      const txnQuery = query(
        collection(db, 'welfare_transactions'),
        where('donorId', '==', params.id),
        where('type', '==', 'income'),
        orderBy('createdAt', 'desc')
      );
      const txnSnap = await getDocs(txnQuery);
      setTransactions(txnSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    } catch (err) {
      console.error('Error fetching donor profile:', err);
      toast.error('Failed to load donor profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const q = query(collection(db, 'welfare_children'), where('isActive', '==', true));
      const snap = await getDocs(q);
      setChildrenList(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    } catch (err) {
      console.error('Error fetching children:', err);
    }
  };

  const handleDeleteDonor = async () => {
    if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) return;
    const confirmStr = window.prompt(`To permanently delete this donor profile, type "DELETE" below:`);
    if (confirmStr !== 'DELETE') {
      if (confirmStr !== null) toast.error('Deletion cancelled.');
      return;
    }
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'welfare_donors', params.id));
      toast.success('Donor profile deleted successfully');
      router.push('/departments/welfare/dashboard/admin/donors');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete donor profile');
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      let childName = '';
      if (editForm.donationScope === 'specific_child' && editForm.linkedChildId) {
        const c = childrenList.find(child => child.id === editForm.linkedChildId);
        if (c) childName = c.name;
      }

      const updatedData: any = {
        fullName: editForm.fullName || '',
        fatherName: editForm.fatherName || null,
        cnic: editForm.cnic || null,
        contactNumber: editForm.contactNumber || '',
        whatsappNumber: editForm.whatsappNumber || null,
        address: editForm.address || null,
        email: editForm.email || null,
        profession: editForm.profession || null,
        education: editForm.education || null,
        bloodGroup: editForm.bloodGroup || null,
        city: editForm.city || null,
        district: editForm.district || null,
        province: editForm.province || null,
        referringMemberName: editForm.referringMemberName || null,
        referringMemberFatherName: editForm.referringMemberFatherName || null,
        referringMemberId: editForm.referringMemberId || null,
        referringMemberMobile: editForm.referringMemberMobile || null,
        referringMemberAddress: editForm.referringMemberAddress || null,
        donationScope: editForm.donationScope || 'whole_welfare',
        linkedChildId: editForm.donationScope === 'specific_child' ? (editForm.linkedChildId || null) : null,
        linkedChildName: editForm.donationScope === 'specific_child' ? (childName || null) : null,
        donationType: editForm.donationType || 'monthly_retainer',
        monthlyAmount: editForm.donationType === 'monthly_retainer' ? (Number(editForm.monthlyAmount) || null) : null,
        notes: editForm.notes || null,
        isActive: editForm.isActive ?? true
      };

      await updateDoc(doc(db, 'welfare_donors', params.id), updatedData);
      setDonor(prev => prev ? ({ ...prev, ...updatedData }) : null);
      setIsEditing(false);
      toast.success('Donor details updated ✓');
    } catch (err) {
      console.error('Error updating donor:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof Donor | string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading donor profile...</p>
      </div>
    );
  }

  if (!donor) return null;

  const SectionCard = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <h3 className="text-lg font-black text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );

  const FormField = ({ label, value, type = "text", fieldKey, options }: any) => {
    const isEmpty = value === null || value === undefined || value === '';
    
    if (!isEditing) {
      let displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (isEmpty ? '—' : value);
      return (
        <div className="space-y-1">
          <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</span>
          <span className={`text-sm font-semibold text-gray-900 block ${isEmpty ? 'text-gray-300 italic' : ''}`}>
            {displayValue}
          </span>
        </div>
      );
    }

    if (type === "boolean") {
      return (
        <div className="space-y-1">
          <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</label>
          <select 
            value={value ? 'true' : 'false'} 
            onChange={e => handleFieldChange(fieldKey, e.target.value === 'true')}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px]"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
      );
    }

    if (type === "select" && options) {
      return (
        <div className="space-y-1">
          <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</label>
          <select 
            value={value ?? ''} 
            onChange={e => handleFieldChange(fieldKey, e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px] capitalize"
          >
            <option value="">Select...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt} className="capitalize">{opt.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">{label}</label>
        {type === 'textarea' ? (
          <textarea
            value={value ?? ''}
            onChange={e => handleFieldChange(fieldKey, e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            rows={2}
          />
        ) : (
          <input
            type={type}
            value={value ?? ''}
            onChange={e => handleFieldChange(fieldKey, type === 'number' ? Number(e.target.value) : e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px]"
          />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4">
      {/* Top toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <Link 
          href="/departments/welfare/dashboard/admin/donors" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 
          Back to Registry
        </Link>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isEditing ? (
            <button 
              onClick={() => {
                setEditForm({ ...donor });
                setIsEditing(true);
              }} 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit3 size={14} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(false)} 
                className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit} 
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-teal-900/10 disabled:opacity-70 transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />} 
                Save
              </button>
            </div>
          )}

          {(session?.role === 'admin' || session?.role === 'superadmin') && (
            <button
              onClick={handleDeleteDonor}
              className="inline-flex items-center text-xs font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors uppercase tracking-widest cursor-pointer border border-transparent hover:border-rose-100"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Profile
            </button>
          )}
        </div>
      </div>

      {/* Header Profile Summary */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 w-full p-6 md:p-10 flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-50 rounded-bl-full opacity-50 -z-0"></div>
        
        <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-black text-4xl border-4 border-white shadow-md">
          {donor.fullName.charAt(0).toUpperCase()}
        </div>
        
        <div className="relative z-10 text-center w-full max-w-xl">
          <h1 className="text-3xl font-black text-gray-900 mb-2">{donor.fullName}</h1>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 mb-6">
            <span className="flex items-center justify-center gap-1 font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest text-xs">
              {donor.donorNumber}
            </span>
            <span className="flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4" /> 
              Joined {formatDateDMY(donor.createdAt)}
            </span>
            <span className={`flex items-center justify-center gap-1 font-medium px-3 py-1 rounded-full text-xs uppercase tracking-widest ${donor.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <ShieldCheck className="w-4 h-4" /> {donor.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
              <Phone className="w-4 h-4 text-gray-400" />
              {donor.contactNumber}
            </div>
            {donor.email && (
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                <Mail className="w-4 h-4 text-gray-400" />
                {donor.email}
              </div>
            )}
            {donor.address && (
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl max-w-xs truncate">
                <MapPin className="w-4 h-4 text-gray-400" />
                {donor.address}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main profile details tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Editing form */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="1. Personal Information" icon={User}>
            <FormField label="Full Name" value={editForm.fullName} fieldKey="fullName" />
            <FormField label="Father's Name" value={editForm.fatherName} fieldKey="fatherName" />
            <FormField label="CNIC" value={editForm.cnic} fieldKey="cnic" />
            <FormField label="Contact Number" value={editForm.contactNumber} fieldKey="contactNumber" />
            <FormField label="WhatsApp Number" value={editForm.whatsappNumber} fieldKey="whatsappNumber" />
            <FormField label="Blood Group" value={editForm.bloodGroup} type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} fieldKey="bloodGroup" />
            <FormField label="Profession" value={editForm.profession} fieldKey="profession" />
            <FormField label="Education" value={editForm.education} fieldKey="education" />
          </SectionCard>

          <SectionCard title="2. Location details" icon={MapPin}>
            <FormField label="Address" value={editForm.address} fieldKey="address" />
            <FormField label="City" value={editForm.city} fieldKey="city" />
            <FormField label="District" value={editForm.district} fieldKey="district" />
            <FormField label="Province" value={editForm.province} fieldKey="province" />
          </SectionCard>

          <SectionCard title="3. Sponsorship Preferences" icon={Heart}>
            <FormField label="Scope" value={editForm.donationScope} type="select" options={['whole_welfare', 'specific_child']} fieldKey="donationScope" />
            
            {editForm.donationScope === 'specific_child' && (
              isEditing ? (
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">Link sponsored Child</label>
                  <select 
                    value={editForm.linkedChildId ?? ''} 
                    onChange={e => handleFieldChange('linkedChildId', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none h-[42px]"
                  >
                    <option value="">Select Child...</option>
                    {childrenList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">Sponsored Child</span>
                  {donor.linkedChildId ? (
                    <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 rounded-xl px-3 py-2 mt-0.5 justify-between">
                      <span className="font-bold text-blue-700 text-sm">{donor.linkedChildName || 'Linked Child'}</span>
                      <Link 
                        href={`/departments/welfare/dashboard/admin/children/${donor.linkedChildId}`}
                        className="w-6 h-6 rounded-full bg-white text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors shadow-sm"
                      >
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400 block italic">Not linked to a child</span>
                  )}
                </div>
              )
            )}

            <FormField label="Donation Type" value={editForm.donationType} type="select" options={['monthly_retainer', 'one_time', 'variable']} fieldKey="donationType" />
            
            {editForm.donationType === 'monthly_retainer' && (
              <FormField label="Pledged Monthly Amount (PKR)" value={editForm.monthlyAmount} type="number" fieldKey="monthlyAmount" />
            )}
            
            {isEditing && (
              <FormField label="Is Active" value={editForm.isActive} type="boolean" fieldKey="isActive" />
            )}
          </SectionCard>

          {/* Referring Member Info */}
          {(isEditing || donor.referringMemberName) && (
            <SectionCard title="4. Referring Member Details" icon={UserCheck}>
              <FormField label="Referring Member Name" value={editForm.referringMemberName} fieldKey="referringMemberName" />
              <FormField label="Father's Name" value={editForm.referringMemberFatherName} fieldKey="referringMemberFatherName" />
              <FormField label="Member ID" value={editForm.referringMemberId} fieldKey="referringMemberId" />
              <FormField label="Mobile Number" value={editForm.referringMemberMobile} fieldKey="referringMemberMobile" />
              <FormField label="Address" value={editForm.referringMemberAddress} fieldKey="referringMemberAddress" />
            </SectionCard>
          )}

          {(isEditing || donor.notes) && (
            <div className="bg-amber-50 rounded-[2rem] border border-amber-100 p-6 md:p-8">
              <h3 className="text-sm font-black text-amber-900 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <AlertTriangle className="w-4 h-4" /> Internal Notes
              </h3>
              {isEditing ? (
                <textarea 
                  value={editForm.notes ?? ''} 
                  onChange={e => handleFieldChange('notes', e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  rows={3}
                  placeholder="Internal details, notes, preferences..."
                />
              ) : (
                <p className="text-amber-800 text-sm leading-relaxed">{donor.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Transactions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-teal-600" />
                Donation History
              </h3>
              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                {transactions.length} Records
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-gray-300" />
                </div>
                <h4 className="text-gray-900 font-bold text-sm">No Donations Found</h4>
                <p className="text-gray-400 text-xs mt-1">This donor has no recorded transactions yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {transactions.map(txn => (
                  <div key={txn.id} className="p-4 hover:bg-gray-50/50 transition-colors flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-gray-900 text-sm">
                        Rs {txn.amount.toLocaleString()}
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                        txn.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                        txn.status === 'pending' || txn.status === 'pending_cashier' ? 'bg-amber-50 text-amber-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {txn.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 flex justify-between">
                      <span>{formatDateDMY(txn.createdAt)}</span>
                      <span>{txn.categoryName || txn.category}</span>
                    </div>
                    {txn.txnDescription && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg truncate mt-1">
                        {txn.txnDescription}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
