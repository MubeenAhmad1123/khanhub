// apps/web/src/components/spims/student-profile/AdmissionTab.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Save, Loader2, GraduationCap, User, IndianRupee, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDateDMY, parseDateDMY } from '@/lib/utils';
import type { SpimsStudent } from '@/types/spims';
import { SPIMS_COURSES } from '@/types/spims';
import { updateStudent } from '@/lib/spims/students';
import { Timestamp } from 'firebase/firestore';

export type SpimsSessionLike = {
  uid: string;
  displayName?: string;
  role?: string;
};

const formatCnic = (val: string) => {
  const digits = val.replace(/\D/g, '').substring(0, 13);
  let formatted = '';
  if (digits.length > 0) {
    formatted = digits.substring(0, 5);
    if (digits.length > 5) {
      formatted += '-' + digits.substring(5, 12);
      if (digits.length > 12) {
        formatted += '-' + digits.substring(12, 13);
      }
    }
  }
  return formatted;
};

function isoFromField(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  try {
    const d =
      v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(v as string | number);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function AdmissionTab({
  student,
  session,
  onSaved,
}: {
  student: SpimsStudent;
  session: SpimsSessionLike;
  onSaved?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<SpimsStudent>>({});

  useEffect(() => {
    setForm({
      ...student,
      contact: student.contact || (student as any).phone || '',
      dateOfBirth: student.dateOfBirth,
      admissionDate: student.admissionDate,
    });
  }, [student]);

  const canEdit = session.role === 'admin' || session.role === 'superadmin';

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await updateStudent(student.id, {
        rollNo: form.rollNo,
        name: form.name,
        fatherName: form.fatherName,
        cnic: form.cnic,
        contact: form.contact,
        fatherContact: form.fatherContact,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        studentOccupation: form.studentOccupation,
        fatherOccupation: form.fatherOccupation,
        qualification: form.qualification,
        subjectPhysics_marks: Number(form.subjectPhysics_marks),
        subjectChemistry_marks: Number(form.subjectChemistry_marks),
        subjectBiology_marks: Number(form.subjectBiology_marks),
        board: form.board,
        totalMarks: Number(form.totalMarks),
        percentage: Number(form.percentage),
        course: form.course,
        session: form.session,
        admissionDate: form.admissionDate,
        status: form.status,
        totalPackage: Number(form.totalPackage),
        monthlyFee: Number(form.monthlyFee),
        admissionFee: Number(form.admissionFee),
        registrationFee: Number(form.registrationFee),
        examinationFee: Number(form.examinationFee),
        referredBy: form.referredBy,
        referralSheetAmount:
          form.referralSheetAmount === undefined || form.referralSheetAmount === ('' as unknown as number)
            ? undefined
            : Number(form.referralSheetAmount),
      });
      toast.success('Admission record saved');
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error('Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const fld = (label: string, child: React.ReactNode) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      {child}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-[#1D9E75]" size={22} />
          <h2 className="text-xl font-black text-gray-900">Admission</h2>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D9E75] text-white px-5 py-2.5 text-sm font-bold shadow-lg shadow-[#1D9E75]/20 hover:opacity-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save
          </button>
        )}
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-800 font-black text-sm uppercase tracking-widest">
          <User size={16} className="text-[#1D9E75]" /> Personal
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {fld(
            'Roll No',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.rollNo ?? ''}
              onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
            />
          )}
          {fld(
            'Name',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          {fld(
            'Father Name',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.fatherName ?? ''}
              onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
            />
          )}
          {fld(
            'CNIC',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              placeholder="00000-0000000-0"
              value={form.cnic ?? ''}
              onChange={(e) => setForm({ ...form, cnic: formatCnic(e.target.value) })}
            />
          )}
          {fld(
            'Contact',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.contact ?? ''}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          )}
          {fld(
            'Father Contact',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.fatherContact ?? ''}
              onChange={(e) => setForm({ ...form, fatherContact: e.target.value })}
            />
          )}
          {fld(
            'Address',
            <textarea
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50 sm:col-span-2 min-h-[72px]"
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
            />
          )}
          {fld(
            'Date of birth',
            <input
              type="date"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50 cursor-pointer"
              value={isoFromField(form.dateOfBirth)}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          )}
          {fld(
            'Student occupation (optional)',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.studentOccupation ?? ''}
              onChange={(e) => setForm({ ...form, studentOccupation: e.target.value })}
            />
          )}
          {fld(
            'Father occupation (optional)',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.fatherOccupation ?? ''}
              onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="text-gray-800 font-black text-sm uppercase tracking-widest">Academic (Matric / Inter)</div>
        <div className="flex gap-6 flex-wrap">
          {(['Matric', 'Inter'] as const).map((q) => (
            <label key={q} className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
              <input
                type="radio"
                disabled={!canEdit}
                checked={form.qualification === q}
                onChange={() => setForm({ ...form, qualification: q })}
              />
              {q}
            </label>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {fld(
            'Physics marks',
            <input
              type="number"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.subjectPhysics_marks ?? ''}
              onChange={(e) => setForm({ ...form, subjectPhysics_marks: Number(e.target.value) })}
            />
          )}
          {fld(
            'Chemistry marks',
            <input
              type="number"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.subjectChemistry_marks ?? ''}
              onChange={(e) => setForm({ ...form, subjectChemistry_marks: Number(e.target.value) })}
            />
          )}
          {fld(
            'Biology marks',
            <input
              type="number"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.subjectBiology_marks ?? ''}
              onChange={(e) => setForm({ ...form, subjectBiology_marks: Number(e.target.value) })}
            />
          )}
          {fld(
            'Board',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.board ?? ''}
              onChange={(e) => setForm({ ...form, board: e.target.value })}
            />
          )}
          {fld(
            'Total marks',
            <input
              type="number"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.totalMarks ?? ''}
              onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })}
            />
          )}
          {fld(
            'Percentage',
            <input
              type="number"
              step="0.01"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.percentage ?? ''}
              onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="text-gray-800 font-black text-sm uppercase tracking-widest">Course</div>
        <div className="grid sm:grid-cols-2 gap-4">
          {fld(
            'Course',
            <select
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.course ?? ''}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
            >
              <option value="">Select…</option>
              {SPIMS_COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {fld(
            'Session',
            <input
              disabled={!canEdit}
              placeholder="e.g. 24-26"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.session ?? ''}
              onChange={(e) => setForm({ ...form, session: e.target.value })}
            />
          )}
          {fld(
            'Admission date',
            <input
              type="date"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50 cursor-pointer"
              value={isoFromField(form.admissionDate)}
              onChange={(e) => setForm({ ...form, admissionDate: e.target.value as any })}
            />
          )}
          {fld(
            'Status',
            <select
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.status ?? 'Active'}
              onChange={(e) => setForm({ ...form, status: e.target.value as SpimsStudent['status'] })}
            >
              {(
                ['Active', 'Pass', '1st Year Supply', '2nd Year Supply', 'Fail', 'Left'] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-800 font-black text-sm uppercase tracking-widest">
          <IndianRupee size={16} className="text-[#1D9E75]" /> Fee structure
        </div>
        <p className="text-xs text-gray-500 font-medium">
          Totals shown reflect admission-time structure. Running balance is updated when payments are approved.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {canEdit && (
            <>
              {fld(
                'Total package',
                <input
                  type="number"
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
                  value={form.totalPackage ?? ''}
                  onChange={(e) => setForm({ ...form, totalPackage: Number(e.target.value) })}
                />
              )}
              {fld(
                'Monthly fee',
                <input
                  type="number"
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
                  value={form.monthlyFee ?? ''}
                  onChange={(e) => setForm({ ...form, monthlyFee: Number(e.target.value) })}
                />
              )}
              {fld(
                'Admission fee',
                <input
                  type="number"
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
                  value={form.admissionFee ?? ''}
                  onChange={(e) => setForm({ ...form, admissionFee: Number(e.target.value) })}
                />
              )}
              {fld(
                'Registration fee',
                <input
                  type="number"
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
                  value={form.registrationFee ?? ''}
                  onChange={(e) => setForm({ ...form, registrationFee: Number(e.target.value) })}
                />
              )}
              {fld(
                'Examination fee',
                <input
                  type="number"
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
                  value={form.examinationFee ?? ''}
                  onChange={(e) => setForm({ ...form, examinationFee: Number(e.target.value) })}
                />
              )}
            </>
          )}

          {/* Paid fields - always read only as they come from cashier */}
          {fld(
            'Admission fee paid',
            <input
              type="number"
              disabled={true}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold bg-gray-50 text-emerald-700"
              value={form.admissionFeePaid ?? 0}
            />
          )}
          {fld(
            'Registration fee paid',
            <input
              type="number"
              disabled={true}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold bg-gray-50 text-emerald-700"
              value={form.registrationFeePaid ?? 0}
            />
          )}
          {fld(
            'Examination fee paid',
            <input
              type="number"
              disabled={true}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold bg-gray-50 text-emerald-700"
              value={form.examinationFeePaid ?? 0}
            />
          )}
          {fld(
            'Total received',
            <input
              type="number"
              disabled={true}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold bg-gray-50 text-emerald-700"
              value={form.totalReceived ?? 0}
            />
          )}
          {fld(
            'Remaining balance',
            <input
              type="number"
              disabled={true}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold bg-gray-50 text-amber-700"
              value={form.remaining ?? 0}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-800 font-black text-sm uppercase tracking-widest">
          <Share2 size={16} className="text-[#1D9E75]" /> Referral
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {fld(
            'Referred by (optional)',
            <input
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.referredBy ?? ''}
              onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
            />
          )}
          {fld(
            'Referral sheet amount',
            <input
              type="number"
              disabled={!canEdit}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
              value={form.referralSheetAmount ?? ''}
              onChange={(e) =>
                setForm({ ...form, referralSheetAmount: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
