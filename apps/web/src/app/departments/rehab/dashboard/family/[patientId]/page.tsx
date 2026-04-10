'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, DollarSign, ShoppingCart, Heart, Calendar, Clock, 
  CheckCircle, AlertCircle, Loader2, Phone, MessageCircle,
  Shield, Pill, TrendingUp, Activity, ArrowLeft, Users, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import DailySheetTab from '@/components/rehab/patient-profile/DailySheetTab';
import FinanceHistory, { MonthRecord, Payment as PaymentType } from '@/components/rehab/patient-profile/FinanceHistory';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'daily' | 'therapy' | 'meds' | 'progress' | 'visits'>('overview');
  const [payments, setPayments] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);

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
      setPayments(allPayments.sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()));

      const visitsSnap = await getDocs(query(collection(db, 'rehab_visits'), where('patientId', '==', patientId)));
      const vData = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setVisits(vData.sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()));

      const monthlyPkg = Number(data.monthlyPackage || data.packageAmount || 0);
      const totalPkg = (monthlyPkg * (data.durationMonths || 1));
      const dailyRate = Math.floor(monthlyPkg / 30);
      const dueTillDate = daysSince * dailyRate;
      const remainingTillDate = dueTillDate - totalReceived;

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
        overallReceived: totalReceived,
        overallRemaining: totalPkg - totalReceived,
        dailyRate,
        dueTillDate,
        remainingTillDate,
        remaining: totalPkg - totalReceived,
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full pb-20 sm:pb-0">
      {/* Sticky Header for Mobile */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 sm:relative">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="hidden sm:block">
            <Link href="/departments/rehab/dashboard/family" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-800 text-xs font-black uppercase tracking-widest mb-4 transition-colors">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-teal-700 font-black text-xl sm:text-3xl border border-teal-200/50 flex-shrink-0 overflow-hidden shadow-sm">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                patient.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight truncate">{patient.name}</h1>
              <p className="text-gray-500 text-[10px] sm:text-sm font-bold uppercase tracking-widest">S/o {patient.fatherName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${patient.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {patient.isActive ? 'Active' : 'Discharged'}
              </span>
              <div className="hidden sm:flex gap-2">
                {patient.contactNumber && (
                   <a href={`tel:${patient.contactNumber}`} className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[11px] font-black hover:bg-blue-100 transition-all border border-blue-100/50">
                     <Phone size={14} /> Call
                   </a>
                )}
                {patient.whatsappNumber && (
                  <a href={`https://wa.me/${patient.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 text-green-600 text-[11px] font-black hover:bg-green-100 transition-all border border-green-100/50">
                     <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-xl shadow-gray-200 overflow-hidden relative border border-gray-800">
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-4 relative z-10">Real-time Financial History</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Est. Total</span>
              <span className="text-xl font-black text-white">₨{patient.totalPkg?.toLocaleString()}</span>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">{patient.durationMonths || 1} M Program</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Received</span>
              <span className="text-xl font-black text-teal-400">₨{patient.totalReceived?.toLocaleString()}</span>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Verified Payments</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black text-orange-400/80 tracking-widest">Due till Date</span>
              <span className="text-xl font-black text-orange-400">₨{(patient.remainingTillDate || 0).toLocaleString()}</span>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Day {patient.daysAdmitted}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Canteen</span>
              <span className={`text-xl font-black ${patient.canteenBalance >= 0 ? 'text-white' : 'text-red-500'}`}>₨{patient.canteenBalance?.toLocaleString()}</span>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Current Wallet</span>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('finance')}
            className="w-full mt-6 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-teal-400 flex items-center justify-center gap-2"
          >
            View Full Billing Details <DollarSign size={12} />
          </button>
        </div>
      </div>

      {/* Sticky Tabs for Mobile */}
      <div className="sticky top-[72px] sm:static z-30 bg-gray-50/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-gray-200">
            {[
              { key: 'overview', label: 'Overview', icon: User },
              { key: 'finance', label: 'Finance', icon: DollarSign },
              { key: 'daily', label: 'Sheet', icon: Activity },
              { key: 'visits', label: 'Visits', icon: Clock },
              { key: 'therapy', label: 'Therapy', icon: Heart },
              { key: 'meds', label: 'Meds', icon: Pill },
              { key: 'progress', label: 'Progress', icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[11px] whitespace-nowrap rounded-xl font-black transition-all active:scale-95 flex-shrink-0 ${
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
        {activeTab === 'finance' && (
          <div className="space-y-8 mt-6">
             <FinanceHistory 
              patientName={patient.name}
              records={(() => {
                const records: MonthRecord[] = [];
                const monthlyPkg = Number(patient.monthlyPackage || 40000);
                
                // Group payments by month
                const groups: { [key: string]: PaymentType[] } = {};
                payments.forEach(p => {
                  const date = toDate(p.date);
                  const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
                  if (!groups[monthLabel]) groups[monthLabel] = [];
                  groups[monthLabel].push({
                    date: date.toLocaleDateString('en-PK'),
                    amount: Number(p.amount),
                    receivedBy: "Admin Portal",
                    verifiedByHQ: p.approved,
                    status: p.approved ? "Approved" : "Pending"
                  });
                });

                // Create MonthRecord from groups
                Object.keys(groups).forEach(label => {
                  const monthPayments = groups[label];
                  const totalPaid = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);
                  records.push({
                    label,
                    package: monthlyPkg,
                    totalPaid,
                    remaining: Math.max(0, monthlyPkg - totalPaid),
                    payments: monthPayments
                  });
                });

                return records.length > 0 ? records : [{
                  label: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase(),
                  package: monthlyPkg,
                  totalPaid: 0,
                  remaining: monthlyPkg,
                  payments: []
                }];
              })()}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Package</p>
                  <p className="text-xl font-black text-[#1a3a5c]">PKR {Number(patient.totalPkg).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Received</p>
                  <p className="text-xl font-black text-green-700">PKR {Number(patient.overallReceived).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 border-l-4 border-l-orange-500">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Till Today</p>
                  <p className="text-xl font-black text-orange-600">PKR {Number(patient.remainingTillDate).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Audit Trail Table */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-8">
              <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                 <Clock size={16} className="text-teal-600" /> Audit Trail
              </h3>
              <div className="overflow-x-auto no-scrollbar">
                 <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                      <th className="pb-4">Date</th>
                      <th className="pb-4">Amount</th>
                      <th className="pb-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payments.map((payment, idx) => (
                      <tr key={payment.id || idx} className="text-xs">
                        <td className="py-4 text-gray-500 font-medium">{toDate(payment.date).toLocaleDateString()}</td>
                        <td className="py-4 font-black text-gray-900">₨{Number(payment.amount).toLocaleString()}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${payment.approved || payment.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {payment.approved || payment.status === 'approved' ? 'APPROVED' : 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-2">
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
                    <div key={i} className="p-6 hover:bg-gray-50 transition-colors group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-all shrink-0">
                            <User size={24} />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-lg">{v.visitorName}</p>
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Shield size={18} /> Health Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
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