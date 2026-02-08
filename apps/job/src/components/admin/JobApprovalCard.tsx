'use client';

import { useState } from 'react';
import { Job } from '@/types/job';
import { formatSalary } from '@/lib/utils';

interface JobApprovalCardProps {
    job: Job;
    onApprove: (jobId: string) => Promise<void>;
    onReject: (jobId: string, reason: string) => Promise<void>;
    onFeature: (jobId: string) => Promise<void>;
}

export default function JobApprovalCard({ job, onApprove, onReject, onFeature }: JobApprovalCardProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isFeaturing, setIsFeaturing] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const handleApprove = async () => {
        try {
            setIsApproving(true);
            await onApprove(job.id);
        } catch (error) {
            console.error('Approve error:', error);
            alert('Failed to approve job');
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        try {
            setIsRejecting(true);
            await onReject(job.id, rejectReason);
            setShowRejectModal(false);
            setRejectReason('');
        } catch (error) {
            console.error('Reject error:', error);
            alert('Failed to reject job');
        } finally {
            setIsRejecting(false);
        }
    };

    const handleFeature = async () => {
        try {
            setIsFeaturing(true);
            await onFeature(job.id);
        } catch (error) {
            console.error('Feature error:', error);
            alert('Failed to feature job');
        } finally {
            setIsFeaturing(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                        <p className="text-gray-600 mt-1">{job.company}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Posted: {job.createdAt ? new Date(job.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Pending
                    </span>
                </div>

                {/* Job Details */}
                <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="text-gray-900">{job.location}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Type</p>
                            <p className="text-gray-900 capitalize">{job.type}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Salary</p>
                            <p className="text-gray-900">
                                {formatSalary(job.salary.min, job.salary.max)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Experience</p>
                            <p className="text-gray-900">{job.experience} years</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Category</p>
                            <p className="text-gray-900">{job.category}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Employer ID</p>
                            <p className="text-gray-900 font-mono text-xs">
                                {job.employerId.slice(0, 8)}...
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Description</p>
                        <p className="text-gray-700 text-sm line-clamp-3">{job.description}</p>
                    </div>

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Required Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {job.skills.map((skill, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Requirements */}
                    {job.requirements && job.requirements.length > 0 && (
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Requirements</p>
                            <ul className="list-disc list-inside space-y-1">
                                {job.requirements.map((req, index) => (
                                    <li key={index} className="text-sm text-gray-700">
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleApprove}
                        disabled={isApproving || isRejecting || isFeaturing}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {isApproving ? 'Approving...' : '✓ Approve'}
                    </button>
                    <button
                        onClick={handleFeature}
                        disabled={isApproving || isRejecting || isFeaturing}
                        className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {isFeaturing ? 'Featuring...' : '⭐ Approve & Feature'}
                    </button>
                    <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={isApproving || isRejecting || isFeaturing}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        ✗ Reject
                    </button>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Reject Job Posting</h3>
                        <p className="text-gray-600 mb-4">
                            Please provide a reason for rejecting this job posting. The employer will be notified.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g., Job description is incomplete, salary is below market rate, duplicate posting..."
                            className="w-full border rounded-lg p-3 mb-4 h-24 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={isRejecting}
                                className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isRejecting || !rejectReason.trim()}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isRejecting ? 'Rejecting...' : 'Reject Job'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}