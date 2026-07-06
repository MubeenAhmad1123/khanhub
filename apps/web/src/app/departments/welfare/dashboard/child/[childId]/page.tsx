'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, DollarSign, ShoppingCart, Heart, Calendar, Clock, 
  CheckCircle, AlertCircle, Loader2, Phone, MessageCircle,
  Shield, Pill, TrendingUp, Activity, ArrowLeft, Video, Camera, Play, FileText
} from 'lucide-react';
import Link from 'next/link';
import DailySheetTab from '@/components/welfare/child-profile/DailySheetTab';
import ProgressTab from '@/components/welfare/child-profile/ProgressTab';
import TherapyTab from '@/components/welfare/child-profile/TherapyTab';
import MedicationTab from '@/components/welfare/child-profile/MedicationTab';
import { formatDateDMY } from '@/lib/utils';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

export default function FamilyChildViewPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'therapy' | 'meds' | 'progress' | 'media'>('overview');

  const fetchChildData = useCallback(async () => {
    try {
      const pDoc = await getDoc(doc(db, 'welfare_children', childId));
      if (!pDoc.exists()) { router.push('/departments/welfare/login'); return; }
      const data = pDoc.data();
      
      const admissionDate = toDate(data.admissionDate);
      const totalDays = (data.durationMonths || 1) * 30;
      const daysSince = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - daysSince);

      const [feesSnap, canteenSnap, videosSnap] = await Promise.all([
        getDocs(query(collection(db, 'welfare_fees'), where('childId', '==', childId))),
        getDocs(query(collection(db, 'welfare_canteen'), where('childId', '==', childId))),
        getDocs(query(collection(db, 'welfare_videos'), where('childId', '==', childId), orderBy('createdAt', 'desc'))),
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

      const vidsList = videosSnap.docs.map(v => ({ id: v.id, ...v.data() }));
      setVideos(vidsList);

      setChild({ 
        id: pDoc.id, 
        ...data, 
        name: data.name || data.fullName || 'Resident',
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
      console.error("Error fetching child data:", error);
    } finally {
      setLoading(false);
    }
  }, [childId, router]);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const sessionData = localStorage.getItem('welfare_session');
      if (!sessionData) {
        router.push('/departments/welfare/login');
        return;
      }
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.role === 'family' && parsed.childId === childId) {
          setSession(parsed);
          await fetchChildData();
        } else if (parsed.role === 'donor' && parsed.donorId) {
          // Open to all logged in donors!
          setSession(parsed);
          await fetchChildData();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error verifying child access:', err);
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [router, childId, fetchChildData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading resident profile...</p>
        </div>
      </div>
    );
  }

  if (!session || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">You do not have permissions to view this profile.</p>
        </div>
      </div>
    );
  }

  const healthStatus = child.healthStatus || {};
  const statusColor = (status: string) => {
    if (status === 'positive') return 'bg-red-100 text-red-700';
    if (status === 'negative') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-500';
  };

  // Enforce Section Visibility Settings
  const visible = child.visibleSections || {
    admissionDetails: true,
    dailySheet: true,
    medication: true,
    therapy: true,
    progressNotes: true,
    financialStatement: true,
    familyContact: true,
    visits: true,
    canteen: true,
    files: true,
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User, visible: visible.admissionDetails },
    { key: 'daily', label: 'Daily Sheet', icon: Activity, visible: visible.dailySheet },
    { key: 'therapy', label: 'Therapy', icon: Heart, visible: visible.therapy },
    { key: 'meds', label: 'Medication', icon: Pill, visible: visible.medication },
    { key: 'progress', label: 'Progress', icon: TrendingUp, visible: visible.progressNotes },
    { key: 'media', label: 'Media Gallery', icon: Camera, visible: visible.files },
  ].filter(t => t.visible);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link 
            href={session?.role === 'donor' ? "/departments/welfare/dashboard/donor" : "/departments/welfare/dashboard/family"} 
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-bold mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex flex-col items-start gap-3 p-2 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-teal-700 font-black text-3xl border border-teal-200/50 flex-shrink-0 overflow-hidden shadow-sm">
                {child.photoUrl ? (
                  <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  child.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">{child.name}</h1>
                <p className="text-gray-500 text-sm mt-0.5">{child.admissionNumber || `ID: ${child.id.substring(0, 6).toUpperCase()}`}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${child.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {child.isActive ? 'Active' : 'Departed'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest">
                <Calendar size={10} /> {formatDateDMY(child.admissionDate)}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                <Clock size={10} /> {child.daysAdmitted} days admitted
              </span>
              {child.category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                  {child.category}
                </span>
              )}
            </div>
            {visible.familyContact && (
              <div className="flex flex-wrap gap-2 mt-1 w-full sm:w-auto">
                {child.contactNumber && (
                  <a href={`tel:${child.contactNumber}`} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-black hover:bg-blue-100 active:scale-95 transition-all w-full sm:w-auto">
                    <Phone size={14} /> Call
                  </a>
                )}
                {child.whatsappNumber && (
                  <a href={`https://wa.me/${child.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 text-xs font-black hover:bg-green-100 active:scale-95 transition-all w-full sm:w-auto">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      {visible.financialStatement && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="rounded-2xl bg-teal-500/10 border border-teal-500/20 p-4">
            <p className="text-teal-600 text-[9px] font-black uppercase tracking-widest mb-3">Financial Summary</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-lg font-black text-teal-700">₨{child.totalDues?.toLocaleString() || '0'}</span>
                <span className="text-[9px] uppercase tracking-widest opacity-80 text-teal-600">Total Package</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-black text-teal-700">₨{child.totalReceived?.toLocaleString() || '0'}</span>
                <span className="text-[9px] uppercase tracking-widest opacity-80 text-teal-600">Received</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={`text-lg font-black ${(child.remaining || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>₨{child.remaining?.toLocaleString() || '0'}</span>
                <span className="text-[9px] uppercase tracking-widest opacity-80 text-teal-600">Remaining</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-black text-teal-700">₨{child.canteenBalance?.toLocaleString() || '0'}</span>
                <span className="text-[9px] uppercase tracking-widest opacity-80 text-teal-600">Canteen Balance</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="w-full">
          <div className="flex flex-wrap gap-1.5 pb-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[11px] whitespace-nowrap rounded-xl font-black transition-all active:scale-95 cursor-pointer ${
                  activeTab === tab.key ? 'bg-gray-900 text-white shadow-lg' : 'opacity-60 bg-white border border-gray-100 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab contents */}
        {activeTab === 'overview' && visible.admissionDetails && (
          <div className="space-y-6 mt-6 animate-in fade-in duration-500">
            {/* Health indicators */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Shield size={18} /> Diagnostic & Health Status</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'HIV', value: healthStatus.hivStatus },
                  { label: 'HBsAg', value: healthStatus.hbsagStatus },
                  { label: 'HCV', value: healthStatus.hcvStatus },
                  { label: 'TB', value: healthStatus.tbStatus },
                  { label: 'STI', value: healthStatus.stiStatus },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${statusColor(item.value || 'not_known')}`}>
                      {item.value?.replace('_', ' ') || 'Not Known'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guardian Contact Info */}
            {visible.familyContact && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><User size={18} /> Guardian Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</p>
                    <p className="font-bold text-gray-900 mt-1">{child.guardianName || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Relationship</p>
                    <p className="font-bold text-gray-900 mt-1">{child.guardianRelationship || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                    <a href={`tel:${child.contactNumber}`} className="font-bold text-teal-600 hover:underline mt-1 block">{child.contactNumber || '—'}</a>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</p>
                    {child.whatsappNumber ? (
                      <a href={`https://wa.me/${child.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 hover:underline mt-1 block">{child.whatsappNumber}</a>
                    ) : <p className="font-bold text-gray-400 mt-1">—</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'daily' && visible.dailySheet && session && (
          <div className="mt-6">
            <DailySheetTab childId={childId} session={session} readOnly />
          </div>
        )}

        {activeTab === 'therapy' && visible.therapy && session && (
          <div className="pointer-events-none mt-6">
            <TherapyTab childId={childId} session={session} />
          </div>
        )}

        {activeTab === 'meds' && visible.medication && session && (
          <div className="pointer-events-none mt-6">
            <MedicationTab childId={childId} session={session} />
          </div>
        )}

        {activeTab === 'progress' && visible.progressNotes && session && (
          <div className="pointer-events-none mt-6">
            <ProgressTab childId={childId} session={session} />
          </div>
        )}

        {activeTab === 'media' && visible.files && (
          <div className="space-y-6 mt-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Camera size={16} />
              </div>
              <h2 className="text-lg font-black text-gray-900">Media Gallery & Progress Files</h2>
            </div>
            
            {videos.length === 0 ? (
              <div className="text-center py-12 bg-white border-2 border-dashed border-gray-100 rounded-[2rem]">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-gray-900 font-bold">No Media Found</h4>
                <p className="text-gray-400 text-xs mt-1">There are no photos, videos, or documents uploaded for this resident yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {videos.map(vid => {
                  const isVideo = vid.fileType?.startsWith('video/') || vid.url?.includes('.mp4');
                  const isImage = vid.fileType?.startsWith('image/');
                  const isPdf = vid.fileType === 'application/pdf';

                  return (
                    <div key={vid.id} className="border border-gray-100 rounded-3xl overflow-hidden bg-white group hover:border-teal-300 transition-colors shadow-sm relative">
                      <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                        {isImage ? (
                          <img src={vid.url} alt={vid.title} className="w-full h-full object-cover" />
                        ) : isPdf ? (
                          <FileText className="w-12 h-12 text-gray-400" />
                        ) : (
                          <Video className="w-12 h-12 text-gray-400" />
                        )}
                        
                        <a href={vid.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-teal-600 transform scale-90 group-hover:scale-100 transition-transform shadow-md">
                            <Play className="w-5 h-5 ml-1" />
                          </div>
                        </a>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-900 truncate mb-1 text-sm" title={vid.title}>{vid.title || 'Untitled'}</h4>
                        <div className="flex items-center justify-between mt-2">
                           <p className="text-xs text-gray-400 font-medium">
                            {formatDateDMY(vid.createdAt)}
                          </p>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            isVideo ? 'bg-purple-50 text-purple-600' : isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {isVideo ? 'Video' : isPdf ? 'Doc' : 'Image'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}