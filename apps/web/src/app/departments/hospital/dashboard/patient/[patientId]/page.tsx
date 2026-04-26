'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, DollarSign, ShoppingCart, Heart, Calendar, Clock, 
  CheckCircle, AlertCircle, Loader2, Phone, MessageCircle,
  Shield, Pill, TrendingUp, Activity, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import DailySheetTab from '@/components/hospital/patient-profile/DailySheetTab';
import ProgressTab from '@/components/hospital/patient-profile/ProgressTab';
import TherapyTab from '@/components/hospital/patient-profile/TherapyTab';
import MedicationTab from '@/components/hospital/patient-profile/MedicationTab';
import { formatDateDMY } from '@/lib/utils';
import { getCached, setCached } from '@/lib/queryCache';


function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function HospitalPatientViewPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'therapy' | 'meds' | 'progress'>('overview');

  const fetchPatientData = useCallback(async () => {
    try {
      const cacheKey = `hospital_patient_profile_${patientId}`;
      const cached = getCached<any>(cacheKey);
      if (cached) {
        setPatient(cached);
        setLoading(false);
        return;
      }

      const pDoc = await getDoc(doc(db, 'hospital_patients', patientId));
      if (!pDoc.exists()) { router.push('/departments/hospital/login'); return; }
      const data = pDoc.data();
      
      const admissionDate = toDate(data.admissionDate);
      const totalDays = (data.durationMonths || 1) * 30;
      const daysSince = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - daysSince);

      const [feesSnap, canteenSnap] = await Promise.all([
        getDocs(query(collection(db, 'hospital_fees'), where('patientId', '==', patientId))),
        getDocs(query(collection(db, 'hospital_canteen'), where('patientId', '==', patientId))),
      ]);

      let totalReceived = 0;
      feesSnap.docs.forEach(d => {
        const feeData = d.data();
        (feeData.payments || []).filter((p: any) => p.status === 'approved').forEach((p: any) => {
          totalReceived += (p.amount || 0);
        });
      });

      const totalDues = (data.packageAmount || 0) * (data.durationMonths || 1) + (data.otherExpenses || 0);
      const remaining = totalDues - totalReceived;

      let totalCanteenDeposited = 0, totalCanteenSpent = 0;
      canteenSnap.docs.forEach(d => {
        const cData = d.data();
        totalCanteenDeposited += (cData.totalDeposited || 0);
        totalCanteenSpent += (cData.totalSpent || 0);
      });

      const patientData = { 
        id: pDoc.id, 
        ...data, 
        admissionDate, 
        remainingDays, 
        daysAdmitted: daysSince,
        totalDays,
        daysSince,
        totalDues,
        totalReceived,
        remaining,
        canteenBalance: totalCanteenDeposited - totalCanteenSpent,
        canteenDeposit: totalCanteenDeposited,
        canteenSpent: totalCanteenSpent,
      };

      setPatient(patientData);
      setCached(cacheKey, patientData, 180); // Cache for 180s
    } catch (error) {
      console.error("Error fetching hospital patient data:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId, router]);


  useEffect(() => {
    const sessionData = localStorage.getItem('hospital_session');
    if (!sessionData) { router.push('/departments/hospital/login'); return; }
    const parsed = JSON.parse(sessionData);
    
    // Allow viewing if role is admin/superadmin OR if it's the correct patient/family member
    const canView = parsed.role === 'admin' || parsed.role === 'superadmin' || 
                   (parsed.patientId === patientId);

    if (!canView) {
      setLoading(false);
      return;
    }
    setSession(parsed);
    fetchPatientData();
  }, [router, patientId, fetchPatientData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (!session || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">You do not have permission to view this patient profile.</p>
          <button onClick={() => router.push('/departments/hospital/dashboard')} className="mt-6 text-emerald-600 text-xs font-black uppercase tracking-widest hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const healthStatus = patient.healthStatus || {};
  const statusColor = (status: string) => {
    if (status === 'positive') return 'bg-red-100 text-red-700';
    if (status === 'negative') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold mb-4 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-700 font-black text-3xl border border-emerald-200/50 flex-shrink-0 overflow-hidden shadow-sm">
                {patient.photoUrl ? (
                  <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
                ) : (
                  patient.name?.charAt(0).toUpperCase() || <User size={32} />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{patient.name}</h1>
                <p className="text-gray-500 text-sm font-medium mt-0.5">S/o {patient.fatherName || '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${patient.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {patient.isActive !== false ? 'Active' : 'Discharged'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                <Calendar size={10} /> {formatDateDMY(patient.admissionDate)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest border border-gray-100">
                <Clock size={10} /> {(patient.remainingDays || 0) > 0 ? patient.remainingDays : (patient.daysAdmitted || 0)} {(patient.remainingDays || 0) > 0 ? 'days remaining' : 'days admitted'}
              </span>
              {patient.diagnosis && (
                <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  {patient.diagnosis}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-1 w-full sm:w-auto">
              {patient.contactNumber && (
                <a href={`tel:${patient.contactNumber}`} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all w-full sm:w-auto">
                  <Phone size={14} /> Call Primary
                </a>
              )}
              {patient.whatsappNumber && (
                <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-green-600 text-white text-xs font-black shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all w-full sm:w-auto">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-[2.5rem] bg-white border border-gray-100 shadow-sm p-6 md:p-8">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Financial Ledger</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Package</span>
              <span className="text-xl font-black text-gray-900">₨{patient.totalDues?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex flex-col gap-1.5 border-l border-gray-100 pl-6">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Received</span>
              <span className="text-xl font-black text-emerald-600">₨{patient.totalReceived?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex flex-col gap-1.5 border-l border-gray-100 pl-6">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Remaining</span>
              <span className={`text-xl font-black ${(patient.remaining || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₨{patient.remaining?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex flex-col gap-1.5 border-l border-gray-100 pl-6">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Canteen Balance</span>
              <span className="text-xl font-black text-amber-600">₨{patient.canteenBalance?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex overflow-x-auto gap-2 pb-6 no-scrollbar">
          {[
            { key: 'overview', label: 'Summary', icon: User },
            { key: 'daily', label: 'Vital Sheet', icon: Activity },
            { key: 'therapy', label: 'Treatment', icon: Heart },
            { key: 'meds', label: 'Pharmacy', icon: Pill },
            { key: 'progress', label: 'Growth', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs whitespace-nowrap rounded-2xl font-black transition-all active:scale-95 ${
                activeTab === tab.key 
                ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 translate-y-[-2px]' 
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="transition-all duration-300">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8">
                <h2 className="font-black text-gray-900 text-lg mb-6 flex items-center gap-3"><Shield className="text-emerald-600" size={20} /> Medical Clearance</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'HIV', value: healthStatus.hivStatus },
                    { label: 'HBsAg', value: healthStatus.hbsagStatus },
                    { label: 'HCV', value: healthStatus.hcvStatus },
                    { label: 'TB', value: healthStatus.tbStatus },
                    { label: 'STI', value: healthStatus.stiStatus },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-gray-100/50">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{item.label}</p>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor(item.value || 'not_known')}`}>
                        {item.value?.replace('_', ' ') || 'Not Known'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8">
                <h2 className="font-black text-gray-900 text-lg mb-6 flex items-center gap-3"><User className="text-emerald-600" size={20} /> Emergency Contact</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guardian</span>
                    <span className="font-bold text-gray-900">{patient.guardianName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Relation</span>
                    <span className="font-bold text-gray-900 text-xs px-3 py-1 bg-white rounded-lg shadow-sm">{patient.guardianRelationship || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</span>
                    <a href={`tel:${patient.contactNumber}`} className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">{patient.contactNumber || '—'}</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'daily' && session && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
               <DailySheetTab patientId={patientId} session={session} readOnly />
            </div>
          )}

          {activeTab === 'therapy' && session && (
            <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden ${session.role === 'family' || session.role === 'patient' ? 'pointer-events-none' : ''}`}>
               <TherapyTab patientId={patientId} session={session} />
            </div>
          )}

          {activeTab === 'meds' && session && (
            <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden ${session.role === 'family' || session.role === 'patient' ? 'pointer-events-none' : ''}`}>
               <MedicationTab patientId={patientId} session={session} />
            </div>
          )}

          {activeTab === 'progress' && session && (
            <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden ${session.role === 'family' || session.role === 'patient' ? 'pointer-events-none' : ''}`}>
               <ProgressTab patientId={patientId} session={session} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}