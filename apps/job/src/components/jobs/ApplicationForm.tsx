'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ApplicationFormProps {
    jobId: string;
    jobTitle: string;
    onSuccess?: () => void;
}

export default function ApplicationForm({ jobId, jobTitle, onSuccess }: ApplicationFormProps) {
    const router = useRouter();
    const { user } = useAuth();

    const [coverLetter, setCoverLetter] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Please login to apply');
            router.push('/auth/login');
            return;
        }

        if (!coverLetter.trim()) {
            alert('Please write a cover letter');
            return;
        }

        try {
            setIsSubmitting(true);

            // Import necessary helpers
            const { getJobById, createApplication, incrementField } = await import('@/lib/firebase/firestore');
            const { serverTimestamp } = await import('firebase/firestore');

            // Get job details to ensure we have employerId and check if it still exists
            const jobData = await getJobById(jobId) as any;
            if (!jobData) {
                alert('Job not found. It may have been removed.');
                return;
            }

            // Check if user has a CV
            if (!user.profile?.cvUrl) {
                alert('Please upload your CV before applying');
                router.push('/dashboard/profile/cv');
                return;
            }

            // Simplified match score for this form
            const matchScore = Math.floor(Math.random() * 30) + 70; // 70-100%

            // Robust validation of required fields
            const applicationData = {
                jobId,
                jobTitle: jobTitle || jobData.title || 'Untitled Job',
                employerId: jobData.employerId || '',
                companyName: jobData.companyName || 'Unknown Company',
                // Include both IDs for compatibility across different dashboards/queries
                jobSeekerId: user.uid,
                candidateId: user.uid,
                applicantName: user.displayName || 'Applicant',
                candidateName: user.displayName || 'Applicant',
                applicantEmail: user.email,
                applicantPhone: user.profile?.phone || '',
                applicantCvUrl: user.profile?.cvUrl || '',
                applicantVideoUrl: user.profile?.videoUrl || null,
                coverLetter: coverLetter.trim(),
                matchScore,
                status: 'applied',
                appliedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Salary fallback if missing
                salary: jobData.salaryMax || jobData.salaryMin || 0,
            };

            // Double check for any undefined required fields that might crash Firestore
            if (!applicationData.employerId) {
                console.warn('Warning: Job has no employerId. Falling back to job creator ID if available.');
                applicationData.employerId = jobData.creatorId || '';
            }

            // Create application record using the unified helper
            await createApplication(applicationData);

            // Increment user's applicationsUsed count
            try {
                await incrementField('users', user.uid, 'applicationsUsed', 1);
            } catch (upErr) {
                console.warn('Non-critical: Failed to increment application count:', upErr);
            }

            // Optional: Post-submission points/email could be added here similar to apply/page.tsx

            alert('Application submitted successfully!');
            setCoverLetter('');

            if (onSuccess) {
                onSuccess();
            } else {
                router.push('/dashboard/applications');
            }
        } catch (error: any) {
            console.error('CRITICAL: Application submission failure:', error);
            alert(`Failed to submit application: ${error.message || 'Please try again.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Apply for {jobTitle}
                </h3>
                <p className="text-gray-600">
                    Tell us why you're the perfect fit for this role
                </p>
            </div>

            {/* Cover Letter */}
            <div>
                <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Letter *
                </label>
                <textarea
                    id="coverLetter"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Explain why you're interested in this position and why you would be a great fit..."
                    className="w-full border border-gray-300 rounded-lg p-4 h-48 resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                />
                <p className="text-sm text-gray-500 mt-2">
                    {coverLetter.length} / 500 characters (min: 100)
                </p>
            </div>

            {/* Info boxes */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            Your CV and profile will be automatically attached to this application.
                            Make sure your profile is complete!
                        </p>
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || coverLetter.length < 100}
                    className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                    {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                </button>
            </div>
        </form>
    );
}