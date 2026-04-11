// filepath: src/hooks/hq/useFcmNotifications.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/fcm';
import type { HqSession } from '@/types/hq';

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icons/icon-192x192.png' });
  } catch {
    // Some browsers block new Notification() outside of SW context — silently ignore
  }
}

export function useFcmNotifications(session: HqSession | null) {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  // Read the current permission state on mount (don't prompt yet)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // If permission was already granted previously, silently register the token
  useEffect(() => {
    if (!session?.customId) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const silentRegister = async () => {
      try {
        const token = await requestNotificationPermission(session.customId);
        if (token) setFcmToken(token);
      } catch (e) {
        console.warn('[FCM] Silent token registration failed', e);
      }
    };
    void silentRegister();
  }, [session?.customId]);

  // Subscribe to foreground messages after token is set
  useEffect(() => {
    if (!fcmToken) return;
    const unsub = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'New Notification';
      const body  = payload.notification?.body  || payload.data?.body  || '';
      showBrowserNotification(title, body);
    });
    return () => { if (unsub) unsub(); };
  }, [fcmToken]);

  /**
   * Call this from a button/banner click — browsers require a user gesture
   * before showing the native permission prompt.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!session?.customId) return false;
    setIsRequesting(true);
    try {
      const token = await requestNotificationPermission(session.customId);
      const newPermission =
        typeof window !== 'undefined' && 'Notification' in window
          ? Notification.permission
          : 'denied';
      setPermission(newPermission as NotificationPermission);
      if (token) {
        setFcmToken(token);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[FCM] requestPermission failed', e);
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, [session?.customId]);

  return { permission, fcmToken, isRequesting, requestPermission };
}
