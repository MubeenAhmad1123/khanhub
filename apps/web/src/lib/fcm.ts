// filepath: src/lib/fcm.ts
import { getMessaging, getToken, onMessage, deleteToken, Messaging } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let messaging: Messaging | null = null;

/** Lazily initialise Firebase Messaging (browser-only, requires SW + Push API support) */
function getClientMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null;
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn('[FCM] Failed to initialize Firebase Messaging', e);
  }
  return messaging;
}

/** Register the FCM-specific service worker if not already registered */
async function ensureFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  } catch (e) {
    console.warn('[FCM] SW registration failed', e);
    return null;
  }
}

export async function requestNotificationPermission(userId: string): Promise<string | null> {
  const msg = getClientMessaging();
  if (!msg) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Ensure our dedicated SW is registered before requesting token
    const swReg = await ensureFcmServiceWorker();

    const token = await getToken(msg, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg ?? undefined,
    });

    if (token) {
      // Persist token in hq_users sub-collection so the Admin SDK can fan-out
      const tokenRef = doc(db, `hq_users/${userId}/fcmTokens`, token);
      await setDoc(
        tokenRef,
        {
          token,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          userAgent: navigator.userAgent,
        },
        { merge: true }
      );
      return token;
    }
    return null;
  } catch (error) {
    console.error('[FCM] An error occurred while retrieving token. ', error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const msg = getClientMessaging();
  if (!msg) return () => {};
  return onMessage(msg, callback);
}

export async function removeToken(userId: string, currentToken: string): Promise<void> {
  const msg = getClientMessaging();
  if (!msg) return;
  try {
    await deleteToken(msg);
    const tokenRef = doc(db, `hq_users/${userId}/fcmTokens`, currentToken);
    await deleteDoc(tokenRef);
  } catch (error) {
    console.error('[FCM] Error removing FCM token:', error);
  }
}
