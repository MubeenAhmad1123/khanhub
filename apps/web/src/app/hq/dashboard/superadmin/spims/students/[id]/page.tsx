'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot, collection, limit, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { EmptyState, InlineLoading } from '@/components/hq/superadmin/DataState';
import { formatPKR } from '@/lib/hq/superadmin/format';
import { formatDateDMY } from '@/lib/utils';
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
    setLoading(true);
    const unsub1 = onSnapshot(doc(db, 'spims_students', studentId), (snap) => {
      setStudent(snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null);
      setLoading(false);
    });

    const unsub2 = onSnapshot(
      query(
        collection(db, 'spims_transactions'),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snap) => setTx(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))),
      () => {}
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [session, studentId]);

  const totals = useMemo(() => {
    const approved = tx.filter((t) => String(t.status) === 'approved');
    const totalApproved = approved.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingCount = tx.filter((t) => String(t.status) === 'pending').length;
    return { totalApproved, pendingCount };
  }, [tx]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <InlineLoading label="Loading student…" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-8 flex items-center justify-center">
        <EmptyState title="Not found" message="Student record does not exist." />
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

  const remaining = Number(student.remaining ?? student.amountRemaining ?? 0) || 0;

  // Render explicitly handled fields inside specific cards
  // Build a generic list for any other fields present in the database object.
  const explicitKeys = ['id', 'name', 'fatherName', 'guardianName', 'cnic', 'cnicNo', 'dob', 'age', 'gender', 'phone', 'contactNumber', 'contact', 'address', 'admissionDate', 'createdAt', 'studentNumber', 'rollNo', 'status', 'isActive', 'notes', 'remarks', 'remaining', 'amountRemaining', 'course', 'class'];
  
  const additionalFields = Object.entries(student).filter(([k]) => !explicitKeys.includes(k));

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] inline-flex items-center gap-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                <User size={28} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-black text-white truncate">
                  {student?.name || 'Student'}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                  SPIMS Student Profile - HQ Read View
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-300 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0">
              <ShieldCheck size={14} /> Verified HQ Access
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 box-border">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining Details</div>
              <div className="mt-1 text-sm font-black text-amber-400">{formatPKR(remaining)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 box-border">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Paid (Approved)</div>
              <div className="mt-1 text-sm font-black text-white">{formatPKR(totals.totalApproved)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 box-border">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Txs</div>
              <div className="mt-1 text-sm font-black text-white">{totals.pendingCount}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 box-border">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student ID</div>
              <div className="mt-1 text-xs font-mono text-slate-300 break-all">{studentId}</div>
            </div>
          </div>

          {/* Primary Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Identity & Basic Info */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 text-teal-400">
                <Info size={16} />
                <p className="text-[11px] font-black uppercase tracking-widest">Identity Info</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">Father / Guardian Name</span>
                  <span className="font-bold text-slate-200">{getVal(['fatherName', 'guardianName'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">CNIC / B-Form</span>
                  <span className="font-bold text-slate-200">{getVal(['cnic', 'cnicNo'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">Date of Birth / Age</span>
                  <span className="font-bold text-slate-200">{getVal(['dob', 'age'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">Gender</span>
                  <span className="font-bold text-slate-200 capitalize">{getVal(['gender'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">Status</span>
                  <span className="font-bold text-slate-200 uppercase tracking-wider">{getVal(['status', 'isActive'])}</span>
                </div>
              </div>
            </div>

            {/* Academic & Contact Info */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 text-teal-400">
                <User size={16} />
                <p className="text-[11px] font-black uppercase tracking-widest">Enrollment & Contact</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-slate-500 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Admission Date</span>
                    <span className="font-bold text-slate-200">{getVal(['admissionDate', 'createdAt'])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-slate-500 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Contact Number</span>
                    <span className="font-bold text-slate-200">{getVal(['phone', 'contactNumber', 'contact'])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-slate-500 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Address</span>
                    <span className="font-bold text-slate-200 line-clamp-3">{getVal(['address'])}</span>
                  </div>
                </div>
                <div className="flex flex-col mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs font-bold text-slate-500">Department</span>
                  <span className="font-bold text-teal-400 tracking-wider">SPIMS</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">Course / Class</span>
                  <span className="font-bold text-slate-200">{getVal(['course', 'class'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500">Student Roll / No</span>
                  <span className="font-bold text-slate-200">{getVal(['studentNumber', 'rollNo'])}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="md:col-span-2 bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3 text-teal-400">
                <Heart size={16} />
                <p className="text-[11px] font-black uppercase tracking-widest">Notes / Remarks</p>
              </div>
              <p className="text-sm font-bold text-slate-300 whitespace-pre-wrap leading-relaxed">
                {getVal(['notes', 'remarks'])}
              </p>
            </div>
            
            {/* Dynamic Database Record Dump (to guarantee NO field is left behind) */}
            {additionalFields.length > 0 && (
              <div className="md:col-span-2 bg-slate-900/40 border border-indigo-500/20 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-4 text-indigo-400">
                  <Database size={16} />
                  <p className="text-[11px] font-black uppercase tracking-widest">Additional Database Fields</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {additionalFields.map(([key, val]) => (
                    <div key={key} className="flex flex-col bg-slate-800/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate" title={key}>{key}</span>
                      <span className="font-medium text-xs text-slate-300 break-all mt-1">{renderValue(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="mt-8">
            <h2 className="text-lg font-black text-white mb-4">Complete Payment History</h2>
            {!tx.length ? (
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-8 text-center text-slate-400 text-sm font-medium">
                No past transactions found for this student.
              </div>
            ) : (
              <div className="space-y-3">
                {tx.map((t) => {
                  const dateStr = t.createdAt ? renderValue(t.createdAt) : 'Unknown Date';
                  const isApproved = String(t.status) === 'approved';
                  const isRejected = String(t.status) === 'rejected';
                  return (
                    <div key={t.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 hover:bg-slate-900/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="truncate text-base font-black text-white">
                            {String(t.transactionType || t.categoryName || t.category || t.type || 'Transaction')}
                          </p>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isApproved ? 'bg-emerald-500/20 text-emerald-400' :
                            isRejected ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {String(t.status || 'Pending')}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-3">
                          <span>{dateStr}</span>
                          {t.receiptNo && <span className="font-mono text-[10px] text-slate-500">#{t.receiptNo}</span>}
                          {t.cashierName && <span>By: {t.cashierName}</span>}
                        </p>
                        {t.notes && <p className="mt-2 text-xs text-slate-500 italic">Note: {t.notes}</p>}
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <p className="text-lg font-black text-white">{formatPKR(Number(t.amount || 0))}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Amount</p>
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
