// apps/web/src/app/departments/spims/dashboard/admin/students/new/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createStudent, firestoreDate } from '@/lib/spims/students';
import { createSpimsStudentUserServer } from '@/app/departments/rehab/actions/createRehabUser';
import { SPIMS_COURSES, type SpimsStudentStatus } from '@/types/spims';

export default function NewSpimsStudentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [cnic, setCnic] = useState('');
  const [contact, setContact] = useState('');
  const [fatherContact, setFatherContact] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [studentOcc, setStudentOcc] = useState('');
  const [fatherOcc, setFatherOcc] = useState('');

  const [qualification, setQualification] = useState<'Matric' | 'Inter'>('Matric');
  const [phy, setPhy] = useState('');
  const [chem, setChem] = useState('');
  const [bio, setBio] = useState('');
  const [board, setBoard] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [percentage, setPercentage] = useState('');

  const [rollNo, setRollNo] = useState('');
  const [course, setCourse] = useState('Pharmacy');
  const [session, setSession] = useState('');
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<SpimsStudentStatus>('Active');
  const [totalPackage, setTotalPackage] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [admissionFee, setAdmissionFee] = useState('');
  const [registrationFee, setRegistrationFee] = useState('');
  const [examinationFee, setExaminationFee] = useState('');
  const [admissionPaid, setAdmissionPaid] = useState('');
  const [registrationPaid, setRegistrationPaid] = useState('');
  const [examinationPaid, setExaminationPaid] = useState('');
  const [admissionPaidOn, setAdmissionPaidOn] = useState('');
  const [registrationPaidOn, setRegistrationPaidOn] = useState('');
  const [examinationPaidOn, setExaminationPaidOn] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [referralAmt, setReferralAmt] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('spims_session');
    if (!raw) {
      router.push('/departments/spims/login');
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/spims/login');
      return;
    }
    setLoading(false);
  }, [router]);

  const submit = async () => {
    if (!loginId.trim() || !loginPassword || loginPassword.length < 6) {
      toast.error('Login ID and password (6+ chars) required');
      return;
    }
    if (!name.trim() || !fatherName.trim() || !rollNo.trim() || !session.trim()) {
      toast.error('Name, father name, roll number, and session are required');
      return;
    }
    const pkg = Number(totalPackage) || 0;
    const admPaid = Number(admissionPaid) || 0;
    const regPaid = Number(registrationPaid) || 0;
    const exPaid = Number(examinationPaid) || 0;
    const initReceived = admPaid + regPaid + exPaid;

    setSubmitting(true);
    let studentDocId: string | null = null;
    try {
      studentDocId = await createStudent({
        rollNo: rollNo.trim(),
        name: name.trim(),
        fatherName: fatherName.trim(),
        cnic: cnic.trim(),
        contact: contact.trim(),
        fatherContact: fatherContact.trim(),
        address: address.trim(),
        dateOfBirth: dob,
        studentOccupation: studentOcc.trim() || undefined,
        fatherOccupation: fatherOcc.trim() || undefined,
        qualification,
        subjectPhysics_marks: Number(phy) || 0,
        subjectChemistry_marks: Number(chem) || 0,
        subjectBiology_marks: Number(bio) || 0,
        board: board.trim(),
        totalMarks: Number(totalMarks) || 0,
        percentage: Number(percentage) || 0,
        course,
        session: session.trim(),
        admissionDate: firestoreDate(admissionDate),
        status,
        totalPackage: pkg,
        monthlyFee: Number(monthlyFee) || 0,
        admissionFee: Number(admissionFee) || 0,
        registrationFee: Number(registrationFee) || 0,
        examinationFee: Number(examinationFee) || 0,
        admissionFeePaid: admPaid,
        registrationFeePaid: regPaid,
        examinationFeePaid: exPaid,
        admissionFeePaidOn: admissionPaidOn ? firestoreDate(admissionPaidOn) : null,
        registrationFeePaidOn: registrationPaidOn ? firestoreDate(registrationPaidOn) : null,
        examinationFeePaidOn: examinationPaidOn ? firestoreDate(examinationPaidOn) : null,
        referredBy: referredBy.trim() || undefined,
        referralSheetAmount: referralAmt === '' ? undefined : Number(referralAmt),
        totalReceived: initReceived,
        remaining: Math.max(0, pkg - initReceived),
        degreeStatus: 'Not Applied',
      });

      const authRes = await createSpimsStudentUserServer(
        loginId.trim().toUpperCase(),
        loginPassword,
        name.trim(),
        studentDocId
      );

      if (!authRes.success) {
        try {
          await deleteDoc(doc(db, 'spims_students', studentDocId));
        } catch {}
        toast.error(authRes.error || 'Could not create login');
        setSubmitting(false);
        return;
      }

      toast.success('Student admitted');
      router.push(`/departments/spims/dashboard/admin/students/${studentDocId}`);
    } catch (e: any) {
      console.error(e);
      if (studentDocId) {
        try {
          await deleteDoc(doc(db, 'spims_students', studentDocId));
        } catch {}
      }
      toast.error(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  const StepBadge = ({ n, label }: { n: number; label: string }) => (
    <div className="flex items-center gap-2">
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
          step === n ? 'bg-[#1D9E75] text-white' : step > n ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {n}
      </span>
      <span className={`text-xs font-black uppercase tracking-wider ${step === n ? 'text-gray-900' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8 pb-24">
      <Link
        href="/departments/spims/dashboard/admin/students"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#1D9E75]"
      >
        <ArrowLeft size={16} /> Students
      </Link>

      <div>
        <h1 className="text-3xl font-black text-gray-900">New student admission</h1>
        <p className="text-gray-500 font-medium mt-1">Three-step intake · creates student record + student login</p>
      </div>

      <div className="flex flex-wrap gap-6 py-2">
        <StepBadge n={1} label="Login + personal" />
        <StepBadge n={2} label="Academic" />
        <StepBadge n={3} label="Course & fees" />
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm space-y-6">
        {step === 1 && (
          <>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Portal login</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Login ID" value={loginId} onChange={setLoginId} placeholder="e.g. STU-36322" />
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-12 text-sm font-semibold"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest pt-4">Personal</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name" value={name} onChange={setName} />
              <Field label="Father name" value={fatherName} onChange={setFatherName} />
              <Field label="CNIC" value={cnic} onChange={setCnic} placeholder="00000-0000000-0" />
              <Field label="Contact" value={contact} onChange={setContact} />
              <Field label="Father contact" value={fatherContact} onChange={setFatherContact} />
              <Field label="Student occupation (optional)" value={studentOcc} onChange={setStudentOcc} />
              <Field label="Father occupation (optional)" value={fatherOcc} onChange={setFatherOcc} />
              <Field label="Date of birth" type="date" value={dob} onChange={setDob} />
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Address</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold min-h-[80px]"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Academic background</h2>
            <div className="flex gap-6">
              {(['Matric', 'Inter'] as const).map((q) => (
                <label key={q} className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 cursor-pointer">
                  <input type="radio" checked={qualification === q} onChange={() => setQualification(q)} />
                  {q}
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Physics" value={phy} onChange={setPhy} type="number" />
              <Field label="Chemistry" value={chem} onChange={setChem} type="number" />
              <Field label="Biology" value={bio} onChange={setBio} type="number" />
              <Field label="Board" value={board} onChange={setBoard} />
              <Field label="Total marks" value={totalMarks} onChange={setTotalMarks} type="number" />
              <Field label="Percentage" value={percentage} onChange={setPercentage} type="number" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Course & fees</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Roll number" value={rollNo} onChange={setRollNo} />
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Course</label>
                <select
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                >
                  {SPIMS_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Session (e.g. 24-26)" value={session} onChange={setSession} />
              <Field label="Admission date" type="date" value={admissionDate} onChange={setAdmissionDate} />
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Status</label>
                <select
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SpimsStudentStatus)}
                >
                  {(['Active', 'Pass', '1st Year Supply', '2nd Year Supply', 'Fail', 'Left'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Total package" value={totalPackage} onChange={setTotalPackage} type="number" />
              <Field label="Monthly fee" value={monthlyFee} onChange={setMonthlyFee} type="number" />
              <Field label="Admission fee" value={admissionFee} onChange={setAdmissionFee} type="number" />
              <Field label="Registration fee" value={registrationFee} onChange={setRegistrationFee} type="number" />
              <Field label="Examination fee" value={examinationFee} onChange={setExaminationFee} type="number" />
              <Field label="Admission fee paid" value={admissionPaid} onChange={setAdmissionPaid} type="number" />
              <Field type="date" label="Admission fee paid on" value={admissionPaidOn} onChange={setAdmissionPaidOn} />
              <Field label="Registration fee paid" value={registrationPaid} onChange={setRegistrationPaid} type="number" />
              <Field type="date" label="Registration paid on" value={registrationPaidOn} onChange={setRegistrationPaidOn} />
              <Field label="Examination fee paid" value={examinationPaid} onChange={setExaminationPaid} type="number" />
              <Field type="date" label="Examination paid on" value={examinationPaidOn} onChange={setExaminationPaidOn} />
              <Field label="Referred by (optional)" value={referredBy} onChange={setReferredBy} />
              <Field label="Referral sheet amount" value={referralAmt} onChange={setReferralAmt} type="number" />
            </div>
          </>
        )}

        <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            disabled={step === 1}
            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 disabled:opacity-30"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-black"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-black disabled:opacity-50"
              onClick={submit}
            >
              {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
              Submit admission
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
