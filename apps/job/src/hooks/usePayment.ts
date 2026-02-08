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
            // 1. Create payment record with placeholder screenshot URL
            const paymentId = await createPayment({
                userId,
                type,
                amount,
                screenshotUrl: '', // Will update after upload
                screenshotFileName: screenshotFile.name,
                status: 'pending',
                method: 'bank_transfer', // Default or passed generic method
                transactionId: 'PENDING', // Will update if needed or passed
                reviewedBy: null,
                reviewedAt: null,
                rejectionReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                isFlagged: false,
            });

            // 2. Upload screenshot
            const uploadResult = await uploadPaymentScreenshot(screenshotFile, paymentId);

            // 3. Update payment with actual URL
            await updatePayment(paymentId, {
                screenshotUrl: uploadResult.url,
                transactionId: paymentId.substring(0, 8).toUpperCase(), // Generate temp ID or usage generic
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
