'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPatient, getPatientFeeRecord, getPatientCanteen, getPatientVideos } from '@/lib/rehab/patients';
import PatientCard from '@/components/rehab/PatientCard';
import FeeTracker from '@/components/rehab/FeeTracker';
import CanteenWallet from '@/components/rehab/CanteenWallet';
import type { Patient, FeeRecord, CanteenRecord, RehabUser } from '@/types/rehab';

export default function FamilyDashboardPage() {
  const { patientId } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [fee, setFee] = useState<FeeRecord | null>(null);
  const [canteen, setCanteen] = useState<CanteenRecord | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const raw = localStorage.getItem('rehab_session');
      if (!raw) return;
      
      const user = JSON.parse(raw) as RehabUser;
      if (user.role !== 'family' && user.role !== 'admin' && user.role !== 'superadmin') {
        router.push('/departments/rehab/login');
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01"
      
      try {
        const [pData, fData, cData, vData] = await Promise.all([
          getPatient(patientId as string),
          getPatientFeeRecord(patientId as string, currentMonth),
          getPatientCanteen(patientId as string, currentMonth),
          getPatientVideos(patientId as string)
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

    fetchData();
  }, [patientId, router]);

  if (loading) return <div className="space-y-6"><div className="h-32 bg-gray-100 rounded-3xl animate-pulse" /><div className="grid grid-cols-2 gap-6"><div className="h-64 bg-gray-100 rounded-3xl animate-pulse" /><div className="h-64 bg-gray-100 rounded-3xl animate-pulse" /></div></div>;
  if (!patient) return <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest">Patient not found</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Patient Dashboard</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Real-time status monitor</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Last Update</p>
          <p className="text-sm font-black text-[#1D9E75]">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      <PatientCard patient={patient} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FeeTracker feeRecord={fee} />
        <CanteenWallet canteenRecord={canteen} />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-[#1D9E75]/10 rounded-lg flex items-center justify-center text-sm font-bold text-[#1D9E75]">▶</span>
          Video Feed
        </h2>
        {videos.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-gray-100 border-dashed text-center">
            <p className="text-gray-400 font-medium">No videos uploaded yet for this patient.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="group relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all">
                <div className="aspect-video bg-gray-900 relative">
                  {/* Thumbnail logic would go here */}
                  <img src={video.thumbnailUrl || '/api/placeholder/400/225'} alt="video thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-16 h-16 bg-[#1D9E75] rounded-full flex items-center justify-center text-white shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                       <span className="ml-1">▶</span>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-black text-gray-800 line-clamp-1">{video.title || `Update ${new Date(video.createdAt.toDate()).toLocaleDateString()}`}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{new Date(video.createdAt.toDate()).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
