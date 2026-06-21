// apps/web/src/lib/voice/entityResolver.ts
'use server';

import { readHqSessionCookie } from '@/app/hq/actions/auth';
import { adminDb } from '@/lib/firebaseAdmin';

export interface EntityMatch {
  id: string;
  name: string;
  fatherName: string;
  department: string;
  collection: string;
  identifierLabel: string; // e.g. "REHAB-058" or roll no
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
  name: string,
  scopedDepartments: string[],
  entityType?: string
): Promise<{ matches: EntityMatch[] }> {
  try {
    const session = await readHqSessionCookie();
    if (!session) {
      throw new Error('Unauthorized');
    }

    if (!['superadmin', 'manager', 'cashier'].includes(session.role)) {
      throw new Error('Unauthorized: insufficient role permissions');
    }

    const ENTITY_TYPE_DEPT_MAPPINGS: Record<string, string[]> = {
      'patient': ['rehab', 'hospital', 'sukoon'],
      'student': ['spims'],
      'child': ['welfare'],
      'seeker': ['job-center'],
      'client': ['sukoon'],
      'staff': ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it'],
    };

    let permittedDepts = session.role === 'superadmin' 
      ? Object.keys(DEPT_COLLECTIONS) 
      : scopedDepartments;

    let permittedStaffDepts = (session.role === 'superadmin' || session.role === 'manager')
      ? ['hq', 'rehab', 'spims', 'hospital', 'sukoon', 'welfare', 'job-center', 'social-media', 'it']
      : scopedDepartments;

    // Filter permitted departments by entity type if specified
    if (entityType && ENTITY_TYPE_DEPT_MAPPINGS[entityType]) {
      const allowedDepts = ENTITY_TYPE_DEPT_MAPPINGS[entityType];
      permittedDepts = permittedDepts.filter(d => allowedDepts.includes(d));
      permittedStaffDepts = permittedStaffDepts.filter(d => allowedDepts.includes(d));
    }

    const lowercaseName = name.toLowerCase().trim();
    if (!lowercaseName) {
      return { matches: [] };
    }

    // Build the list of target collections to query
    const targets: { dept: string; collection: string; label: string; isStaff: boolean }[] = [];

    // Add patient/student targets
    if (!entityType || entityType !== 'staff') {
      for (const dept of permittedDepts) {
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
    if (!entityType || entityType === 'staff') {
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
            
            // Skip inactive documents
            if (data.isActive === false) return;

            const docName = String(data.name || data.fullName || data.displayName || '').toLowerCase();
            const docCourse = String(data.course || '').toLowerCase();
            const docCustomId = String(data.customId || data.rollNo || data.studentId || data.employeeId || doc.id || '').toLowerCase();
            const docDiagnosis = String(data.diagnosis || data.disease || data.diseaseName || '').toLowerCase();
            
            // Smarter ID Matching:
            // Check if the query is a pure number.
            const isNumericQuery = /^\d+$/.test(lowercaseName);
            let isIdMatch = false;

            if (isNumericQuery) {
              // Extract all digit groups from the ID
              const docDigitsMatch = docCustomId.match(/\d+/g);
              if (docDigitsMatch) {
                // Check if the last digit group parses to the exact searched integer
                const lastDigits = docDigitsMatch[docDigitsMatch.length - 1];
                const searchVal = parseInt(lowercaseName, 10);
                const lastVal = parseInt(lastDigits, 10);
                isIdMatch = !isNaN(searchVal) && !isNaN(lastVal) && searchVal === lastVal;
              }
            } else {
              const docDigits = docCustomId.replace(/[^0-9]/g, '');
              const searchDigits = lowercaseName.replace(/[^0-9]/g, '');
              isIdMatch = searchDigits.length > 0 && docDigits.endsWith(searchDigits);
            }
            
            const nameMatch = !isNumericQuery && docName.includes(lowercaseName);
            const courseMatch = !isNumericQuery && docCourse.includes(lowercaseName);
            const diagnosisMatch = !isNumericQuery && docDiagnosis.includes(lowercaseName);
            const customIdSubstringMatch = !isNumericQuery && docCustomId.includes(lowercaseName);

            if (nameMatch || 
                courseMatch || 
                diagnosisMatch ||
                customIdSubstringMatch ||
                isIdMatch) {
              
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
