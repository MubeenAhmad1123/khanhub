'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, Heart, Calendar, User, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { formatDateDMY } from '@/lib/utils';

export default function HqRehabPatientProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { session, loading: sessionLoading } = useHqSession();
  const patientId = params?.id;

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any | null>(null);
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
  }, [sessionLoading, session, router, patientId]);

  const admissionDateStr = useMemo(() => {
    const d = patient?.admissionDate;
    const date =
      d instanceof Timestamp
        ? d.toDate()
        : d?.seconds
          ? new Date(d.seconds * 1000)
          : d
            ? new Date(d)
            : null;
    return date ? formatDateDMY(date) : '—';
  }, [patient?.admissionDate]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="min-h-[44px] inline-flex items-center gap-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Heart size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-black text-white truncate">
                    {patient?.name || 'Patient'}
                  </h1>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    HQ Superadmin Read-Only View
                  </p>
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-300 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} /> Verified access
            </div>
          </div>

          {error ? (
            <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 font-bold text-sm">
              {error}
            </div>
          ) : null}

          {patient ? (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Identity</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-500" />
                    <span className="font-bold text-slate-200">{patient?.fatherName || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="font-bold text-slate-200">Admission: {admissionDateStr}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    Inpatient No: {patient?.inpatientNumber || '—'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Contact</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-500" />
                    <span className="font-bold text-slate-200">{patient?.phone || patient?.contactNumber || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500" />
                    <span className="font-bold text-slate-200 line-clamp-2">{patient?.address || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Notes</p>
                <p className="text-sm font-bold text-slate-300 whitespace-pre-wrap">
                  {patient?.diagnosis || patient?.addictionType || patient?.notes || '—'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

