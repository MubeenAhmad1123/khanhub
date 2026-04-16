// d:\khanhub\apps\web\src\app\departments\job-center\dashboard\seeker\[seekerId]\page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, DollarSign, ShoppingCart, Heart, Calendar, Clock, 
  CheckCircle, AlertCircle, Loader2, Phone, MessageCircle,
  Shield, Pill, TrendingUp, Activity, ArrowLeft, GraduationCap, Briefcase
} from 'lucide-react';
import Link from 'next/link';

// Core Tabs
import RegistrationTab from '@/components/job-center/seeker-profile/RegistrationTab';
import ActivityLogTab from '@/components/job-center/seeker-profile/ActivityLogTab';
import CareerProgressTab from '@/components/job-center/seeker-profile/CareerProgressTab';
import JobTrainingTab from '@/components/job-center/seeker-profile/JobTrainingTab';
import SupportRecordTab from '@/components/job-center/seeker-profile/SupportRecordTab';

import { formatDateDMY } from '@/lib/utils';
import type { JobSeeker } from '@/types/job-center';

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

  const [seeker, setSeeker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'therapy' | 'meds' | 'progress'>('overview');
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('jobcenter_session');
    if (!raw) {
      router.push('/departments/job-center/login');
      return;
    }
    setSession(JSON.parse(raw));
  }, [router]);

  const fetchSeeker = useCallback(async () => {
    try {
      setLoading(true);
      const sDoc = await getDoc(doc(db, 'jobcenter_seekers', seekerId));
      if (!sDoc.exists()) {
        router.push('/departments/job-center/dashboard/admin');
        return;
      }
      
      const data = sDoc.data();
      setSeeker({
        id: sDoc.id,
        ...data,
        createdAt: toDate(data.createdAt),
      });
    } catch (error) {
      console.error("Error fetching seeker:", error);
    } finally {
      setLoading(false);
    }
  }, [seekerId, router]);

  useEffect(() => {
    fetchSeeker();
  }, [fetchSeeker]);

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!seeker) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500/30">
      {/* Header Area */}
      <div className="relative bg-gradient-to-b from-orange-600/20 to-transparent pt-12 pb-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <Link 
            href="/departments/job-center/dashboard/admin/seekers" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
          >
            <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all">
              <ArrowLeft size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Back to Directory</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-orange-600 to-orange-400 p-1 shadow-2xl shadow-orange-600/20">
                  <div className="w-full h-full rounded-[2.3rem] overflow-hidden bg-gray-900 flex items-center justify-center">
                    {seeker.photoUrl ? (
                      <img src={seeker.photoUrl} alt={seeker.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-gray-700" />
                    )}
                  </div>
                </div>
                {seeker.isActive && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-[#050505] rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black tracking-tight">{seeker.name}</h1>
                  <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest">
                    {seeker.seekerNumber}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-0.5 font-medium">S/o {seeker.fatherName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${seeker.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {seeker.isActive ? 'Active' : 'Completed'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-white/5">
                <Calendar size={10} /> Registered {formatDateDMY(seeker.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-white/5">
                <Briefcase size={10} /> {seeker.isEmployed ? 'Currently Employed' : 'Job Seeking'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Finance/Quick Stats */}
      <div className="max-w-4xl mx-auto px-4 -mt-12 mb-12 relative z-20">
        <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/5 p-8 shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Education</p>
              <p className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                <GraduationCap size={16} className="text-orange-500" />
                {seeker.education || 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Skills</p>
              <p className="text-lg font-bold text-white leading-tight truncate">
                {seeker.skills?.slice(0, 3).join(', ') || 'None'}
              </p>
            </div>
            <div className="space-y-1 md:text-right md:ml-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Experience</p>
              <p className="text-lg font-bold text-white">{seeker.experience || 'N/A'}</p>
            </div>
            <div className="space-y-1 md:text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Wallet Balance</p>
              <p className="text-2xl font-black text-orange-500">₨{seeker.canteenBalance?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap gap-2 mb-8 bg-white/5 p-2 rounded-[2rem] border border-white/5 w-fit">
          {[
            { key: 'overview', label: 'Profile', icon: User },
            { key: 'daily', label: 'Activities', icon: Activity },
            { key: 'therapy', label: 'Counselling', icon: MessageCircle },
            { key: 'progress', label: 'Growth', icon: TrendingUp },
            { key: 'meds', label: 'Support', icon: Heart },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 px-6 py-3 text-[11px] whitespace-nowrap rounded-[1.5rem] font-black transition-all active:scale-95 ${
                activeTab === tab.key 
                  ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-24">
          {activeTab === 'overview' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <RegistrationTab seeker={seeker} onUpdate={() => {}} />
            </div>
          )}

          {activeTab === 'daily' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <ActivityLogTab seekerId={seekerId} session={session} readOnly={true} />
            </div>
          )}

          {activeTab === 'therapy' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <JobTrainingTab seekerId={seekerId} session={session} />
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CareerProgressTab seekerId={seekerId} session={session} />
            </div>
          )}

          {activeTab === 'meds' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SupportRecordTab seekerId={seekerId} session={session} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}