'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, User, Heart, Save, Loader2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NewPatientPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [packageAmount, setPackageAmount] = useState('60000');
  const [diagnosis, setDiagnosis] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');

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
    setLoading(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !admissionDate || !packageAmount) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const newPatientRef = await addDoc(collection(db, 'rehab_patients'), {
        name,
        photoUrl: photoUrl || null,
        admissionDate: Timestamp.fromDate(new Date(admissionDate)),
        packageAmount: Number(packageAmount),
        diagnosis: diagnosis || null,
        assignedStaffId: assignedStaffId || null,
        isActive: true,
        createdAt: Timestamp.now()
      });
      
      toast.success('Patient added ✓');
      router.push(`/departments/rehab/dashboard/admin/patients/${newPatientRef.id}`);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error('Failed to add patient');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header & Back Link */}
        <div className="flex flex-col gap-4">
          <Link 
            href="/departments/rehab/dashboard/admin/patients" 
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-teal-600" />
              Add New Patient
            </h1>
            <p className="text-sm text-gray-500 mt-1">Register a new patient into the rehab system.</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            {/* Core Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-50">
                <Heart className="w-5 h-5 text-gray-400" />
                Core Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all placeholder-gray-400"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Admission Date *</label>
                  <input
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Package Amount (PKR) *</label>
                  <input
                    type="number"
                    value={packageAmount}
                    onChange={(e) => setPackageAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all font-medium"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-50">
                <Save className="w-5 h-5 text-gray-400" />
                Additional Info
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Diagnosis / Notes</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all placeholder-gray-400 resize-none"
                  placeholder="e.g. Heroin addiction, referred by Dr. Smith..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                  Photo URL
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm"
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-gray-500 mt-2 ml-1">
                  Cloudinary upload coming soon — paste a direct image URL for now.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned Staff ID (Optional)</label>
                <input
                  type="text"
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm font-mono"
                  placeholder="Staff document ID"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
              <Link 
                href="/departments/rehab/dashboard/admin/patients"
                className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Add Patient
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
