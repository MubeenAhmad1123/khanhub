import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import { useAuth } from './useAuth';

export interface AdminNotification {
    id: string;
    type: 'new_payment' | 'new_video' | 'new_user' | 'flag';
    title: string;
    message: string;
    is_read: boolean;
    targetId: string;
    targetType: string;
    created_at: any;
}

export function useAdminNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user?.role !== 'admin') {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const q = query(
            collection(db, 'adminNotifications'),
            orderBy('created_at', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Robust mapping for transition
                    is_read: data.is_read !== undefined ? data.is_read : data.read,
                    created_at: data.created_at || data.createdAt
                };
            }) as AdminNotification[];

            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        }, (error) => {
            console.error("Error fetching admin notifications:", error);
        });

        return () => unsubscribe();
    }, [user?.role]);

    const markAsRead = async (id: string) => {
        if (!id) return;
        try {
            await updateDoc(doc(db, 'adminNotifications', id), { is_read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        if (user?.role !== 'admin') return;
        try {
            const batch = writeBatch(db);
            const unreadQ = query(collection(db, 'adminNotifications'), where('is_read', '==', false), limit(100));
            const snapshot = await getDocs(unreadQ);

            snapshot.docs.forEach((document) => {
                batch.update(document.ref, { is_read: true });
            });

            await batch.commit();
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead };
}
