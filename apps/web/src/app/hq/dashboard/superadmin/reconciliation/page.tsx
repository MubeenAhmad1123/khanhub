'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, CheckCircle, Flag } from 'lucide-react';

export default function ReconciliationVerifyPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') router.push('/hq/login');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;
    getDocs(query(collection(db, 'hq_reconciliation'), limit(50))).then((snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => (b.date > a.date ? 1 : -1));
      setRecords(data);
      setLoading(false);
    });
  }, [session]);

  const handleVerify = async (id: string, status: 'verified' | 'flagged') => {
    setActionLoading(id);
    await updateDoc(doc(db, 'hq_reconciliation', id), {
      status,
      verifiedBy: session!.customId,
      verifiedAt: new Date().toISOString(),
    });
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status, verifiedBy: session!.customId } : r));
    setActionLoading(null);
  };

  if (sessionLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Reconciliation Verify</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Daily cash close submissions from cashiers</p>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
              <CheckCircle className="text-gray-600" size={28} />
            </div>
            <p className="text-gray-600 font-black uppercase tracking-widest text-xs">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((r: any, index) => (
              <div
                key={r.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white/5 border border-white/8 rounded-3xl p-5 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-black text-lg">{r.date}</p>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        r.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        r.status === 'flagged' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>{r.status}</span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{r.cashierName} · {r.cashierId}</p>
                  </div>
                  {r.status === 'submitted' && (
                    <div className="flex gap-2">
                      <button disabled={!!actionLoading} onClick={() => handleVerify(r.id, 'verified')} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2">
                        {actionLoading === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Verify
                      </button>
                      <button disabled={!!actionLoading} onClick={() => handleVerify(r.id, 'flagged')} className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2">
                        <Flag size={12} /> Flag
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  {[
                    { label: 'Opening', value: r.openingBalance, color: 'text-gray-300' },
                    { label: 'Inflow', value: r.totalInflow, color: 'text-emerald-400' },
                    { label: 'Outflow', value: r.totalOutflow, color: 'text-rose-400' },
                    { label: 'Variance', value: r.variance, color: r.variance === 0 ? 'text-emerald-400' : 'text-rose-400' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-900 rounded-xl p-3">
                      <p className={`text-sm font-black ${item.color}`}>Rs{Math.abs(item.value || 0).toLocaleString()}</p>
                      <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                {r.varianceNote && (
                  <div className="mt-4 bg-rose-500/5 border border-rose-500/15 rounded-xl px-4 py-3">
                    <p className="text-rose-400/70 text-[10px] font-black uppercase tracking-widest mb-1">Variance Reason</p>
                    <p className="text-rose-300 text-sm font-medium">{r.varianceNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
