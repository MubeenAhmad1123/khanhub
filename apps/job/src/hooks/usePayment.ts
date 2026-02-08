// usePayment Hook - Payment Submission and Verification
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/config';
import { PaymentType, PaymentMethod } from '@/types/payment';
import { useAuth } from './useAuth';

export function usePayment() {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Submit payment for verification
     */
    const submitPayment = async (
        screenshot: File,
        transactionId: string,
        amount: number,
        type: PaymentType,
        method: PaymentMethod,
        userNotes?: string
    ): Promise<void> => {
        if (!user) throw new Error('Not authenticated');

        try {
            setSubmitting(true);
            setError(null);

            // Validate screenshot
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validTypes.includes(screenshot.type)) {
                throw new Error('Invalid file type. Please upload JPG, PNG, or WebP');
            }

            if (screenshot.size > 5 * 1024 * 1024) {
                throw new Error('Image size must be less than 5MB');
            }

            // Upload screenshot to Firebase Storage
            const fileName = `${user.uid}_${Date.now()}_${screenshot.name}`;
            const storageRef = ref(storage, `payment_screenshots/${user.uid}/${fileName}`);
            await uploadBytes(storageRef, screenshot);
            const downloadURL = await getDownloadURL(storageRef);

            // Create payment record in Firestore
            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName,
                userPhone: user.profile?.phone || '',
                amount,
                type,
                method,
                transactionId,
                screenshotUrl: downloadURL,
                screenshotFileName: fileName,
                status: 'pending',
                userNotes: userNotes || '',
                submittedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isFlagged: false,
            });

        } catch (err: any) {
            setError(err.message || 'Failed to submit payment');
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