import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export function resolveCollectionName(department: string, collectionInput: string): string {
  const dept = department.toLowerCase();
  const input = collectionInput.toLowerCase();
  
  // If it's already a full collection name like rehab_patients, return it
  if (input.includes('_')) {
    return input;
  }
  
  if (input === 'staff') {
    if (dept === 'hq') return 'hq_users';
    if (dept === 'job-center') return 'jobcenter_users';
    if (dept === 'social-media') return 'media_users';
    const slug = dept.replace('-', '_');
    return `${slug}_users`;
  }
  
  if (input === 'patients' || input === 'patient') {
    if (dept === 'rehab') return 'rehab_patients';
    if (dept === 'hospital') return 'hospital_patients';
    if (dept === 'sukoon') return 'sukoon_guests';
    return `${dept}_patients`;
  }
  
  if (input === 'students' || input === 'student') {
    return 'spims_students';
  }
  
  return input;
}

export function getEntityTypeFromCollection(collectionInput: string): 'staff' | 'patient' | 'student' {
  const input = collectionInput.toLowerCase();
  if (input === 'staff' || input.includes('users') || input.includes('staff')) {
    return 'staff';
  }
  if (input === 'patients' || input === 'patient' || input.includes('patients') || input.includes('guests') || input.includes('children')) {
    return 'patient';
  }
  if (input === 'students' || input === 'student' || input.includes('students')) {
    return 'student';
  }
  return 'staff'; // fallback
}

export function getDefaultSections(
  entityType: 'staff' | 'patient' | 'student'
): Record<string, boolean> {
  if (entityType === 'staff') {
    return {
      salary: true,
      designation: true,
      attendance: true,
      duties: true,
      uniform: true,
      growthPoints: true,
      reports: true,
      canteenWallet: true,
    };
  }
  if (entityType === 'patient') {
    return {
      admissionDetails: true,
      dailySheet: true,
      medication: true,
      therapy: true,
      progressNotes: true,
      financialStatement: true,
      familyContact: true,
      visits: true,
      canteen: true,
      files: true,
    };
  }
  if (entityType === 'student') {
    return {
      admissionDetails: true,
      attendance: true,
      examRecords: true,
      feeRecord: true,
      documents: true,
      progressNotes: true,
    };
  }
  return {};
}

// Get the current visibleSections for an entity
function getSimpleId(id: string): string {
  if (!id) return '';
  const prefixes = ['hq_', 'rehab_', 'spims_', 'hospital_', 'sukoon_', 'welfare_', 'jobcenter_', 'media_', 'it_', 'job-center_', 'social-media_'];
  for (const pref of prefixes) {
    if (id.startsWith(pref)) {
      return id.substring(pref.length);
    }
  }
  return id;
}

export async function getVisibleSections(
  department: string,
  collectionInput: string,
  entityId: string
): Promise<Record<string, boolean>> {
  if (!department || !collectionInput || !entityId) {
    return {};
  }
  try {
    const resolvedCol = resolveCollectionName(department, collectionInput);
    const cleanId = getSimpleId(entityId);
    const docRef = doc(db, resolvedCol, cleanId);
    const snap = await getDoc(docRef);
    
    const entityType = getEntityTypeFromCollection(resolvedCol);
    const defaults = getDefaultSections(entityType);
    
    if (snap.exists()) {
      const data = snap.data();
      if (data?.visibleSections) {
        // Merge defaults in case some keys are missing
        return { ...defaults, ...data.visibleSections };
      }
    }
    return defaults;
  } catch (err) {
    console.error('Error in getVisibleSections:', err);
    // Fallback to all true on any error to avoid breaking profile access
    const entityType = getEntityTypeFromCollection(collectionInput);
    return getDefaultSections(entityType);
  }
}

// Save updated visibleSections to Firestore
export async function saveVisibleSections(
  department: string,
  collectionInput: string,
  entityId: string,
  sections: Record<string, boolean>
): Promise<void> {
  const resolvedCol = resolveCollectionName(department, collectionInput);
  const cleanId = getSimpleId(entityId);
  const docRef = doc(db, resolvedCol, cleanId);
  await updateDoc(docRef, {
    visibleSections: sections
  });
}
