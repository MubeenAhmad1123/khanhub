// apps/web/src/lib/hq/superadmin/users.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type Portal = 'hq' | 'rehab' | 'spims';

export type PortalUserRow = {
  id: string;
  portal: Portal;
  uid: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  customId?: string;
  isActive: boolean;
  lastLoginAt?: unknown;
  createdAt?: unknown;
};

function normalizeUser(portal: Portal, uid: string, data: any): PortalUserRow {
  return {
    id: `${portal}_${uid}`,
    portal,
    uid,
    name: String(data.name || data.displayName || '—'),
    role: String(data.role || '—'),
    email: data.email,
    phone: data.phone,
    customId: data.customId,
    isActive: data.isActive !== false,
    lastLoginAt: data.lastLoginAt,
    createdAt: data.createdAt,
  };
}

export function subscribePortalUsers(
  portal: Portal,
  onData: (rows: PortalUserRow[]) => void,
  onError?: (err: unknown) => void
) {
  const col = portal === 'hq' ? 'hq_users' : portal === 'rehab' ? 'rehab_users' : 'spims_users';
  const q = query(collection(db, col), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => normalizeUser(portal, d.id, d.data()))),
    (err) => onError?.(err)
  );
}

export async function toggleUserActive(portal: Portal, uid: string, isActive: boolean) {
  const col = portal === 'hq' ? 'hq_users' : portal === 'rehab' ? 'rehab_users' : 'spims_users';
  await updateDoc(doc(db, col, uid), { isActive });
}

export async function fetchUserProfile(portal: Portal, uid: string): Promise<PortalUserRow | null> {
  const col = portal === 'hq' ? 'hq_users' : portal === 'rehab' ? 'rehab_users' : 'spims_users';
  const snap = await getDoc(doc(db, col, uid));
  if (!snap.exists()) return null;
  return normalizeUser(portal, uid, snap.data());
}

export async function listCashiersForFeeRequests(): Promise<Array<{ uid: string; name: string; customId?: string }>> {
  const snap = await getDocs(query(collection(db, 'hq_users'), orderBy('createdAt', 'desc')));
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as any))
    .filter((u) => String(u.role || '').toLowerCase() === 'cashier' && u.isActive !== false)
    .map((u) => ({ uid: u.uid, name: String(u.name || 'Cashier'), customId: u.customId }));
}

