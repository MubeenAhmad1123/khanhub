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
import {
  ArrowLeft, User, Calendar, MapPin, Phone, ShieldCheck,
  Heart, Info, Database, Banknote, CheckCircle2, Clock, XCircle, TrendingDown
} from 'lucide-react';

export default function SuperadminSpimsStudentProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const studentId = params.id;
  const [student, setStudent] = useState<any | null>(null);
  // fees: entries from spims_fees (the primary payment collection)
  const [fees, setFees] = useState<any[]>([]);
  // txs: entries from spims_transactions (general income/expense ledger)
  const [txs, setTxs] = useState<any[]>([]);
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
        // 1. Fetch Student Profile
        const studentSnap = await getDoc(doc(db, 'spims_students', studentId));
        if (studentSnap.exists()) {
          setStudent({ id: studentSnap.id, ...studentSnap.data() });
        }

        // 2. Fetch from spims_fees — the actual cashier-entered fee payments
        const cacheKeyFees = `spims_fees_${studentId}`;
        const cachedFees = getCached<any[]>(cacheKeyFees);
        let feeList: any[] = [];

        if (cachedFees) {
          feeList = cachedFees;
        } else {
          const feeSnap = await getDocs(
            query(collection(db, 'spims_fees'), where('studentId', '==', studentId), limit(100))
          );
          feeList = feeSnap.docs.map(d => ({ id: d.id, _source: 'spims_fees', ...d.data() }));
          setCached(cacheKeyFees, feeList, 60);
        }

        // Client-side sort descending
        feeList.sort((a: any, b: any) => {
          const tA = toDate(a.createdAt || a.date).getTime();
          const tB = toDate(b.createdAt || b.date).getTime();
          return tB - tA;
        });
        setFees(feeList);

        // 3. Also fetch from spims_transactions for any additional entries
        const cacheKeyTx = `spims_tx_${studentId}`;
        const cachedTx = getCached<any[]>(cacheKeyTx);
        let txList: any[] = [];

        if (cachedTx) {
          txList = cachedTx;
        } else {
          const [snapByStudentId, snapByPatientId] = await Promise.all([
            getDocs(query(collection(db, 'spims_transactions'), where('studentId', '==', studentId), limit(50))),
            getDocs(query(collection(db, 'spims_transactions'), where('patientId', '==', studentId), limit(50))),
          ]);
          const txMap = new Map<string, any>();
          snapByStudentId.docs.forEach(d => txMap.set(d.id, { id: d.id, _source: 'spims_transactions', ...d.data() }));
          snapByPatientId.docs.forEach(d => txMap.set(d.id, { id: d.id, _source: 'spims_transactions', ...d.data() }));
          txList = Array.from(txMap.values());
          setCached(cacheKeyTx, txList, 60);
        }

        txList.sort((a: any, b: any) => {
          const tA = toDate(a.createdAt || a.date).getTime();
          const tB = toDate(b.createdAt || b.date).getTime();
          return tB - tA;
        });
        setTxs(txList);

      } catch (err) {
        console.error('Error loading student data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session, studentId]);

  const totals = useMemo(() => {
    // Primary source: spims_fees (cashier payments)
    const approvedFees = fees.filter(f => String(f.status) === 'approved');
    const totalApproved = approvedFees.reduce((s, f) => s + (Number(f.amount) || 0), 0);

    const pendingFees = fees.filter(f =>
      String(f.status) === 'pending' || String(f.status) === 'pending_cashier'
    );
    const pendingAmount = pendingFees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const pendingCount = pendingFees.length;

    return { totalApproved, pendingCount, pendingAmount };
  }, [fees]);

  const remaining = useMemo(() => {
    if (student?.totalPackage !== undefined) {
      return Math.max(0, (Number(student.totalPackage) || 0) - totals.totalApproved);
    }
    return Number(student?.remaining ?? student?.amountRemaining ?? 0) || 0;
  }, [student, totals.totalApproved]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] flex items-center justify-center">
        <InlineLoading label="Syncing Subject Matrix…" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] p-8 flex items-center justify-center">
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

  const getFeeTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
      monthly: 'Monthly Fee',
      admission: 'Admission Fee',
      registration: 'Registration Fee',
      examination: 'Examination Fee',
      other: 'Other',
    };
    return map[String(type || '').toLowerCase()] || String(type || 'Payment');
  };

  const getStatusStyle = (status: string) => {
    switch (String(status)) {
      case 'approved': return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2, label: 'Approved' };
      case 'pending': return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', icon: Clock, label: 'Pending' };
      case 'pending_cashier': return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', icon: Clock, label: 'Pending Cashier' };
      case 'rejected':
      case 'rejected_cashier': return { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', icon: XCircle, label: 'Rejected' };
      default: return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400', icon: Clock, label: status };
    }
  };

  const explicitKeys = ['id', 'name', 'fatherName', 'guardianName', 'cnic', 'cnicNo', 'dob', 'age', 'gender', 'phone', 'contactNumber', 'contact', 'address', 'admissionDate', 'createdAt', 'studentNumber', 'rollNo', 'status', 'isActive', 'notes', 'remarks', 'remaining', 'amountRemaining', 'course', 'class', 'totalPackage', 'totalReceived', 'monthlyFee', 'admissionFee', 'registrationFee', 'examinationFee'];
  const additionalFields = Object.entries(student).filter(([k]) => !explicitKeys.includes(k));

  // Combined bank statement: merge fees and non-fee txs for the statement view
  // Prefer spims_fees as truth for fees; supplement with spims_transactions only for non-fee types
  const allStatementEntries = [
    ...fees,
    ...txs.filter(t => String(t.type) !== 'student_fee'), // avoid duplicates for fee entries
  ].sort((a: any, b: any) => {
    const tA = toDate(a.createdAt || a.date).getTime();
    const tB = toDate(b.createdAt || b.date).getTime();
    return tB - tA;
  });

  return (
    <div className="min-h-screen bg-[#FCFAF2] text-slate-800 py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] inline-flex items-center gap-3 text-slate-700 bg-white border border-gray-150 px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={16} /> Return to Directory
        </button>

        <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-xl">
                <User size={40} />
              </div>
              <div className="min-w-0">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter truncate">
                  {student?.name || 'STUDENT PROFILE'}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">
                  SPIMS Academy — Student Financial Record
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
              <ShieldCheck size={18} /> Secure Access
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Total Fee Package</div>
              <div className="text-xl font-black text-indigo-700 tracking-tighter">
                {formatPKR(Number(student.totalPackage) || 0)}
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2">Total Paid (Approved)</div>
              <div className="text-xl font-black text-emerald-700 tracking-tighter">{formatPKR(totals.totalApproved)}</div>
            </div>
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 shadow-sm">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2">Remaining Balance</div>
              <div className="text-xl font-black text-rose-700 tracking-tighter">{formatPKR(remaining)}</div>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-2">Pending Payments</div>
              <div className="text-xl font-black text-amber-700 tracking-tighter">
                {totals.pendingCount} &bull; {formatPKR(totals.pendingAmount)}
              </div>
            </div>
          </div>

          {/* Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Identity */}
            <div className="bg-[#FCFBF8] border border-gray-100 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Info size={16} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Identity</p>
              </div>
              <div className="space-y-5 text-sm">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Father / Guardian</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['fatherName', 'guardianName'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">CNIC</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['cnic', 'cnicNo'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date of Birth / Age</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['dateOfBirth', 'dob', 'age'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gender</span>
                  <span className="font-black text-gray-900 uppercase mt-1">{getVal(['gender'])}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</span>
                  <span className="font-black text-gray-900 uppercase mt-1 tracking-wider">{getVal(['status'])}</span>
                </div>
              </div>
            </div>

            {/* Contact & Academic */}
            <div className="bg-[#FCFBF8] border border-gray-100 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <User size={16} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Contact & Academic</p>
              </div>
              <div className="space-y-5 text-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                    <Calendar size={16} className="text-slate-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Admission Date</span>
                    <span className="font-black text-gray-900 uppercase">{getVal(['admissionDate', 'createdAt'])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                    <Phone size={16} className="text-slate-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</span>
                    <span className="font-black text-gray-900 uppercase">{getVal(['phone', 'contact', 'contactNumber'])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin size={16} className="text-slate-600" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Address</span>
                    <span className="font-black text-gray-900 uppercase text-[11px] line-clamp-2">{getVal(['address'])}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Course</span>
                    <span className="font-black text-gray-900 uppercase text-[11px]">{getVal(['course', 'class'])}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Roll No</span>
                    <span className="font-black text-gray-900 uppercase">{getVal(['rollNo', 'studentNumber'])}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {(student.notes || student.remarks) && (
              <div className="md:col-span-2 bg-[#FCFBF8] border border-gray-100 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Heart size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Remarks & Observations</p>
                </div>
                <p className="text-[13px] font-black text-slate-700 uppercase tracking-widest whitespace-pre-wrap leading-[2] italic">
                  {getVal(['notes', 'remarks'])}
                </p>
              </div>
            )}

            {/* Additional DB fields */}
            {additionalFields.length > 0 && (
              <div className="md:col-span-2 bg-[#FCFBF8] border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Database size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Additional Record Fields</p>
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

          {/* ── BANK STATEMENT SECTION ──────────────────────────────────────── */}
          <div className="mt-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <Banknote size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Payment Statement</h2>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">
                  All fees received &bull; Date &bull; Amount &bull; Category &bull; Status
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100">
                <TrendingDown size={14} className="text-rose-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                  Remaining: {formatPKR(remaining)}
                </span>
              </div>
            </div>

            {fees.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[2rem] p-16 text-center">
                <Banknote size={40} className="text-gray-200 mx-auto mb-4" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">
                  No fee payments recorded yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-[2rem] border border-gray-100 shadow-sm">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-[8px] font-black uppercase tracking-widest text-gray-400">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-2 text-right">Balance After</div>
                  <div className="col-span-2 text-center">Status</div>
                </div>

                {/* Running balance calc from oldest to newest */}
                {(() => {
                  // Compute running balance (oldest first)
                  const sorted = [...fees].sort((a, b) =>
                    toDate(a.createdAt || a.date).getTime() - toDate(b.createdAt || b.date).getTime()
                  );
                  const totalPkg = Number(student.totalPackage) || 0;
                  let runningPaid = 0;
                  const withBalance = sorted.map((f, i) => {
                    if (String(f.status) === 'approved') runningPaid += Number(f.amount) || 0;
                    const balanceAfter = Math.max(0, totalPkg - runningPaid);
                    return { ...f, _index: i + 1, _balanceAfter: balanceAfter };
                  });
                  // Show newest first in UI
                  const displayList = [...withBalance].reverse();

                  return displayList.map((f) => {
                    const dateStr = f.createdAt || f.date
                      ? formatDateDMY(toDate(f.createdAt || f.date))
                      : '—';
                    const ss = getStatusStyle(f.status);
                    const StatusIcon = ss.icon;
                    const isApproved = String(f.status) === 'approved';
                    return (
                      <div
                        key={f.id}
                        className={`grid grid-cols-12 gap-2 px-6 py-4 border-b border-gray-50 last:border-0 transition-colors hover:bg-indigo-50/30 ${isApproved ? '' : 'opacity-75'}`}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <span className="text-[10px] font-black text-gray-300">#{f._index}</span>
                        </div>
                        <div className="col-span-2 flex flex-col justify-center">
                          <span className="text-[11px] font-black text-gray-700">{dateStr}</span>
                          {(f.receivedBy || f.cashierName) && (
                            <span className="text-[9px] font-bold text-gray-400 mt-0.5">
                              by {f.receivedBy || f.cashierName}
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 flex flex-col justify-center">
                          <span className="text-[11px] font-black text-gray-900 uppercase">
                            {getFeeTypeLabel(f.type || f.transactionType || f.category || 'other')}
                          </span>
                          {f.note && (
                            <span className="text-[9px] text-gray-400 font-bold mt-0.5 line-clamp-1">{f.note}</span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          <span className={`text-sm font-black tracking-tight ${isApproved ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {formatPKR(Number(f.amount) || 0)}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          {isApproved ? (
                            <span className="text-[11px] font-black text-rose-600">
                              {formatPKR(f._balanceAfter)}
                            </span>
                          ) : (
                            <span className="text-[11px] font-black text-gray-300">—</span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${ss.bg} ${ss.text}`}>
                            <StatusIcon size={10} />
                            {ss.label}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Summary Footer */}
                <div className="grid grid-cols-12 gap-2 px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="col-span-6 flex items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Total Payments: {fees.length} entries
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-sm font-black text-emerald-700">
                      {formatPKR(totals.totalApproved)}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-sm font-black text-rose-600">
                      {formatPKR(remaining)}
                    </span>
                  </div>
                  <div className="col-span-2" />
                </div>
              </div>
            )}

            {/* Additional General Transactions (spims_transactions) if any */}
            {txs.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 px-2">
                  Other Transactions (Ledger)
                </h3>
                <div className="space-y-3">
                  {txs.map((t) => {
                    const dateStr = t.createdAt || t.date ? formatDateDMY(toDate(t.createdAt || t.date)) : '—';
                    const isApproved = String(t.status) === 'approved';
                    const isRejected = String(t.status) === 'rejected';
                    return (
                      <div key={t.id} className="group rounded-[1.5rem] border border-gray-100 bg-[#FCFBF8] p-5 hover:shadow-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                              {String(t.transactionType || t.categoryName || t.category || t.type || 'Transaction')}
                            </p>
                            <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                              isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              {String(t.status || 'pending')}
                            </span>
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex flex-wrap gap-3">
                            <span>{dateStr}</span>
                            {t.receiptNo && <span>Receipt #{t.receiptNo}</span>}
                            {t.cashierName && <span>By: {t.cashierName}</span>}
                          </p>
                          {t.notes && <p className="mt-2 text-[9px] text-gray-400 font-bold italic">{t.notes}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-black text-gray-900 tracking-tighter">{formatPKR(Number(t.amount || 0))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
