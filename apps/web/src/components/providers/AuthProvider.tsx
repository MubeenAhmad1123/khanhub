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

export function AuthProvider({ children }: { children: any }) {
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
          // In our system, the Document ID in department collections is usually the Firebase UID.
          // But it can also be the custom ID (e.g. raqeeb-62).
          
          for (const dept of allDepts) {
             try {
                const { doc, getDoc, collection, query, where, getDocs, limit } = await import('firebase/firestore');
                
                let userDoc = await getDoc(doc(db, dept.collection, firebaseUser.uid));
                let data: any = userDoc.exists() ? userDoc.data() : null;
                let finalDocId = firebaseUser.uid;

                // Validate retrieved data: ignore dummy password reset documents lacking role or customId
                if (!data || !data.role || !data.customId) {
                  data = null; // reset to try queries
                  
                  // Try finding by customId extracted from Firebase Auth email prefix
                  if (firebaseUser.email) {
                    const prefix = firebaseUser.email.split('@')[0];
                    const q = query(
                      collection(db, dept.collection),
                      where('customId', '==', prefix),
                      limit(1)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                      userDoc = snap.docs[0];
                      data = userDoc.data();
                      finalDocId = userDoc.id;
                    }
                  }

                  // Try finding by email field
                  if (!data && firebaseUser.email) {
                    const q = query(
                      collection(db, dept.collection),
                      where('email', '==', firebaseUser.email),
                      limit(1)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                      userDoc = snap.docs[0];
                      data = userDoc.data();
                      finalDocId = userDoc.id;
                    }
                  }
                }
                
                if (data && data.role && data.customId) {
                  const newSession = {
                    uid: finalDocId,
                    customId: data.customId,
                    name: data.name || data.displayName || 'User',
                    role: data.role,
                    ...data,
                    loginTime: Date.now() + 600000
                  };
                  localStorage.setItem(dept.sessionKey, JSON.stringify(newSession));
                  
                  // Keep login time in sync to satisfy forceLogoutAt checks
                  const loginTimeKey = dept.sessionKey.replace('_session', '_login_time');
                  localStorage.setItem(loginTimeKey, Date.now().toString());

                  console.log(`[AuthProvider] Restored session for ${dept.name} with doc ID ${finalDocId}`);
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
