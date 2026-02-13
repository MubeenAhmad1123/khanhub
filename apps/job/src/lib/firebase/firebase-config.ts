// Firebase Configuration - FIXED VERSION
// This version ensures proper initialization order and export

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Validate environment variables
const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
    console.warn('⚠️ Missing Firebase environment variables:', missingVars);
    // We don't throw here to allow the app to hydrate, but Firebase features might fail
}

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

console.log('🔥 Firebase Config Loaded:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKeyLength: firebaseConfig.apiKey?.length || 0
});

// Initialize Firebase app
let app: FirebaseApp;

try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
    } else {
        app = getApps()[0];
        console.log('✅ Using existing Firebase app');
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
}

// Initialize services AFTER app is confirmed initialized
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Configure auth persistence to LOCAL (survives browser restarts)
    // This ensures users stay logged in until they explicitly log out
    if (typeof window !== 'undefined') {
        const { setPersistence, browserLocalPersistence } = require('firebase/auth');
        setPersistence(auth, browserLocalPersistence).then(() => {
            console.log('✅ Firebase Auth persistence set to LOCAL');
        }).catch((error: any) => {
            console.error('⚠️ Failed to set auth persistence:', error);
        });
    }

    // Verify db is properly initialized
    if (!db) {
        throw new Error('Firestore database is undefined after initialization');
    }

    console.log('✅ Firebase services initialized:', {
        hasAuth: !!auth,
        hasDb: !!db,
        hasStorage: !!storage,
    });
} catch (error) {
    console.error('❌ Firebase services initialization error:', error);
    throw error;
}

// Export with verification
export { app, auth, db, storage, firebaseConfig };
export default app;

// Debug helper - remove in production
if (typeof window !== 'undefined') {
    (window as any).__FIREBASE_DB__ = db;
    console.log('🔍 Firebase db available at window.__FIREBASE_DB__');
}