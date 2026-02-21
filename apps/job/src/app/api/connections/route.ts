import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase-config';
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    updateDoc
} from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { seekerId, seekerName, employerId, employerName, employerCompany, message } = body;

        if (!seekerId || !employerId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Create Connection Document
        const connectionRef = await addDoc(collection(db, 'connections'), {
            seekerId,
            seekerName,
            employerId,
            employerName,
            employerCompany,
            status: 'pending',
            message: message || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // 2. Create Pending Payment Document
        const paymentRef = await addDoc(collection(db, 'payments'), {
            userId: employerId,
            userEmail: employerName, // Using name as placeholder for email if not provided
            amount: 1000,
            currency: 'PKR',
            type: 'connection',
            status: 'pending',
            connectionId: connectionRef.id,
            seekerId,
            seekerName,
            method: 'bank_transfer',
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // 3. Update Connection with Payment ID
        await updateDoc(doc(db, 'connections', connectionRef.id), {
            paymentId: paymentRef.id,
        });

        return NextResponse.json({
            success: true,
            connectionId: connectionRef.id,
            paymentId: paymentRef.id
        });

    } catch (error: any) {
        console.error('API Connection Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
