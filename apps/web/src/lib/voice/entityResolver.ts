// apps/web/src/lib/voice/entityResolver.ts

import { readHqSessionCookie } from '@/app/hq/actions/auth';
import { adminDb } from '@/lib/firebaseAdmin';
import { EntityType } from './intentParser';

export interface EntityMatch {
  id: string;
  name: string;
  fatherName: string;
  department: string;
  collection: string;
  identifierLabel: string; // e.g. "REHAB-058" or roll no
  designation?: string;     // designation/role for staff
}

const DEPT_COLLECTIONS: Record<string, { collection: string; label: string }> = {
  'rehab': { collection: 'rehab_patients', label: 'Patient' },
  'spims': { collection: 'spims_students', label: 'Student' },
  'hospital': { collection: 'hospital_patients', label: 'Patient' },
  'sukoon': { collection: 'sukoon_patients', label: 'Patient' },
  'welfare': { collection: 'welfare_children', label: 'Child' },
  'job-center': { collection: 'job_center_seekers', label: 'Seeker' },
};

const STAFF_COLLECTIONS: Record<string, { collection: string; label: string }[]> = {
  'hq': [
    { collection: 'hq_users', label: 'Staff' },
    { collection: 'hq_staff', label: 'Staff' }
  ],
  'rehab': [
    { collection: 'rehab_users', label: 'Staff' },
    { collection: 'rehab_staff', label: 'Staff' }
  ],
  'spims': [
    { collection: 'spims_users', label: 'Staff' },
    { collection: 'spims_staff', label: 'Staff' }
  ],
  'hospital': [
    { collection: 'hospital_users', label: 'Staff' },
    { collection: 'hospital_staff', label: 'Staff' }
  ],
  'sukoon': [
    { collection: 'sukoon_users', label: 'Staff' },
    { collection: 'sukoon_staff', label: 'Staff' }
  ],
  'welfare': [
    { collection: 'welfare_users', label: 'Staff' },
    { collection: 'welfare_staff', label: 'Staff' }
  ],
  'job-center': [
    { collection: 'jobcenter_users', label: 'Staff' },
    { collection: 'jobcenter_staff', label: 'Staff' }
  ],
  'social-media': [
    { collection: 'media_users', label: 'Staff' }
  ],
  'it': [
    { collection: 'it_users', label: 'Staff' },
    { collection: 'it_staff', label: 'Staff' }
  ],
};

function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp.push([i]);
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function getSoundex(s: string): string {
  const a = s.toLowerCase().replace(/[^a-z]/g, '');
  if (!a) return '';
  const first = a[0].toUpperCase();
  const mapping: Record<string, string> = {
    b: '1', f: '1', p: '1', v: '1',
    c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
    d: '3', t: '3',
    l: '4',
    m: '5', n: '5',
    r: '6'
  };
  let code = first;
  let prevCode = mapping[a[0]] || '';
  for (let i = 1; i < a.length; i++) {
    const char = a[i];
    if ('aeiouyhw'.includes(char)) {
      prevCode = ''; // vowel separators
      continue;
    }
    const currentCode = mapping[char];
    if (currentCode && currentCode !== prevCode) {
      code += currentCode;
      prevCode = currentCode;
    }
  }
  return (code + '0000').substring(0, 4);
}

function fuzzyMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (!n1 || !n2) return false;

  // Exact substring match
  if (n1.includes(n2) || n2.includes(n1)) return true;

  const words1 = n1.split(/\s+/).filter(w => w.length > 1);
  const words2 = n2.split(/\s+/).filter(w => w.length > 1);

  for (const w1 of words1) {
    const s1 = getSoundex(w1);
    for (const w2 of words2) {
      if (w1.includes(w2) || w2.includes(w1)) return true;
      
      const s2 = getSoundex(w2);
      if (s1 === s2 && s1 !== '') return true;

      // Edit distance check on words
      const dist = getLevenshteinDistance(w1, w2);
      const maxLen = Math.max(w1.length, w2.length);
      if (dist / maxLen <= 0.35) return true; // max 35% edit distance difference
    }
  }
  return false;
}

export async function resolveEntityByName(
  name: string | null,
  entityId: string | null,
  entityType: EntityType,
  scopedDepartments: string[]
): Promise<{ matches: EntityMatch[] }> {
  try {
    const session = await readHqSessionCookie();
    if (!session) {
      throw new Error('Unauthorized');
    }

    if (!['superadmin', 'manager', 'cashier'].includes(session.role)) {
      throw new Error('Unauthorized: insufficient role permissions');
    }

    let permittedDepts = session.role === 'superadmin' 
      ? Object.keys(DEPT_COLLECTIONS) 
      : scopedDepartments;

    let permittedStaffDepts = (session.role === 'superadmin' || session.role === 'manager')
      ? ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it']
      : scopedDepartments;

    // Filter by entityType:
    // - entityType === 'staff'   → search ONLY hq_staff collection (and dept staff collections)
    // - entityType === 'patient' → search ONLY rehab_patients, hospital_patients, sukoon_patients
    // - entityType === 'student' → search ONLY spims_students
    // - entityType === 'child'   → search ONLY welfare_children
    // - entityType === 'seeker'  → search ONLY jobcenter_seekers
    // - entityType === null      → search all collections (current behavior, keep as fallback)
    const searchPatients = entityType === null || 
                           entityType === 'patient' || 
                           entityType === 'student' || 
                           entityType === 'child' || 
                           entityType === 'seeker';

    const searchStaff = entityType === null || entityType === 'staff';

    const lowercaseName = name ? name.toLowerCase().trim() : '';
    let searchId = entityId ? entityId.toLowerCase().trim() : '';

    // If searchId is empty but name is a number, treat it as the searchId
    if (!searchId && /^\d+$/.test(lowercaseName)) {
      searchId = lowercaseName;
    }

    if (!lowercaseName && !searchId) {
      return { matches: [] };
    }

    // Build the list of target collections to query
    const targets: { dept: string; collection: string; label: string; isStaff: boolean }[] = [];

    // Add patient/student targets
    if (searchPatients) {
      for (const dept of permittedDepts) {
        if (entityType === 'patient' && !['rehab', 'hospital', 'sukoon'].includes(dept)) continue;
        if (entityType === 'student' && dept !== 'spims') continue;
        if (entityType === 'child' && dept !== 'welfare') continue;
        if (entityType === 'seeker' && dept !== 'job-center') continue;

        const config = DEPT_COLLECTIONS[dept];
        if (config) {
          targets.push({
            dept,
            collection: config.collection,
            label: config.label,
            isStaff: false
          });
        }
      }
    }

    // Add staff targets
    if (searchStaff) {
      for (const dept of permittedStaffDepts) {
        const configs = STAFF_COLLECTIONS[dept];
        if (configs) {
          for (const config of configs) {
            targets.push({
              dept,
              collection: config.collection,
              label: config.label,
              isStaff: true
            });
          }
        }
      }
    }

    const matches: EntityMatch[] = [];
    const seenMatches = new Set<string>();

    // Query each target collection in parallel
    await Promise.all(
      targets.map(async (target) => {
        try {
          const snapshot = await adminDb.collection(target.collection).get();
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            const docName = String(data.name || data.displayName || data.fullName || '').toLowerCase();
            const docCourse = String(data.course || '').toLowerCase();
            const docCustomId = String(
              data.customId ||
              data.serialNumber ||
              data.inpatientNumber ||
              data.patientId ||
              data.rollNo ||
              data.rollNumber ||
              data.studentId ||
              data.employeeId ||
              data.childId ||
              data.seekerId ||
              data.seekerNo ||
              doc.id ||
              ''
            ).toLowerCase();
            const docDiagnosis = String(data.diagnosis || data.disease || data.diseaseName || '').toLowerCase();
            const docDesignation = String(data.designation || data.role || '').toLowerCase();
            
            let isMatch = false;

            // 1. If we have an entityId, perform ID matching
            if (searchId) {
              const isNumericQuery = /^\d+$/.test(searchId);
              if (isNumericQuery) {
                const docDigitsMatch = docCustomId.match(/\d+/g);
                if (docDigitsMatch) {
                  const lastDigits = docDigitsMatch[docDigitsMatch.length - 1];
                  const searchVal = parseInt(searchId, 10);
                  const lastVal = parseInt(lastDigits, 10);
                  isMatch = !isNaN(searchVal) && !isNaN(lastVal) && searchVal === lastVal;
                }
              } else {
                const docDigits = docCustomId.replace(/[^0-9]/g, '');
                const searchDigits = searchId.replace(/[^0-9]/g, '');
                isMatch = searchDigits.length > 0 && docDigits.endsWith(searchDigits);
              }
            }

            // 2. If we didn't match by ID and have a name, perform name/text matching
            if (!isMatch && lowercaseName) {
              const nameMatch = docName.includes(lowercaseName) || fuzzyMatch(docName, lowercaseName);
              const courseMatch = docCourse.includes(lowercaseName) || fuzzyMatch(docCourse, lowercaseName);
              const diagnosisMatch = docDiagnosis.includes(lowercaseName) || fuzzyMatch(docDiagnosis, lowercaseName);
              const customIdSubstringMatch = docCustomId.includes(lowercaseName);
              const designationMatch = docDesignation.includes(lowercaseName) || fuzzyMatch(docDesignation, lowercaseName);
              
              isMatch = nameMatch || courseMatch || diagnosisMatch || customIdSubstringMatch || designationMatch;
            }

            if (isMatch) {
              const matchKey = `${target.isStaff ? 'staff' : 'patient'}_${target.dept}_${doc.id}`;
              if (seenMatches.has(matchKey)) return;
              seenMatches.add(matchKey);

              matches.push({
                id: doc.id,
                name: data.name || data.displayName || data.fullName || 'Unknown',
                fatherName: data.fatherName || data.guardianName || 'N/A',
                department: target.dept,
                collection: target.collection,
                identifierLabel: String(data.employeeId || data.customId || data.rollNo || data.studentId || doc.id),
                designation: data.designation || data.role || undefined,
              });
            }
          });
        } catch (err) {
          console.error(`[resolveEntityByName] Error querying collection ${target.collection}:`, err);
        }
      })
    );

    return { matches: matches.slice(0, 10) };
  } catch (error: any) {
    console.error('[resolveEntityByName] Server action error:', error?.message);
    throw error;
  }
}
