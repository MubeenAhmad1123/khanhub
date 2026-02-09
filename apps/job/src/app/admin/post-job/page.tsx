'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import JobPostForm from '@/components/forms/JobPostForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminPostJobPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin/jobs"
                        className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium mb-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back to Jobs
                    </Link>
                    <h1 className="text-4xl font-black text-gray-900 mb-2">Post New Job</h1>
                    <p className="text-gray-600">
                        Create a new job posting (as admin, this will be automatically approved)
                    </p>
                </div>

                {/* Admin Badge */}
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg mb-8">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="text-2xl">👑</span>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-purple-700">
                                <strong>Admin Posting:</strong> Jobs you create will be automatically approved and go live immediately without review.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <JobPostForm
                        isAdmin={true}
                        onSuccess={() => {
                            router.push('/admin/jobs');
                        }}
                    />
                </div>
            </div>
        </div>
    );
}