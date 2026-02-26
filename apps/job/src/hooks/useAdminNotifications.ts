import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/firebase-config';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import { useAuth } from './useAuth';

export interface AdminNotification {
    id: string;
    type: 'new_payment' | 'new_video' | 'new_user' | 'flag';
    title: string;
    message: string;
    read: boolean;
    targetId: string;
    targetType: string;
    createdAt: any;
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
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AdminNotification[];

            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user?.role]);

    const markAsRead = async (id: string) => {
        if (!id) return;
        try {
            await updateDoc(doc(db, 'adminNotifications', id), { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        if (user?.role !== 'admin') return;
        try {
            const batch = writeBatch(db);
            const unreadQ = query(collection(db, 'adminNotifications'), where('read', '==', false), limit(100));
            const snapshot = await getDocs(unreadQ);

            snapshot.docs.forEach((document) => {
                batch.update(document.ref, { read: true });
            });

            await batch.commit();
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead };
}
