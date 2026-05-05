// src/lib/it/publicData.ts
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { getCached, setCached } from '../queryCache';

export interface PublicITIntern {
  id: string;
  name: string;
  course: string;
  status: string;
  joiningDate: any;
  photoUrl?: string;
  skills?: string[];
}

export interface PublicITClient {
  id: string;
  companyName: string;
  industry?: string;
  logoUrl?: string;
  description?: string;
  activeProjects: number;
}

export async function fetchPublicITInterns(): Promise<PublicITIntern[]> {
  const cacheKey = 'it_public_interns';
  const cached = getCached<PublicITIntern[]>(cacheKey);
  if (cached) return cached;

  const q = query(
    collection(db, 'it_students'),
    where('status', '==', 'active'),
    limit(100)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      course: data.course || 'Technology Intern',
      status: data.status,
      joiningDate: data.joiningDate,
      photoUrl: data.photoUrl,
      skills: data.skills || []
    };
  });
  setCached(cacheKey, data, 300);
  return data;
}

export async function fetchPublicITClients(): Promise<PublicITClient[]> {
  const cacheKey = 'it_public_clients';
  const cached = getCached<PublicITClient[]>(cacheKey);
  if (cached) return cached;

  const q = query(
    collection(db, 'it_clients'),
    where('status', '==', 'active'),
    limit(100)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      companyName: data.companyName,
      industry: data.industry || 'Tech Solutions',
      logoUrl: data.logoUrl,
      description: data.description,
      activeProjects: data.activeProjects || 0
    };
  });
  setCached(cacheKey, data, 300);
  return data;
}

