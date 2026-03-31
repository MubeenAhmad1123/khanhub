'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Eye, EyeOff, Copy, Check, Shield, Filter } from 'lucide-react';

type FilterType = 'all' | 'superadmin' | 'manager' | 'cashier';

export default function HqPasswordsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'superadmin') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'superadmin') return;

    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'hq_users'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session]);

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id: string, customId: string, password: string) => {
    const text = `ID: ${customId} | Pass: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-gray-800" />
          All Passwords
        </h1>
        <p className="text-gray-400 text-sm mt-1">Confidential — authorized access only</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-amber-800 text-sm font-bold">
          This page is confidential. Do not share or screenshot credentials.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'superadmin', 'manager', 'cashier'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              filter === f
                ? 'bg-gray-800 text-white shadow-lg'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Filter size={12} />
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
            Users
          </h2>
          <span className="text-[10px] font-black bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-gray-400 uppercase tracking-widest">
            {filtered.length} Total
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-[10px]">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Custom ID</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Password</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        u.role === 'superadmin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        u.role === 'manager' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700 whitespace-nowrap">{u.customId}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-700">
                          {visiblePasswords[u.id] ? u.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePassword(u.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          {visiblePasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-right">
                      <button
                        onClick={() => copyToClipboard(u.id, u.customId, u.password)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          copiedId === u.id
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                        }`}
                      >
                        {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === u.id ? 'Copied!' : 'Copy'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}