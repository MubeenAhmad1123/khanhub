'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Search, Eye, EyeOff, Copy, Check, ArrowLeft, Shield, GraduationCap } from 'lucide-react';
import { resetItPassword } from '@/app/departments/it/actions/createItUser';

type StudentCredential = {
  id: string;
  displayName?: string;
  customId?: string;
  password?: string;
  role?: string;
  studentId?: string;
  isActive?: boolean;
};

export default function ITAdminPasswordsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StudentCredential[]>([]);
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('it_session');
    if (!sessionData) {
      router.push('/departments/it/login');
      return;
    }
    const parsed = JSON.parse(sessionData);
    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      router.push('/departments/it/login');
      return;
    }
    setSession(parsed);
  }, [router]);

  useEffect(() => {
    if (!session) return;

    const fetchStudentCredentials = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'it_users'),
          where('role', '==', 'student'),
          orderBy('displayName', 'asc'),
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentCredential));

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

    void fetchStudentCredentials();
  }, [session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.displayName || ''} ${u.customId || ''} ${u.studentId || ''}`.toLowerCase().includes(q),
    );
  }, [users, search]);

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCredentials = (u: StudentCredential) => {
    const text = `ID: ${u.customId || '-'} | Password: ${u.password || '-'}`;
    void navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleResetPassword = async (u: StudentCredential) => {
    const next = window.prompt(`Enter new password for ${u.customId || u.displayName || 'user'} (min 6 chars):`);
    if (!next) return;
    if (next.length < 6) {
      window.alert('Password must be at least 6 characters.');
      return;
    }

    try {
      setResettingId(u.id);
      const res = await resetItPassword(u.id, next);
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 space-y-8">
      <Link href="/departments/it/dashboard/admin" className="inline-flex items-center gap-3 text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors group">
        <div className="w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center group-hover:bg-indigo-50 transition-colors shadow-sm">
          <ArrowLeft size={14} />
        </div>
        Back to admin
      </Link>

      <div className="bg-white rounded-[2.5rem] border border-black/5 p-8 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-100">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Access Tokens</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">
              Managing Student Login Credentials
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-black/5 p-4 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, login ID, or student doc ID..."
            className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-gray-50 border border-black/5 text-sm font-bold outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-black/5 overflow-hidden shadow-sm">
        <div className="md:hidden divide-y divide-black/5">
          {filtered.map((u) => (
            <div key={u.id} className="p-6 space-y-4">
              <div>
                <p className="text-base font-black text-black">{u.displayName || '-'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-widest">Student</span>
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{u.id}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black mb-1">Login ID</p>
                  <p className="text-xs font-mono font-black text-black break-all">{u.customId || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black mb-1">Doc ID</p>
                  <p className="text-xs font-mono font-black text-gray-400 break-all">{u.studentId || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black mb-1">Password</p>
                  <div className="flex items-center justify-between gap-4 mt-1">
                    <span className="font-mono text-sm font-black text-black break-all">
                      {visiblePasswords[u.id] ? (u.password || '-') : '••••••••••'}
                    </span>
                    <button onClick={() => togglePassword(u.id)} className="p-2 rounded-xl bg-white border border-black/5 text-gray-400 hover:text-black transition-all">
                      {visiblePasswords[u.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => copyCredentials(u)}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                    copiedId === u.id ? 'bg-black border-black text-white' : 'bg-white border-black/10 text-gray-600 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  {copiedId === u.id ? <Check size={14} /> : <Copy size={14} />}
                  {copiedId === u.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => handleResetPassword(u)}
                  disabled={resettingId === u.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-60 active:scale-95 shadow-sm"
                >
                  {resettingId === u.id ? <Loader2 size={14} className="animate-spin" /> : null}
                  {resettingId === u.id ? 'Resetting...' : 'Reset'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[800px] w-full text-left">
            <thead className="bg-gray-50/50 border-b border-black/5">
              <tr>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-400 font-black">Student Name</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-400 font-black">Login ID</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-400 font-black">Doc ID</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-400 font-black">Password</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-400 font-black text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-black uppercase leading-tight">{u.displayName || '-'}</p>
                    <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest mt-1">it.khanhub.com.pk</p>
                  </td>
                  <td className="px-8 py-6 text-xs font-mono font-black text-indigo-600">{u.customId || '-'}</td>
                  <td className="px-8 py-6 text-[10px] font-mono font-black text-gray-300 uppercase tracking-tight">{u.studentId || '-'}</td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-black min-w-[100px]">
                        {visiblePasswords[u.id] ? (u.password || '-') : '••••••••••'}
                      </span>
                      <button onClick={() => togglePassword(u.id)} className="p-2 rounded-xl bg-gray-50 text-gray-300 hover:text-black transition-all border border-black/5 opacity-0 group-hover:opacity-100">
                        {visiblePasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => copyCredentials(u)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                        copiedId === u.id ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-black/10 text-gray-600 hover:bg-gray-50 shadow-sm'
                      }`}
                    >
                      {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === u.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleResetPassword(u)}
                      disabled={resettingId === u.id}
                      className="ml-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-60 active:scale-95 shadow-sm"
                    >
                      {resettingId === u.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      {resettingId === u.id ? 'Reset' : 'Reset'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-20 text-center">
            <Shield className="w-16 h-16 text-gray-100 mx-auto mb-6" />
            <h3 className="text-xl font-black text-black">No credentials found</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Check your search query</p>
          </div>
        )}
      </div>
    </div>
  );
}
