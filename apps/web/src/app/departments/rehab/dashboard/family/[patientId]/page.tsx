'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, DollarSign, ShoppingCart, Video, Heart, 
  Calendar, Clock, CheckCircle, AlertCircle, Loader2, Play 
} from 'lucide-react';

export default function FamilyPatientViewPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [patient, setPatient] = useState<any>(null);
  const [feeRecord, setFeeRecord] = useState<any>(null);
  const [canteenRecord, setCanteenRecord] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);

  const fetchPatientData = useCallback(async () => {
    try {
      // 1. Patient Profile
      const pDoc = await getDoc(doc(db, 'rehab_patients', patientId));
      if (!pDoc.exists()) {
        router.push('/departments/rehab/login');
        return;
      }
      const data = pDoc.data();
      
      // Calculate Remaining Days (100-day program)
      let remainingDays = 0;
      if (data?.admissionDate) {
        const admission = data.admissionDate.toDate();
        const diffTime = Math.abs(new Date().getTime() - admission.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        remainingDays = Math.max(0, 100 - diffDays);
      }

      setPatient({ id: pDoc.id, ...data, remainingDays });

      // Current Month String (e.g. "2025-01")
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 2. Fees
      const feesQ = query(
        collection(db, 'rehab_fees'),
        where('patientId', '==', patientId),
        where('month', '==', monthStr)
      );
      const feeSnap = await getDocs(feesQ);
      if (!feeSnap.empty) setFeeRecord(feeSnap.docs[0].data());

      // 3. Canteen
      const canteenQ = query(
        collection(db, 'rehab_canteen'),
        where('patientId', '==', patientId),
        where('month', '==', monthStr)
      );
      const canteenSnap = await getDocs(canteenQ);
      if (!canteenSnap.empty) setCanteenRecord(canteenSnap.docs[0].data());

      // 4. Videos
      const videosQ = query(
        collection(db, 'rehab_videos'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      const vidSnap = await getDocs(videosQ);
      setVideos(vidSnap.docs.map(v => ({ id: v.id, ...v.data() })));

    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId, router]);

  useEffect(() => {
    const sessionData = localStorage.getItem('rehab_session');
    if (!sessionData) {
      router.push('/departments/rehab/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    
    // STRICT ROLE AND ID GUARD
    if (parsed.role !== 'family' || parsed.patientId !== patientId) {
      setLoading(false);
      return; // Will show "Access Denied" below
    }
    
    setSession(parsed);
  }, [router, patientId]);

  useEffect(() => {
    if (!session) return;
    fetchPatientData();
  }, [session, fetchPatientData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Access Denied State
  if (!session || session.role !== 'family' || session.patientId !== patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-6">You only have permission to view your linked patient's profile.</p>
          <button 
            onClick={() => router.push('/departments/rehab/login')}
            className="w-full bg-gray-900 text-white rounded-xl py-2.5 font-medium hover:bg-gray-800 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-rose-50/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-sm border border-teal-50/50 p-6 md:p-10 text-center relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 right-0 w-40 h-40 bg-teal-50 rounded-bl-full opacity-50 z-0 pointer-events-none"></div>
          
          <div className="relative z-10 mb-4">
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt={patient.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-md" />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center font-bold text-4xl border-4 border-white shadow-md">
                {patient.name.charAt(0).toUpperCase()}
              </div>
            )}
            {patient.isActive && (
              <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center" title="Active">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 mb-2 relative z-10 uppercase tracking-tight">{patient.name}</h1>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 relative z-10">
            <p className="text-sm text-gray-500 font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              Admitted: {patient.admissionDate?.toDate?.()?.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-200"></div>
            <p className="text-sm font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 uppercase tracking-widest shadow-sm">
              100-Day Program
            </p>
          </div>
        </div>

        {/* PROGRESS COUNTDOWN */}
        <div className="bg-gradient-to-br from-orange-500 to-rose-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl shadow-orange-200 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-200 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-100">Recovery Journey</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-2 uppercase italic tracking-tighter">Discharge Countdown</h2>
              <p className="text-orange-100 text-sm font-medium opacity-90 max-w-xs">
                Estimated remaining days in the intensive care program based on admission date.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 md:w-36 md:h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 drop-shadow-lg">
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="10" 
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * Math.min(100, (100 - (patient.remainingDays || 0)))) / 100}
                    className="text-white transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-black leading-none">{patient.remainingDays}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-100 mt-1">Days Left</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-black/10 rounded-2xl p-4 border border-white/5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-orange-50 mb-2 px-1">
              <span>Program Progress</span>
              <span>{Math.min(100, 100 - (patient.remainingDays || 0))}% Completed</span>
            </div>
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden shadow-inner">
              <div 
                className="bg-white h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                style={{ width: `${Math.min(100, (100 - (patient.remainingDays || 0)))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* SECTION 1: MONTHLY FEE */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Monthly Fee <span className="text-gray-400 font-medium text-lg">— {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </h2>
          </div>

          {!feeRecord ? (
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-center text-gray-500">
              <p>No fee record available for this month.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Package Amount</div>
                  <div className="text-2xl font-bold text-gray-900">Rs. {feeRecord.packageAmount.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                  <div className="text-sm text-green-700 mb-1">Amount Paid</div>
                  <div className="text-2xl font-bold text-green-800">Rs. {feeRecord.amountPaid.toLocaleString()}</div>
                </div>
                <div className={`p-5 rounded-2xl border ${feeRecord.amountRemaining > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`text-sm mb-1 ${feeRecord.amountRemaining > 0 ? 'text-red-700' : 'text-gray-500'}`}>Remaining</div>
                  <div className={`text-2xl font-bold ${feeRecord.amountRemaining > 0 ? 'text-red-800' : 'text-gray-900'}`}>
                    Rs. {feeRecord.amountRemaining.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium px-1">
                  <span>Paid: Rs. {feeRecord.amountPaid.toLocaleString()}</span>
                  <span>Total: Rs. {feeRecord.packageAmount.toLocaleString()}</span>
                </div>
                <div className="bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, (feeRecord.amountPaid / feeRecord.packageAmount) * 100))}%` }}
                  />
                </div>
              </div>

              {feeRecord.payments?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Payment History</h3>
                  <div className="space-y-2">
                    {feeRecord.payments.map((p: any, i: number) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 gap-2">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="font-bold text-gray-900">Rs. {p.amount.toLocaleString()}</span>
                        </div>
                        <span className="text-sm text-gray-500 ml-8 sm:ml-0">
                          {p.date?.toDate?.()?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 2: CANTEEN */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Canteen Wallet <span className="text-gray-400 font-medium text-lg">— {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </h2>
          </div>

          {!canteenRecord ? (
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-center text-gray-500">
              <p>No canteen activity this month.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-2">
                <span className="block text-sm text-gray-500 font-medium mb-1">Available Balance</span>
                <span className="text-4xl font-black text-green-600">Rs. {canteenRecord.balance.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-sm px-2 mb-2">
                <div className="text-gray-500">Deposited: <span className="font-bold text-gray-900">Rs. {canteenRecord.totalDeposited.toLocaleString()}</span></div>
                <div className="text-gray-500">Spent: <span className="font-bold text-gray-900">Rs. {canteenRecord.totalSpent.toLocaleString()}</span></div>
              </div>
              <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
                 <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, (canteenRecord.totalSpent / Math.max(canteenRecord.totalDeposited, 1)) * 100))}%` }}
                />
              </div>

              {canteenRecord.transactions?.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Transactions</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {canteenRecord.transactions.slice().reverse().map((tx: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            tx.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {tx.type === 'deposit' ? '↑' : '↓'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{tx.description}</div>
                            <div className="text-xs text-gray-400">
                              {tx.date?.toDate?.()?.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                        </div>
                        <div className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-gray-900'}`}>
                          {tx.type === 'deposit' ? '+' : '-'} {tx.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 3: VIDEOS */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Progress Videos</h2>
          </div>

          {videos.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 p-12 rounded-2xl text-center flex flex-col items-center">
              <Video className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No videos uploaded yet.</p>
              <p className="text-sm text-gray-400 mt-1">Videos will appear here when added by the center.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map(vid => {
                const isVideo = vid.fileType?.startsWith('video/') || vid.url?.includes('.mp4');
                const isImage = vid.fileType?.startsWith('image/');

                return (
                  <div key={vid.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 group hover:border-teal-300 hover:shadow-md transition-all">
                    <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                      {isImage ? (
                        <img src={vid.url} alt={vid.title} className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <Video className="w-10 h-10 text-gray-600 z-0" />
                      )}
                      
                      <a href={vid.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-teal-600 transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 ml-1" />
                        </div>
                      </a>
                    </div>
                    <div className="p-4 bg-white">
                      <h4 className="font-bold text-gray-900 truncate mb-1">{vid.title || 'Progress Update'}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {vid.createdAt?.toDate?.()?.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="text-center pt-4 pb-8">
          <p className="text-sm text-gray-400">For any queries, please contact KhanHub Rehab Center directly.</p>
        </div>

      </div>
    </div>
  );
}
