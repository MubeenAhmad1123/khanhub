'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getDeptCollection, type StaffDept } from '@/lib/hq/superadmin/staff';

export interface VacateStaffPayload {
  compositeId: string;
  dept: StaffDept;
  vacateReason: 'resigned' | 'terminated';
  departingStaffData?: {
    role?: string;
    designation?: string;
    dutyConfig?: any[];
    dressCodeConfig?: any[];
    monthlySalary?: number;
    dutyStartTime?: string;
    dutyEndTime?: string;
    visibleSections?: Record<string, any>;
    secondaryDepts?: StaffDept[];
    basicInfoExtras?: Record<string, string>;
  };
}

export interface VacateStaffResult {
  success: boolean;
  newCompositeId?: string;
  error?: string;
}

export async function vacateStaffAction(payload: VacateStaffPayload): Promise<VacateStaffResult> {
  try {
    const adminDb = getAdminDb();
    const { compositeId, dept, vacateReason, departingStaffData } = payload;

    const idx = compositeId.indexOf('_');
    const rawUid = idx > 0 ? compositeId.slice(idx + 1) : compositeId;
    const cleanStaffId = rawUid.replace(/^(hq|rehab|spims|hospital|sukoon|welfare|jobcenter|media|it)_/, '');

    const colName = getDeptCollection(dept);
    const candidateIds = Array.from(new Set([rawUid, cleanStaffId, compositeId])).filter(Boolean);

    // 1. Update the departing staff member's record in Firestore
    let sourceData: Record<string, any> = {};

    for (const sId of candidateIds) {
      try {
        const docRef = adminDb.collection(colName).doc(sId);
        const snap = await docRef.get();
        if (snap.exists) {
          sourceData = snap.data() || {};
          await docRef.update({
            isActive: false,
            status: vacateReason,
            updatedAt: FieldValue.serverTimestamp(),
          });
          break;
        }
      } catch (e) {
        console.warn(`[vacateStaffAction] Error checking ${colName}/${sId}:`, e);
      }
    }

    // Also update in secondary staff collections if present
    const secondaryCols = ['hq_staff', 'rehab_staff'].filter(c => c !== colName);
    for (const secCol of secondaryCols) {
      for (const sId of candidateIds) {
        try {
          const secRef = adminDb.collection(secCol).doc(sId);
          const snap = await secRef.get();
          if (snap.exists) {
            await secRef.update({
              isActive: false,
              status: vacateReason,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        } catch {}
      }
    }

    // 2. Create the replacement vacant profile document
    // Retains role, designation, monthlySalary, dutyStartTime, dutyEndTime, dutyConfig, dressCodeConfig, visibleSections, etc.
    const newStaffData: Record<string, any> = {
      name: "Vacant",
      displayName: "Vacant",
      email: "",
      phone: "",
      phoneNumber: "",
      cnic: "",
      address: "",
      photoUrl: "",
      photoURL: "",
      fatherName: "",
      joiningDate: "",
      isActive: false,
      status: "active_vacancy",
      dept: dept,
      department: dept,
      role: departingStaffData?.role || sourceData?.role || "staff",
      designation: departingStaffData?.designation || sourceData?.designation || "",
      dutyConfig: departingStaffData?.dutyConfig || sourceData?.dutyConfig || [],
      dressCodeConfig: departingStaffData?.dressCodeConfig || sourceData?.dressCodeConfig || [],
      monthlySalary: departingStaffData?.monthlySalary ?? sourceData?.monthlySalary ?? 0,
      dutyStartTime: departingStaffData?.dutyStartTime || sourceData?.dutyStartTime || "09:00",
      dutyEndTime: departingStaffData?.dutyEndTime || sourceData?.dutyEndTime || "17:00",
      visibleSections: departingStaffData?.visibleSections || sourceData?.visibleSections || {},
      secondaryDepts: departingStaffData?.secondaryDepts || sourceData?.secondaryDepts || [],
      basicInfoExtras: departingStaffData?.basicInfoExtras || sourceData?.basicInfoExtras || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const newDocRef = await adminDb.collection(colName).add(newStaffData);
    const newCompositeId = `${dept}_${newDocRef.id}`;

    // 3. Fire-and-forget audit log
    try {
      await adminDb.collection('hq_audit').add({
        action: 'staff_vacated',
        dept,
        previousStaffId: compositeId,
        previousStaffName: sourceData?.name || '',
        vacateReason,
        newCompositeId,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch {}

    return {
      success: true,
      newCompositeId,
    };
  } catch (err: any) {
    console.error('[vacateStaffAction] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to vacate staff profile slot',
    };
  }
}
