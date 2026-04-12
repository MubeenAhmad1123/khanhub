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
import DailySheetTab from '@/components/job-center/seeker-profile/DailySheetTab';
import ProgressTab from '@/components/job-center/seeker-profile/ProgressTab';
import TherapyTab from '@/components/job-center/seeker-profile/TherapyTab';
import MedicationTab from '@/components/job-center/seeker-profile/MedicationTab';
import { formatDateDMY } from '@/lib/utils';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function SeekerPortalPage() {
  const router = useRouter();
  const params = useParams();
  const seekerId = params.seekerId as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeker, setSeeker] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'therapy' | 'meds' | 'progress'>('overview');

  const fetchSeekerData = useCallback(async () => {
    try {
      const pDoc = await getDoc(doc(db, 'jobcenter_seekers', seekerId));
      if (!pDoc.exists()) { router.push('/departments/job-center/login'); return; }
      const data = pDoc.data();
      
      const admissionDate = toDate(data.admissionDate);
      const totalDays = (data.durationMonths || 1) * 30;
      const daysSince = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - daysSince);

      const [feesSnap, canteenSnap] = await Promise.all([
        getDocs(query(collection(db, 'jobcenter_fees'), where('seekerId', '==', seekerId))),
        getDocs(query(collection(db, 'jobcenter_canteen'), where('seekerId', '==', seekerId))),
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

      setSeeker({ 
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
      });
    } catch (error) {
      console.error("Error fetching seeker data:", error);
    } finally {
      setLoading(false);
    }
  }, [seekerId, router]);

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) { router.push('/departments/job-center/login'); return; }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'seeker' || parsed.seekerId !== seekerId) {
      setLoading(false);
      return;
    }
    setSession(parsed);
    fetchSeekerData();
  }, [router, seekerId, fetchSeekerData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!session || !seeker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-800 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">You can only view your assigned profile.</p>
        </div>
      </div>
    );
  }

  const healthStatus = seeker.healthStatus || {};
  const statusColor = (status: string) => {
    if (status === 'positive') return 'bg-red-500/10 text-red-500 border border-red-500/20';
    if (status === 'negative') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    return 'bg-white/5 text-gray-500 border border-white/10';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden w-full max-w-full pb-20">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-start gap-4 p-2 sm:p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-orange-500/20 flex-shrink-0 overflow-hidden">
                {seeker.photoUrl ? (
                  <img src={seeker.photoUrl} alt={seeker.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  seeker.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{seeker.name}</h1>
                <p className="text-gray-400 text-sm mt-0.5 font-medium">S/o {seeker.fatherName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${seeker.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {seeker.isActive ? 'Active' : 'Completed'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-white/5">
                <Calendar size={10} /> {formatDateDMY(seeker.admissionDate)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-white/5">
                <Clock size={10} /> {(seeker.remainingDays || 0) > 0 ? seeker.remainingDays : (seeker.daysAdmitted || 0)} {(seeker.remainingDays || 0) > 0 ? 'days remaining' : 'days completed'}
              </span>
              {seeker.substanceOfAddiction && (
                <span className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest">
                  {seeker.substanceOfAddiction}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/5 p-6 shadow-2xl">
          <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
            <DollarSign size={10} className="text-orange-500" /> Financial Summary
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black text-white">₨{seeker.totalDues?.toLocaleString() || '0'}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-gray-400">Total Pkg</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black text-emerald-500">₨{seeker.totalReceived?.toLocaleString() || '0'}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-gray-400">Received</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-2xl font-black ${(seeker.remaining || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>₨{seeker.remaining?.toLocaleString() || '0'}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-gray-400">Remaining</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black text-orange-500">₨{seeker.canteenBalance?.toLocaleString() || '0'}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-gray-400">Canteen Wallet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'overview', label: 'Overview', icon: User },
            { key: 'daily', label: 'Activity', icon: Activity },
            { key: 'therapy', label: 'Session', icon: Heart },
            { key: 'meds', label: 'Meds', icon: Pill },
            { key: 'progress', label: 'Growth', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 px-5 py-3 text-[11px] whitespace-nowrap rounded-2xl font-black transition-all active:scale-95 ${
                activeTab === tab.key 
                  ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' 
                  : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/5 rounded-3xl border border-white/5 p-6 shadow-xl">
              <h2 className="font-black text-white text-lg mb-6 flex items-center gap-2">
                <Shield size={18} className="text-orange-500" /> Health Baseline
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'HIV', value: healthStatus.hivStatus },
                  { label: 'HBV', value: healthStatus.hbsagStatus },
                  { label: 'HCV', value: healthStatus.hcvStatus },
                  { label: 'TB', value: healthStatus.tbStatus },
                  { label: 'STI', value: healthStatus.stiStatus },
                ].map(item => (
                  <div key={item.label} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">{item.label}</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${statusColor(item.value || 'not_known')}`}>
                      {item.value?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-3xl border border-white/5 p-6 shadow-xl">
              <h2 className="font-black text-white text-lg mb-6 flex items-center gap-2">
                <User size={18} className="text-orange-500" /> Emergency Contact
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Primary Guardian</p>
                  <p className="font-bold text-white uppercase tracking-tight">{seeker.guardianName || '—'}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-widest">{seeker.guardianRelationship || 'Relation'}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Direct Contact</p>
                  <a href={`tel:${seeker.contactNumber}`} className="font-bold text-orange-500 hover:text-orange-400 transition-colors">{seeker.contactNumber || '—'}</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'daily' && session && (
          <div className="bg-white/5 rounded-3xl border border-white/5 p-6">
            <DailySheetTab seekerId={seekerId} session={session} readOnly />
          </div>
        )}

        {activeTab === 'therapy' && session && (
          <div className="bg-white/5 rounded-3xl border border-white/5 p-6 pointer-events-none opacity-80">
            <TherapyTab seekerId={seekerId} session={session} />
          </div>
        )}

        {activeTab === 'meds' && session && (
          <div className="bg-white/5 rounded-3xl border border-white/5 p-6 pointer-events-none opacity-80">
            <MedicationTab seekerId={seekerId} session={session} />
          </div>
        )}

        {activeTab === 'progress' && session && (
          <div className="bg-white/5 rounded-3xl border border-white/5 p-6 pointer-events-none opacity-80">
            <ProgressTab seekerId={seekerId} session={session} />
          </div>
        )}
      </div>
    </div>
  );
}