// apps/web/src/lib/upload/departmentRegistry.ts

export type CanonicalCampusId = 'vehari' | 'burewala' | 'multan';

export type CanonicalDeptId =
  | 'rehab'
  | 'hospital'
  | 'spims'
  | 'it'
  | 'job-center'
  | 'sukoon'
  | 'welfare'
  | 'social-media'
  | 'hq';

export interface DepartmentMeta {
  id: CanonicalDeptId;
  name: string;
  slug: string;
  aliases: string[];
  publicPath: string;
  badgeColor: string;
}

export const CANONICAL_DEPARTMENTS: Record<CanonicalDeptId, DepartmentMeta> = {
  rehab: {
    id: 'rehab',
    name: 'KhanHub Rehabilitation Center',
    slug: 'rehab',
    aliases: ['rehabilitation', 'rehab-center', 'rehab_center'],
    publicPath: '/departments/rehab',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  hospital: {
    id: 'hospital',
    name: 'KhanHub Hospital & Medical Center',
    slug: 'hospital',
    aliases: ['medical-center', 'medical', 'hospital_center', 'surgical', 'surgical-services'],
    publicPath: '/departments/hospital',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  spims: {
    id: 'spims',
    name: 'SPIMS College & Health Sciences',
    slug: 'spims',
    aliases: ['institute-health-sciences', 'spims-college', 'college'],
    publicPath: '/departments/spims',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  it: {
    id: 'it',
    name: 'KhanHub IT & Software Solutions',
    slug: 'it',
    aliases: ['it-department', 'tech', 'software'],
    publicPath: '/departments/it',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  'job-center': {
    id: 'job-center',
    name: 'KhanHub Job Placement Center',
    slug: 'job-center',
    aliases: ['jobcenter', 'job_center', 'job-placement', 'jobs'],
    publicPath: '/departments/job-center',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  sukoon: {
    id: 'sukoon',
    name: 'Sukoon Mental Wellness & Care',
    slug: 'sukoon',
    aliases: ['sukoon-center', 'sukoon_center', 'wellness'],
    publicPath: '/departments/sukoon',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  welfare: {
    id: 'welfare',
    name: 'KhanHub Community Welfare Org',
    slug: 'welfare',
    aliases: ['social-welfare', 'social_welfare', 'welfare-org'],
    publicPath: '/departments/welfare',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  'social-media': {
    id: 'social-media',
    name: 'KhanHub Social Media & Studio',
    slug: 'social-media',
    aliases: ['media', 'social_media', 'creative-studio'],
    publicPath: '/departments/social-media',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200'
  },
  hq: {
    id: 'hq',
    name: 'KhanHub Headquarters',
    slug: 'hq',
    aliases: ['headquarters', 'central', 'admin'],
    publicPath: '/hq',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200'
  }
};

/**
 * Resolves any department name/slug/alias to its canonical ID.
 * Returns null for unknown inputs (CORRECTION D: never defaults to 'social-media').
 */
export function resolveCanonicalDept(input?: string | null): CanonicalDeptId | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  for (const [key, meta] of Object.entries(CANONICAL_DEPARTMENTS)) {
    if (key === clean || meta.slug === clean || meta.aliases.includes(clean)) {
      return key as CanonicalDeptId;
    }
  }
  return null;
}
