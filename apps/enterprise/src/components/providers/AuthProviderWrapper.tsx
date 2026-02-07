'use client';

import { AuthProvider, initializeFirebase } from '@khanhub/auth';
import { firebaseConfig } from '@/lib/firebase/config';

// Initialize Firebase once on the client side
if (typeof window !== 'undefined') {
    initializeFirebase(firebaseConfig);
}

export default function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
