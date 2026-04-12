'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Search, Eye, EyeOff, Copy, Check, ArrowLeft, Shield } from 'lucide-react';
import { resetWelfarePassword } from '@/app/departments/welfare/actions/createWelfareUser';

type RehabPatientCredential = {
  id: string;
  displayName?: string;
  customId?: string;
  password?: string;
  role?: string;
  patientId?: string;
  isActive?: boolean;
};

export default function RehabAdminPasswordsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<RehabPatientCredential[]>([]);
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('welfare_session');
    if (!sessionData) {
      router.push('/departments/welfare/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin') {
      router.push('/departments/welfare/login');
      return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;

    const fetchPatientCredentials = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'welfare_users'),
          where('role', '==', 'family'),
          orderBy('displayName', 'asc'),
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RehabPatientCredential));

        list.sort((a, b) => {
          const aName = (a.displayName || '').toLowerCase();
          const bName = (b.displayName || '').toLowerCase();
          return aName.localeCompare(bName);
        });
        setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPatientCredentials();
  }, [session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.displayName || ''} ${u.customId || ''} ${u.patientId || ''}`.toLowerCase().includes(q),
    );
  }, [users, search]);

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCredentials = (u: RehabPatientCredential) => {
    const text = `ID: ${u.customId || '-'} | Password: ${u.password || '-'}`;
    void navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleResetPassword = async (u: RehabPatientCredential) => {
    const next = window.prompt(`Enter new password for ${u.customId || u.displayName || 'user'} (min 6 chars):`);
    if (!next) return;
    if (next.length < 6) {
      window.alert('Password must be at least 6 characters.');
      return;
    }

    try {
      setResettingId(u.id);
      const res = await resetWelfarePassword(u.id, next);
      if (!res.success) {
        window.alert(res.error || 'Failed to reset password.');
        return;
      }
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, password: next } : row)));
      setVisiblePasswords((prev) => ({ ...prev, [u.id]: true }));
      window.alert('Password reset successful.');
    } catch {
      window.alert('Failed to reset password.');
    } finally {
      setResettingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/departments/welfare/dashboard/admin" className="inline-flex items-center gap-2 text-xs font-black text-gray-500 hover:text-teal-700 uppercase tracking-widest">
        <ArrowLeft size={14} />
        Back to admin
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900">Patient Login Credentials</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              Rehab patients only (family accounts)
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, login ID, or patient ID"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:border-teal-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map((u) => (
            <div key={u.id} className="p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{u.displayName || '-'}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mt-1">Patient</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black">Login ID</p>
                  <p className="text-xs font-mono font-black text-gray-700 mt-1 break-all">{u.customId || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black">Patient ID</p>
                  <p className="text-xs font-mono font-black text-gray-500 mt-1 break-all">{u.patientId || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black">Password</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono text-sm font-bold text-gray-800 break-all">
                      {visiblePasswords[u.id] ? (u.password || '-') : '••••••••••'}
                    </span>
                    <button onClick={() => togglePassword(u.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
                      {visiblePasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => copyCredentials(u)}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  copiedId === u.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === u.id ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => handleResetPassword(u)}
                disabled={resettingId === u.id}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                {resettingId === u.id ? <Loader2 size={12} className="animate-spin" /> : null}
                {resettingId === u.id ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[760px] w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Name</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Login ID</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Patient ID</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Password</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{u.displayName || '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono font-black text-gray-700">{u.customId || '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono font-black text-gray-500">{u.patientId || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-800">
                        {visiblePasswords[u.id] ? (u.password || '-') : '••••••••••'}
                      </span>
                      <button onClick={() => togglePassword(u.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        {visiblePasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => copyCredentials(u)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        copiedId === u.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === u.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleResetPassword(u)}
                      disabled={resettingId === u.id}
                      className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                      {resettingId === u.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      {resettingId === u.id ? 'Resetting...' : 'Reset'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-gray-500 text-sm font-semibold">No patient credential records found.</div>
        )}
      </div>
    </div>
  );
}
