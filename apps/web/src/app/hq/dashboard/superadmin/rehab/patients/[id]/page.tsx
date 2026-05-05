'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { Loader2, ArrowLeft, Heart, Calendar, User, Phone, MapPin, ShieldCheck, Info, Database } from 'lucide-react';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';
import { formatDateDMY, toDate } from '@/lib/utils';

import { useHqSession } from '@/hooks/hq/useHqSession';

import { formatPKR } from '@/lib/hq/superadmin/format';
import { EmptyState } from '@/components/hq/superadmin/DataState';

export default function HqRehabPatientProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { session, loading: sessionLoading } = useHqSession();
  const patientId = params?.id;

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any | null>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }
    if (!patientId) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Patient
        const snap = await getDoc(doc(db, 'rehab_patients', patientId));
        if (!snap.exists()) {
          setPatient(null);
          setError('Patient not found.');
          setLoading(false);
          return;
        }
        setPatient({ id: snap.id, ...snap.data() });

        // Fetch Transactions (Cached 60s)
        const cacheKey = `rehab_tx_${patientId}`;
        const cachedTx = getCached<any[]>(cacheKey);
        let txList = [];

        if (cachedTx) {
          txList = cachedTx;
        } else {
          const q = query(
            collection(db, 'rehab_transactions'),
            where('patientId', '==', patientId),
            limit(50)
          );
          const txSnap = await getDocs(q);
          txList = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCached(cacheKey, txList, 60);
        }

        // Client-side sort
        txList.sort((a: any, b: any) => {
          const tA = toDate(a.createdAt || a.date).getTime();
          const tB = toDate(b.createdAt || b.date).getTime();
          return tB - tA;
        });


        setTx(txList);
      } catch (e: any) {
        console.error('[HQ Superadmin] load patient error:', e);
        setError(e?.message || 'Failed to load patient.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [sessionLoading, session, router, patientId]);


  const totals = useMemo(() => {
    const approved = tx.filter((t) => String(t.status) === 'approved');
    const totalApproved = approved.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingCount = tx.filter((t) => String(t.status) === 'pending').length;
    return { totalApproved, pendingCount };
  }, [tx]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-6" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic animate-pulse">Synchronizing Patient Matrix...</p>
        </div>
      </div>
    );
  }

  if (!patient && error) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] p-8 flex items-center justify-center">
        <EmptyState title="Access Restricted" message={error} />
      </div>
    );
  }

  const renderValue = (val: any): string => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (val instanceof Timestamp) return formatDateDMY(val.toDate());
    if (val?.seconds) return formatDateDMY(new Date(val.seconds * 1000));
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const getVal = (keys: string[]) => {
    for (const k of keys) {
      if (patient[k] !== undefined && patient[k] !== null && patient[k] !== '') {
        return renderValue(patient[k]);
      }
    }
    return '—';
  };

  const explicitKeys = ['id', 'name', 'fatherName', 'guardianName', 'cnic', 'cnicNo', 'dob', 'age', 'gender', 'phone', 'contactNumber', 'contact', 'emergencyContact', 'address', 'admissionDate', 'dischargeDate', 'createdAt', 'inpatientNumber', 'outpatientNumber', 'status', 'isActive', 'assignedTo', 'doctor', 'staffName', 'diagnosis', 'addictionType', 'notes', 'remarks'];
  
  const additionalFields = patient ? Object.entries(patient).filter(([k]) => !explicitKeys.includes(k)) : [];

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-gray-900 py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="group inline-flex items-center gap-4 text-gray-400 hover:text-indigo-600 transition-all font-black text-[10px] uppercase tracking-[0.3em]"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:-translate-x-1 transition-all">
            <ArrowLeft size={16} /> 
          </div>
          Return to Registry
        </button>

        <div className="bg-white border border-gray-100 rounded-[3rem] p-10 md:p-16 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] relative overflow-hidden">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10 mb-16 pb-16 border-b border-gray-50">
            <div className="flex items-center gap-10">
              <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-200 transition-transform hover:scale-105 duration-500">
                <Heart size={44} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h1 className="text-5xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
                  {patient?.name || 'SUBJECT NODE'}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic">
                  Premium Rehab Infrastructure • Authorization Alpha
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-4 bg-indigo-50 text-indigo-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-sm border border-indigo-100">
              <ShieldCheck size={20} /> Verified Secure Node
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-16">
            <div className="rounded-[2.5rem] border border-gray-100 bg-gray-50/30 p-10 shadow-sm transition-all hover:scale-[1.02]">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4">Financial Clearance</div>
              <div className="text-2xl font-black text-indigo-600 tracking-tighter">{formatPKR(totals.totalApproved)}</div>
            </div>
            <div className="rounded-[2.5rem] border border-gray-100 bg-gray-50/30 p-10 shadow-sm transition-all hover:scale-[1.02]">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4">Pending Tasks</div>
              <div className="text-2xl font-black text-amber-500 tracking-tighter">{totals.pendingCount}</div>
            </div>
            <div className="rounded-[2.5rem] border border-gray-100 bg-gray-50/30 p-10 shadow-sm transition-all hover:scale-[1.02] sm:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4">Registry Hash (ID)</div>
              <div className="text-[11px] font-black font-mono text-gray-600 break-all bg-white/50 px-4 py-2 rounded-xl border border-gray-50">{patientId}</div>
            </div>
          </div>

          {patient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Identity Info */}
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/40">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                    <Info size={18} />
                  </div>
                  <p className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-900">Identity Profile</p>
                </div>
                <div className="space-y-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Guardian Authority</span>
                    <span className="font-black text-gray-900 uppercase text-lg">{getVal(['fatherName', 'guardianName'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Registry CNIC</span>
                    <span className="font-black text-gray-900 uppercase text-lg">{getVal(['cnic', 'cnicNo'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Temporal Data</span>
                    <span className="font-black text-gray-900 uppercase text-lg">{getVal(['dob', 'age'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Gender Class</span>
                    <span className="font-black text-gray-900 uppercase text-lg">{getVal(['gender'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Live Status</span>
                    <div className="inline-flex items-center gap-3">
                       <div className={`w-2.5 h-2.5 rounded-full ${patient.isActive !== false ? 'bg-indigo-600' : 'bg-rose-600'} animate-pulse`} />
                       <span className="font-black text-gray-900 uppercase tracking-widest">{getVal(['status', 'isActive'])}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admission & Contact Info */}
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/40">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                    <User size={18} />
                  </div>
                  <p className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-900">Logistics & Comms</p>
                </div>
                <div className="space-y-8">
                  <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-indigo-50 transition-colors">
                      <Calendar size={22} className="text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Inception Node</span>
                      <span className="font-black text-gray-900 uppercase text-base">{getVal(['admissionDate', 'createdAt'])}</span>
                    </div>
                  </div>
                  {patient.isActive === false && (
                    <div className="flex items-center gap-6 group">
                      <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                        <Calendar size={22} className="text-rose-600" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Termination Node</span>
                        <span className="font-black text-rose-600 uppercase text-base">{getVal(['dischargeDate'])}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-indigo-50 transition-colors">
                      <Phone size={22} className="text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Communication Protocol</span>
                      <span className="font-black text-gray-900 uppercase text-base">{getVal(['phone', 'contactNumber', 'contact', 'emergencyContact'])}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-indigo-50 transition-colors">
                      <MapPin size={22} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Geospatial Data</span>
                      <span className="font-black text-gray-900 uppercase text-sm line-clamp-2">{getVal(['address'])}</span>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-gray-50 flex flex-col gap-6">
                    <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
                       <div>
                         <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Department</span>
                         <span className="font-black text-indigo-600 uppercase">REHAB</span>
                       </div>
                       <div className="text-right">
                         <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Node Class</span>
                         <span className="font-black text-gray-900 uppercase">INPATIENT</span>
                       </div>
                    </div>
                    <div className="bg-gray-900 p-8 rounded-3xl shadow-xl">
                      <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.4em] block mb-3 italic">Authorization Signature</span>
                      <span className="font-black text-white uppercase text-lg tracking-widest block font-mono">{getVal(['inpatientNumber', 'outpatientNumber'])}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-3 block">Primary Physician Node</span>
                      <span className="font-black text-gray-900 uppercase text-lg">{getVal(['assignedTo', 'doctor', 'staffName'])}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="md:col-span-2 bg-indigo-600 rounded-[3rem] p-12 md:p-16 shadow-2xl shadow-indigo-200">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center">
                    <Heart size={24} strokeWidth={2.5} />
                  </div>
                  <p className="text-[14px] font-black uppercase tracking-[0.4em] text-white">Clinical Intelligence & Remarks</p>
                </div>
                <p className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-[1.6] italic">
                  "{getVal(['diagnosis', 'addictionType', 'notes', 'remarks'])}"
                </p>
              </div>

              {/* Dynamic Database Record Dump */}
              {additionalFields.length > 0 && (
                <div className="md:col-span-2 bg-gray-50/50 border border-gray-100 rounded-[3rem] p-12 md:p-16">
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg">
                      <Database size={18} />
                    </div>
                    <p className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-900">Extended Schema Fragments</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {additionalFields.map(([key, val]) => (
                      <div key={key} className="flex flex-col bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md group">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate mb-3 group-hover:text-indigo-600" title={key}>{key}</span>
                        <span className="font-black text-sm text-gray-900 uppercase break-all">{renderValue(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          <div className="mt-24">
            <div className="flex items-end gap-6 mb-12 px-2">
               <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Financial Ledger</h2>
               <div className="h-0.5 bg-gray-100 flex-1 mb-3 rounded-full" />
            </div>
            
            {!tx.length ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[3rem] p-24 text-center">
                <p className="text-[12px] font-black uppercase tracking-[0.5em] text-gray-400 italic">No historical activities found in ledger stream</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tx.map((t) => {
                  const dateStr = t.createdAt ? renderValue(t.createdAt) : 'Unknown Date';
                  const isApproved = String(t.status) === 'approved';
                  const isRejected = String(t.status) === 'rejected';
                  return (
                    <div key={t.id} className="group rounded-[2.5rem] border border-gray-100 bg-white p-10 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-8 hover:scale-[1.01] hover:border-indigo-100">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-6 mb-4">
                          <p className="truncate text-2xl font-black text-gray-900 uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                            {String(t.transactionType || t.categoryName || t.category || t.type || 'Activity Node')}
                          </p>
                          <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${
                            isApproved ? 'bg-indigo-600 text-white border-indigo-600' :
                            isRejected ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-gray-50 text-gray-400 border-gray-100'
                          }`}>
                            {String(t.status || 'Syncing')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <span className="flex items-center gap-2"><Calendar size={12} /> {dateStr}</span>
                          {t.receiptNo && <span className="text-gray-900/60 bg-gray-50 px-3 py-1 rounded-lg">HASH #{t.receiptNo}</span>}
                          {t.cashierName && <span className="italic flex items-center gap-2"><ShieldCheck size={12} /> Authority: {t.cashierName.toUpperCase()}</span>}
                        </div>
                        {t.notes && <p className="mt-6 text-[11px] font-black uppercase tracking-[0.1em] text-gray-600 bg-gray-50 p-4 rounded-xl border-l-4 border-indigo-600 line-clamp-2 italic">Memo: {t.notes}</p>}
                      </div>
                      <div className="shrink-0 sm:text-right flex flex-col items-start sm:items-end">
                        <p className={`text-4xl font-black tracking-tighter ${isApproved ? 'text-indigo-600' : 'text-gray-900'}`}>{formatPKR(Number(t.amount || 0))}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mt-2">Cleared Assets</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
