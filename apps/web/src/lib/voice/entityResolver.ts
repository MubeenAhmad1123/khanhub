// apps/web/src/lib/voice/entityResolver.ts
'use server';

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

export async function resolveEntityByName(
  name: string | null,
  entityId: string | null,
  entityType: EntityType,           // NEW parameter
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
    const searchId = entityId ? entityId.toLowerCase().trim() : '';
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
            const docCustomId = String(data.customId || data.rollNo || data.studentId || data.employeeId || doc.id || '').toLowerCase();
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
              const nameMatch = docName.includes(lowercaseName);
              const courseMatch = docCourse.includes(lowercaseName);
              const diagnosisMatch = docDiagnosis.includes(lowercaseName);
              const customIdSubstringMatch = docCustomId.includes(lowercaseName);
              const designationMatch = docDesignation.includes(lowercaseName);
              
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
