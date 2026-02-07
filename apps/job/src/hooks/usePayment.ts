'use client';

import { useState } from 'react';
import { createPayment, updatePayment } from '@/lib/firebase/firestore';
import { uploadPaymentScreenshot } from '@/lib/firebase/storage';
import { PaymentType } from '@/types/payment';

export function usePayment(userId: string | null) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitPayment = async (
        type: PaymentType,
        amount: number,
        screenshotFile: File
    ): Promise<string> => {
        if (!userId) {
            throw new Error('User not authenticated');
        }

        setSubmitting(true);
        setError(null);

        try {
            // Upload screenshot
            const screenshotUrl = await uploadPaymentScreenshot(userId, screenshotFile);

            // Create payment record
            const paymentId = await createPayment({
                userId,
                type,
                amount,
                screenshotUrl,
                status: 'pending',
                reviewedBy: null,
                reviewedAt: null,
                rejectionReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            return paymentId;
        } catch (err) {
            console.error('Error submitting payment:', err);
            setError('Failed to submit payment');
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        submitting,
        error,
        submitPayment,
    };
}
