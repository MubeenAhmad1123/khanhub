'use client';

import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useAuth } from '@/hooks/useAuth';
import { Connection, ConnectionStatus } from '@/types/connection';
import { COLLECTIONS } from '@/types/DATABASE_SCHEMA';

export function useConnections() {
    const { user } = useAuth();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Listen to connections where current user is either seeker or employer
        const q = query(
            collection(db, COLLECTIONS.CONNECTIONS),
            where(user.role === 'employer' ? 'employerId' : 'seekerId', '==', user.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const connectionData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Connection[];

            setConnections(connectionData);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching connections:', err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    /**
     * Request a connection (initiated by Employer)
     */
    const requestConnection = async (seekerId: string, seekerName: string, message?: string) => {
        if (!user || user.role !== 'employer') {
            throw new Error('Only employers can request connections');
        }

        try {
            const connectionData = {
                seekerId,
                seekerName,
                employerId: user.uid,
                employerName: user.displayName || 'Employer',
                employerCompany: (user as any).companyName || 'Company', // Assuming expanded user info
                status: 'pending' as ConnectionStatus,
                message: message || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, COLLECTIONS.CONNECTIONS), connectionData);

            // Also log to activity_log
            await addDoc(collection(db, 'activity_log'), {
                type: 'connection_requested',
                userId: user.uid,
                targetId: seekerId,
                details: { connectionId: docRef.id, seekerName },
                timestamp: serverTimestamp(),
            });

            return docRef.id;
        } catch (err: any) {
            console.error('Error requesting connection:', err);
            throw err;
        }
    };

    /**
     * Check connection status with a specific user
     */
    const getConnectionWith = (otherId: string) => {
        return connections.find(c =>
            (user?.role === 'employer' ? c.seekerId : c.employerId) === otherId
        );
    };

    return {
        connections,
        loading,
        error,
        requestConnection,
        getConnectionWith,
    };
}
