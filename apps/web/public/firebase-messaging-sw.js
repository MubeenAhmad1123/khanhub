// filepath: public/firebase-messaging-sw.js

// Import Firebase compat scripts
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// Initialize Firebase with hardcoded config because service workers cannot use process.env
const firebaseConfig = {
  apiKey: "AIzaSyD31X2_qokpRx4wIRLP99QkzC-9BEndbIs",
  authDomain: "khanhub-5e552.firebaseapp.com",
  projectId: "khanhub-5e552",
  storageBucket: "khanhub-5e552.firebasestorage.app",
  messagingSenderId: "484860653296",
  appId: "1:484860653296:web:b80315c175afed96539c35"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
    image: payload.notification?.image || payload.data?.image || payload.notification?.imageUrl || null,
    badge: '/icons/badge-72x72.png',
    tag: payload.notification?.tag || payload.data?.tag || payload.data?.type || 'default',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      route: payload.data?.route || '/hq/dashboard'
    },
    actions: [
      { action: 'open', title: 'View Details' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetRoute = event.notification.data?.route || '/hq/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === self.registration.scope + targetRoute && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window/tab is open, open one
      if (clients.openWindow) {
        return clients.openWindow(targetRoute);
      }
    })
  );
});
