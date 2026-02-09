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
<<<<<<< HEAD
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
=======
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
>>>>>>> 34630a2430bd3417b8b7bee106e50a1000ec026b
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