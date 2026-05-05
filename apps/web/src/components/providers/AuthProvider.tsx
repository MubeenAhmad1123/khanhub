'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { discoverUser, DEPARTMENTS_AUTH } from '@/lib/hq/auth/universalAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useUniversalAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // ─── SESSION RE-HYDRATION ───────────────────────────────────────────
        // If Firebase says we are logged in, but our custom session is missing,
        // we try to restore it from Firestore using the UID.
        
        const allDepts = Object.values(DEPARTMENTS_AUTH);
        let sessionRestored = false;

        for (const dept of allDepts) {
          const session = localStorage.getItem(dept.sessionKey);
          if (session) {
            sessionRestored = true;
            break; 
          }
        }

        if (!sessionRestored) {
          console.log('[AuthProvider] Auth exists but session is missing. Attempting restoration...');
          // We don't know the customId, but we have the firebaseUser.uid.
          // In our system, the Document ID in department collections is the Firebase UID.
          
          for (const dept of allDepts) {
             try {
                const { doc, getDoc } = await import('firebase/firestore');
                const userDoc = await getDoc(doc(db, dept.collection, firebaseUser.uid));
                
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const newSession = {
                    uid: firebaseUser.uid,
                    customId: data.customId,
                    name: data.name || data.displayName || 'User',
                    role: data.role,
                    loginTime: Date.now(),
                    ...data
                  };
                  localStorage.setItem(dept.sessionKey, JSON.stringify(newSession));
                  console.log(`[AuthProvider] Restored session for ${dept.name}`);
                  break;
                }
             } catch (e) {
                // Silently skip if permission denied or other error
             }
          }
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
