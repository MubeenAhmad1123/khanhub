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

        console.log('[useNotifications] Setting up listener for user:', user.uid);
        const q = query(
            collection(db, 'notifications'),
            where('user_id', '==', user.uid),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Handle potential legacy/alternate field names
                    user_id: data.user_id || data.userId,
                    created_at: data.created_at || data.createdAt,
                    is_read: data.is_read !== undefined ? data.is_read : data.read
                };
            }) as Notification[];

            console.log(`[useNotifications] Fetched ${notifs.length} notifications`);
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.is_read).length);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching notifications:', error);
            if (error.code === 'failed-precondition') {
                console.warn('[useNotifications] This usually means an index is being built or is missing. Check the URL in the previous error message.');
            }
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
