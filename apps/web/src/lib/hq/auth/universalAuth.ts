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
import { setHqSessionCookieFromIdToken, setUserDashboardClaims } from '@/app/hq/actions/auth';
import { isSuperadminEmail } from './superadminWhitelist';

export interface DepartmentAuthInfo {
  id: string;
  name: string;
  collection: string;
  domain: string;
  dashboardPath: string;
  sessionKey: string;
  legacyDomains?: string[];
  prefixes?: string[];
}

export const DEPARTMENTS_AUTH: Record<string, DepartmentAuthInfo> = {
  hq: {
    id: 'hq',
    name: 'HQ',
    collection: 'hq_users',
    domain: '@hq.khanhub.com.pk',
    legacyDomains: ['@hq.khanhub.com', '@khanhub.io', '@hq.KhanHub', '@hq.Khan Hub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/hq/dashboard',
    sessionKey: 'hq_session',
    prefixes: ['HQ', 'SUPER', 'MGR', 'MNG']
  },
  rehab: {
    id: 'rehab',
    name: 'Rehab',
    collection: 'rehab_users',
    domain: '@rehab.khanhub.com.pk',
    legacyDomains: ['@rehab.khanhub.com', '@rehab.KhanHub', '@rehab.Khan Hub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/rehab/dashboard',
    sessionKey: 'rehab_session',
    prefixes: ['REHAB', 'PAT', 'PATIENT', 'FAM', 'FAMILY']
  },
  spims: {
    id: 'spims',
    name: 'SPIMS',
    collection: 'spims_users',
    domain: '@spims.khanhub.com.pk',
    legacyDomains: ['@spims.khanhub.com', '@spims.edu.pk', '@spims.KhanHub', '@spims.Khan Hub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/spims/dashboard',
    sessionKey: 'spims_session',
    prefixes: ['SPIMS', 'STU', 'STUDENT']
  },
  hospital: {
    id: 'hospital',
    name: 'Hospital',
    collection: 'hospital_users',
    domain: '@hospital.khanhub.com.pk',
    legacyDomains: ['@hospital.khanhub.com', '@hospital.KhanHub', '@hospital.Khan Hub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/hospital/dashboard',
    sessionKey: 'hospital_session',
    prefixes: ['HOS', 'HOSP', 'PAT', 'PATIENT']
  },
  sukoon: {
    id: 'sukoon',
    name: 'Sukoon',
    collection: 'sukoon_users',
    domain: '@sukoon.khanhub.com.pk',
    legacyDomains: ['@sukoon.khanhub.com', '@sukoon.KhanHub', '@sukoon.Khan Hub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/sukoon/dashboard',
    sessionKey: 'sukoon_session',
    prefixes: ['SUK', 'RES', 'RESIDENT']
  },
  welfare: {
    id: 'welfare',
    name: 'Welfare',
    collection: 'welfare_users',
    domain: '@welfare.khanhub.com.pk',
    legacyDomains: ['@welfare.khanhub.com', '@welfare.KhanHub', '@welfare.Khan Hub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/welfare/dashboard',
    sessionKey: 'welfare_session',
    prefixes: ['WEL', 'ORPH', 'CHILD']
  },
  'job-center': {
    id: 'job-center',
    name: 'Job Center',
    collection: 'jobcenter_users',
    domain: '@jobcenter.khanhub.com.pk',
    legacyDomains: ['@jobcenter.khanhub.com', '@jobcenter.KhanHub', '@jobcenter.Khan Hub', '@job-center.khanhub.com.pk', '@jobcenter.khanhub', '@job-center.khanhub', '@job-center.KhanHub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/job-center/dashboard',
    sessionKey: 'jobcenter_session',
    prefixes: ['JC', 'JOB', 'SEEK', 'SEEKER']
  },
  'social-media': {
    id: 'social-media',
    name: 'Social Media',
    collection: 'media_users',
    domain: '@media.khanhub.com.pk',
    legacyDomains: ['@media.khanhub.com', '@media.KhanHub', '@media.Khan Hub', '@media.khanhub', '@social-media.khanhub', '@social-media.KhanHub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/social-media/dashboard',
    sessionKey: 'mediacenter_session',
    prefixes: ['MED', 'SOC']
  },
  it: {
    id: 'it',
    name: 'IT',
    collection: 'it_users',
    domain: '@it.khanhub',
    legacyDomains: ['@it.khanhub.com.pk', '@it.khanhub.com', '@it.KhanHub', '@it.Khan Hub', '@khanhub.com.pk', '@khanhub'],
    dashboardPath: '/departments/it/dashboard',
    sessionKey: 'it_session',
    prefixes: ['IT', 'DEV']
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
      const cleanId = rawId.trim();
      const lowerId = cleanId.toLowerCase();
      const upperId = cleanId.toUpperCase();

      // We combine searches to identify the user record efficiently
      const checks = [
        query(collection(db, dept.collection), where('customId', '==', cleanId), limit(1)),
        query(collection(db, dept.collection), where('customId', '==', lowerId), limit(1)),
        query(collection(db, dept.collection), where('customId', '==', upperId), limit(1))
      ];

      const snapshots = await Promise.all(checks.map(q => getDocs(q)));
      const found = snapshots.find(s => !s.empty);

      if (found) {
        const doc = found.docs[0];
        return { dept, data: doc.data(), uid: doc.id };
      }
      
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
    if (discovery) {
      console.log('[UniversalAuth] Discovered Data:', {
        uid: discovery.uid,
        customId: discovery.data.customId,
        email: discovery.data.email,
        role: discovery.data.role
      });
    }
    
    let dept: DepartmentAuthInfo;
    let finalData: any;
    let uid: string;
    let cred: any;

    if (!discovery) {
      // If not found by customId, maybe it's already a full email
      if (customId.includes('@')) {
        const domain = '@' + customId.split('@')[1];
        const foundDept = Object.values(DEPARTMENTS_AUTH).find(d => 
          d.domain === domain || 
          (d.legacyDomains || []).includes(domain) || 
          domain.includes(d.id)
        );
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
      
      // Collect potential email prefixes to try
      const prefixes = Array.from(new Set([
        customId.trim().toLowerCase(),
        customId.trim(), // Try exact case
        finalData.customId?.toLowerCase(),
        finalData.customId,
        finalData.employeeId?.toLowerCase(),
        finalData.employeeId,
        finalData.patientId?.toLowerCase(),
        finalData.seekerId?.toLowerCase(),
        finalData.studentId?.toLowerCase(),
        finalData.childId?.toLowerCase()
      ].filter(Boolean) as string[]));
      
      const domains = Array.from(new Set([
        dept.domain, 
        ...(dept.legacyDomains || []),
        '@khanhub.com.pk',
        '@khanhub'
      ])).filter(Boolean) as string[];
      
      let lastError: any;
      console.log('[UniversalAuth] Attempting robust auth for discovered user');

      // Try any explicit email stored in Firestore first
      if (finalData.email && typeof finalData.email === 'string' && finalData.email.includes('@')) {
        try {
          const cleanEmail = finalData.email.replace(/\s+/g, '');
          console.log('[UniversalAuth] Trying Firestore email:', cleanEmail);
          cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (e: any) {
          lastError = e;
        }
      }

      // Then try combinations of prefixes and domains
      if (!cred) {
        for (const prefix of prefixes) {
          for (const domain of domains) {
            // We use trim() but NOT global replace of spaces, 
            // as some legacy domains like "@jobcenter.Khan Hub" literally have a space.
            const email = `${prefix.trim()}${domain.trim()}`;
            try {
              console.log('[UniversalAuth] Trying generated email:', email);
              cred = await signInWithEmailAndPassword(auth, email, password);
              if (cred) break;
            } catch (e: any) {
              lastError = e;
              // Continue if it's a credential error, otherwise throw
              const isCredError = e.code === 'auth/invalid-credential' || 
                                 e.code === 'auth/user-not-found' || 
                                 e.code === 'auth/wrong-password' ||
                                 e.code === 'auth/invalid-email';
              if (!isCredError) throw e;
            }
          }
          if (cred) break;
        }
      }

      if (!cred) {
        console.error('[UniversalAuth] All auth attempts failed. Final error:', lastError?.code);
        throw lastError;
      }
      
      console.log('[UniversalAuth] Auth successful, UID:', cred.user.uid);
    }

    // 2. Security checks
    if (finalData.isActive === false) return { success: false, error: 'Your account is currently inactive.' };

    // Block superadmin login via ID/Password — only Google (whitelist) is allowed
    if (dept.id === 'hq' && finalData.role === 'superadmin') {
      return {
        success: false,
        error: 'HQ Superadmin access requires Google Sign-in. Please use the "Continue with Google" button at khanhub.com.pk/auth/signin',
      };
    }

    // Block any non-whitelisted email from claiming superadmin role via ID/pass
    if (finalData.role === 'superadmin' && finalData.email && !isSuperadminEmail(finalData.email)) {
      return {
        success: false,
        error: 'Unauthorized superadmin access attempt.',
      };
    }

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
    
    // Normalize login time key (remove hyphens to match dashboard expectations)
    const loginTimeKey = dept.sessionKey.replace('_session', '_login_time');
    localStorage.setItem(loginTimeKey, Date.now().toString());

    // 4. Set HQ Cookie if needed
    if (dept.id === 'hq' || finalData.role === 'superadmin') {
       console.log('[UniversalAuth] Setting HQ session cookie...');
       const idToken = await cred.user.getIdToken();
       const cookieResult = await setHqSessionCookieFromIdToken(idToken);
       if (!cookieResult.success) {
         console.error('[UniversalAuth] Cookie setting failed:', cookieResult.error);
         return { success: false, error: cookieResult.error || 'Failed to set security cookie.' };
       }
    }

    // Set Custom Claims for ALL users to enable zero-cost routing (Free Firestore Reads)
    const redirectPath = getDashboardPath(dept.id, finalData.role, finalData.patientId || finalData.studentId || finalData.seekerId || finalData.childId);
    try {
      await setUserDashboardClaims(uid, redirectPath);
    } catch (err) {
      console.warn('[UniversalAuth] Failed to set custom claims:', err);
    }

    // 5. Final Redirect
    console.log('[UniversalAuth] Redirecting to:', redirectPath);
    
    if (typeof window !== 'undefined') {
      // Small delay to ensure cookies are persisted by browser
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
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
  if (normalizedRole === 'manager') return `${base}/manager`;

  // Specific portal roles with sub-paths
  if (normalizedRole === 'family' && patientId) {
    const familyPath = deptId === 'hospital' ? 'patient' : 'family';
    return `${base}/${familyPath}/${patientId}`;
  }
  if (normalizedRole === 'student' && patientId) {
    return `${base}/student/${patientId}`;
  }
  if (normalizedRole === 'seeker' && patientId) {
    return `${base}/seeker/${patientId}`;
  }
  if (normalizedRole === 'patient' && patientId) {
    return `${base}/patient/${patientId}`;
  }
  if (normalizedRole === 'resident' && patientId) {
    return `${base}/resident/${patientId}`;
  }
  if (normalizedRole === 'child' && patientId) {
    return `${base}/child/${patientId}`;
  }

  return `${base}/${normalizedRole}`;
}
