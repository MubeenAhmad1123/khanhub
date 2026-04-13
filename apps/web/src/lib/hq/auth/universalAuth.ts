import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

export interface DepartmentAuthInfo {
  id: string;
  name: string;
  collection: string;
  domain: string;
  dashboardPath: string;
  sessionKey: string;
}

export const DEPARTMENTS_AUTH: Record<string, DepartmentAuthInfo> = {
  hq: {
    id: 'hq',
    name: 'HQ',
    collection: 'hq_users',
    domain: '@hq.khanhub.com',
    dashboardPath: '/hq/dashboard',
    sessionKey: 'hq_session'
  },
  rehab: {
    id: 'rehab',
    name: 'Rehab',
    collection: 'rehab_users',
    domain: '@rehab.khanhub',
    dashboardPath: '/departments/rehab/dashboard',
    sessionKey: 'rehab_session'
  },
  spims: {
    id: 'spims',
    name: 'SPIMS',
    collection: 'spims_users',
    domain: '@spims.khanhub',
    dashboardPath: '/departments/spims/dashboard',
    sessionKey: 'spims_session'
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital',
    collection: 'hospital_users',
    domain: '@hospital.khanhub',
    dashboardPath: '/departments/hospital/dashboard',
    sessionKey: 'hospital_session'
  },
  sukoon: {
    id: 'sukoon',
    name: 'Sukoon',
    collection: 'sukoon_users',
    domain: '@sukoon.khanhub',
    dashboardPath: '/departments/sukoon/dashboard',
    sessionKey: 'sukoon_session'
  },
  welfare: {
    id: 'welfare',
    name: 'Welfare',
    collection: 'welfare_users',
    domain: '@welfare.khanhub',
    dashboardPath: '/departments/welfare/dashboard',
    sessionKey: 'welfare_session'
  },
  'job-center': {
    id: 'job-center',
    name: 'Job Center',
    collection: 'job_center_users',
    domain: '@job-center.khanhub',
    dashboardPath: '/departments/job-center/dashboard',
    sessionKey: 'job_center_session'
  },
  'social-media': {
    id: 'social-media',
    name: 'Social Media',
    collection: 'media_users',
    domain: '@media.khanhub',
    dashboardPath: '/departments/social-media/dashboard',
    sessionKey: 'social-media_session'
  },
  it: {
    id: 'it',
    name: 'IT',
    collection: 'it_users',
    domain: '@it.khanhub',
    dashboardPath: '/departments/it/dashboard',
    sessionKey: 'it_session'
  }
};

/**
 * Searches across all department collections for a user with the given customId.
 */
export async function discoverUser(customId: string) {
  const normalizedId = customId.trim().toLowerCase();
  
  // Create a list of all potential collections to search
  const searches = Object.values(DEPARTMENTS_AUTH).map(async (dept) => {
    try {
      const q = query(collection(db, dept.collection), where('customId', '==', normalizedId)); // Use original case or normalized depending on creation logic
      // Actually, customId is often case-sensitive in the DB (e.g. M-Khan). 
      // But we search for exact match first.
      const snap = await getDocs(query(collection(db, dept.collection), where('customId', '==', customId.trim())));
      if (!snap.empty) return { dept, data: snap.docs[0].data(), uid: snap.docs[0].id };
      
      // Secondary check with lowercase just in case
      const snapLower = await getDocs(query(collection(db, dept.collection), where('customId', '==', normalizedId)));
      if (!snapLower.empty) return { dept, data: snapLower.docs[0].data(), uid: snapLower.docs[0].id };
      
      return null;
    } catch (e) {
      console.error(`Error searching ${dept.collection}:`, e);
      return null;
    }
  });

  const results = await Promise.all(searches);
  return results.find(r => r !== null);
}

/**
 * Validates if the customId is unique across all department collections.
 */
export async function checkIdUniqueness(customId: string): Promise<{ isUnique: boolean; existingDept?: string }> {
  const found = await discoverUser(customId);
  if (found) {
    return { isUnique: false, existingDept: found.dept.name };
  }
  return { isUnique: true };
}

import { setHqSessionCookieFromIdToken } from '@/app/hq/actions/auth';

export type AuthResult = 
  | { success: true }
  | { success: false; error: string };

/**
 * Performs a universal login: discovers the user's department, authenticates, 
 * and identifies the correct redirect path and session configuration.
 */
export async function loginUniversal(customId: string, password: string): Promise<AuthResult> {
  try {
    // 1. Try to find the user
    const discovery = await discoverUser(customId);
    
    let dept: DepartmentAuthInfo;
    let finalData: any;
    let uid: string;
    let cred: any;

    if (!discovery) {
      // If not found by customId, maybe it's already a full email
      if (customId.includes('@')) {
        const domain = '@' + customId.split('@')[1];
        const foundDept = Object.values(DEPARTMENTS_AUTH).find(d => d.domain === domain || domain.includes(d.id));
        if (foundDept) {
          try {
            cred = await signInWithEmailAndPassword(auth, customId, password);
            const userDoc = await getDoc(doc(db, foundDept.collection, cred.user.uid));
            if (userDoc.exists()) {
              dept = foundDept;
              finalData = userDoc.data();
              uid = cred.user.uid;
            } else {
              return { success: false, error: 'User profile not found. Please check your credentials.' };
            }
          } catch (e: any) {
            return { success: false, error: e.message || 'Authentication failed.' };
          }
        } else {
           return { success: false, error: 'Domain not recognized.' };
        }
      } else {
        return { success: false, error: 'User profile not found. Please check your User ID.' };
      }
    } else {
      dept = discovery.dept;
      finalData = discovery.data;
      uid = discovery.uid;
      const email = `${customId.trim().toLowerCase()}${dept.domain}`;
      cred = await signInWithEmailAndPassword(auth, email, password);
    }

    // 2. Security checks
    if (finalData.isActive === false) return { success: false, error: 'Your account is currently inactive.' };

    // 3. Set Local Session
    const session = {
      uid,
      customId: finalData.customId || customId.trim().toUpperCase(),
      name: finalData.name || finalData.displayName || 'User',
      role: finalData.role,
      loginTime: Date.now(),
      ...finalData
    };
    localStorage.setItem(dept.sessionKey, JSON.stringify(session));

    // 4. Set HQ Cookie if needed
    if (dept.id === 'hq' || finalData.role === 'superadmin') {
       const idToken = await cred.user.getIdToken();
       await setHqSessionCookieFromIdToken(idToken);
    }

    // 5. Final Redirect
    const redirectPath = getDashboardPath(dept.id, finalData.role, finalData.patientId || finalData.studentId || finalData.seekerId || finalData.childId);
    window.location.href = redirectPath;

    return { success: true };
  } catch (err: any) {
    console.error('[UniversalAuth] Login Error:', err);
    let msg = 'Authentication failed.';
    if (err.code === 'auth/invalid-credential') msg = 'Invalid User ID or password.';
    if (err.code === 'auth/user-not-found') msg = 'No account found with this ID.';
    return { success: false, error: err.message || msg };
  }
}

/**
 * Constructs the correct dashboard path based on department and role.
 */
function getDashboardPath(deptId: string, role: string, patientId?: string): string {
  if (deptId === 'hq') {
    if (role === 'superadmin') return '/hq/dashboard/superadmin';
    if (role === 'manager') return '/hq/dashboard/manager';
    if (role === 'cashier') return '/hq/dashboard/cashier';
    return '/hq/dashboard';
  }

  const base = `/departments/${deptId}/dashboard`;
  if (role === 'family' && patientId) return `${base}/family/${patientId}`;
  return `${base}/${role}`;
}
