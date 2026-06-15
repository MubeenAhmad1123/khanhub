'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, DollarSign, Heart, Calendar, Clock, 
  Loader2, Phone, MessageCircle,
  Shield, Pill, TrendingUp, Activity, ArrowLeft, Users,
  ShoppingCart, Video, Play, FileText
} from 'lucide-react';
import Link from 'next/link';
import DailySheetTab from '@/components/rehab/patient-profile/DailySheetTab';
import FinanceHistory from '@/components/patient/FinanceHistory';
import TherapyTab from '@/components/rehab/patient-profile/TherapyTab';
import MedicationTab from '@/components/rehab/patient-profile/MedicationTab';
import AdmissionTab from '@/components/rehab/patient-profile/AdmissionTab';
import { formatDateDMY } from '@/lib/utils';
import { Patient } from '@/types/rehab';
import { useVisibleSections } from '@/hooks/useVisibleSections';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'admission' | 'finance' | 'daily' | 'therapy' | 'meds' | 'visits' | 'canteen' | 'videos'>('overview');
  const [payments, setPayments] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [canteenTransactions, setCanteenTransactions] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);

  const { sections, loading: visibilityLoading } = useVisibleSections('rehab', 'patients', patientId);

  useEffect(() => {
    if (visibilityLoading) return;
    const tabVisibility: Record<string, boolean> = {
      overview: sections.admissionDetails !== false,
      admission: sections.admissionDetails !== false,
      finance: sections.financialStatement !== false,
      daily: sections.dailySheet !== false,
      visits: sections.visits !== false,
      therapy: sections.therapy !== false,
      meds: sections.medication !== false,
      canteen: sections.canteen !== false,
      videos: sections.files !== false,
    };
    
    if (tabVisibility[activeTab] === false) {
      const firstVisible = Object.keys(tabVisibility).find(k => tabVisibility[k] !== false);
      if (firstVisible) {
        setActiveTab(firstVisible as any);
      }
    }
  }, [sections, visibilityLoading, activeTab]);

  const fetchPatientData = useCallback(async () => {
    try {
      const pDoc = await getDoc(doc(db, 'rehab_patients', patientId));
      if (!pDoc.exists()) { router.push('/departments/rehab/login'); return; }
      const data = pDoc.data() as Patient;
      
      const admissionDate = toDate(data.admissionDate);
      const endDate = data.isActive === false && data.dischargeDate 
        ? toDate(data.dischargeDate) 
        : new Date();
        
      const diffMs = endDate.getTime() - admissionDate.getTime();
      const daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const months = Math.floor(daysSince / 30);
      const days = daysSince % 30;
      const durationFormatted = months > 0 
        ? `${months} Month${months > 1 ? 's' : ''}${days > 0 ? ` and ${days} Day${days > 1 ? 's' : ''}` : ''}`
        : `${days} Day${days > 1 ? 's' : ''}`;

      const [feesSnap, canteenSnap] = await Promise.all([
        getDocs(query(collection(db, 'rehab_fees'), where('patientId', '==', patientId))),
        getDocs(query(collection(db, 'rehab_canteen'), where('patientId', '==', patientId))),
      ]);

      let totalReceived = 0;
      const allPayments: any[] = [];
      feesSnap.docs.forEach(d => {
        const feeData = d.data();
        (feeData.payments || []).forEach((p: any) => {
          if (p.status === 'approved' || p.approved === true) {
            totalReceived += Number(p.amount || 0);
          }
          allPayments.push({ ...p, month: feeData.month });
        });
      });
      setPayments(allPayments.sort((a, b) => toDate(b.date || 0).getTime() - toDate(a.date || 0).getTime()));

      const visitsSnap = await getDocs(query(collection(db, 'rehab_visits'), where('patientId', '==', patientId)));
      const vData = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setVisits(vData.sort((a, b) => toDate(b.date || 0).getTime() - toDate(a.date || 0).getTime()));

      const monthlyPkg = Number(data.monthlyPackage || data.packageAmount || 0);
      const dailyRate = Math.round(monthlyPkg / 30);

      const rawMonths = (endDate.getFullYear() - admissionDate.getFullYear()) * 12 + (endDate.getMonth() - admissionDate.getMonth());
      let completedMonths = rawMonths;
      let hasExtraDays = false;

      if (endDate.getDate() < admissionDate.getDate()) {
        completedMonths = rawMonths - 1;
        hasExtraDays = true;
      } else if (endDate.getDate() > admissionDate.getDate()) {
        completedMonths = rawMonths;
        hasExtraDays = true;
      } else {
        completedMonths = rawMonths;
        hasExtraDays = false;
      }

      const billableMonths = Math.max(1, completedMonths + (hasExtraDays ? 1 : 0));
      const dueTillDate = billableMonths * monthlyPkg;
      const remainingTillDate = dueTillDate - totalReceived;

      let totalCanteenDeposited = 0, totalCanteenSpent = 0;
      const allCanteenTransactions: any[] = [];
      canteenSnap.docs.forEach(d => {
        const cData = d.data();
        totalCanteenDeposited += cData.totalDeposited || 0;
        totalCanteenSpent += cData.totalSpent || 0;
        if (Array.isArray(cData.transactions)) {
          cData.transactions.forEach((t: any) => {
            allCanteenTransactions.push({ ...t, month: cData.month });
          });
        }
      });
      setCanteenTransactions(allCanteenTransactions.sort((a, b) => toDate(b.date || 0).getTime() - toDate(a.date || 0).getTime()));

      try {
        const videosSnap = await getDocs(query(collection(db, 'rehab_videos'), where('patientId', '==', patientId)));
        const vids = videosSnap.docs.map(v => ({ id: v.id, ...v.data() } as any));
        setVideos(vids.sort((a, b) => toDate(b.createdAt || 0).getTime() - toDate(a.createdAt || 0).getTime()));
      } catch (err) {
        console.warn("Videos fetch error:", err);
      }

      setPatient({ 
        ...data, 
        admissionDate, 
        daysAdmitted: daysSince,
        durationFormatted,
        monthlyPackage: monthlyPkg,
        totalReceived,
        overallReceived: totalReceived,
        dailyRate,
        dueTillDate,
        remainingTillDate,
        overallRemaining: dueTillDate - totalReceived,
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
    const isSuperAdmin = parsed.role === 'superadmin';
    
    if (!isSuperAdmin && (parsed.role !== 'family' || parsed.patientId !== patientId)) {
      setLoading(false);
      return;
    }
    setSession(parsed);
    fetchPatientData();
  }, [router, patientId, fetchPatientData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (!session || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-bounce" />
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full pb-20 sm:pb-0">
      {/* Header with Navigation */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 sm:relative">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="block mb-3 sm:mb-4">
            <Link href="/departments/rehab/dashboard/family" className="no-print inline-flex items-center gap-2 text-gray-400 hover:text-gray-800 text-xs font-black uppercase tracking-widest transition-colors">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-teal-700 font-black text-2xl sm:text-3xl border border-teal-200/50 flex-shrink-0 overflow-hidden shadow-sm">
                {patient.photoUrl ? (
                  <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
                ) : (
                  patient.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate leading-tight">{patient.name}</h1>
                <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-widest mt-0.5">S/o {patient.fatherName}</p>
                {!patient.isActive && patient.dischargeDate && (
                  <p className="text-rose-600 text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1">Discharged on: {formatDateDMY(patient.dischargeDate)}</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-t border-gray-50 pt-3 sm:pt-0 sm:border-t-0">
              <span className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${patient.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {patient.isActive ? 'Active' : 'Discharged'}
              </span>
              <div className="flex flex-wrap gap-2">
                {patient.contactNumber && session?.role !== 'family' && (
                   <a href={`tel:${patient.contactNumber}`} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[11px] font-black hover:bg-blue-100 transition-all border border-blue-100/50 shadow-sm active:scale-95">
                     <Phone size={14} /> Call
                   </a>
                )}
                {patient.whatsappNumber && (
                  <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-600 text-[11px] font-black hover:bg-green-100 transition-all border border-green-100/50 shadow-sm active:scale-95">
                     <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary card rewritten with premium white background and black text */}
      {sections.financialStatement !== false && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 text-gray-900 shadow-sm border border-gray-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-4 relative z-10">Real-time Financial History</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
              <div className="flex flex-col gap-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 sm:bg-transparent sm:border-0 sm:p-0">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Monthly Package</span>
                <span className="text-xl font-black text-gray-900">₨{patient.monthlyPackage?.toLocaleString()}</span>
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-tighter">PKR {patient.dailyRate}/Day</span>
              </div>
              <div className="flex flex-col gap-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 sm:bg-transparent sm:border-0 sm:p-0">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Total Received</span>
                <span className="text-xl font-black text-teal-600">₨{patient.totalReceived?.toLocaleString()}</span>
                <span className="text-[9px] text-teal-500/70 font-semibold uppercase tracking-tighter">Verified Payments</span>
              </div>
              <div className="flex flex-col gap-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 sm:bg-transparent sm:border-0 sm:p-0">
                <span className="text-[10px] uppercase font-black text-orange-600/80 tracking-widest">Current Balance</span>
                <span className="text-xl font-black text-orange-600">₨{(patient.remainingTillDate || 0).toLocaleString()}</span>
                <span className="text-[9px] text-orange-500/70 font-semibold uppercase tracking-tighter">{patient.durationFormatted}</span>
              </div>
              <div className="flex flex-col gap-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 sm:bg-transparent sm:border-0 sm:p-0">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Canteen</span>
                <span className={`text-xl font-black ${patient.canteenBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>₨{patient.canteenBalance?.toLocaleString()}</span>
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-tighter">Current Wallet</span>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('finance')}
              className="w-full mt-6 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-teal-600 flex items-center justify-center gap-2 active:scale-95"
            >
              View Full Billing Details <DollarSign size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Tabs for Mobile */}
      <div className="sticky top-[72px] sm:static z-30 bg-gray-50/90 backdrop-blur-md border-b border-gray-150 py-2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
            {[
              { key: 'overview', label: 'Overview', icon: User, visible: sections.admissionDetails !== false },
              { key: 'admission', label: 'Admission', icon: FileText, visible: sections.admissionDetails !== false },
              { key: 'finance', label: 'Finance', icon: DollarSign, visible: sections.financialStatement !== false },
              { key: 'canteen', label: 'Canteen', icon: ShoppingCart, visible: sections.canteen !== false },
              { key: 'daily', label: 'Sheet', icon: Activity, visible: sections.dailySheet !== false },
              { key: 'visits', label: 'Visits', icon: Clock, visible: sections.visits !== false },
              { key: 'therapy', label: 'Therapy', icon: Heart, visible: sections.therapy !== false },
              { key: 'meds', label: 'Meds', icon: Pill, visible: sections.medication !== false },
              { key: 'videos', label: 'Files', icon: Video, visible: sections.files !== false },
            ].filter(t => t.visible !== false).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[11px] whitespace-nowrap rounded-xl font-black uppercase tracking-wider transition-all active:scale-95 flex-shrink-0 ${
                  activeTab === tab.key ? 'bg-gray-900 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {activeTab === 'admission' && (
          <div className="space-y-6 sm:space-y-8 mt-6">
            <AdmissionTab patient={patient} readOnly={true} />
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6 sm:space-y-8 mt-6">
             <FinanceHistory 
              totalPackage={(patient.dueTillDate || 0) + (patient.medicineCharges || 0)}
              payments={payments.map(p => ({
                date: toDate(p.date).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '),
                amount: Number(p.amount),
                type: p.type || 'Monthly Fee',
                status: (p.approved || p.status === 'approved') ? 'Approved' : 'Pending',
                note: p.note || p.receivedByNote || 'Standard payment',
                receivedBy: p.receivedBy || p.receiver || 'Staff'
              }))}
              monthlyDetails={(() => {
                const details: any[] = [];
                const monthlyPkg = Number(patient.monthlyPackage || 40000);
                
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                
                const groups: { [key: string]: number } = {};
                payments.forEach(p => {
                  const d = toDate(p.date);
                  const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                  if (p.approved || p.status === 'approved') {
                    groups[key] = (groups[key] || 0) + Number(p.amount);
                  }
                });

                if (Object.keys(groups).length === 0) {
                  const d = new Date();
                  groups[`${monthNames[d.getMonth()]} ${d.getFullYear()}`] = 0;
                }

                Object.keys(groups).forEach(month => {
                  details.push({
                    month,
                    totalDue: monthlyPkg,
                    totalPaid: groups[month],
                    remaining: Math.max(0, monthlyPkg - groups[month])
                  });
                });

                return details.sort((a, b) => {
                   const dateA = new Date(a.month);
                   const dateB = new Date(b.month);
                   return dateB.getTime() - dateA.getTime();
                });
              })()}
            />
          </div>
        )}

        {activeTab === 'canteen' && (
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-gray-50 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-2 text-base sm:text-lg">
                    <ShoppingCart size={18} className="text-teal-600" /> Canteen Wallet History
                  </h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Canteen deposits and expenses</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Balance</p>
                  <p className={`text-xl sm:text-2xl font-black ${patient.canteenBalance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                    PKR {Number(patient.canteenBalance || 0).toLocaleString('en-PK')}
                  </p>
                </div>
              </div>
              {canteenTransactions.length === 0 ? (
                <div className="p-12 text-center text-gray-450">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">No canteen transactions found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 divide-y divide-gray-50">
                  {canteenTransactions.map((t, i) => (
                    <div key={i} className={`p-5 sm:p-6 hover:bg-gray-50 transition-colors group flex items-center justify-between gap-4 border-l-4 ${t.type === 'deposit' ? 'border-l-green-400 bg-green-50/10' : 'border-l-red-400'}`}>
                      <div>
                        <p className="font-black text-gray-900 text-sm sm:text-base">{t.description || (t.type === 'deposit' ? 'Wallet Deposit' : 'Canteen Purchase')}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          {formatDateDMY(t.date?.toDate?.() ? t.date.toDate() : t.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-base sm:text-lg font-black ${t.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'deposit' ? '+' : '-'}PKR {t.amount?.toLocaleString('en-PK')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-gray-50">
                <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-2 text-base sm:text-lg">
                  <Clock size={18} className="text-teal-600" /> Family Visit Logs
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Official history of visitors</p>
              </div>
              {visits.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Users size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">No family visits have been logged yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 divide-y divide-gray-50">
                  {visits.map((v, i) => (
                    <div key={i} className="p-5 sm:p-6 hover:bg-gray-50 transition-colors group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-all shrink-0">
                            <User size={24} />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-base sm:text-lg">{v.visitorName}</p>
                            <p className="text-xs text-gray-500 font-bold">{v.relation}</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-black text-gray-900">{formatDateDMY(v.date)}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Visit Logged</p>
                        </div>
                      </div>
                      {v.notes && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 italic border border-gray-100 group-hover:bg-white group-hover:border-teal-100 transition-all">
                          &ldquo;{v.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 animate-in fade-in duration-500">
              <h2 className="font-black text-gray-900 text-base sm:text-lg mb-4 flex items-center gap-2">
                <Clock size={18} className="text-teal-600" /> Stay Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Admission Date</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {patient.admissionDate ? formatDateDMY(patient.admissionDate) : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Discharge Date</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {patient.isActive === false && patient.dischargeDate ? formatDateDMY(patient.dischargeDate) : 'Still Admitted'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Stay Duration</p>
                  <p className="font-bold text-gray-900 mt-1">{patient.durationFormatted || '0 Days'}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Days</p>
                  <p className="font-bold text-gray-900 mt-1">{patient.daysAdmitted} Days</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h2 className="font-black text-gray-900 text-base sm:text-lg mb-4 flex items-center gap-2"><Shield size={18} /> Health Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'HIV', value: healthStatus.hivStatus },
                  { label: 'HBsAg', value: healthStatus.hbsagStatus },
                  { label: 'HCV', value: healthStatus.hcvStatus },
                  { label: 'TB', value: healthStatus.tbStatus },
                  { label: 'STI', value: healthStatus.stiStatus },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100/50">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                    <span className={`inline-block mt-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest ${statusColor(item.value || 'not_known')}`}>
                      {item.value?.replace('_', ' ') || 'Not Known'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {sections.familyContact !== false && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                <h2 className="font-black text-gray-900 text-base sm:text-lg mb-4 flex items-center gap-2"><User size={18} /> Guardian Contact</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Name</p>
                    <p className="font-bold text-gray-900 mt-1">{patient.guardianName || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Relationship</p>
                    <p className="font-bold text-gray-900 mt-1">{patient.guardianRelationship || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Phone</p>
                    <a href={`tel:${patient.contactNumber}`} className="font-bold text-teal-600 hover:underline mt-1 block">{patient.contactNumber || '—'}</a>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">WhatsApp</p>
                    {patient.whatsappNumber ? (
                      <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 hover:underline mt-1 block">{patient.whatsappNumber}</a>
                    ) : <p className="font-bold text-gray-400 mt-1">—</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'daily' && session && (
          <DailySheetTab patientId={patientId} session={session} readOnly />
        )}

        {activeTab === 'therapy' && session && (
          <div className="pointer-events-none mt-6">
            <TherapyTab patientId={patientId} session={session} />
          </div>
        )}

        {activeTab === 'meds' && session && (
          <div className="pointer-events-none mt-6">
            <MedicationTab patientId={patientId} session={session} />
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-gray-50">
                <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-2 text-base sm:text-lg">
                  <Video size={18} className="text-teal-600" /> Files & Media Progress
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Videos and documents uploaded for updates</p>
              </div>
              <div className="p-5 sm:p-6">
                {videos.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                    <Video className="w-12 h-12 text-gray-300 mx-auto mb-3 opacity-30" />
                    <p className="text-gray-500 text-sm">No files uploaded yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map(vid => {
                      const isVideo = vid.fileType?.startsWith('video/') || vid.url?.includes('.mp4');
                      const isImage = vid.fileType?.startsWith('image/');
                      const isPdf = vid.fileType === 'application/pdf';

                      return (
                        <div key={vid.id} className="border border-gray-205 rounded-2xl overflow-hidden bg-white group hover:border-teal-300 transition-colors shadow-sm relative flex flex-col justify-between">
                          <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                            {isImage ? (
                              <img src={vid.url} alt={vid.title} className="w-full h-full object-cover opacity-80" />
                            ) : isPdf ? (
                              <FileText className="w-10 h-10 text-gray-600 z-0" />
                            ) : (
                              <Video className="w-10 h-10 text-gray-600 z-0" />
                            )}

                            <a href={vid.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-teal-600 transform scale-90 group-hover:scale-100 transition-transform">
                                <Play className="w-5 h-5 ml-1" />
                              </div>
                            </a>
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-gray-900 dark:text-white truncate mb-1" title={vid.title}>{vid.title || 'Untitled'}</h4>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                {formatDateDMY(vid.createdAt)}
                              </p>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isVideo ? 'bg-purple-50 text-purple-600' : isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                {isVideo ? 'Video' : isPdf ? 'Document' : 'Image'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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