import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

export const initFirebase = (config: any) => {
    const app = !getApps().length ? initializeApp(config) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();

    return { app, db, auth, googleProvider };
};

export * from 'firebase/app';
export * from 'firebase/auth';
export * from 'firebase/firestore';
