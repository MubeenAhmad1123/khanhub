// Firebase Configuration
// Initialize Firebase app and export instances

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
const validateConfig = () => {
    const requiredKeys = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
    ];

    const missing = requiredKeys.filter(
        (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
    );

    if (missing.length > 0) {
        throw new Error(
            `Missing Firebase configuration: ${missing.join(', ')}. ` +
            'Please check your .env.local file.'
        );
    }
};

// Validate on initialization
if (typeof window !== 'undefined') {
    validateConfig();
}

// Initialize Firebase app (only once)
let app: FirebaseApp;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Export app instance
export default app;

// Helper to check if Firebase is initialized
export const isFirebaseInitialized = (): boolean => {
    return getApps().length > 0;
};

// Environment check
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// App configuration
export const appConfig = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Khanhub Job Portal',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    adminPassword: process.env.ADMIN_PASSWORD || '',
};

// Validate admin password exists
if (isProduction && !appConfig.adminPassword) {
    console.warn('Warning: ADMIN_PASSWORD not set in production environment');
}