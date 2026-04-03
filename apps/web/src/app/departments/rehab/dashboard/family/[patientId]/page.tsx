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
      const data = pDoc.data();
      
      const admissionDate = toDate(data.admissionDate);
      const totalDays = (data.durationMonths || 1) * 30;
      const daysSince = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - daysSince);

      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [feesSnap, canteenSnap] = await Promise.all([
        getDocs(query(collection(db, 'rehab_fees'), where('patientId', '==', patientId))),
        getDocs(query(collection(db, 'rehab_canteen'), where('patientId', '==', patientId))),
      ]);

      let totalReceived = 0;
      feesSnap.docs.forEach(d => {
        const feeData = d.data();
        (feeData.payments || []).filter((p: any) => p.status === 'approved').forEach((p: any) => {
          totalReceived += p.amount;
        });
      });

      const totalDues = (data.packageAmount || 0) * (data.durationMonths || 1) + (data.otherExpenses || 0);
      const remaining = totalDues - totalReceived;

      let totalCanteenDeposited = 0, totalCanteenSpent = 0;
      canteenSnap.docs.forEach(d => {
        const cData = d.data();
        totalCanteenDeposited += cData.totalDeposited || 0;
        totalCanteenSpent += cData.totalSpent || 0;
      });

      setPatient({ 
        id: pDoc.id, 
        ...data, 
        admissionDate, 
        remainingDays, 
        totalDays,
        daysSince,
        totalDues,
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
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/departments/rehab/dashboard/family" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold mb-4 transition-colors">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-teal-700 font-black text-3xl border border-teal-200/50 flex-shrink-0">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover rounded-3xl" />
              ) : (
                patient.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-gray-900">{patient.name}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${patient.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {patient.isActive ? 'Active' : 'Discharged'}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">S/o {patient.fatherName}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest">
                  <Calendar size={10} /> {patient.admissionDate?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                  <Clock size={10} /> {patient.remainingDays} days remaining
                </span>
                {patient.substanceOfAddiction && (
                  <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                    {patient.substanceOfAddiction}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {patient.contactNumber && (
                <a href={`tel:${patient.contactNumber}`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-black hover:bg-blue-100 transition-all">
                  <Phone size={14} /> Call
                </a>
              )}
              {patient.whatsappNumber && (
                <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 text-xs font-black hover:bg-green-100 transition-all">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-teal-900/10">
          <p className="text-teal-100 text-[10px] font-black uppercase tracking-widest mb-4">Stay connected with your loved one's recovery journey</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-teal-100 text-[10px] font-black uppercase tracking-widest">Total Package</p>
              <p className="text-xl font-black mt-1">₨{patient.totalDues?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-teal-100 text-[10px] font-black uppercase tracking-widest">Received</p>
              <p className="text-xl font-black mt-1">₨{patient.totalReceived?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-teal-100 text-[10px] font-black uppercase tracking-widest">Remaining</p>
              <p className={`text-xl font-black mt-1 ${(patient.remaining || 0) > 0 ? 'text-red-200' : 'text-green-200'}`}>
                ₨{patient.remaining?.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-teal-100 text-[10px] font-black uppercase tracking-widest">Canteen Balance</p>
              <p className="text-xl font-black mt-1">₨{patient.canteenBalance?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.key ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Shield size={18} /> Health Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: 'HIV', value: healthStatus.hivStatus },
                  { label: 'HBsAg', value: healthStatus.hbsagStatus },
                  { label: 'HCV', value: healthStatus.hcvStatus },
                  { label: 'TB', value: healthStatus.tbStatus },
                  { label: 'STI', value: healthStatus.stiStatus },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${statusColor(item.value || 'not_known')}`}>
                      {item.value?.replace('_', ' ') || 'Not Known'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><User size={18} /> Guardian Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</p><p className="font-bold text-gray-900">{patient.guardianName || '—'}</p></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Relationship</p><p className="font-bold text-gray-900">{patient.guardianRelationship || '—'}</p></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                  <a href={`tel:${patient.contactNumber}`} className="font-bold text-teal-600 hover:underline">{patient.contactNumber || '—'}</a>
                </div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</p>
                  {patient.whatsappNumber ? (
                    <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 hover:underline">{patient.whatsappNumber}</a>
                  ) : <p className="font-bold text-gray-400">—</p>}
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