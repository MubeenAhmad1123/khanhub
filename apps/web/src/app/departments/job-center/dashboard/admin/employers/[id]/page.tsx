// d:\khanhub\apps\web\src\app\departments\job-center\dashboard\admin\employers\[id]\page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  doc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp, deleteDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, Building, MapPin, Globe, Mail, Phone, 
  Settings, Loader2, Save, Edit3, Briefcase, Users, 
  History, DollarSign, LayoutDashboard, LogOut, CheckCircle, Plus, X, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'history' | 'actions' | 'billing'>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  
  // Actions Tab State
  const [meetings, setMeetings] = useState<any[]>([]);
  const [seekers, setSeekers] = useState<any[]>([]);
  const [loadingSeekers, setLoadingSeekers] = useState(false);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  
  // Meeting Form State
  const [selectedSeekerId, setSelectedSeekerId] = useState('');
  const [mName, setMName] = useState(''); // Seeker Name (or fallback)
  const [mPurpose, setMPurpose] = useState('Interview');
  const [mNotes, setMNotes] = useState('');
  const [mOutcome, setMOutcome] = useState('Pending');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const sessionData = localStorage.getItem('jobcenter_session');
    if (!sessionData) {
      router.push('/departments/job-center/login');
      return;
    }
    fetchEmployer();
    fetchMeetings();
    fetchSeekers();
  }, [id, router]);

  const fetchMeetings = async () => {
    try {
      const q = query(
        collection(db, 'jobcenter_meetings'), 
        where('employerId', '==', id),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching meetings:", err);
    }
  };

  const fetchSeekers = async () => {
    try {
      setLoadingSeekers(true);
      const q = query(collection(db, 'jobcenter_seekers'), where('isActive', '==', true), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setSeekers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching seekers:", err);
    } finally {
      setLoadingSeekers(false);
    }
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeekerId && !mName) {
      toast.error('Please select a seeker or enter a name');
      return;
    }

    try {
      setIsSavingMeeting(true);
      const session = JSON.parse(localStorage.getItem('jobcenter_session') || '{}');
      const seeker = seekers.find(s => s.id === selectedSeekerId);
      
      const meetingData = {
        employerId: id,
        organization: employer?.companyName || '',
        seekerId: selectedSeekerId || null,
        representativeName: mName || seeker?.name || 'Unknown Seeker',
        phone: seeker?.phone || '',
        purpose: mPurpose,
        outcome: mOutcome,
        notes: mNotes,
        date: Timestamp.fromDate(new Date(`${mDate}T00:00:00`)),
        loggedBy: session.uid || 'admin',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'jobcenter_meetings'), meetingData);
      toast.success('Interaction logged successfully ✓');
      setShowAddMeetingModal(false);
      
      // Reset
      setSelectedSeekerId('');
      setMName('');
      setMNotes('');
      setMDate(new Date().toISOString().split('T')[0]);
      
      fetchMeetings();
    } catch (err) {
      console.error(err);
      toast.error('Failed to log interaction');
    } finally {
      setIsSavingMeeting(false);
    }
  };

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
    { id: 'actions', label: 'Actions & Logs', icon: Settings },
    { id: 'billing', label: 'Financials', icon: DollarSign },
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
            {activeTab === 'actions' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Status Management Card */}
                <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[2.5rem] shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase">Operational Status</h3>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Manage Employer Visibility & Permissions</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Account Status</label>
                      <select 
                        value={employer.isActive ? 'active' : 'inactive'}
                        onChange={async (e) => {
                          const newStatus = e.target.value === 'active';
                          try {
                            setLoading(true);
                            await updateDoc(doc(db, 'jobcenter_employers', id), { isActive: newStatus });
                            setEmployer((prev: any) => ({ ...prev, isActive: newStatus }));
                            toast.success(`Employer status set to ${e.target.value.toUpperCase()}`);
                          } catch (err) {
                            toast.error('Failed to update status');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none shadow-inner"
                      >
                        <option value="active">ACTIVE / VERIFIED</option>
                        <option value="inactive">INACTIVE / DISABLED</option>
                        <option value="restricted">RESTRICTED ACCESS</option>
                        <option value="pending">PENDING VERIFICATION</option>
                        <option value="blacklisted">BLACKLISTED</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/50 border border-indigo-100">
                       <div className={`w-3 h-3 rounded-full ${employer.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                       <div>
                          <p className="text-xs font-black text-gray-900 uppercase">{employer.isActive ? 'Active Partner' : 'Account Disabled'}</p>
                          <p className="text-[10px] text-gray-500 font-bold">Updated on: {new Date().toLocaleDateString()}</p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Interaction Logs */}
                <div className="space-y-6">
                   <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                          <History size={20} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Interaction & Meeting Log</h2>
                      </div>
                      <button 
                        onClick={() => setShowAddMeetingModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/10 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Plus size={16} /> Log Interaction
                      </button>
                   </div>
                   
                   {meetings.length === 0 ? (
                     <div className="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                           <Users size={32} />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2 uppercase">No Meetings Logged</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">Interviews and company meetings recorded by staff will appear in this centralized timeline.</p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 gap-4">
                       {meetings.map((meeting) => (
                         <div key={meeting.id} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-6">
                              <div className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg">
                                 {formatDateDMY(meeting.date?.toDate?.() ? meeting.date.toDate() : meeting.date)}
                              </div>
                           </div>

                           <div className="flex flex-col gap-4">
                             <div className="pr-20">
                               <div className="flex items-center gap-3 mb-1">
                                  <h4 className="font-black text-gray-900 text-xl tracking-tight">{meeting.representativeName}</h4>
                                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                                    meeting.outcome === 'Hired' ? 'bg-green-50 text-green-700 border-green-100' : 
                                    meeting.outcome === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                  }`}>
                                    {meeting.outcome}
                                  </span>
                               </div>
                               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{meeting.purpose}</p>
                             </div>

                             {meeting.notes && (
                               <div className="bg-gray-50 p-5 rounded-2xl italic text-sm text-gray-600 border border-gray-100">
                                 "{meeting.notes}"
                               </div>
                             )}

                             <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logged by Admin ID: {meeting.loggedBy?.slice(0, 8)}</p>
                                <button 
                                  onClick={async () => {
                                    if(confirm('Delete this log?')) {
                                      await deleteDoc(doc(db, 'jobcenter_meetings', meeting.id));
                                      toast.success('Log deleted');
                                      fetchMeetings();
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </div>
            )}
            {activeTab === 'billing' && (
              <div className="bg-white rounded-[2.5rem] p-20 text-center shadow-sm border border-gray-100">
                <DollarSign className="w-20 h-20 text-gray-100 mx-auto mb-8" />
                <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase">Financial Ledger</h2>
                <p className="text-gray-500 text-base max-w-sm mx-auto font-medium">Invoices, commission tracking (30% first salary), and payment history for {employer.companyName} will be available here.</p>
              </div>
            )}
          </div>
      </div>
      {/* Add Meeting Modal */}
      {showAddMeetingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 leading-none uppercase">Log Interaction</h2>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1.5">Interview or Company Meeting</p>
                </div>
              </div>
              <button onClick={() => setShowAddMeetingModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddMeeting} className="p-8 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5">Select Seeker *</label>
                  <select
                    value={selectedSeekerId}
                    onChange={e => setSelectedSeekerId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%234f46e5\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                  >
                    <option value="">Choose a seeker...</option>
                    {seekers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {!selectedSeekerId && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5">Or Enter Name Manually</label>
                    <input 
                      value={mName} 
                      onChange={e => setMName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                      placeholder="Seeker Name"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5">Purpose</label>
                    <select 
                      value={mPurpose} 
                      onChange={e => setMPurpose(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                    >
                      <option value="Interview">Interview</option>
                      <option value="Initial Meeting">Initial Meeting</option>
                      <option value="Documentation">Documentation</option>
                      <option value="Follow-up">Follow-up</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5">Outcome</label>
                    <select 
                      value={mOutcome} 
                      onChange={e => setMOutcome(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Shortlisted">Shortlisted</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5">Meeting Date</label>
                  <input 
                    type="date" 
                    value={mDate} 
                    onChange={e => setMDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5">Notes</label>
                  <textarea 
                    rows={3} 
                    value={mNotes} 
                    onChange={e => setMNotes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm resize-none"
                    placeholder="Details about the meeting..."
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  type="submit" 
                  disabled={isSavingMeeting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-900/10 disabled:opacity-50 active:scale-95 group"
                >
                  {isSavingMeeting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} className="group-hover:rotate-12 transition-transform" />}
                  {isSavingMeeting ? 'Logging...' : 'Save Interaction'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddMeetingModal(false)}
                  className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
