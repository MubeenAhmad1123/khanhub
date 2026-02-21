import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp,
    addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { useAuth } from './useAuth';
import { Notification, NotificationType } from '@/types/notification';

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('user_id', '==', user.uid),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];

            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.is_read).length);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching notifications:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (notificationId: string) => {
        if (!user) return;
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, {
                is_read: true
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const unreadNotifs = notifications.filter(n => !n.is_read);
        const promises = unreadNotifs.map(n =>
            updateDoc(doc(db, 'notifications', n.id), { is_read: true })
        );
        try {
            await Promise.all(promises);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const createNotification = async (
        userId: string,
        type: NotificationType,
        message: string,
        referenceId?: string,
        actionUrl?: string
    ) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                user_id: userId,
                type,
                message,
                is_read: false,
                created_at: serverTimestamp(),
                reference_id: referenceId || null,
                action_url: actionUrl || null
            });
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        createNotification
    };
}
