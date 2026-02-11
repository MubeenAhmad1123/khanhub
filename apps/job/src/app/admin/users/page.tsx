'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface User {
    id: string;
    email: string;
    role: 'job_seeker' | 'employer' | 'admin';
    paymentStatus?: 'pending' | 'approved' | 'rejected';
    isPremium?: boolean;
    createdAt: any;
    profile?: any;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'job_seeker' | 'employer' | 'admin'>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Auth check
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    // Fetch users in real-time
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        let unsubscribe: () => void;

        const setupListener = async () => {
            try {
                setLoading(true);
                const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase/firebase-config');

                let q;
                if (filter === 'all') {
                    q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
                } else {
                    q = query(
                        collection(db, 'users'),
                        where('role', '==', filter),
                        orderBy('createdAt', 'desc')
                    );
                }

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const usersData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...(doc.data() as any),
                    })) as User[];
                    setUsers(usersData);
                    setLoading(false);
                }, (error) => {
                    console.error('Users listener error:', error);
                    setLoading(false);
                });

            } catch (error) {
                console.error('Fetch users error:', error);
                setLoading(false);
            }
        };

        setupListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, filter]);

    const handleBanUser = async (userId: string) => {
        if (!confirm('Are you sure you want to ban this user?')) return;

        try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');

            await updateDoc(doc(db, 'users', userId), {
                isBanned: true,
                bannedAt: new Date(),
            });

            alert('User banned successfully');
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (error) {
            console.error('Ban user error:', error);
            alert('Failed to ban user');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to PERMANENTLY DELETE this user? This cannot be undone.')) return;

        try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');

            await deleteDoc(doc(db, 'users', userId));

            alert('User deleted successfully');
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (error) {
            console.error('Delete user error:', error);
            alert('Failed to delete user');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setUpdating(true);
        try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase-config');

            const updates: any = {
                role: (e.target as any).role.value,
                paymentStatus: (e.target as any).paymentStatus.value,
            };

            // If approving payment and it was previously pending/rejected
            if (updates.paymentStatus === 'approved' && selectedUser.paymentStatus !== 'approved') {
                // Also update the payment document if it exists
                try {
                    await updateDoc(doc(db, 'payments', selectedUser.id), {
                        status: 'approved',
                        reviewedAt: new Date(),
                        reviewedBy: user?.uid
                    });
                } catch (pErr) {
                    console.log('No specific payment doc found for ID:', selectedUser.id);
                }
            }

            await updateDoc(doc(db, 'users', selectedUser.id), updates);

            alert('User updated successfully');
            setShowEditModal(false);
            setSelectedUser(null);
        } catch (error) {
            console.error('Update user error:', error);
            alert('Failed to update user');
        } finally {
            setUpdating(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            </div>
        );
    }

    const jobSeekersCount = users.filter((u) => u.role === 'job_seeker').length;
    const employersCount = users.filter((u) => u.role === 'employer').length;
    const adminsCount = users.filter((u) => u.role === 'admin').length;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600 mt-2">Manage all platform users</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
                    </div>
                    <div className="bg-teal-50 rounded-lg shadow p-6 border-l-4 border-teal-500">
                        <p className="text-sm text-teal-700">Job Seekers</p>
                        <p className="text-3xl font-bold text-teal-900 mt-2">{jobSeekersCount}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <p className="text-sm text-blue-700">Employers</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">{employersCount}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg shadow p-6 border-l-4 border-purple-500">
                        <p className="text-sm text-purple-700">Admins</p>
                        <p className="text-3xl font-bold text-purple-900 mt-2">{adminsCount}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-6 p-4">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All ({users.length})
                        </button>
                        <button
                            onClick={() => setFilter('job_seeker')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'job_seeker'
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Job Seekers ({jobSeekersCount})
                        </button>
                        <button
                            onClick={() => setFilter('employer')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'employer'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Employers ({employersCount})
                        </button>
                        <button
                            onClick={() => setFilter('admin')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'admin'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Admins ({adminsCount})
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
                                                {u.email[0].toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {u.profile?.fullName || u.email}
                                                </div>
                                                <div className="text-sm text-gray-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {u.isPremium && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                💎 Premium
                                            </span>
                                        )}
                                        {u.paymentStatus === 'approved' && !u.isPremium && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                ✓ Active
                                            </span>
                                        )}
                                        {u.paymentStatus === 'pending' && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                ⏳ Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {u.createdAt ? new Date(u.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setShowEditModal(true);
                                                }}
                                                className="text-teal-600 hover:text-teal-900 font-medium"
                                            >
                                                Manage
                                            </button>
                                            <button
                                                onClick={() => handleBanUser(u.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Ban
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="text-gray-400 hover:text-red-600 font-bold"
                                                title="Delete Permanently"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Manage User Modal */}
                {showEditModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                            <h2 className="text-2xl font-bold mb-2">Manage User</h2>
                            <p className="text-gray-600 mb-6">{selectedUser.email}</p>

                            <form onSubmit={handleUpdateUser} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                    <select
                                        name="role"
                                        defaultValue={selectedUser.role}
                                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none"
                                    >
                                        <option value="job_seeker">Job Seeker</option>
                                        <option value="employer">Employer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                                    <select
                                        name="paymentStatus"
                                        defaultValue={selectedUser.paymentStatus || 'pending'}
                                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {updating ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}