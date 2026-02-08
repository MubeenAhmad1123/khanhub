'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    collection,
    query,
    getDocs,
    orderBy,
    where,
    doc,
    updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, Search, Filter, Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminApplicationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/auth/login');
        }
    }, [authLoading, user, router]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'applications'),
                orderBy('appliedAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const apps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setApplications(apps);
        } catch (error) {
            console.error('Error fetching applications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchApplications();
        }
    }, [user]);

    const handleUpdateStatus = async (appId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'applications', appId), {
                status: newStatus,
                updatedAt: new Date()
            });
            setApplications(prev => prev.map(app =>
                app.id === appId ? { ...app, status: newStatus } : app
            ));
        } catch (error) {
            console.error('Error updating application status:', error);
        }
    };

    const filteredApplications = applications.filter(app => {
        const matchesSearch =
            app.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (authLoading || (loading && applications.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Platform Applications</h1>
                        <p className="text-gray-600">Review all job applications across the platform</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by candidate, job, or company..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                    </select>
                </div>

                {/* Grid */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Candidate</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Job Details</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Applied On</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredApplications.map((app) => (
                                <tr key={app.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{app.candidateName}</div>
                                        <div className="text-sm text-gray-500">{app.candidateEmail}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{app.jobTitle}</div>
                                        <div className="text-sm text-gray-500">{app.companyName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${app.status === 'hired' ? 'bg-green-100 text-green-700' :
                                                app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    app.status === 'shortlisted' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {app.appliedAt ? format(app.appliedAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => router.push(`/admin/applications/${app.id}`)}
                                                className="p-2 text-gray-400 hover:text-teal-600 transition"
                                                title="View Details"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(app.id, 'shortlisted')}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition"
                                                title="Shortlist"
                                            >
                                                <CheckCircle className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                                className="p-2 text-gray-400 hover:text-red-600 transition"
                                                title="Reject"
                                            >
                                                <XCircle className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredApplications.length === 0 && (
                        <div className="py-20 text-center text-gray-500">
                            No applications found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
