'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useHqSession } from '@/hooks/hq/useHqSession';
import { Loader2, Users, Info } from 'lucide-react';

type TabType = 'admin' | 'staff' | 'family';

export default function ManagerUsersPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useHqSession();
  const [activeTab, setActiveTab] = useState<TabType>('admin');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || session.role !== 'manager') {
      router.push('/hq/login');
      return;
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session || session.role !== 'manager') return;

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

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    try {
      await updateDoc(doc(db, 'hq_users', id), { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(null);
    }
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
        <p className="text-gray-400 text-sm mt-1">Manage system users and accounts</p>
      </div>

      <div className="flex gap-2">
        {(['admin', 'staff', 'family'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-gray-800 text-white shadow-lg'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            Create {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* TODO: connect to rehab createRehabUser server action for admin/staff/family creation */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-lg mb-2">Coming Soon</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Admin, Staff, and Family accounts for Rehab are created from the Rehab Admin dashboard.
              This unified creation panel is coming soon. Once integrated, you will be able to create
              accounts across all departments from here.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            HQ Users
          </h2>
          <span className="text-[10px] font-black bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-gray-400 uppercase tracking-widest">
            {users.length} Total
          </span>
        </div>

        {users.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-[10px]">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Custom ID</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap">Created</th>
                  <th className="px-4 py-3 text-xs whitespace-nowrap text-right">Status</th>
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
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-right">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.isActive !== false)}
                        disabled={toggling === u.id}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                          u.isActive !== false
                            ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                            : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                        {u.isActive !== false ? 'Active' : 'Disabled'}
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