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
    };

    let permittedDepts = session.role === 'superadmin' 
      ? Object.keys(DEPT_COLLECTIONS) 
      : scopedDepartments;

    // Filter permitted departments by entity type if specified
    if (entityType && ENTITY_TYPE_DEPT_MAPPINGS[entityType]) {
      const allowedDepts = ENTITY_TYPE_DEPT_MAPPINGS[entityType];
      permittedDepts = permittedDepts.filter(d => allowedDepts.includes(d));
    }

    const lowercaseName = name.toLowerCase().trim();
    if (!lowercaseName) {
      return { matches: [] };
    }

    const matches: EntityMatch[] = [];

    // Query each permitted department in parallel
    await Promise.all(
      permittedDepts.map(async (dept) => {
        const config = DEPT_COLLECTIONS[dept];
        if (!config) return;

        try {
          const snapshot = await adminDb.collection(config.collection).get();
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Skip inactive documents
            if (data.isActive === false) return;

            const docName = String(data.name || data.fullName || '').toLowerCase();
            const docCourse = String(data.course || '').toLowerCase();
            const docCustomId = String(data.customId || data.rollNo || data.studentId || doc.id || '').toLowerCase();
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
              matches.push({
                id: doc.id,
                name: data.name || data.fullName || 'Unknown',
                fatherName: data.fatherName || data.guardianName || 'N/A',
                department: dept,
                collection: config.collection,
                identifierLabel: String(data.customId || data.rollNo || data.studentId || doc.id),
              });
            }
          });
        } catch (err) {
          console.error(`[resolveEntityByName] Error querying collection ${config.collection}:`, err);
        }
      })
    );

    return { matches: matches.slice(0, 10) };
  } catch (error: any) {
    console.error('[resolveEntityByName] Server action error:', error?.message);
    throw error;
  }
}
