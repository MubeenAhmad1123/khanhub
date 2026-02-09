'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePayment } from '@/lib/firebase/firestore';
import { updateUserProfile, getUserProfile } from '@/lib/firebase/auth';
import { sendPaymentApprovalEmail, sendPaymentRejectionEmail } from '@/lib/services/emailService';

export default function AdminDashboardPage() {
    const router = useRouter();

    // Redirect to parent /admin to consolidate dashboards
    useEffect(() => {
        router.replace('/admin');
    }, [router]);

    return null; // Don't render anything, just redirect
}
