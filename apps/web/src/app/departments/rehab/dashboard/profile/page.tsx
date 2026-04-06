// src/app/departments/rehab/dashboard/profile/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs, 
  addDoc, serverTimestamp, deleteDoc, orderBy, limit 
} from 'firebase/firestore';
import { 
  User, Camera, Save, Loader2, Shield, UserCog, 
  Heart, CheckCircle, Phone, X, Calendar, ClipboardCheck, 
  Shirt, Award, Plus, Trash2, Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { toDate } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Profile Data
  const [profile, setProfile] = useState<any>(null);
  const [staffDoc, setStaffDoc] = useState<any>(null);
  const [patientDoc, setPatientDoc] = useState<any>(null);
  
  // Tabs for Admin/Staff
  const [activeTab, setActiveTab] = useState<'attendance'|'duties'|'dress'|'contributions'>('attendance');
  
  // Metrics Data
  const [attendance, setAttendance] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);
  const [dressLogs, setDressLogs] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [growthPoints, setGrowthPoints] = useState<any>(null);

  // Contributions State
  const [isAddingContrib, setIsAddingContrib] = useState(false);
  const [newContrib, setNewContrib] = useState({ title: '', content: '' });
  const [submittingContrib, setSubmittingContrib] = useState(false);

  const fetchMetrics = useCallback(async (sId: string, dept: string) => {
    try {
      const prefix = dept === 'hq' ? 'hq' : 'rehab';
      
      const [attSnap, dutySnap, dressSnap, contribSnap, pointsSnap] = await Promise.all([
        getDocs(query(collection(db, `${prefix}_attendance`), where('staffId', '==', sId))),
        getDocs(query(collection(db, `${prefix}_duty_logs`), where('staffId', '==', sId))),
        getDocs(query(collection(db, `${prefix}_dress_logs`), where('staffId', '==', sId))),
        getDocs(query(collection(db, `${prefix}_contributions`), where('staffId', '==', sId))),
        getDocs(query(collection(db, `${prefix}_growth_points`), where('staffId', '==', sId), limit(1)))
      ]);

      // Client-side sorting to avoid composite index requirement
      const sortByDate = (docs: any[]) => [...docs].sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateB - dateA;
      });

      setAttendance(sortByDate(attSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      setDuties(sortByDate(dutySnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      setDressLogs(sortByDate(dressSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      setContributions(sortByDate(contribSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      
      if (!pointsSnap.empty) {
        setGrowthPoints(pointsSnap.docs[0].data());
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  }, []);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) { router.push('/departments/rehab/login'); return; }
    const parsed = JSON.parse(sessionData);
    setSession(parsed);

    const loadProfile = async () => {
      try {
        setLoading(true);
        // 1. User Doc
        const userSnap = await getDoc(doc(db, 'rehab_users', parsed.uid));
        if (!userSnap.exists()) {
          toast.error("User not found");
          router.push('/departments/rehab/login');
          return;
        }
        const uData = userSnap.data();
        setProfile({ id: userSnap.id, ...uData });

        // 2. Role Data
        if (parsed.role === 'admin' || parsed.role === 'staff') {
          // Find staff dock in rehab_staff or hq_staff
          let sSnap = await getDocs(query(collection(db, 'rehab_staff'), where('loginUserId', '==', parsed.uid)));
          if (sSnap.empty) {
            sSnap = await getDocs(query(collection(db, 'hq_staff'), where('loginUserId', '==', parsed.uid)));
          }
          
          if (!sSnap.empty) {
            const sd = sSnap.docs[0].data();
            setStaffDoc({ id: sSnap.docs[0].id, ...sd });
            fetchMetrics(sSnap.docs[0].id, sd.department || 'rehab');
          }
        } else if (parsed.role === 'family' && uData.patientId) {
          const pSnap = await getDoc(doc(db, 'rehab_patients', uData.patientId));
          if (pSnap.exists()) setPatientDoc({ id: pSnap.id, ...pSnap.data() });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router, fetchMetrics]);

  const handleAddContribution = async () => {
    if (!newContrib.title || !newContrib.content) return toast.error("Fill all fields");
    if (!staffDoc) return;

    try {
      setSubmittingContrib(true);
      const prefix = staffDoc.department === 'hq' ? 'hq' : 'rehab';
      await addDoc(collection(db, `${prefix}_contributions`), {
        staffId: staffDoc.id,
        title: newContrib.title,
        content: newContrib.content,
        isApproved: false,
        createdAt: serverTimestamp(),
        date: serverTimestamp()
      });
      
      toast.success("Contribution submitted for approval");
      setIsAddingContrib(false);
      setNewContrib({ title: '', content: '' });
      fetchMetrics(staffDoc.id, staffDoc.department || 'rehab');
    } catch (error) {
      toast.error("Failed to submit");
    } finally {
      setSubmittingContrib(false);
    }
  };

  const handleDeleteContribution = async (cid: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const prefix = staffDoc.department === 'hq' ? 'hq' : 'rehab';
      await deleteDoc(doc(db, `${prefix}_contributions`, cid));
      toast.success("Deleted");
      fetchMetrics(staffDoc.id, staffDoc.department || 'rehab');
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-100">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">My Profile</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{session?.role}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Basic Info Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 w-full flex flex-col items-center p-6">
          <div className="relative">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} className="w-20 h-20 rounded-2xl mx-auto object-cover shadow-xl ring-4 ring-gray-50" />
            ) : (
              <div className="w-20 h-20 rounded-2xl mx-auto bg-teal-50 text-teal-600 flex items-center justify-center text-3xl font-black shadow-inner">
                {profile?.displayName?.[0]}
              </div>
            )}
          </div>
          <h2 className="text-center text-xl font-black mt-3 text-gray-900">{profile?.displayName}</h2>
          <span className="mx-auto mt-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-500">
            {session?.role}
          </span>
          <p className="text-gray-500 font-medium flex items-center justify-center gap-2 mt-3">
            <Phone size={14} className="text-teal-500" /> {profile?.phone || 'No phone provided'}
          </p>
        </div>

        {/* Role Specific Content */}
        {session?.role === 'family' ? (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-green-100">
            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
              <Heart className="text-green-500" /> Linked Patient Information
            </h3>
            {patientDoc ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100/50">
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Name</p>
                  <p className="font-bold text-gray-900">{patientDoc.name}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Admission Date</p>
                  <p className="font-bold text-gray-900">{toDate(patientDoc.admissionDate).toLocaleDateString()}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {patientDoc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 italic">No patient linked to this account.</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Growth Points Summary */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {[
                { label: 'Attendance', val: growthPoints?.attendancePoints || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Duties', val: growthPoints?.dutyPoints || 0, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Dress Code', val: growthPoints?.dressCodePoints || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Contribs', val: growthPoints?.contributionPoints || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map(stat => (
                <div key={stat.label} className={`rounded-2xl p-4 text-center ${stat.bg} border border-white shadow-sm`}>
                  <span className="text-2xl font-black block">{stat.val}</span>
                  <span className="text-[9px] uppercase tracking-widest mt-1 opacity-60 block">{stat.label}</span>
                </div>
              ))}
              <div className="col-span-2 rounded-2xl p-4 text-center bg-teal-500/10 border border-teal-500/20">
                <span className="text-2xl font-black block text-teal-600">{growthPoints?.totalPoints || 0}</span>
                <span className="text-[9px] uppercase tracking-widest mt-1 opacity-60 block">Total Points</span>
              </div>
            </div>

            {/* Metric Tabs */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto scrollbar-none w-full p-4">
                <div className="flex min-w-max gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
                  {[
                    { id: 'attendance', label: 'Attendance', icon: <Calendar size={16}/> },
                    { id: 'duties', label: 'Duties', icon: <ClipboardCheck size={16}/> },
                    { id: 'dress', label: 'Dress Code', icon: <Shirt size={16}/> },
                    { id: 'contributions', label: 'Contribs', icon: <Award size={16}/> },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
                        activeTab === tab.id 
                          ? 'bg-white shadow-sm text-teal-600 dark:bg-white/10' 
                          : 'opacity-40'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center justify-between px-4 py-2">
                <button className="p-2 rounded-xl bg-gray-100 active:scale-95 transition-all">←</button>
                <span className="text-[11px] font-black uppercase tracking-widest">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </span>
                <button className="p-2 rounded-xl bg-gray-100 active:scale-95 transition-all">→</button>
              </div>

              <div className="p-8">
                {activeTab === 'attendance' && (
                  <div className="space-y-4">
                    {attendance.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
                        <span className="text-4xl">📋</span>
                        <p className="text-sm font-black">No Records Found</p>
                        <p className="text-[10px]">Nothing logged for this period</p>
                      </div>
                    ) : (
                      attendance.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-900">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{log.day}</p>
                          </div>
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            log.status === 'present' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'duties' && (
                  <div className="space-y-4">
                    {duties.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
                        <span className="text-4xl">📋</span>
                        <p className="text-sm font-black">No Records Found</p>
                        <p className="text-[10px]">Nothing logged for this period</p>
                      </div>
                    ) : (
                      duties.map(log => (
                        <div key={log.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase tracking-widest">
                                {new Date(log.date).toLocaleDateString()}
                              </span>
                              <h4 className="font-black text-gray-900 text-sm capitalize">{log.dutyType?.replace(/_/g, ' ')}</h4>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{log.comment || 'No comments'}</p>
                          </div>
                   
                          <div className={`flex flex-col items-center gap-1 p-2 rounded-2xl ${log.status === 'completed' ? 'bg-teal-100 text-teal-600' : 'bg-red-100 text-red-600'}`}>
                              <span className="text-xs font-black uppercase tracking-widest">{log.status}</span>
                              <span className="text-[8px] font-bold opacity-70">+{log.points || 0} Points</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'dress' && (
                  <div className="space-y-4">
                    {dressLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
                        <span className="text-4xl">📋</span>
                        <p className="text-sm font-black">No Records Found</p>
                        <p className="text-[10px]">Nothing logged for this period</p>
                      </div>
                    ) : (
                      dressLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-900">{new Date(log.date).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{log.comment || 'Professional attire'}</p>
                          </div>
                          <div className="text-right">
                             <div className="text-sm font-black text-teal-600">+{log.points || 0}</div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Points earned</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'contributions' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-teal-50 p-6 rounded-3xl border border-teal-100">
                      <div>
                        <h4 className="font-black text-teal-900">Share your contribution</h4>
                        <p className="text-xs text-teal-600 font-medium">Add records of extra work or achievements</p>
                      </div>
                      <button 
                        onClick={() => setIsAddingContrib(true)}
                        className="bg-teal-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center gap-2"
                      >
                        <Plus size={16} /> New Entry
                      </button>
                    </div>

                    {isAddingContrib && (
                      <div className="p-6 bg-white border border-teal-200 rounded-3xl shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-black text-sm uppercase tracking-widest text-teal-600">New Contribution</h4>
                          <button onClick={() => setIsAddingContrib(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <input 
                           type="text" 
                           placeholder="Title (e.g. Extra Patient Care)" 
                           className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                           value={newContrib.title}
                           onChange={e => setNewContrib({...newContrib, title: e.target.value})}
                        />
                        <textarea 
                           placeholder="Describe your contribution in detail..." 
                           className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-2 focus:ring-teal-500 outline-none min-h-[120px] leading-relaxed"
                           value={newContrib.content}
                           onChange={e => setNewContrib({...newContrib, content: e.target.value})}
                        />
                        <button 
                           onClick={handleAddContribution}
                           disabled={submittingContrib}
                           className="w-full bg-teal-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:bg-teal-700 disabled:opacity-50 transition-all"
                        >
                          {submittingContrib ? 'Submitting...' : 'Submit Contribution'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {contributions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
                          <span className="text-4xl">📋</span>
                          <p className="text-sm font-black">No Records Found</p>
                          <p className="text-[10px]">Nothing logged for this period</p>
                        </div>
                      ) : (
                        contributions.map(c => (
                          <div key={c.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 relative group transition-all hover:border-gray-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-gray-900">{c.title}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                  {toDate(c.date || c.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  c.isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {c.isApproved ? 'Approved' : 'Pending'}
                                </span>
                                {!c.isApproved && (
                                  <button onClick={() => handleDeleteContribution(c.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed mb-3 whitespace-pre-wrap">{c.content}</p>
                            {c.isApproved && (
                              <div className="flex items-center gap-2 text-teal-600 font-black text-[10px] uppercase tracking-widest">
                                <Award size={14} /> +{c.points || 0} Points Awarded
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
