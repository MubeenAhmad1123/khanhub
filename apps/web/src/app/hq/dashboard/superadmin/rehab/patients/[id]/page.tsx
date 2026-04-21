'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp, collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Loader2, ArrowLeft, Heart, Calendar, User, Phone, MapPin, ShieldCheck, Info, Database } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';
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
        const snap = await getDoc(doc(db, 'rehab_patients', patientId));
        if (!snap.exists()) {
          setPatient(null);
          setError('Patient not found.');
          return;
        }
        setPatient({ id: snap.id, ...snap.data() });
      } catch (e: any) {
        console.error('[HQ Superadmin] load patient error:', e);
        setError(e?.message || 'Failed to load patient.');
      } finally {
        setLoading(false);
      }
    };

    void run();

    // Also get transactions
    const unsub = onSnapshot(
      query(
        collection(db, 'rehab_transactions'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snap) => setTx(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))),
      (err) => {
        // Only log if necessary, it might fail if index is building but we fallback gracefully
        console.warn('Tx fetch error or index building:', err);
      }
    );

    return () => {
      unsub();
    };
  }, [sessionLoading, session, router, patientId]);

  const totals = useMemo(() => {
    const approved = tx.filter((t) => String(t.status) === 'approved');
    const totalApproved = approved.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingCount = tx.filter((t) => String(t.status) === 'pending').length;
    return { totalApproved, pendingCount };
  }, [tx]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  if (!patient && error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black p-8 flex items-center justify-center transition-colors duration-300">
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
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white py-12 px-4 md:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] inline-flex items-center gap-3 text-black dark:text-white bg-white dark:bg-black border border-gray-100 dark:border-white/10 px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={16} /> REVERT TO DIRECTORY
        </button>

        <div className="bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[1.5rem] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xl transition-transform hover:rotate-6">
                <Heart size={40} />
              </div>
              <div className="min-w-0">
                <h1 className="text-4xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter truncate">
                  {patient?.name || 'SUBJECT NODE'}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mt-2 italic">
                  Command Authorization Level Alpha • Rehab Architecture
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
              <ShieldCheck size={18} /> Authenticated Secure Access
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 shadow-sm transition-all hover:border-black dark:hover:border-white">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">Total Cleared</div>
              <div className="text-xl font-black text-black dark:text-white tracking-tighter">{formatPKR(totals.totalApproved)}</div>
            </div>
            <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 shadow-sm transition-all hover:border-black dark:hover:border-white">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">Queue Count</div>
              <div className="text-xl font-black text-black dark:text-white tracking-tighter">{totals.pendingCount}</div>
            </div>
            <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 shadow-sm transition-all hover:border-black dark:hover:border-white sm:col-span-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">ID Fragment</div>
              <div className="text-[10px] font-black font-mono text-gray-400 dark:text-gray-500 break-all">{patientId}</div>
            </div>
          </div>

          {patient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Identity Info */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-black dark:bg-white text-white dark:text-black">
                    <Info size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black dark:text-white">Identity Matrix</p>
                </div>
                <div className="space-y-6 text-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Authorized Guardian</span>
                    <span className="font-black text-black dark:text-white uppercase mt-1">{getVal(['fatherName', 'guardianName'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Registry ID (CNIC)</span>
                    <span className="font-black text-black dark:text-white uppercase mt-1">{getVal(['cnic', 'cnicNo'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Chrono Data (DOB/Age)</span>
                    <span className="font-black text-black dark:text-white uppercase mt-1">{getVal(['dob', 'age'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Gender Allocation</span>
                    <span className="font-black text-black dark:text-white uppercase mt-1">{getVal(['gender'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Node Status</span>
                    <span className="font-black text-black dark:text-white uppercase mt-1 tracking-wider">{getVal(['status', 'isActive'])}</span>
                  </div>
                </div>
              </div>

              {/* Admission & Contact Info */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-black dark:bg-white text-white dark:text-black">
                    <User size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black dark:text-white">Lifecycle & Contact</p>
                </div>
                <div className="space-y-6 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-black border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                      <Calendar size={18} className="text-gray-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Enrollment Sequence</span>
                      <span className="font-black text-black dark:text-white uppercase">{getVal(['admissionDate', 'createdAt'])}</span>
                    </div>
                  </div>
                  {patient.isActive === false && (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-black border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                        <Calendar size={18} className="text-rose-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Termination Sequence (Discharge)</span>
                        <span className="font-black text-black dark:text-white uppercase">{getVal(['dischargeDate'])}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-black border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                      <Phone size={18} className="text-gray-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Comm Node</span>
                      <span className="font-black text-black dark:text-white uppercase">{getVal(['phone', 'contactNumber', 'contact', 'emergencyContact'])}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-black border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin size={18} className="text-gray-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Geo Location</span>
                      <span className="font-black text-black dark:text-white uppercase text-[11px] line-clamp-2">{getVal(['address'])}</span>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Department</span>
                      <span className="font-black text-black dark:text-white uppercase">REHAB</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Node Class</span>
                      <span className="font-black text-black dark:text-white uppercase">INPATIENT</span>
                    </div>
                  </div>
                  <div className="bg-black dark:bg-white p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-white/40 dark:text-black/40 uppercase tracking-widest block mb-1">Authorization Fragment</span>
                    <span className="font-black text-white dark:text-black uppercase break-all">{getVal(['inpatientNumber', 'outpatientNumber'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Responsible Node</span>
                    <span className="font-black text-black dark:text-white uppercase mt-1">{getVal(['assignedTo', 'doctor', 'staffName'])}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="md:col-span-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-black dark:bg-white text-white dark:text-black">
                    <Heart size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black dark:text-white">Clinical Observations & Remarks</p>
                </div>
                <p className="text-[13px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-pre-wrap leading-[2] italic">
                  {getVal(['diagnosis', 'addictionType', 'notes', 'remarks'])}
                </p>
              </div>

              {/* Dynamic Database Record Dump */}
              {additionalFields.length > 0 && (
                <div className="md:col-span-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-8 mt-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-black dark:bg-white text-white dark:text-black">
                      <Database size={16} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black dark:text-white">Residual Database Fragments</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {additionalFields.map(([key, val]) => (
                      <div key={key} className="flex flex-col bg-white dark:bg-black p-4 rounded-2xl border border-gray-50 dark:border-white/5 shadow-sm">
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate" title={key}>{key}</span>
                        <span className="font-black text-[10px] text-black dark:text-white uppercase mt-1.5 break-all">{renderValue(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          <div className="mt-12">
            <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter mb-8 px-2">Ledger Stream</h2>
            {!tx.length ? (
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] p-12 text-center text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest italic shadow-inner">
                Zero authenticated activities logged in fragment stream.
              </div>
            ) : (
              <div className="space-y-4">
                {tx.map((t) => {
                  const dateStr = t.createdAt ? renderValue(t.createdAt) : 'Unknown Date';
                  const isApproved = String(t.status) === 'approved';
                  const isRejected = String(t.status) === 'rejected';
                  return (
                    <div key={t.id} className="group rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-6 hover:shadow-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:scale-[1.01]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <p className="truncate text-lg font-black text-black dark:text-white uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                            {String(t.transactionType || t.categoryName || t.category || t.type || 'Activity Node')}
                          </p>
                          <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${
                            isApproved ? 'bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white' :
                            isRejected ? 'bg-rose-500 text-white' :
                            'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/10'
                          }`}>
                            {String(t.status || 'Syncing')}
                          </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex flex-wrap items-center gap-4">
                          <span>{dateStr}</span>
                          {t.receiptNo && <span className="text-black dark:text-white opacity-40">FRAGMENT #{t.receiptNo}</span>}
                          {t.cashierName && <span className="italic">Authorized By: {t.cashierName.toUpperCase()}</span>}
                        </p>
                        {t.notes && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-600 line-clamp-1 italic">Memo: {t.notes}</p>}
                      </div>
                      <div className="shrink-0 sm:text-right flex flex-col items-start sm:items-end">
                        <p className="text-2xl font-black text-black dark:text-white tracking-tighter">{formatPKR(Number(t.amount || 0))}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mt-1">Value Clearance</p>
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
