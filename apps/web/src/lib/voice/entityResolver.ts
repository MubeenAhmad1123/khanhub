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

    // Determine departments we are allowed to search
    const permittedDepts = session.role === 'superadmin' 
      ? Object.keys(DEPT_COLLECTIONS) 
      : scopedDepartments;

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
            
            // Skip inactive documents if the collection contains isActive field
            if (data.isActive === false) return;

            const docName = String(data.name || data.fullName || '').toLowerCase();
            if (docName.includes(lowercaseName)) {
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

    // Limit to prevent overloading in UI (e.g. max 10 matches)
    return { matches: matches.slice(0, 10) };
  } catch (error: any) {
    console.error('[resolveEntityByName] Server action error:', error?.message);
    throw error;
  }
}
