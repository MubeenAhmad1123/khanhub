import { NextRequest, NextResponse } from 'next/server';
import { collection, query, getDocs, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status'); // 'pending', 'approved', 'rejected'

        let paymentsQuery = query(
            collection(db, 'payments'),
            orderBy('createdAt', 'desc')
        );

        if (status && status !== 'all') {
            paymentsQuery = query(paymentsQuery, where('status', '==', status));
        }

        const snapshot = await getDocs(paymentsQuery);

        // CRITICAL FIX: Handle empty results gracefully
        if (snapshot.empty) {
            return NextResponse.json({
                payments: [],
                count: 0,
                message: 'No payments found',
                success: true
            }, { status: 200 });
        }

        const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));

        return NextResponse.json({
            payments,
            count: payments.length,
            success: true
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error fetching payments:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch payments',
                details: error.message,
                payments: [],
                count: 0,
                success: false
            },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { paymentId, status, userId } = body;

        if (!paymentId || !status) {
            return NextResponse.json(
                { error: 'Payment ID and status are required', success: false },
                { status: 400 }
            );
        }

        // Update payment status
        const paymentRef = doc(db, 'payments', paymentId);
        await updateDoc(paymentRef, {
            status,
            updatedAt: new Date(),
            reviewedAt: new Date(),
        });

        // CRITICAL FIX: Update user status in real-time when payment is approved/rejected
        if (userId) {
            const userRef = doc(db, 'users', userId);

            if (status === 'approved') {
                await updateDoc(userRef, {
                    paymentStatus: 'approved',
                    isPremium: true,
                    premiumActivatedAt: new Date(),
                    updatedAt: new Date(),
                });
            } else if (status === 'rejected') {
                await updateDoc(userRef, {
                    paymentStatus: 'rejected',
                    updatedAt: new Date(),
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Payment status updated successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error updating payment:', error);
        return NextResponse.json(
            { error: 'Failed to update payment', details: error.message, success: false },
            { status: 500 }
        );
    }
}
