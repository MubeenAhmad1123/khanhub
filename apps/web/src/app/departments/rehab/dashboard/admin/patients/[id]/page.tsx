'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPatient, getPatientFeeRecord, getPatientCanteen, getPatientVideos, updatePatient } from '@/lib/rehab/patients';
import PatientCard from '@/components/rehab/PatientCard';
import FeeTracker from '@/components/rehab/FeeTracker';
import CanteenWallet from '@/components/rehab/CanteenWallet';
import type { Patient, FeeRecord, CanteenRecord } from '@/types/rehab';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminPatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [fee, setFee] = useState<FeeRecord | null>(null);
  const [canteen, setCanteen] = useState<CanteenRecord | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    try {
      const [pData, fData, cData, vData] = await Promise.all([
        getPatient(id as string),
        getPatientFeeRecord(id as string, currentMonth),
        getPatientCanteen(id as string, currentMonth),
        getPatientVideos(id as string)
      ]);
      setPatient(pData);
      setFee(fData);
      setCanteen(cData);
      setVideos(vData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUploadVideo = async () => {
    const url = prompt('Enter video URL:');
    if (!url) return;
    setUploading(true);
    try {
      await addDoc(collection(db, 'rehab_videos'), {
        patientId: id,
        videoUrl: url,
        createdAt: Timestamp.now(),
        title: `Update ${new Date().toLocaleDateString()}`
      });
      fetchData();
    } catch (err) {
      alert('Error uploading video');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-32 bg-gray-100 rounded-3xl" /><div className="grid grid-cols-2 gap-6"><div className="h-64 bg-gray-100 rounded-3xl" /><div className="h-64 bg-gray-100 rounded-3xl" /></div></div>;
  if (!patient) return <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest">Patient not found</div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{patient.name}</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Comprehensive Patient File • ID: {patient.id.slice(0, 8)}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => updatePatient(patient.id, { isActive: !patient.isActive }).then(fetchData)}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${patient.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
          >
            {patient.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">
            Edit Profile
          </button>
        </div>
      </div>

      <PatientCard patient={patient} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
             <span className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-sm font-bold text-green-500">💰</span>
             Finance & Fees
          </h2>
          <FeeTracker feeRecord={fee} />
          {/* List of all historical fees could go here */}
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
             <span className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-sm font-bold text-orange-500">🛒</span>
             Canteen Wallet
          </h2>
          <CanteenWallet canteenRecord={canteen} />
        </section>
      </div>

      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
             <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-sm font-bold text-blue-500">📹</span>
             Patient Updates (Videos)
          </h2>
          <button 
            onClick={handleUploadVideo}
            disabled={uploading}
            className="text-xs font-black text-[#1D9E75] hover:underline uppercase tracking-widest"
          >
            {uploading ? 'Registering...' : '＋ Add Video Link'}
          </button>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 border-dashed text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
            No video records currently exist
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.map((v) => (
              <div key={v.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 group">
                <div className="aspect-video bg-gray-900 rounded-2xl mb-4 relative overflow-hidden">
                   <img src={v.thumbnailUrl || '/api/placeholder/400/225'} alt="video" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all scale-110 group-hover:scale-100" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-2xl group-hover:scale-125 transition-transform">▶</span>
                   </div>
                </div>
                <p className="text-xs font-black text-gray-700 uppercase tracking-widest">{v.title}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{new Date(v.createdAt.toDate()).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
