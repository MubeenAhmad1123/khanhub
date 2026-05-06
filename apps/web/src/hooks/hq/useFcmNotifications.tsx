// filepath: src/hooks/hq/useFcmNotifications.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/fcm';
import type { HqSession } from '@/types/hq';

import toast from 'react-hot-toast';

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  
  // WhatsApp style in-app notification using toast
  toast(
    (t) => (
      <div className="flex flex-col gap-1 cursor-pointer" onClick={() => toast.dismiss(t.id)}>
        <span className="font-bold text-sm text-gray-900">{title}</span>
        <span className="text-xs text-gray-600 line-clamp-2">{body}</span>
      </div>
    ),
    {
      duration: 5000,
      position: 'top-right',
      icon: '🔔',
      style: {
        borderRadius: '16px',
        background: '#fff',
        color: '#333',
        border: '1px solid #eee',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: '12px 16px',
        maxWidth: '350px',
      },
    }
  );

  // Still try native notification if in background
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    try {
      new Notification(title, { body, icon: '/icons/icon-192x192.png' });
    } catch {
      // Ignore
    }
  }
}

export function useFcmNotifications(session: HqSession | null, userCol: string = 'hq_users') {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  // Read the current permission state on mount (don't prompt yet)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      } else {
        setPermission('denied');
      }
    }
  }, []);

  // If permission was already granted previously, silently register the token
  useEffect(() => {
    if (!session?.uid) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const silentRegister = async () => {
      try {
        const token = await requestNotificationPermission(session.uid, userCol);
        if (token) setFcmToken(token);
      } catch (e) {
        console.warn('[FCM] Silent token registration failed', e);
      }
    };
    void silentRegister();
  }, [session?.uid, userCol]);

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
    if (!session?.uid) return false;
    setIsRequesting(true);
    try {
      const token = await requestNotificationPermission(session.uid, userCol);
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
  }, [session?.uid, userCol]);

  return { permission, fcmToken, isRequesting, requestPermission };
}
