'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { writeActivityLog } from '@/hooks/useActivityLog';
import UserDetailDrawer from '@/components/admin/UserDetailDrawer';
import {
    Search,
    Filter,
    MoreVertical,
    Eye,
    Ban,
    Trash2,
    RefreshCcw,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Users as UsersIcon,
    UserCheck,
    UserPlus,
    ShieldAlert
} from 'lucide-react';

export default function AdminUsersPage() {
    const { user: adminUser } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by registration date desc
            list.sort((a: any, b: any) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setUsers(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleBanToggle = async (user: any) => {
        const isBanning = !user.isBanned;
        if (!confirm(`Are you sure you want to ${isBanning ? 'ban' : 'unban'} ${user.name || user.email}?`)) return;

        try {
            await updateDoc(doc(db, 'users', user.id), {
                isBanned: isBanning,
                updatedAt: serverTimestamp()
            });

            await writeActivityLog({
                admin_id: adminUser?.uid || 'system',
                action_type: isBanning ? 'user_banned' : 'user_unbanned',
                target_id: user.id,
                target_type: 'user',
                note: `${isBanning ? 'Banned' : 'Unbanned'} user: ${user.email}`
            });

            toast(`User ${isBanning ? 'banned' : 'unbanned'} successfully`, 'success');
        } catch (err) {
            toast('Failed to update user status', 'error');
        }
    };

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`CRITICAL: Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, 'users', user.id));

            await writeActivityLog({
                admin_id: adminUser?.uid || 'system',
                action_type: 'user_deleted',
                target_id: user.id,
                target_type: 'user',
                note: `Deleted user: ${user.email}`
            });

            toast('User deleted forever', 'info');
        } catch (err) {
            toast('Failed to delete user', 'error');
        }
    };

    const handleResetVideo = async (user: any) => {
        if (!confirm(`Reset video status for ${user.name}? This will allow them to re-upload.`)) return;

        try {
            await updateDoc(doc(db, 'users', user.id), {
                profile_status: 'payment_approved',
                video_upload_enabled: true,
                updatedAt: serverTimestamp()
            });
            toast('Video status reset', 'success');
        } catch (err) {
            toast('Failed to reset video', 'error');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || u.profile_status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 italic font-bold">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                SYNCING USER DATABASE...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                        <UsersIcon className="w-8 h-8 text-blue-600" />
                        User Management
                    </h1>
                    <p className="text-slate-500 font-bold">Manage {users.length} registered platform members</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-xs font-bold text-slate-600 uppercase">
                            {users.filter(u => u.profile_status === 'active').length} Active
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                >
                    <option value="all">All Roles</option>
                    <option value="job_seeker">Job Seekers</option>
                    <option value="employer">Employers</option>
                    <option value="admin">Admins</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="video_pending">Video Pending</option>
                    <option value="payment_pending">Payment Pending</option>
                    <option value="incomplete">Incomplete</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm uppercase">
                                                {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none mb-1">{u.name || 'Anonymous'}</p>
                                                <p className="text-xs text-slate-400 leading-none">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">
                                            {u.role?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-bold text-slate-500">
                                            {u.industry || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight inline-flex items-center gap-1.5 ${u.profile_status === 'active' ? 'bg-green-50 text-green-700' :
                                            u.profile_status === 'video_pending' ? 'bg-blue-50 text-blue-700' :
                                                u.profile_status === 'payment_pending' ? 'bg-yellow-50 text-yellow-700' :
                                                    'bg-slate-100 text-slate-500'
                                            }`}>
                                            <span className={`w-1 h-1 rounded-full ${u.profile_status === 'active' ? 'bg-green-600' :
                                                u.profile_status === 'video_pending' ? 'bg-blue-600' :
                                                    u.profile_status === 'payment_pending' ? 'bg-yellow-600' :
                                                        'bg-slate-600'
                                                }`} />
                                            {u.profile_status || 'Incomplete'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-medium text-slate-500">
                                            {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setSelectedUser(u); setIsDrawerOpen(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="View Profile"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {openMenuId === u.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenuId(null)}
                                                        />
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                                                            <button
                                                                onClick={() => { handleBanToggle(u); setOpenMenuId(null); }}
                                                                className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-2 ${u.isBanned ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                                {u.isBanned ? 'Unban User' : 'Ban User'}
                                                            </button>
                                                            <button
                                                                onClick={() => { handleResetVideo(u); setOpenMenuId(null); }}
                                                                className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50"
                                                            >
                                                                <RefreshCcw className="w-4 h-4" />
                                                                Reset Video
                                                            </button>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <button
                                                                onClick={() => { handleDeleteUser(u); setOpenMenuId(null); }}
                                                                className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 flex items-center gap-2 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete Permanently
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Search className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">No users match your criteria</h3>
                        <p className="text-slate-500 font-bold">Try adjusting your filters or search term.</p>
                    </div>
                )}
            </div>

            {/* Profile Drawer */}
            <UserDetailDrawer
                user={selectedUser}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </div>
    );
}