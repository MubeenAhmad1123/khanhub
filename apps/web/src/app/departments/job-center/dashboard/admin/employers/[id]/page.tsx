// d:\khanhub\apps\web\src\app\departments\job-center\dashboard\admin\employers\[id]\page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, Building, MapPin, Globe, Mail, Phone, 
  Settings, Loader2, Save, Edit3, Briefcase, Users, 
  History, DollarSign, LayoutDashboard, LogOut, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Employer } from '@/types/job-center';

// Components
import OverviewTab from '@/components/job-center/employer-profile/OverviewTab';
import JobPostingsTab from '@/components/job-center/employer-profile/JobPostingsTab';
import HireHistoryTab from '@/components/job-center/employer-profile/HireHistoryTab';

export default function EmployerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'history' | 'billing'>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    fetchEmployer();
  }, [id, router]);

  const fetchEmployer = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'jobcenter_employers', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setEmployer({ id: snap.id, ...snap.data() } as Employer);
      } else {
        toast.error('Employer not found');
        router.push('/departments/job-center/dashboard/admin/employers');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error fetching employer details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-all">Fetching Company Profile...</p>
        </div>
      </div>
    );
  }

  if (!employer) return null;

  const tabs = [
    { id: 'overview', label: 'Company Overview', icon: Building },
    { id: 'jobs', label: 'Job Postings', icon: Briefcase },
    { id: 'history', label: 'Hire History', icon: Users },
    { id: 'billing', label: 'Billing & Support', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row w-full overflow-hidden">
      
      {/* LEFT SIDEBAR (Hidden on mobile, potentially) */}
      <div className="w-full md:w-80 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col h-screen sticky top-0">
        <div className="p-8 pb-4">
          <Link href="/departments/job-center/dashboard/admin/employers" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors mb-8">
            <ArrowLeft size={16} />
            Back to Registry
          </Link>

          <div className="relative group mb-6">
            <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 border-4 border-white shadow-xl flex items-center justify-center text-4xl font-black text-indigo-600 overflow-hidden mx-auto">
              {employer.logoUrl ? (
                <img src={employer.logoUrl} alt={employer.companyName} className="w-full h-full object-cover" />
              ) : (
                employer.companyName.charAt(0).toUpperCase()
              )}
            </div>
            <div className={`absolute bottom-2 right-8 w-6 h-6 border-4 border-white rounded-full ${employer.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-gray-900 leading-tight">{employer.companyName}</h2>
            <p className="text-[10px] font-mono font-black text-indigo-500 uppercase tracking-widest">{employer.loginId || `#${employer.id.slice(0, 8)}`}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider mt-2 border border-indigo-100">
               {employer.industry}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/10 active:scale-95' 
                  : 'text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : 'text-gray-300'} />
              {tab.label}
              {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 mb-4 shadow-sm">
             <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><CheckCircle size={20} /></div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile Status</p>
                <p className="text-xs font-black text-gray-900 uppercase">Verified Partner</p>
             </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 text-xs font-black text-red-500 uppercase tracking-widest hover:text-red-700 transition-colors">
            <Settings size={14} />
            Manage Account
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 h-screen overflow-y-auto bg-[#F8FAFC]">
          {/* TOP ACTION BAR */}
          <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-md px-4 md:px-12 py-6 border-b border-gray-100 flex items-center justify-between">
             <div>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-3">
                   {tabs.find(t => t.id === activeTab)?.icon && React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "text-indigo-600", size: 24 })}
                   {tabs.find(t => t.id === activeTab)?.label}
                </h1>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Employer Control Panel • {employer.companyName}</p>
             </div>
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.push(`/departments/job-center/dashboard/admin/employers/${id}/edit`)}
                  className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-100 px-5 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                >
                   <Settings size={14} className="text-indigo-600" />
                   ADMIN ACTIONS
                </button>
             </div>
          </div>

          {/* MAIN CONTENT WRAPPER */}
          <div className="px-4 md:px-12 py-8 max-w-6xl">
            {activeTab === 'overview' && <OverviewTab employer={employer} />}
            {activeTab === 'jobs' && <JobPostingsTab employerId={id} employer={employer} />}
            {activeTab === 'history' && <HireHistoryTab employerId={id} />}
            {activeTab === 'billing' && (
              <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                <DollarSign className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                <h2 className="text-xl font-black text-gray-900 mb-2">Billing & Ledger</h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">Financial records and service billing for this employer will appear here in the next update.</p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
