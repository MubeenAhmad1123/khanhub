/**
 * Utility to resolve the correct profile path for different entities within Khan Hub
 */
export function resolveProfilePath(source: string, role: string, id: string): string {
  const s = source.toLowerCase();
  const r = role.toLowerCase();

  // Rehab Center Profiles
  if (s === 'rehab') {
    if (r === 'superadmin' || r === 'admin') {
      return `/hq/dashboard/superadmin/rehab/centers/${id}`;
    }
    return `/hq/dashboard/superadmin/rehab/centers/${id}`;
  }

  // SPIMS (Student Profiles)
  if (s === 'spims') {
    return `/hq/dashboard/superadmin/spims/students/${id}`;
  }

  // HQ Management / Staff
  if (s === 'hq' || s === 'management') {
    return `/hq/dashboard/superadmin/management/staff/${id}`;
  }

  // HR / Jobs
  if (s === 'job_center' || s === 'hr') {
    return `/hq/dashboard/superadmin/job-center/applicants/${id}`;
  }

  // Default fallback to a generic search or the dashboard
  return `/hq/dashboard/superadmin/search?q=${id}`;
}
