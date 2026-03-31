'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { createHqUserServer } from '../../../actions/createHqUser';
import EyePasswordInput from '@/components/spims/EyePasswordInput';
import { Loader2, Users, Plus, Copy, Check } from 'lucide-react';

type TabType = 'manager' | 'cashier';

export default function HqCreateUsersPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType>('manager');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [form, setForm] = useState({ name: '', customId: 'KHAN-MGR-001', phone: '', password: '' });

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
        const filtered = list.filter(u => u.role === activeTab);

        filtered.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setUsers(filtered);

        const prefix = activeTab === 'manager' ? 'KHAN-MGR-' : 'KHAN-CSH-';
        const num = filtered.length + 1;
        setForm(prev => ({
          ...prev,
          customId: `${prefix}${String(num).padStart(3, '0')}`,
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ type: '', text: '' });

    const res = await createHqUserServer({
      customId: form.customId,
      name: form.name,
      role: activeTab,
      password: form.password,
      phone: form.phone || undefined,
      createdBy: session?.customId || 'superadmin',
    });

    if (res.success) {
      setMessage({ type: 'success', text: `${activeTab === 'manager' ? 'Manager' : 'Cashier'} ${form.customId} created!` });
      setForm(prev => ({
        ...prev,
        name: '',
        phone: '',
        password: '',
      }));

      const snap = await getDocs(collection(db, 'hq_users'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const filtered = list.filter(u => u.role === activeTab);
      filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setUsers(filtered);

      const prefix = activeTab === 'manager' ? 'KHAN-MGR-' : 'KHAN-CSH-';
      const num = filtered.length + 1;
      setForm(prev => ({
        ...prev,
        customId: `${prefix}${String(num).padStart(3, '0')}`,
      }));
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create user' });
    }
    setActionLoading(false);
  };

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
          <Users className="w-8 h-8 text-gray-800" />
          Create Users
        </h1>
        <p className="text-gray-400 text-sm mt-1">Add new managers and cashiers</p>
      </div>

      {message.text && (
        <div className={`p-6 rounded-3xl border font-bold flex items-center gap-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          <span className="w-8 h-8 rounded-xl bg-white/50 flex items-center justify-center text-sm">{message.type === 'success' ? '✓' : '!'}</span>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        {(['manager', 'cashier'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-gray-800 text-white shadow-lg'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {tab === 'manager' ? 'Create Manager' : 'Create Cashier'}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Full Name</label>
            <input
              required
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200 placeholder:text-gray-300"
              placeholder="Enter full name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Custom ID</label>
              <input
                required
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200"
                value={form.customId}
                onChange={e => setForm({ ...form, customId: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Phone (optional)</label>
              <input
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200 placeholder:text-gray-300"
                placeholder="03XX-XXXXXXX"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Password</label>
            <EyePasswordInput
              required
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-gray-200 placeholder:text-gray-300"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button
            disabled={actionLoading}
            className="w-full bg-gray-800 text-white py-5 rounded-2xl font-black shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
            Create {activeTab === 'manager' ? 'Manager' : 'Cashier'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            Existing {activeTab === 'manager' ? 'Managers' : 'Cashiers'}
          </h2>
          <span className="text-[10px] font-black bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-gray-400 uppercase tracking-widest">
            {users.length} Total
          </span>
        </div>

        {users.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-[10px]">No {activeTab}s found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Custom ID</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Phone</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Created</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700 whitespace-nowrap">{u.customId}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        u.role === 'manager' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${u.isActive !== false ? 'text-green-500' : 'text-red-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                        {u.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
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