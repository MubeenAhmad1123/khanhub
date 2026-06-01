'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, limit, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCached, setCached } from '@/lib/queryCache';
import { formatDateDMY, toDate } from '@/lib/utils';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { formatPKR } from '@/lib/hq/superadmin/format';
import { ArrowLeft, User, Calendar, MapPin, Phone, ShieldCheck, Heart, Info, Database } from 'lucide-react';

export default function SuperadminSpimsStudentProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const studentId = params.id;
  const [student, setStudent] = useState<any | null>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    async function loadData() {
      setLoading(true);
      try {
        // Fetch Student Profile
        const studentSnap = await getDoc(doc(db, 'spims_students', studentId));
        if (studentSnap.exists()) {
          setStudent({ id: studentSnap.id, ...studentSnap.data() });
        }

        // Fetch Transactions (Cached 60s)
        const cacheKey = `spims_tx_${studentId}`;
        const cachedTx = getCached<any[]>(cacheKey);
        let txList = [];

        if (cachedTx) {
          txList = cachedTx;
        } else {
          const qStudent = query(
            collection(db, 'spims_transactions'),
            where('studentId', '==', studentId),
            limit(50)
          );
          const qPatient = query(
            collection(db, 'spims_transactions'),
            where('patientId', '==', studentId),
            limit(50)
          );
          const [snapStudent, snapPatient] = await Promise.all([
            getDocs(qStudent),
            getDocs(qPatient)
          ]);
          
          const txMap = new Map<string, any>();
          snapStudent.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
          snapPatient.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
          txList = Array.from(txMap.values());
          setCached(cacheKey, txList, 60);
        }

        // Client-side sort
        txList.sort((a: any, b: any) => {
          const tA = toDate(a.createdAt || a.date).getTime();
          const tB = toDate(b.createdAt || b.date).getTime();
          return tB - tA;
        });

        setTx(txList);
      } catch (err) {
        console.error('Error loading student data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session, studentId]);

  const totals = useMemo(() => {
    const approved = tx.filter((t) => String(t.status) === 'approved');
    const totalApproved = approved.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pending = tx.filter((t) => String(t.status) === 'pending' || String(t.status) === 'pending_cashier');
    const pendingAmount = pending.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingCount = pending.length;
    return { totalApproved, pendingCount, pendingAmount };
  }, [tx]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] flex items-center justify-center transition-colors duration-300">
        <InlineLoading label="Syncing Subject Matrix…" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] p-8 flex items-center justify-center transition-colors duration-300">
        <EmptyState title="Access Restricted" message="Subject record not found in central terminal." />
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
      if (student[k] !== undefined && student[k] !== null && student[k] !== '') {
        return renderValue(student[k]);
      }
    }
    return '—';
  };

  const remaining = student.totalPackage !== undefined 
    ? Math.max(0, (Number(student.totalPackage) || 0) - totals.totalApproved)
    : (Number(student.remaining ?? student.amountRemaining ?? 0) || 0);

  const explicitKeys = ['id', 'name', 'fatherName', 'guardianName', 'cnic', 'cnicNo', 'dob', 'age', 'gender', 'phone', 'contactNumber', 'contact', 'address', 'admissionDate', 'createdAt', 'studentNumber', 'rollNo', 'status', 'isActive', 'notes', 'remarks', 'remaining', 'amountRemaining', 'course', 'class'];
  
  const additionalFields = Object.entries(student).filter(([k]) => !explicitKeys.includes(k));

  return (
    <div className="min-h-screen bg-[#FCFAF2] text-slate-800 py-12 px-4 md:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] inline-flex items-center gap-3 text-slate-700 bg-white border border-gray-150 px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={16} /> REVERT TO DIRECTORY
        </button>

        <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-xl transition-transform hover:rotate-6">
                <User size={40} />
              </div>
              <div className="min-w-0">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter truncate">
                  {student?.name || 'SUBJECT NODE'}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2 italic">
                  Command Authorization Level Alpha • SPIMS Architecture
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
              <ShieldCheck size={18} /> Authenticated Secure Access
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="rounded-3xl border border-gray-100 bg-[#FCFBF8] p-6 shadow-sm transition-all hover:border-indigo-500">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Liabilities</div>
              <div className="text-xl font-black text-gray-900 tracking-tighter">{formatPKR(remaining)}</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-[#FCFBF8] p-6 shadow-sm transition-all hover:border-indigo-500">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Cleared</div>
              <div className="text-xl font-black text-gray-950 tracking-tighter">{formatPKR(totals.totalApproved)}</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-[#FCFBF8] p-6 shadow-sm transition-all hover:border-indigo-500">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Queue Count</div>
              <div className="text-xl font-black text-gray-900 tracking-tighter">{totals.pendingCount}</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-[#FCFBF8] p-6 shadow-sm transition-all hover:border-indigo-500">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Pending Amount</div>
              <div className="text-xl font-black text-gray-900 tracking-tighter">{formatPKR(totals.pendingAmount)}</div>
            </div>
          </div>

          {/* Primary Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Identity & Basic Info */}
            <div className="bg-[#FCFBF8] border border-gray-100 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-650">
                  <Info size={16} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Identity Matrix</p>
              </div>
              <div className="space-y-6 text-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorized Guardian</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['fatherName', 'guardianName'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registry ID (CNIC)</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['cnic', 'cnicNo'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chrono Data (DOB/Age)</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['dob', 'age'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gender Allocation</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['gender'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Status</span>
                  <span className="font-black text-gray-900 uppercase mt-1 tracking-wider">{getVal(['status', 'isActive'])}</span>
                </div>
              </div>
            </div>

            {/* Academic & Contact Info */}
            <div className="bg-[#FCFBF8] border border-gray-100 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-650">
                  <User size={16} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Lifecycle & Contact</p>
              </div>
              <div className="space-y-6 text-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-150 flex items-center justify-center shrink-0 shadow-sm">
                    <Calendar size={18} className="text-slate-600" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Enrollment Sequence</span>
                    <span className="font-black text-gray-900 uppercase">{getVal(['admissionDate', 'createdAt'])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-150 flex items-center justify-center shrink-0 shadow-sm">
                    <Phone size={18} className="text-slate-600" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Comm Node</span>
                    <span className="font-black text-gray-900 uppercase">{getVal(['phone', 'contactNumber', 'contact'])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-150 flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin size={18} className="text-slate-600" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Geo Location</span>
                    <span className="font-black text-gray-900 uppercase text-[11px] line-clamp-2">{getVal(['address'])}</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Department</span>
                    <span className="font-black text-gray-900 uppercase">SPIMS</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Classification</span>
                    <span className="font-black text-gray-900 uppercase">{getVal(['course', 'class'])}</span>
                  </div>
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Authorization Sequence</span>
                  <span className="font-black text-white uppercase break-all">{getVal(['studentNumber', 'rollNo'])}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="md:col-span-2 bg-[#FCFBF8] border border-gray-100 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-650">
                  <Heart size={16} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Observations & Remarks</p>
              </div>
              <p className="text-[13px] font-black text-slate-700 uppercase tracking-widest whitespace-pre-wrap leading-[2] italic">
                {getVal(['notes', 'remarks'])}
              </p>
            </div>
            
            {/* Dynamic Database Record Dump */}
            {additionalFields.length > 0 && (
              <div className="md:col-span-2 bg-[#FCFBF8] border border-gray-100 rounded-[2.5rem] p-8 mt-4 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-650">
                    <Database size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Residual Database Fragments</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {additionalFields.map(([key, val]) => (
                    <div key={key} className="flex flex-col bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate" title={key}>{key}</span>
                      <span className="font-black text-[10px] text-gray-900 uppercase mt-1.5 break-all">{renderValue(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="mt-12">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-8 px-2">Ledger Stream</h2>
            {!tx.length ? (
              <div className="bg-[#FCFBF8] border border-gray-100 rounded-[2rem] p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic shadow-inner">
                Zero authenticated activities logged in fragment stream.
              </div>
            ) : (
              <div className="space-y-4">
                {tx.map((t) => {
                  const dateStr = t.createdAt ? renderValue(t.createdAt) : 'Unknown Date';
                  const isApproved = String(t.status) === 'approved';
                  const isRejected = String(t.status) === 'rejected';
                  return (
                    <div key={t.id} className="group rounded-[2rem] border border-gray-100 bg-[#FCFBF8] p-6 hover:shadow-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:scale-[1.01] hover:bg-white">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <p className="truncate text-lg font-black text-gray-900 uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                            {String(t.transactionType || t.categoryName || t.category || t.type || 'Activity Node')}
                          </p>
                          <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${
                            isApproved ? 'bg-slate-900 text-white border border-slate-950' :
                            isRejected ? 'bg-rose-500 text-white' :
                            'bg-gray-100 text-slate-600 border border-gray-150'
                          }`}>
                            {String(t.status || 'Syncing')}
                          </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex flex-wrap items-center gap-4">
                          <span>{dateStr}</span>
                          {t.receiptNo && <span className="text-slate-600 opacity-40">FRAGMENT #{t.receiptNo}</span>}
                          {t.cashierName && <span className="italic">Authorized By: {t.cashierName.toUpperCase()}</span>}
                        </p>
                        {t.notes && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400 line-clamp-1 italic">Memo: {t.notes}</p>}
                      </div>
                      <div className="shrink-0 sm:text-right flex flex-col items-start sm:items-end">
                        <p className="text-2xl font-black text-gray-900 tracking-tighter">{formatPKR(Number(t.amount || 0))}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Value Clearance</p>
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
