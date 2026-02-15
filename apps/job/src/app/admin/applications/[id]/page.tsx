'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    addDoc,
    collection,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import {
    Loader2, ChevronLeft, Mail, Phone, Clock, Download,
    Star, CheckCircle, XCircle, Building2, Briefcase,
    FileText, ExternalLink, ArrowRight, User
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminApplicationDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/admin/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!id || user?.role !== 'admin') return;

        const appRef = doc(db, 'applications', id as string);
        const unsubscribe = onSnapshot(appRef, (docSnap) => {
            if (docSnap.exists()) {
                setApplication({ id: docSnap.id, ...docSnap.data() });
            } else {
                alert('Application not found');
                router.push('/admin/applications');
            }
            setLoading(false);
        }, (error) => {
            console.error('Error fetching application:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, user, router]);

    const handleUpdateStatus = async (newStatus: string) => {
        if (!application) return;
        try {
            setActionLoading(true);
            const appRef = doc(db, 'applications', application.id);

            await updateDoc(appRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            if (newStatus === 'hired') {
                const salary = prompt('Enter first month salary (Rs.) for commission calculation:', '50000');
                if (salary && !isNaN(Number(salary))) {
                    const salaryNum = Number(salary);

                    await addDoc(collection(db, 'placements'), {
                        applicationId: application.id,
                        jobId: application.jobId,
                        jobSeekerId: application.jobSeekerId || application.candidateId,
                        employerId: application.employerId,
                        candidateName: application.applicantName || application.candidateName,
                        jobTitle: application.jobTitle,
                        companyName: application.companyName,
                        firstMonthSalary: salaryNum,
                        commissionRate: 0.5,
                        commissionAmount: salaryNum * 0.5,
                        isPaid: false,
                        createdBy: user?.uid,
                        createdAt: serverTimestamp(),
                        hiredAt: serverTimestamp(),
                        status: 'pending'
                    });

                    await updateDoc(appRef, {
                        actualSalary: salaryNum,
                        hiredAt: serverTimestamp()
                    });
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!application) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header Navigation */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-teal-600 font-bold mb-6 transition"
                >
                    <ChevronLeft className="h-5 w-5" />
                    Back to Applications
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Candidate Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-8 py-10 text-white">
                                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                                    <div className="h-24 w-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl border border-white/30">
                                        {(application.applicantName || application.candidateName || '?').charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start mb-2">
                                            <h1 className="text-3xl font-black tracking-tight">
                                                {application.applicantName || application.candidateName}
                                            </h1>
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/30`}>
                                                {application.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-teal-50">
                                            <p className="flex items-center gap-2 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-xl">
                                                <Mail className="h-4 w-4" />
                                                {application.applicantEmail || application.candidateEmail}
                                            </p>
                                            {application.applicantPhone && (
                                                <p className="flex items-center gap-2 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-xl">
                                                    <Phone className="h-4 w-4" />
                                                    {application.applicantPhone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Applied For Section */}
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                            <Briefcase className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Applied For Position</h3>
                                            <p className="text-xl font-black text-gray-900 mb-1">{application.jobTitle}</p>
                                            <p className="flex items-center gap-2 text-gray-600 font-bold">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                                {application.companyName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-200/50 flex items-center gap-6 text-sm text-gray-500 font-bold">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Applied {application.appliedAt ? format(application.appliedAt.toDate(), 'PPP p') : 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Star className="h-4 w-4 text-teal-500" />
                                            Match Score: {application.matchScore}%
                                        </div>
                                    </div>
                                </div>

                                {/* Cover Letter */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-8 w-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900">Cover Letter</h3>
                                    </div>
                                    <div className="bg-white border-2 border-gray-50 rounded-2xl p-6 text-gray-700 font-medium leading-relaxed shadow-inner">
                                        {application.coverLetter || "No cover letter provided."}
                                    </div>
                                </div>

                                {/* Resume / CV */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-8 w-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                                            <Download className="h-4 w-4" />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900">Resume / CV</h3>
                                    </div>
                                    {application.applicantCvUrl ? (
                                        <div className="flex items-center justify-between p-4 bg-gray-900 rounded-2xl text-white">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center font-bold">PDF</div>
                                                <div>
                                                    <p className="text-sm font-black">Candidate_CV.pdf</p>
                                                    <p className="text-xs text-gray-400">Standard Resume Format</p>
                                                </div>
                                            </div>
                                            <a
                                                href={application.applicantCvUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 px-6 py-2 rounded-xl font-black text-sm transition"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                View Source
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="p-10 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400 font-bold italic">
                                            No CV uploaded for this application.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        {/* Decision Panel */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Admin Controls</h3>

                            <div className="space-y-3">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-2">QUICK ACTIONS</p>

                                <button
                                    onClick={() => handleUpdateStatus('shortlisted')}
                                    disabled={actionLoading || application.status === 'shortlisted'}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition shadow-md active:scale-95 ${application.status === 'shortlisted'
                                            ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    <CheckCircle className="h-5 w-5" />
                                    Shortlist Candidate
                                </button>

                                <button
                                    onClick={() => handleUpdateStatus('rejected')}
                                    disabled={actionLoading || application.status === 'rejected'}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition active:scale-95 ${application.status === 'rejected'
                                            ? 'bg-red-50 text-red-300 border-2 border-red-50 cursor-not-allowed'
                                            : 'bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100'
                                        }`}
                                >
                                    <XCircle className="h-5 w-5" />
                                    Reject Application
                                </button>

                                <button
                                    onClick={() => handleUpdateStatus('hired')}
                                    disabled={actionLoading || application.status === 'hired'}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition shadow-lg active:scale-95 ${application.status === 'hired'
                                            ? 'bg-green-100 text-green-400 cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                        }`}
                                >
                                    <Star className="h-5 w-5" />
                                    Mark as Hired
                                </button>

                                {(application.status !== 'applied') && (
                                    <button
                                        onClick={() => handleUpdateStatus('applied')}
                                        disabled={actionLoading}
                                        className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-200 transition mt-4"
                                    >
                                        RESET TO PENDING
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="bg-gray-900 rounded-3xl shadow-xl p-6 text-white">
                            <h3 className="text-sm font-black text-teal-400 uppercase tracking-widest mb-4">Placement Info</h3>
                            {application.status === 'hired' ? (
                                <div className="space-y-4">
                                    <div className="bg-white/10 p-4 rounded-2xl">
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Actual Salary</p>
                                        <p className="text-2xl font-black">Rs. {application.actualSalary || '50,000'}</p>
                                    </div>
                                    <div className="bg-teal-500/20 border border-teal-500/30 p-4 rounded-2xl">
                                        <p className="text-xs text-teal-400 font-bold uppercase mb-1">Potential Commission (50%)</p>
                                        <p className="text-2xl font-black text-teal-300">Rs. {(application.actualSalary || 50000) * 0.5}</p>
                                    </div>
                                    <button
                                        onClick={() => router.push('/admin/placements')}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-white text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-100 transition"
                                    >
                                        View in Placements
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Star className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-gray-400">Mark as hired to create revenue tracking record.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
