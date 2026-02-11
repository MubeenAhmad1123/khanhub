'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePayment } from '@/lib/firebase/firestore';
import { updateUserProfile, getUserProfile } from '@/lib/firebase/auth';
import { sendPaymentApprovalEmail, sendPaymentRejectionEmail } from '@/lib/services/emailService';

// CRITICAL: Updated to fix legacy jobs data
import FixJobsStatusButton from '../FixJobsStatusButton';

export default function AdminDashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-black text-slate-800 mb-8">Admin Dashboard</h1>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-3xl">
                <h2 className="text-xl font-bold mb-4">Database Migration Utilities</h2>
                <div className="mb-4 text-sm text-gray-600">
                    Use these tools to fix data inconsistencies.
                </div>

                {/* Migration Tool */}
                <FixJobsStatusButton />
            </div>
        </div>
    );
}
