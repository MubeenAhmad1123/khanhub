// src/lib/job-center/publicData.ts

import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import type { JobSeeker, Employer } from '@/types/job-center';

export interface PublicJobSeeker {
  id: string;
  seekerNumber: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  photoUrl?: string | null;
  education: string;
  skills: string[];
  experience?: string | null;
  jobInterests: string[];
  availability: string;
  isActive: boolean;
  isEmployed: boolean;
}

export interface PublicEmployer {
  id: string;
  companyName: string;
  industry: string;
  website?: string | null;
  logoUrl?: string | null;
  companySize?: string | null;
  description?: string | null;
  contactPerson: {
    name: string;
    position?: string | null;
  };
  isActive: boolean;
}

export async function fetchPublicSeekers(): Promise<PublicJobSeeker[]> {
  const q = query(
    collection(db, 'jobcenter_seekers'), 
    where('isActive', '==', true)
  );
  
  const snap = await getDocs(q);
  // Rule 50: Sort client-side to avoid composite indexes
  const sortedDocs = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as JobSeeker & { id: string }))
    .sort((a, b) => (b.serialNumber || 0) - (a.serialNumber || 0));

  return sortedDocs.map(data => {
    return {
      id: data.id,
      seekerNumber: data.seekerNumber,
      name: data.name,
      gender: data.gender,
      photoUrl: data.photoUrl,
      education: data.education,
      skills: data.skills || [],
      experience: data.experience,
      jobInterests: data.jobInterests || [],
      availability: data.availability,
      isActive: data.isActive,
      isEmployed: data.isEmployed
    };
  });
}

export async function fetchPublicEmployers(): Promise<PublicEmployer[]> {
  const q = query(
    collection(db, 'jobcenter_employers'), 
    where('isActive', '==', true)
  );
  
  const snap = await getDocs(q);
  // Rule 50: Sort client-side to avoid composite indexes
  const sortedDocs = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Employer & { id: string }))
    .sort((a, b) => {
      const getMillis = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val instanceof Date) return val.getTime();
        if (val.seconds) return val.seconds * 1000;
        return 0;
      };
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });

  return sortedDocs.map(data => {
    return {
      id: data.id,
      companyName: data.companyName,
      industry: data.industry,
      website: data.website,
      logoUrl: data.logoUrl,
      companySize: data.companySize,
      description: data.description,
      contactPerson: {
        name: data.contactPerson.name,
        position: data.contactPerson.position
      },
      isActive: data.isActive
    };
  });
}
