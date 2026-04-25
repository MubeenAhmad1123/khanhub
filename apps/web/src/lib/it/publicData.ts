// src/lib/it/publicData.ts
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

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
  const q = query(
    collection(db, 'it_students'),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
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
}

export async function fetchPublicITClients(): Promise<PublicITClient[]> {
  const q = query(
    collection(db, 'it_clients'),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
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
}
