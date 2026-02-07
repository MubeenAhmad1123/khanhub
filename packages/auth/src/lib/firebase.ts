import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';

let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

export function initializeFirebase(config: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
}) {
    // Prevent duplicate Firebase app initialization
    if (!getApps().length) {
        app = initializeApp(config);
    } else {
        app = getApp();
    }

    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    // Optional: Customize Google provider
    googleProvider.setCustomParameters({
        prompt: 'select_account'
    });

    return { app, auth, googleProvider };
}

export function getFirebaseAuth(): Auth {
    if (!auth) {
        throw new Error('Firebase not initialized. Call initializeFirebase first.');
    }
    return auth;
}

export function getGoogleProvider(): GoogleAuthProvider {
    if (!googleProvider) {
        throw new Error('Firebase not initialized. Call initializeFirebase first.');
    }
    return googleProvider;
}
