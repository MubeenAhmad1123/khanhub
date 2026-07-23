// src/components/spims/student-profile/ProfileHeader.tsx
'use client';

import React, { useState, useRef } from 'react';
import { User, Wallet, Calendar, GraduationCap, Phone, FileText, Camera, Loader2 } from 'lucide-react';
import type { SpimsStudent } from '@/types/spims';
import { formatDateDMY } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface ProfileHeaderProps {
  student: SpimsStudent;
  onGenerateReport?: () => void;
  onPhotoUpdated?: (url: string) => void;
}

export default function ProfileHeader({ student, onGenerateReport, onPhotoUpdated }: ProfileHeaderProps): any {
  const totalPkg = Number(student.totalPackage) || 0;
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student?.id) return;

    const loadingToast = toast.loading('Uploading profile picture...');
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'khanhub/spims/students');

      // Update main student document
      await updateDoc(doc(db, 'spims_students', student.id), {
        photoUrl: url
      });

      // Also update linked spims_users account if present
      try {
        const userQ = query(collection(db, 'spims_users'), where('studentId', '==', student.id));
        const userSnap = await getDocs(userQ);
        userSnap.docs.forEach(d => {
          updateDoc(doc(db, 'spims_users', d.id), { photoUrl: url }).catch(() => {});
        });
      } catch (err) {
        console.warn('Could not sync photoUrl to spims_users:', err);
      }

      toast.success('Profile picture updated successfully!');
      if (onPhotoUpdated) {
        onPhotoUpdated(url);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
      toast.dismiss(loadingToast);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/50">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#1D9E75]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full -ml-24 -mb-24 blur-3xl" />

      <div className="relative p-5 md:p-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
          {/* Avatar Section */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-[#1D9E75] to-teal-700 flex items-center justify-center text-white shadow-2xl shadow-[#1D9E75]/30 transform group-hover:rotate-1 transition-transform duration-500 overflow-hidden relative">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : student.name ? (
                <span className="text-3xl md:text-5xl font-black">{student.name.charAt(0)}</span>
              ) : (
                <User size={48} />
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Camera Button to Upload DP */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -left-2 bg-white p-2.5 rounded-xl shadow-lg border border-gray-100 text-gray-600 hover:text-[#1D9E75] hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
              title="Upload Profile Photo (DP)"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            <div className="absolute -bottom-2 -right-2 bg-white p-1.5 md:p-2 rounded-xl shadow-lg border border-gray-50">
              <div className="bg-gray-100 px-2 py-0.5 md:py-1 rounded-lg text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">
                ID: {student.rollNo}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-4 w-full">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                <span className={`px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full ${(student.activity || 'Active') === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                  {student.activity || 'Active'}
                </span>
                {student.status && student.status !== 'Active' && student.status !== 'Inactive' && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                    {student.status}
                  </span>
                )}
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                  {student.course}
                </span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                  {student.session}
                </span>
              </div>
              <h1 className="text-2xl min-[400px]:text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-2">
                {student.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-gray-400 font-bold text-[10px] md:text-sm uppercase tracking-wider">
                <p className="flex items-center gap-1.5 bg-gray-50 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg">
                  <GraduationCap size={14} className="text-[#1D9E75]" />
                  Roll {student.rollNo}
                </p>
                <span className="hidden md:block w-1 h-1 rounded-full bg-gray-200" />
                <p className="flex items-center gap-1.5 bg-gray-50 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg">
                  <Phone size={14} className="text-[#1D9E75]" />
                  {student.contact || (student as any).phone || 'No Phone'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="md:absolute md:top-0 md:right-0 p-0 md:p-10 flex gap-2 relative top-0 right-0 justify-center md:justify-end w-full md:w-auto mb-4 md:mb-0">
              <button
                onClick={(onGenerateReport as any)}
                className="p-3 bg-white hover:bg-gray-50 text-gray-400 hover:text-[#1D9E75] rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-95 group"
                title="Generate Report"
              >
                <FileText size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pt-4">
              <div className="bg-gray-50/50 p-4 rounded-xl md:rounded-2xl border border-gray-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Wallet size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Total Package</span>
                </div>
                <p className="text-lg md:text-xl font-black text-gray-900">
                  Rs {totalPkg.toLocaleString()}
                </p>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl md:rounded-2xl border border-emerald-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <Wallet size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Approved / Paid</span>
                </div>
                <p className="text-lg md:text-xl font-black text-emerald-700">
                  Rs {(Number((student as any).totalReceived) || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-xl md:rounded-2xl border border-amber-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Wallet size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Pending</span>
                </div>
                <p className="text-lg md:text-xl font-black text-amber-700">
                  Rs {(Number((student as any).pendingAmount) || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-rose-50/50 p-4 rounded-xl md:rounded-2xl border border-rose-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-rose-600 mb-1">
                  <Wallet size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Remaining Balance</span>
                </div>
                <p className="text-lg md:text-xl font-black text-rose-700">
                  Rs {(Number((student as any).remaining) || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-xl md:rounded-2xl border border-gray-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Calendar size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Joined On</span>
                </div>
                <p className="text-lg md:text-xl font-black text-gray-900">
                  {formatDateDMY(student.admissionDate)}
                </p>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-xl md:rounded-2xl border border-gray-100/50 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <User size={14} className="text-[#1D9E75]" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Guardian Contact</span>
                </div>
                <p className="text-lg md:text-xl font-black text-gray-900 truncate max-w-full">
                  {student.fatherContact || '---'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
