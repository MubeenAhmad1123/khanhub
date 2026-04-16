// apps/web/src/components/spims/student-profile/FeeRecordTab.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { SpimsFeePayment, SpimsFeePaymentType, SpimsStudent } from '@/types/spims';
import { formatDateDMY } from '@/lib/utils';
import type { SpimsSessionLike } from './AdmissionTab';

export default function FeeRecordTab({
  student,
  session,
}: {
  student: SpimsStudent;
  session: SpimsSessionLike;
}) {
  const [rows, setRows] = useState<SpimsFeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [feeType, setFeeType] = useState<SpimsFeePaymentType>('monthly');
  const [receivedBy, setReceivedBy] = useState('');
  const [note, setNote] = useState('');

  const role = session.role;
  const canAdd = role === 'admin' || role === 'superadmin' || role === 'cashier';
  const readOnlyStudent = role === 'student';

  useEffect(() => {
    const q = query(
      collection(db, 'spims_fees'),
      where('studentId', '==', student.id),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: SpimsFeePayment[] = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            ...x,
            date: x.date?.toDate ? x.date.toDate() : x.date,
            createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : x.createdAt,
          } as SpimsFeePayment;
        });
        setRows(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error('Could not load fee records');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [student.id]);

  const { totalReceived, displayRemaining } = useMemo(() => {
    const approved = rows.filter((r) => r.status === 'approved');
    const sum = approved.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const pkg = Number(student.totalPackage) || 0;
    return {
      totalReceived: sum,
      displayRemaining: Math.max(0, pkg - sum),
    };
  }, [rows, student.totalPackage]);

  const submitPayment = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      toast.error('Enter amount');
      return;
    }
    if (!receivedBy.trim()) {
      toast.error('Received By is required');
      return;
    }

    setSubmitting(true);
    try {
      const setupSnap = await getDoc(doc(db, 'rehab_meta', 'setup'));
      const setupData = setupSnap.data() as Record<string, unknown> | undefined;
      const cashierCustomId = String(setupData?.cashierCustomId || '').trim().toUpperCase();
      if (!cashierCustomId) {
        toast.error('Cashier not configured (rehab_meta/setup.cashierCustomId).');
        setSubmitting(false);
        return;
      }

      const d = new Date(`${payDate}T00:00:00`);
      const ts = Timestamp.fromDate(d);
      const provisionalRemaining = Math.max(0, (Number(student.remaining) || 0) - amt);

      const feeRef = await addDoc(collection(db, 'spims_fees'), {
        studentId: student.id,
        studentName: student.name,
        course: student.course,
        session: student.session,
        date: ts,
        amount: amt,
        remaining: provisionalRemaining,
        receivedBy: receivedBy.trim(),
        type: feeType,
        note: note.trim() || null,
        status: 'pending_cashier',
        createdBy: session.uid,
        createdAt: serverTimestamp(),
        linkedTransactionId: null,
      });

      const txRef = await addDoc(collection(db, 'spims_transactions'), {
        type: 'income',
        amount: amt,
        category: 'fee',
        categoryName: 'Student Fee',
        departmentCode: 'spims',
        departmentName: 'SPIMS College',
        patientId: student.id,
        patientName: student.name,
        status: 'pending_cashier',
        cashierId: cashierCustomId,
        proofRequired: true,
        description: note.trim() || `${feeType} fee`,
        date: ts,
        transactionDate: ts,
        feePaymentId: feeRef.id,
        feePaymentType: feeType,
        createdBy: session.uid,
        createdByName: session.displayName || 'SPIMS',
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'spims_fees', feeRef.id), {
        linkedTransactionId: txRef.id,
      });

      toast.success('Payment logged — pending cashier');
      setModal(false);
      setAmount('');
      setNote('');
      setReceivedBy('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add payment');
    } finally {
      setSubmitting(false);
    }
  };

  const statusClass = (s: string) => {
    if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'pending' || s === 'pending_cashier') return 'bg-amber-50 text-amber-800 border-amber-200';
    if (s === 'rejected' || s === 'rejected_cashier') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#1D9E75] w-8 h-8" />
      </div>
    );
  }

  const visibleRows = readOnlyStudent ? rows.filter((r) => r.status === 'approved') : rows;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">Fee record</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Monthly fee register (all payment lines)</p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1D9E75] text-white px-4 py-2.5 text-sm font-bold"
          >
            <Plus size={18} /> Add payment
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">
                <th className="px-4 py-3">Sr#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Received by</th>
                <th className="px-4 py-3">Type</th>
                {!readOnlyStudent && <th className="px-4 py-3">Status</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={readOnlyStudent ? 6 : 7} className="px-4 py-10 text-center text-gray-400 font-medium">
                    No payments yet.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r, idx) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-bold text-gray-700">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatDateDMY(r.date)}</td>
                    <td className="px-4 py-3 font-black text-gray-900">Rs {(Number(r.amount) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">Rs {(Number(r.remaining) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{r.receivedBy}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{r.type}</td>
                    {!readOnlyStudent && (
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${statusClass(r.status)}`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {visibleRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-400 font-medium text-sm">
              No payments yet.
            </div>
          ) : (
            visibleRows.map((r, idx) => (
              <div key={r.id} className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      #{idx + 1} — {formatDateDMY(r.date)}
                    </span>
                    <h4 className="text-lg font-black text-gray-900">Rs {(Number(r.amount) || 0).toLocaleString()}</h4>
                  </div>
                  {!readOnlyStudent && (
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${statusClass(r.status)}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Remaining</span>
                    <span className="text-xs font-bold text-amber-700">Rs {(Number(r.remaining) || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Received by</span>
                    <span className="text-xs font-bold text-gray-700">{r.receivedBy}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Payment Type</span>
                    <span className="text-xs font-bold text-gray-600 capitalize">{r.type}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 px-5 py-6 bg-gray-50 border-t border-gray-100">
          <div className="min-w-[120px]">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total received</div>
            <div className="text-xl font-black text-[#1D9E75]">Rs {totalReceived.toLocaleString()}</div>
          </div>
          <div className="min-w-[120px]">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Package</div>
            <div className="text-xl font-black text-gray-900">Rs {(Number(student.totalPackage) || 0).toLocaleString()}</div>
          </div>
          <div className="min-w-[120px]">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remaining</div>
            <div className="text-xl font-black text-amber-700">Rs {displayRemaining.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900">New payment</h3>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
              <select
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as SpimsFeePaymentType)}
              >
                <option value="monthly">Monthly</option>
                <option value="admission">Admission</option>
                <option value="registration">Registration</option>
                <option value="examination">Examination</option>
                <option value="other">Other</option>
              </select>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Received by</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Staff name"
              />
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Note</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-[#1D9E75] text-white disabled:opacity-50 inline-flex items-center gap-2"
                onClick={submitPayment}
              >
                {submitting && <Loader2 className="animate-spin w-4 h-4" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
