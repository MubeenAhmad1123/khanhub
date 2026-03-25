'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRehabSession } from '@/hooks/rehab/useRehabSession';
import { getPatients } from '@/lib/rehab/patients';
import type { Patient } from '@/types/rehab';

export default function AdminPatientsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRehabSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      router.push('/departments/rehab/login');
      return;
    }

    const fetchPatients = async () => {
      try {
        const data = await getPatients();
        setPatients(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [router, user, sessionLoading]);

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (sessionLoading || loading) return <div className="space-y-8 animate-pulse"><div className="h-16 bg-gray-100 rounded-2xl" /><div className="h-96 bg-gray-100 rounded-3xl" /></div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Patient Registry</h1>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Manage and View Records</p>
        </div>
        <Link 
          href="/departments/rehab/dashboard/admin/patients/new"
          className="bg-[#1D9E75] text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-[#1D9E75]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>＋</span> Add Patient
        </Link>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <span className="ml-4 text-xl">🔍</span>
        <input 
          type="text" 
          placeholder="Search by name..." 
          className="flex-1 bg-transparent border-none outline-none py-3 font-bold text-gray-700 placeholder:text-gray-300"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((patient) => (
          <Link 
            key={patient.id} 
            href={`/departments/rehab/dashboard/admin/patients/${patient.id}`}
            className="group block bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 hover:border-[#1D9E75]/20 transition-all text-center relative overflow-hidden"
          >
            <div className="w-24 h-24 rounded-3xl bg-gray-50 mx-auto mb-4 overflow-hidden border-4 border-white shadow-md relative z-10">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-3xl">
                  {patient.name.charAt(0)}
                </div>
              )}
            </div>
            
            <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-[#1D9E75] transition-colors">{patient.name}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{patient.diagnosis || 'General Care'}</p>
            
            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
              <div className="text-left">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Package</p>
                <p className="text-sm font-black text-gray-700">{patient.packageAmount.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">PKR</span></p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Admission</p>
                <p className="text-sm font-bold text-gray-600">{new Date(patient.admissionDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-gray-100 border-dashed">
            <p className="text-gray-400 font-bold uppercase tracking-widest">No patients found matches search</p>
          </div>
        )}
      </div>
    </div>
  );
}
