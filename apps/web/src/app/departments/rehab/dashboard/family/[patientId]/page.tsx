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
import DailySheetTab from '@/components/rehab/patient-profile/DailySheetTab';
import ProgressTab from '@/components/rehab/patient-profile/ProgressTab';
import TherapyTab from '@/components/rehab/patient-profile/TherapyTab';
import MedicationTab from '@/components/rehab/patient-profile/MedicationTab';
import { formatDateDMY } from '@/lib/utils';
import { Patient } from '@/types/rehab';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function FamilyPatientViewPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [canteenRecord, setCanteenRecord] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'therapy' | 'meds' | 'progress'>('overview');

  const fetchPatientData = useCallback(async () => {
    try {
      const pDoc = await getDoc(doc(db, 'rehab_patients', patientId));
      if (!pDoc.exists()) { router.push('/departments/rehab/login'); return; }
      const data = pDoc.data() as Patient;
      
      const admissionDate = toDate(data.admissionDate);
      const totalDays = (data.durationMonths || 1) * 30;
      const daysSince = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - daysSince);

      const [feesSnap, canteenSnap] = await Promise.all([
        getDocs(query(collection(db, 'rehab_fees'), where('patientId', '==', patientId))),
        getDocs(query(collection(db, 'rehab_canteen'), where('patientId', '==', patientId))),
      ]);

      let totalReceived = 0;
      feesSnap.docs.forEach(d => {
        const feeData = d.data();
        (feeData.payments || []).forEach((p: any) => {
          if (p.status === 'approved') totalReceived += Number(p.amount || 0);
        });
      });

      // Standardized calculation
      const totalPkg = data.totalPackageAmount || (Number(data.monthlyPackage || data.packageAmount || 0) * (data.durationMonths || 1));
      const remaining = totalPkg - totalReceived;

      let totalCanteenDeposited = 0, totalCanteenSpent = 0;
      canteenSnap.docs.forEach(d => {
        const cData = d.data();
        totalCanteenDeposited += cData.totalDeposited || 0;
        totalCanteenSpent += cData.totalSpent || 0;
      });

      setPatient({ 
        ...data, 
        admissionDate, 
        remainingDays, 
        daysAdmitted: daysSince,
        totalDays,
        daysSince,
        totalPkg,
        totalReceived,
        remaining,
        canteenBalance: totalCanteenDeposited - totalCanteenSpent,
        canteenDeposit: totalCanteenDeposited,
        canteenSpent: totalCanteenSpent,
      });
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId, router]);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'family' || parsed.patientId !== patientId) {
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
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (!session || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">You can only view your assigned patient's profile.</p>
        </div>
      </div>
    );
  }

  const healthStatus = patient.healthStatus || {};
  const statusColor = (status: string) => {
    if (status === 'positive') return 'bg-red-100 text-red-700';
    if (status === 'negative') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/departments/rehab/dashboard/family" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold mb-4 transition-colors">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex flex-col items-start gap-3 p-2 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-teal-700 font-black text-3xl border border-teal-200/50 flex-shrink-0 overflow-hidden">
                {patient.photoUrl ? (
                  <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  patient.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">{patient.name}</h1>
                <p className="text-gray-500 text-sm mt-0.5">S/o {patient.fatherName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${patient.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {patient.isActive ? 'Active' : 'Discharged'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest">
                <Calendar size={10} /> {formatDateDMY(patient.admissionDate)}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                <Clock size={10} /> {(patient.remainingDays || 0) > 0 ? patient.remainingDays : (patient.daysAdmitted || 0)} {(patient.remainingDays || 0) > 0 ? 'days remaining' : 'days admitted'}
              </span>
              {patient.substanceOfAddiction && (
                <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                  {patient.substanceOfAddiction}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-1 w-full sm:w-auto">
              {patient.contactNumber && (
                <a href={`tel:${patient.contactNumber}`} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-black hover:bg-blue-100 active:scale-95 transition-all w-full sm:w-auto">
                  <Phone size={14} /> Call
                </a>
              )}
              {patient.whatsappNumber && (
                <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 text-xs font-black hover:bg-green-100 active:scale-95 transition-all w-full sm:w-auto">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl bg-teal-500/10 border border-teal-500/20 p-4">
          <p className="text-teal-600 text-[9px] font-black uppercase tracking-widest mb-3">Financial Summary</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-lg font-black text-teal-700">₨{patient.totalPkg?.toLocaleString() || '0'}</span>
              <span className="text-[9px] uppercase tracking-widest text-teal-600/90 font-bold">Total Pkg ({patient.durationMonths || 1}m)</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-black text-teal-700">₨{patient.totalReceived?.toLocaleString() || '0'}</span>
              <span className="text-[9px] uppercase tracking-widest text-teal-600/90 font-bold">Received</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-lg font-black ${(patient.remaining || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>₨{patient.remaining?.toLocaleString() || '0'}</span>
              <span className="text-[9px] uppercase tracking-widest text-teal-600/90 font-bold">Remaining</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-black text-teal-700">₨{patient.canteenBalance?.toLocaleString() || '0'}</span>
              <span className="text-[9px] uppercase tracking-widest text-teal-600/90 font-bold">Canteen Balance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="w-full -mx-4 px-4">
          <div className="flex flex-wrap gap-1 pb-1">
            {[
              { key: 'overview', label: 'Overview', icon: User },
              { key: 'daily', label: 'Daily Sheet', icon: Activity },
              { key: 'therapy', label: 'Therapy', icon: Heart },
              { key: 'meds', label: 'Medication', icon: Pill },
              { key: 'progress', label: 'Progress', icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3 py-2 text-[11px] whitespace-nowrap rounded-xl font-black transition-all active:scale-95 ${
                  activeTab === tab.key ? 'bg-gray-900 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Shield size={18} /> Health Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'HIV', value: healthStatus.hivStatus },
                  { label: 'HBsAg', value: healthStatus.hbsagStatus },
                  { label: 'HCV', value: healthStatus.hcvStatus },
                  { label: 'TB', value: healthStatus.tbStatus },
                  { label: 'STI', value: healthStatus.stiStatus },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${statusColor(item.value || 'not_known')}`}>
                      {item.value?.replace('_', ' ') || 'Not Known'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><User size={18} /> Guardian Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Name</p>
                  <p className="font-bold text-gray-900 mt-1">{patient.guardianName || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Relationship</p>
                  <p className="font-bold text-gray-900 mt-1">{patient.guardianRelationship || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Phone</p>
                  <a href={`tel:${patient.contactNumber}`} className="font-bold text-teal-600 hover:underline mt-1 block">{patient.contactNumber || '—'}</a>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">WhatsApp</p>
                  {patient.whatsappNumber ? (
                    <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 hover:underline mt-1 block">{patient.whatsappNumber}</a>
                  ) : <p className="font-bold text-gray-400 mt-1">—</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'daily' && session && (
          <DailySheetTab patientId={patientId} session={session} readOnly />
        )}

        {activeTab === 'therapy' && session && (
          <div className="pointer-events-none">
            <TherapyTab patientId={patientId} session={session} />
          </div>
        )}

        {activeTab === 'meds' && session && (
          <div className="pointer-events-none">
            <MedicationTab patientId={patientId} session={session} />
          </div>
        )}

        {activeTab === 'progress' && session && (
          <div className="pointer-events-none">
            <ProgressTab patientId={patientId} session={session} />
          </div>
        )}
      </div>
    </div>
  );
}