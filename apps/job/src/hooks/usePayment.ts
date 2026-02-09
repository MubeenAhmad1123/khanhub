// usePayment Hook - Payment Submission with Cloudinary Upload
'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PaymentType, PaymentMethod } from '@/types/payment';
import { useAuth } from './useAuth';
import { uploadPaymentScreenshot, UploadProgress } from '@/lib/services/cloudinaryUpload';

export function usePayment() {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    /**
     * Submit payment for verification with Cloudinary upload
     */
    const submitPayment = async (
        screenshot: File,
        transactionId: string,
        amount: number,
        type: PaymentType,
        method: PaymentMethod,
        userNotes?: string,
        senderName?: string // Added senderName parameter
    ): Promise<void> => {
        if (!user) throw new Error('Not authenticated');

        try {
            setSubmitting(true);
            setError(null);
            setUploadProgress(0);

            // Validate screenshot
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validTypes.includes(screenshot.type)) {
                throw new Error('Invalid file type. Please upload JPG, PNG, or WebP');
            }

            if (screenshot.size > 10 * 1024 * 1024) {
                throw new Error('Image size must be less than 10MB');
            }

            console.log('📤 Uploading payment screenshot to Cloudinary...');

            // Upload screenshot to Cloudinary with progress tracking
            const uploadResult = await uploadPaymentScreenshot(
                screenshot,
                user.uid,
                (progress: UploadProgress) => {
                    setUploadProgress(progress.percentage);
                    console.log(`Upload progress: ${progress.percentage}%`);
                }
            );

            console.log('✅ Screenshot uploaded:', uploadResult.secureUrl);

            // Create payment record in Firestore
            const paymentData = {
                // User information
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || senderName || 'Unknown',
                userPhone: user.profile?.phone || '',

                // Payment details
                amount,
                type,
                method,
                transactionId,
                senderName: senderName || user.displayName || 'Unknown', // Include senderName

                // Cloudinary screenshot data (NOT base64!)
                screenshotUrl: uploadResult.secureUrl, // ✅ This is what admin looks for
                screenshotPublicId: uploadResult.publicId, // Store for potential deletion
                screenshotFileName: screenshot.name,
                screenshotSize: screenshot.size,
                screenshotFormat: uploadResult.format,

                // Status tracking
                status: 'pending',
                isFlagged: false,
                adminNotes: '',
                userNotes: userNotes || '',

                // Timestamps
                submittedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                reviewedAt: null,
                reviewedBy: null,
            };

            const docRef = await addDoc(collection(db, 'payments'), paymentData);
            console.log('✅ Payment record created:', docRef.id);
            console.log('✅ Screenshot URL saved:', uploadResult.secureUrl);

            setUploadProgress(100);

            // Optional: Send confirmation email
            try {
                const { sendPaymentSubmittedEmail } = await import('@/lib/services/emailService');
                await sendPaymentSubmittedEmail({
                    to: user.email!,
                    userName: user.displayName || 'User',
                    amount,
                    transactionId,
                    paymentId: docRef.id,
                });
                console.log('✅ Confirmation email sent');
            } catch (emailError) {
                console.warn('⚠️ Email notification failed (non-critical):', emailError);
                // Don't throw error - email is optional
            }

        } catch (err: any) {
            console.error('❌ Payment submission error:', err);
            setError(err.message || 'Failed to submit payment');
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        submitting,
        uploadProgress,
        error,
        submitPayment,
    };
}