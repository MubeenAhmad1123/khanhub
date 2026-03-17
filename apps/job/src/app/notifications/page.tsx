'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase-config';
import { Bell, ArrowLeft, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    fromUid?: string;
    isRead: boolean;
    createdAt: any;
}

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs: Notification[] = [];
            snapshot.forEach((doc) => {
                notifs.push({ id: doc.id, ...doc.data() } as Notification);
            });
            setNotifications(notifs);
            setLoading(false);

            // Mark all as read
            notifs.filter(n => !n.isRead).forEach(async (n) => {
                try {
                    await updateDoc(doc(db, 'notifications', n.id), {
                        isRead: true,
                        readAt: serverTimestamp()
                    });
                } catch (err) {
                    console.warn('Failed to mark notification as read:', err);
                }
            });
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'follow':
                return '👤';
            case 'like':
                return '❤️';
            case 'comment':
                return '💬';
            case 'save':
                return '🔖';
            default:
                return '🔔';
        }
    };

    if (authLoading || loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #333', borderTop: '3px solid #FF0069', animation: 'spin 0.75s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #222',
                padding: '16px', display: 'flex', alignItems: 'center', gap: 12,
                zIndex: 50
            }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none', border: 'none',
                        color: '#fff', cursor: 'pointer',
                        padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 40, minHeight: 40,
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Poppins' }}>Notifications</h1>
            </div>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div style={{
                    height: 'calc(100vh - 80px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 16, color: '#666'
                }}>
                    <Bell size={48} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: 16 }}>No notifications yet</p>
                </div>
            ) : (
                <div style={{ padding: '8px 0' }}>
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            style={{
                                display: 'flex', gap: 12, padding: '16px',
                                background: notification.isRead ? 'transparent' : 'rgba(255,0,105,0.05)',
                                borderBottom: '1px solid #222',
                                cursor: 'pointer',
                            }}
                        >
                            {/* Unread indicator */}
                            {!notification.isRead && (
                                <div style={{
                                    width: 8, height: 8,
                                    borderRadius: '50%',
                                    background: '#FF0069',
                                    flexShrink: 0, marginTop: 6,
                                }} />
                            )}
                            {notification.isRead && <div style={{ width: 8 }} />}

                            {/* Icon */}
                            <div style={{
                                width: 40, height: 40,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, flexShrink: 0,
                            }}>
                                {getNotificationIcon(notification.type)}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <p style={{
                                    fontSize: 14,
                                    color: notification.isRead ? '#888' : '#fff',
                                    lineHeight: 1.4,
                                }}>
                                    {notification.message}
                                </p>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    marginTop: 4, color: '#666', fontSize: 12
                                }}>
                                    <Clock size={12} />
                                    <span>
                                        {notification.createdAt?.toDate
                                            ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
                                            : 'Just now'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
