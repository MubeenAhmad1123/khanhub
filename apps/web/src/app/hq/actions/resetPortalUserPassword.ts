'use server'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === 'hq-admin');
  if (existing) return existing;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');

  const sa = JSON.parse(json);

  return initializeApp(
    {
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    },
    'hq-admin'
  );
}

type Portal = 'hq' | 'rehab' | 'spims' | 'hospital' | 'sukoon' | 'welfare' | 'job-center' | 'social-media' | 'it';

const COLLECTION_BY_PORTAL: Record<Portal, string> = {
  hq: 'hq_users',
  rehab: 'rehab_users',
  spims: 'spims_users',
  hospital: 'hospital_users',
  sukoon: 'sukoon_users',
  'job-center': 'jobcenter_users',
  welfare: 'welfare_users',
  'social-media': 'media_users',
  it: 'it_users',
};

export async function resetPortalUserPassword(
  uid: string,
  portal: Portal,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    let authUid: string | null = null;

    // Layer 1: Check if the passed `uid` is already a valid Firebase Auth UID
    try {
      const u = await auth.getUser(uid);
      if (u) {
        authUid = u.uid;
      }
    } catch {
      // Not found by direct UID
    }

    // Layer 2: Read Firestore doc and try various UID and email fields
    const col = COLLECTION_BY_PORTAL[portal];
    let docData: any = null;
    if (!authUid && col) {
      try {
        const snap = await db.collection(col).doc(uid).get();
        if (snap.exists) {
          docData = snap.data();
          const candidateUid = docData.loginUserId || docData.authUid || docData.uid;
          if (candidateUid) {
            try {
              const u = await auth.getUser(candidateUid);
              if (u) authUid = u.uid;
            } catch {
              // candidate UID not valid
            }
          }

          if (!authUid) {
            const email = docData.loginEmail || docData.email;
            if (email) {
              try {
                const u = await auth.getUserByEmail(email);
                if (u) authUid = u.uid;
              } catch {
                // Not found by exact field email
              }
            }
          }
        }
      } catch {
        // Firestore fetch failed
      }
    }

    // Layer 3: Fallback by looking up constructed emails using various domains
    if (!authUid) {
      const domains = [
        `@${portal}.khanhub.com.pk`,
        `@${portal}.khanhub`,
        `@${portal.replace('-', '_')}.khanhub.com.pk`,
        `@${portal.replace('-', '_')}.khanhub`,
        `@khanhub.com.pk`,
        `@khanhub`
      ];

      const candidateIds = new Set<string>();
      if (docData?.customId) candidateIds.add(String(docData.customId).toLowerCase());
      if (docData?.userId) candidateIds.add(String(docData.userId).toLowerCase());
      if (uid) candidateIds.add(uid.toLowerCase());

      for (const id of candidateIds) {
        for (const domain of domains) {
          if (authUid) break;
          try {
            const u = await auth.getUserByEmail(`${id}${domain}`);
            if (u) {
              authUid = u.uid;
              break;
            }
          } catch {
            // Not found
          }
        }
      }
    }

    // Layer 4: Final fallback - try getUserByEmail with uid directly in case uid is an email
    if (!authUid && uid && uid.includes('@')) {
      try {
        const u = await auth.getUserByEmail(uid);
        if (u) authUid = u.uid;
      } catch {
        // Not found
      }
    }

    if (!authUid) {
      // Create user on the fly if still not resolved
      let email = docData?.loginEmail || docData?.email;
      if (!email) {
        const id = docData?.customId || docData?.userId || uid;
        email = `${id.toLowerCase()}@${portal}.khanhub.com.pk`;
      }

      try {
        const newUser = await auth.createUser({
          uid: uid,
          email: email,
          password: newPassword,
          displayName: docData?.displayName || docData?.name || uid,
        });
        authUid = newUser.uid;
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists' || String(err.message).includes('already exists')) {
          try {
            const u = await auth.getUserByEmail(email);
            authUid = u.uid;
          } catch {
            // Not found
          }
        }

        if (!authUid) {
          try {
            const newUser = await auth.createUser({
              email: email,
              password: newPassword,
              displayName: docData?.displayName || docData?.name || uid,
            });
            authUid = newUser.uid;
          } catch (err2: any) {
            try {
              const uniqueEmail = `${uid.toLowerCase()}_${Date.now()}@${portal}.khanhub.com.pk`;
              const newUser = await auth.createUser({
                email: uniqueEmail,
                password: newPassword,
                displayName: docData?.displayName || docData?.name || uid,
              });
              authUid = newUser.uid;
            } catch {
              // Ignore
            }
          }
        }
      }
    }

    if (!authUid) {
      return { 
        success: false, 
        error: `Could not resolve or create Firebase Auth account for identifier: "${uid}".` 
      };
    }

    // Now update the password in Firebase Auth
    await auth.updateUser(authUid, { password: newPassword });

    // Also update plaintext password in Firestore for display in Credential Hub
    if (col) {
      const updates: any = {
        password: newPassword,
        defaultPassword: newPassword
      };

      await db.collection(col).doc(uid).set(updates, { merge: true }).catch(() => null);
      if (authUid && authUid !== uid) {
        await db.collection(col).doc(authUid).set(updates, { merge: true }).catch(() => null);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reset password.' };
  }
}
