// src/lib/firebase.ts
// ─────────────────────────────────────────────
// Firebase initialization.
// Reads config from environment variables.
// Uses singleton pattern so Firebase only initializes once.
// ─────────────────────────────────────────────

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore }               from 'firebase/firestore';
import { getStorage, FirebaseStorage }           from 'firebase/storage';
import { getAuth, Auth }                         from 'firebase/auth';

const firebaseConfig = {
  apiKey:                process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:             process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:         process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:     process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:                 process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Singleton: reuse existing app if already initialized (Next.js HMR)
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const db:      Firestore      = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const auth:    Auth           = getAuth(app);

export default app;
