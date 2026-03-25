'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { createPatient } from '@/lib/rehab/patients';

export default function NewPatientPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRehabSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    photoUrl: '',
    admissionDate: new Date().toISOString().split('T')[0],
    packageAmount: '',
    diagnosis: ''
  });

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }
  }, [user, sessionLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPatient({
        name: formData.name,
        photoUrl: formData.photoUrl || undefined,
        admissionDate: new Date(formData.admissionDate),
        packageAmount: parseFloat(formData.packageAmount),
        diagnosis: formData.diagnosis || undefined,
        assignedStaffId: '',
        isActive: true
      });
      router.push('/departments/rehab/dashboard/admin/patients');
    } catch (err) {
      alert('Error creating patient profile');
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) return <div className="p-20 text-center animate-pulse">Initializing...</div>;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">New Enrollment</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Register new patient to system</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-10">
        <div className="space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
             <span className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-sm font-bold text-blue-500">1</span>
             Personal Information
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
              <input
                type="text"
                required
                placeholder="Enter patient's full name..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Photo URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300 uppercase text-[10px]"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-10 border-t border-gray-50">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
             <span className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-sm font-bold text-orange-500">2</span>
             Admission Details
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Admission Date</label>
              <input
                type="date"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all"
                value={formData.admissionDate}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Monthly Package (PKR)</label>
              <input
                type="number"
                required
                placeholder="e.g. 60000"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300"
                value={formData.packageAmount}
                onChange={(e) => setFormData({ ...formData, packageAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Diagnosis / Notes</label>
              <textarea
                placeholder="Additional medical notes..."
                rows={4}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-700 font-bold focus:ring-4 focus:ring-[#1D9E75]/10 outline-none transition-all placeholder:text-gray-300 resize-none"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-50 text-gray-500 py-5 rounded-[2rem] font-black text-lg hover:bg-gray-100 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            className="flex-[2] bg-[#1D9E75] text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-[#1D9E75]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
          >
            {loading ? 'Registering...' : 'Enroll Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
