// File: apps/transport/src/lib/firebase/config.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signOut } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

export function initializeFirebase() {
  if (typeof window === 'undefined') return null;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  return { app, auth, googleProvider };
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const initialized = initializeFirebase();
    if (!initialized) {
      throw new Error('Firebase cannot be initialized on server');
    }
    return initialized.auth;
  }
  return auth;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    const initialized = initializeFirebase();
    if (!initialized) {
      throw new Error('Firebase cannot be initialized on server');
    }
    return initialized.googleProvider;
  }
  return googleProvider;
}

export async function firebaseSignOut() {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}