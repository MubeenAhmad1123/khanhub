import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  limit
} from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { setHqSessionCookieFromIdToken } from '@/app/hq/actions/auth';

export interface DepartmentAuthInfo {
  id: string;
  name: string;
  collection: string;
  domain: string;
  dashboardPath: string;
  sessionKey: string;
  legacyDomain?: string;
  prefixes?: string[];
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
    sessionKey: 'spims_session',
    legacyDomain: '@spims.edu.pk'
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital',
    collection: 'hospital_users',
    domain: '@hospital.khanhub',
    dashboardPath: '/departments/hospital/dashboard',
    sessionKey: 'hospital_session',
    prefixes: ['HOS', 'HOSP']
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
  job_center: {
    id: 'job_center',
    name: 'Job Center',
    collection: 'job_center_users',
    domain: '@jobcenter.khanhub',
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
 * Discovers a user's department by their Custom ID.
 * Optionally takes a deptHint to prioritize searching a specific department collection.
 */
export async function discoverUser(rawId: string, deptHint?: string): Promise<{ dept: DepartmentAuthInfo; data: any; uid: string } | null> {
  if (!rawId) return null;
  const normalizedId = rawId.trim().toLowerCase();
  const depts = Object.values(DEPARTMENTS_AUTH);

  // Helper to search a specific department
  const performSearch = async (dept: (typeof DEPARTMENTS_AUTH)[keyof typeof DEPARTMENTS_AUTH]) => {
    try {
      // 1. Try exact match
      const q1 = query(collection(db, dept.collection), where('customId', '==', rawId.trim()), limit(1));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) return { dept, data: snap1.docs[0].data(), uid: snap1.docs[0].id };
      
      // 2. Try lowercase match
      const q2 = query(collection(db, dept.collection), where('customId', '==', normalizedId), limit(1));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) return { dept, data: snap2.docs[0].data(), uid: snap2.docs[0].id };
      
      return null;
    } catch (e: any) {
      const isPermissionError = 
        e?.code === 'permission-denied' || 
        e?.message?.toLowerCase().includes('permission');
      
      if (!isPermissionError) {
        console.error(`[Discovery] Error searching ${dept.collection}:`, e);
      }
      return null;
    }
  };

  // 0. Priority Hint Search (If landing on a specific department login page)
  if (deptHint) {
    const hintDept = DEPARTMENTS_AUTH[deptHint.toLowerCase()];
    if (hintDept) {
      console.log('[UniversalAuth] Discovery using deptHint:', deptHint);
      const hintResult = await performSearch(hintDept);
      if (hintResult) return hintResult;
    }
  }

  // 1. Identify priority department based on prefix (e.g., "REHAB-001" -> Rehab)
  const idUpper = rawId.trim().toUpperCase();
  const priorityDeptByPrefix = depts.find(d => {
    const deptId = d.id.toUpperCase();
    const deptName = d.name.toUpperCase();
    const customPrefixes = (d.prefixes || []).map(p => p.toUpperCase());
    
    return idUpper.startsWith(deptId + '-') || 
           idUpper.startsWith(deptName + '-') || 
           customPrefixes.some(p => idUpper.startsWith(p + '-'));
  });

  if (priorityDeptByPrefix) {
    console.log('[UniversalAuth] Priority prefix match:', priorityDeptByPrefix.id);
    const result = await performSearch(priorityDeptByPrefix);
    if (result) return result;
  }

  // 2. Fallback: Search all departments (parallel)
  const remainingDepts = depts.filter(d => d.id !== priorityDeptByPrefix?.id && d.id !== deptHint?.toLowerCase());
  
  const results = await Promise.all(remainingDepts.map(performSearch));
  return results.find(r => r !== null) || null;
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

export type AuthResult = 
  | { success: true; redirectUrl?: string }
  | { success: false; error: string };

/**
 * Performs a universal login: discovers the user's department, authenticates, 
 * and identifies the correct redirect path and session configuration.
 */
export async function loginUniversal(customId: string, password: string, deptHint?: string): Promise<AuthResult> {
  try {
    // 1. Try to find the user
    console.log('[UniversalAuth] Starting login for:', customId, deptHint ? `(Hint: ${deptHint})` : '');
    const discovery = await discoverUser(customId, deptHint);
    console.log('[UniversalAuth] Discovery result:', discovery ? discovery.dept.id : 'NOT FOUND');
    
    let dept: DepartmentAuthInfo;
    let finalData: any;
    let uid: string;
    let cred: any;

    if (!discovery) {
      // If not found by customId, maybe it's already a full email
      if (customId.includes('@')) {
        const domain = '@' + customId.split('@')[1];
        const foundDept = Object.values(DEPARTMENTS_AUTH).find(d => d.domain === domain || d.legacyDomain === domain || domain.includes(d.id));
        if (foundDept) {
          try {
            console.log('[UniversalAuth] Attempting login with full email:', customId);
            cred = await signInWithEmailAndPassword(auth, customId, password);
            const userDoc = await getDoc(doc(db, foundDept.collection, cred.user.uid));
            if (userDoc.exists()) {
              dept = foundDept;
              finalData = userDoc.data();
              uid = cred.user.uid;
              console.log('[UniversalAuth] Profile found for email user');
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
      console.log('[UniversalAuth] Attempting Firebase Auth with discovered user:', email);
      
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
        console.log('[UniversalAuth] Auth successful, UID:', cred.user.uid);
      } catch (e: any) {
        if (dept.legacyDomain && (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email')) {
          const legacyEmail = `${customId.trim().toLowerCase()}${dept.legacyDomain}`;
          console.log('[UniversalAuth] Attempting fallback with legacy domain:', legacyEmail);
          cred = await signInWithEmailAndPassword(auth, legacyEmail, password);
          console.log('[UniversalAuth] Legacy Auth successful, UID:', cred.user.uid);
        } else {
          throw e;
        }
      }
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
    console.log('[UniversalAuth] Setting localStorage for:', dept.sessionKey);
    localStorage.setItem(dept.sessionKey, JSON.stringify(session));
    localStorage.setItem(`${dept.id}_login_time`, Date.now().toString());

    // 4. Set HQ Cookie if needed
    if (dept.id === 'hq' || finalData.role === 'superadmin') {
       console.log('[UniversalAuth] Setting HQ session cookie...');
       const idToken = await cred.user.getIdToken();
       await setHqSessionCookieFromIdToken(idToken);
    }

    // 5. Final Redirect
    const redirectPath = getDashboardPath(dept.id, finalData.role, finalData.patientId || finalData.studentId || finalData.seekerId || finalData.childId);
    console.log('[UniversalAuth] Redirecting to:', redirectPath);
    
    if (typeof window !== 'undefined') {
      window.location.href = redirectPath;
    }

    return { success: true, redirectUrl: redirectPath };
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
  const normalizedRole = (role || '').toLowerCase();

  if (deptId === 'hq') {
    if (normalizedRole === 'superadmin') return '/hq/dashboard/superadmin';
    if (normalizedRole === 'manager') return '/hq/dashboard/manager';
    if (normalizedRole === 'cashier') return '/hq/dashboard/cashier';
    return '/hq/dashboard';
  }

  const base = `/departments/${deptId}/dashboard`;
  // Handle common roles directly
  if (normalizedRole === 'staff') return `${base}/staff`;
  if (normalizedRole === 'admin') return `${base}/admin`;
  if (normalizedRole === 'cashier') return `${base}/cashier`;
  if (normalizedRole === 'superadmin') return `${base}/superadmin`;
  if (normalizedRole === 'family' && patientId) return `${base}/family/${patientId}`;
  
  return `${base}/${normalizedRole}`;
}
