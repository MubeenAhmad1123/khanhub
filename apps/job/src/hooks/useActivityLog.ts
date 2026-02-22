'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export type ActivityActionType =
    | 'payment_approved'
    | 'payment_rejected'
    | 'video_approved'
    | 'video_rejected'
    | 'user_banned'
    | 'user_unbanned'
    | 'user_deleted'
    | 'user_created'
    | 'user_updated'
    | 'placement_confirmed';

export interface ActivityLogEntry {
    id: string;
    admin_id: string;
    action_type: ActivityActionType;
    target_id: string;
    target_type: 'payment' | 'video' | 'user' | 'placement';
    note: string;
    created_at: Timestamp | null;
}

export function useActivityLog(limitCount = 20) {
    const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'activity_log'),
            orderBy('created_at', 'desc'),
            limit(limitCount)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const logs = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as ActivityLogEntry[];
            setEntries(logs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [limitCount]);

    return { entries, loading };
}

export async function writeActivityLog(entry: Omit<ActivityLogEntry, 'id' | 'created_at'>) {
    try {
        await addDoc(collection(db, 'activity_log'), {
            ...entry,
            created_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('Failed to write activity log:', err);
    }
}

export function getActionIcon(actionType: ActivityActionType): string {
    const icons: Record<ActivityActionType, string> = {
        payment_approved: '✅',
        payment_rejected: '❌',
        video_approved: '🎬',
        video_rejected: '🚫',
        user_banned: '🔒',
        user_unbanned: '🔓',
        user_deleted: '🗑️',
        user_created: '👤',
        user_updated: '📝',
        placement_confirmed: '🤝',
    };
    return icons[actionType] || '📝';
}
