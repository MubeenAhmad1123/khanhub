// filepath: src/hooks/hq/useFcmNotifications.ts
'use client';

import { useEffect, useState } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/fcm';
import type { HqSession } from '@/types/hq';

/** Fires a browser Notification using the Notifications API as a fallback */
function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/icons/icon-192x192.png' });
}

export function useFcmNotifications(session: HqSession | null) {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!session?.customId) return;

    // Read current permission state
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    const initFcm = async () => {
      try {
        const token = await requestNotificationPermission(session.customId);
        if (token) {
          setFcmToken(token);
          setPermission('granted');
        } else {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
          }
        }
      } catch (error) {
        console.error('[FCM Hook] Error initializing FCM', error);
      }
    };

    void initFcm();

    // Handle foreground messages (app is open) — show a browser notification
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'New Notification';
      const body = payload.notification?.body || payload.data?.body || '';
      showBrowserNotification(title, body);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [session?.customId]);

  return { permission, fcmToken };
}
