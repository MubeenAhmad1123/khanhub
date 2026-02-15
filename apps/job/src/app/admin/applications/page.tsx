'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    where,
    doc,
    updateDoc,
    serverTimestamp,
    addDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import {
    Loader2, Search, Filter, Eye, CheckCircle, XCircle,
    Star, Users, Mail, Phone, Clock, Download, ExternalLink,
    DollarSign, Briefcase, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { Application } from '@/types/application';

export default function AdminApplicationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'shortlisted' | 'rejected' | 'hired'>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Auth check
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/admin/login');
        }
    }, [authLoading, user, router]);

    // Real-time listener for ALL applications
    useEffect(() => {
        if (user?.role !== 'admin') return;

        console.log('🔄 Setting up real-time applications listener...');
        setLoading(true);

        const q = query(
            collection(db, 'applications'),
            orderBy('appliedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setApplications(apps);
            setLoading(false);
            console.log('✅ Applications updated:', apps.length);
        }, (error) => {
            console.error('❌ Error listening to applications:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleUpdateStatus = async (appId: string, newStatus: string) => {
        try {
            setActionLoading(appId);
            const appRef = doc(db, 'applications', appId);

            await updateDoc(appRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            // Special handling for Hired status (Placement Creation)
            if (newStatus === 'hired') {
                const app = applications.find(a => a.id === appId);
                if (app) {
                    const salary = prompt('Enter first month salary (Rs.) for commission calculation:', '50000');
                    if (salary && !isNaN(Number(salary))) {
                        const salaryNum = Number(salary);

                        // Create placement record
                        await addDoc(collection(db, 'placements'), {
                            applicationId: appId,
                            jobId: app.jobId,
                            jobSeekerId: app.jobSeekerId || app.candidateId,
                            employerId: app.employerId,
                            candidateName: app.applicantName || app.candidateName,
                            jobTitle: app.jobTitle,
                            companyName: app.companyName,
                            firstMonthSalary: salaryNum,
                            commissionRate: 0.5,
                            commissionAmount: salaryNum * 0.5,
                            isPaid: false,
                            createdBy: user?.uid,
                            createdAt: serverTimestamp(),
                            hiredAt: serverTimestamp(),
                            status: 'pending' // commission status
                        });

                        // Update application with salary info
                        await updateDoc(appRef, {
                            actualSalary: salaryNum,
                            hiredAt: serverTimestamp()
                        });
                    }
                }
            }

            console.log(`✅ Application ${appId} status updated to ${newStatus}`);
        } catch (error) {
            console.error('❌ Error updating application status:', error);
            alert('Failed to update status');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredApplications = applications.filter(app => {
        const matchesSearch =
            (app.applicantName || app.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filter === 'all' ||
            (filter === 'pending' ? app.status === 'applied' : app.status === filter);

        return matchesSearch && matchesStatus;
    });

    const stats = {
        all: applications.length,
        pending: applications.filter(a => a.status === 'applied' || a.status === 'pending').length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
        hired: applications.filter(a => a.status === 'hired').length,
    };

    if (authLoading || (loading && applications.length === 0)) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-bold">Synchronizing Applications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Platform Applications</h1>
                        <p className="text-gray-600 font-medium">Manage and monitor all job applications across KhanHub</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Total', value: stats.all, color: 'bg-gray-900', icon: Users },
                        { label: 'Pending', value: stats.pending, color: 'bg-yellow-500', icon: Clock },
                        { label: 'Shortlisted', value: stats.shortlisted, color: 'bg-blue-600', icon: CheckCircle },
                        { label: 'Rejected', value: stats.rejected, color: 'bg-red-600', icon: XCircle },
                        { label: 'Hired', value: stats.hired, color: 'bg-green-600', icon: Star },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                            </div>
                            <div className={`${stat.color} p-3 rounded-xl text-white`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by candidate, job, or company..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            {(['all', 'pending', 'shortlisted', 'rejected', 'hired'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${filter === s
                                            ? 'bg-white text-teal-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Applications List */}
                <div className="space-y-4">
                    {filteredApplications.map((app) => (
                        <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Candidate Info */}
                                <div className="lg:w-1/3 flex gap-4">
                                    <div className="h-16 w-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                        {(app.applicantName || app.candidateName || '?').charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-gray-900 mb-1">
                                            {app.applicantName || app.candidateName || 'Unknown Candidate'}
                                        </h3>
                                        <div className="space-y-1">
                                            <p className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                                <Mail className="h-4 w-4 text-teal-500" />
                                                {app.applicantEmail || app.candidateEmail}
                                            </p>
                                            {app.applicantPhone && (
                                                <p className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                                    <Phone className="h-4 w-4 text-teal-500" />
                                                    {app.applicantPhone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Job Info */}
                                <div className="lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6">
                                    <div className="flex flex-col h-full justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Briefcase className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-black text-blue-600 uppercase tracking-tight">Applied For</span>
                                            </div>
                                            <p className="text-lg font-black text-gray-900">{app.jobTitle}</p>
                                            <p className="flex items-center gap-2 text-sm text-gray-500 font-bold">
                                                <Building2 className="h-4 w-4" />
                                                {app.companyName}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-gray-400">
                                            <Clock className="h-3 w-3" />
                                            Applied on {app.appliedAt ? format(app.appliedAt.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter ${app.status === 'hired' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                    app.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                        app.status === 'shortlisted' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                            'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                }`}>
                                                {app.status === 'applied' ? 'PENDING REVIEW' : app.status}
                                            </span>
                                            {app.matchScore !== undefined && (
                                                <div className="flex items-center gap-1 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                                                    <Star className="h-3 w-3 text-teal-600 fill-teal-600" />
                                                    <span className="text-xs font-black text-teal-700">{app.matchScore}% Match</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {app.applicantCvUrl && (
                                                <a
                                                    href={app.applicantCvUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition shadow-sm"
                                                    title="View CV"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => router.push(`/admin/applications/${app.id}`)}
                                                className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition shadow-sm"
                                                title="View Full Details"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 flex gap-2">
                                        {app.status === 'applied' && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(app.id, 'shortlisted')}
                                                    disabled={!!actionLoading}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition shadow-md active:scale-95 disabled:opacity-50"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    Shortlist
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                                    disabled={!!actionLoading}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border-2 border-red-100 rounded-xl font-black text-sm hover:bg-red-100 transition active:scale-95 disabled:opacity-50"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {app.status === 'shortlisted' && (
                                            <button
                                                onClick={() => handleUpdateStatus(app.id, 'hired')}
                                                disabled={!!actionLoading}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700 transition shadow-md active:scale-95 disabled:opacity-50"
                                            >
                                                <Star className="h-4 w-4" />
                                                Mark as Hired (Create Placement)
                                            </button>
                                        )}
                                        {(app.status === 'rejected' || app.status === 'hired') && (
                                            <button
                                                onClick={() => handleUpdateStatus(app.id, 'applied')}
                                                disabled={!!actionLoading}
                                                className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-sm hover:bg-gray-200 transition active:scale-95"
                                            >
                                                Undo Decision (Reset to Pending)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredApplications.length === 0 && (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-20 text-center">
                            <Users className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-gray-900 mb-2">No Applications Found</h3>
                            <p className="text-gray-500 font-bold max-w-sm mx-auto">
                                We couldn't find any applications matching your current filter and search criteria.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
