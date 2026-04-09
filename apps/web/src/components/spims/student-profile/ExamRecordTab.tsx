// apps/web/src/components/spims/student-profile/ExamRecordTab.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Save, Loader2, ClipboardList } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import type { SpimsDegreeStatus, SpimsStudent } from '@/types/spims';
import { updateStudent } from '@/lib/spims/students';
import type { SpimsSessionLike } from './AdmissionTab';

function iso(v: unknown): string {
  if (!v) return '';
  try {
    const d =
      v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(v as string | number);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

type ExamForm = {
  year1_rollNo: string;
  year1_examDate: string;
  year1_annualResult: string;
  year1_supplementaryResult1: string;
  year1_supplementaryResult2: string;
  year1_passDate: string;
  year2_rollNo: string;
  year2_examDate: string;
  year2_annualResult: string;
  year2_supplementaryResult1: string;
  year2_supplementaryResult2: string;
  year2_passDate: string;
  degreeStatus: SpimsDegreeStatus;
};

export default function ExamRecordTab({
  student,
  session,
  onSaved,
}: {
  student: SpimsStudent;
  session: SpimsSessionLike;
  onSaved?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExamForm>({
    year1_rollNo: '',
    year1_examDate: '',
    year1_annualResult: '',
    year1_supplementaryResult1: '',
    year1_supplementaryResult2: '',
    year1_passDate: '',
    year2_rollNo: '',
    year2_examDate: '',
    year2_annualResult: '',
    year2_supplementaryResult1: '',
    year2_supplementaryResult2: '',
    year2_passDate: '',
    degreeStatus: 'Not Applied',
  });
  const canEdit = session.role === 'admin' || session.role === 'superadmin';

  useEffect(() => {
    setForm({
      year1_rollNo: student.year1_rollNo || '',
      year1_examDate: iso(student.year1_examDate),
      year1_annualResult: student.year1_annualResult || '',
      year1_supplementaryResult1: student.year1_supplementaryResult1 || '',
      year1_supplementaryResult2: student.year1_supplementaryResult2 || '',
      year1_passDate: iso(student.year1_passDate),
      year2_rollNo: student.year2_rollNo || '',
      year2_examDate: iso(student.year2_examDate),
      year2_annualResult: student.year2_annualResult || '',
      year2_supplementaryResult1: student.year2_supplementaryResult1 || '',
      year2_supplementaryResult2: student.year2_supplementaryResult2 || '',
      year2_passDate: iso(student.year2_passDate),
      degreeStatus: (student.degreeStatus as SpimsDegreeStatus) || 'Not Applied',
    });
  }, [student]);

  const toTs = (s: string) => (s ? Timestamp.fromDate(new Date(`${s}T00:00:00`)) : null);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await updateStudent(student.id, {
        year1_rollNo: form.year1_rollNo || undefined,
        year1_examDate: toTs(form.year1_examDate),
        year1_annualResult: form.year1_annualResult || undefined,
        year1_supplementaryResult1: form.year1_supplementaryResult1 || undefined,
        year1_supplementaryResult2: form.year1_supplementaryResult2 || undefined,
        year1_passDate: toTs(form.year1_passDate),
        year2_rollNo: form.year2_rollNo || undefined,
        year2_examDate: toTs(form.year2_examDate),
        year2_annualResult: form.year2_annualResult || undefined,
        year2_supplementaryResult1: form.year2_supplementaryResult1 || undefined,
        year2_supplementaryResult2: form.year2_supplementaryResult2 || undefined,
        year2_passDate: toTs(form.year2_passDate),
        degreeStatus: form.degreeStatus,
      });
      toast.success('Exam record saved');
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resOpts = ['', 'Pass', 'Fail', 'Supply'];

  const section = (title: string, body: React.ReactNode) => (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">{title}</h3>
      {body}
    </section>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-[#1D9E75]" size={22} />
          <h2 className="text-xl font-black text-gray-900">Exam record</h2>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1D9E75] text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin w-[18px] h-[18px]" /> : <Save size={18} />}
            Save
          </button>
        )}
      </div>

      {section(
        'First year',
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Roll No" disabled={!canEdit} value={form.year1_rollNo} onChange={(v) => setForm({ ...form, year1_rollNo: v })} />
          <Field label="Exam date" type="date" disabled={!canEdit} value={form.year1_examDate} onChange={(v) => setForm({ ...form, year1_examDate: v })} />
          <Select label="Annual result" disabled={!canEdit} value={form.year1_annualResult} options={resOpts} onChange={(v) => setForm({ ...form, year1_annualResult: v })} />
          <Select label="Supplementary 1" disabled={!canEdit} value={form.year1_supplementaryResult1} options={resOpts} onChange={(v) => setForm({ ...form, year1_supplementaryResult1: v })} />
          <Select label="Supplementary 2" disabled={!canEdit} value={form.year1_supplementaryResult2} options={resOpts} onChange={(v) => setForm({ ...form, year1_supplementaryResult2: v })} />
          <Field label="Pass date" type="date" disabled={!canEdit} value={form.year1_passDate} onChange={(v) => setForm({ ...form, year1_passDate: v })} />
        </div>
      )}

      {section(
        'Second year',
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Roll No" disabled={!canEdit} value={form.year2_rollNo} onChange={(v) => setForm({ ...form, year2_rollNo: v })} />
          <Field label="Exam date" type="date" disabled={!canEdit} value={form.year2_examDate} onChange={(v) => setForm({ ...form, year2_examDate: v })} />
          <Select label="Annual result" disabled={!canEdit} value={form.year2_annualResult} options={resOpts} onChange={(v) => setForm({ ...form, year2_annualResult: v })} />
          <Select label="Supplementary 1" disabled={!canEdit} value={form.year2_supplementaryResult1} options={resOpts} onChange={(v) => setForm({ ...form, year2_supplementaryResult1: v })} />
          <Select label="Supplementary 2" disabled={!canEdit} value={form.year2_supplementaryResult2} options={resOpts} onChange={(v) => setForm({ ...form, year2_supplementaryResult2: v })} />
          <Field label="Pass date" type="date" disabled={!canEdit} value={form.year2_passDate} onChange={(v) => setForm({ ...form, year2_passDate: v })} />
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Degree status</label>
        <select
          disabled={!canEdit}
          className="w-full max-w-md rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
          value={form.degreeStatus}
          onChange={(e) => setForm({ ...form, degreeStatus: e.target.value as SpimsDegreeStatus })}
        >
          {(['Not Applied', 'Applied', 'Received'] as SpimsDegreeStatus[]).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <select
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:bg-gray-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o || 'empty'} value={o}>
            {o || '—'}
          </option>
        ))}
      </select>
    </div>
  );
}
