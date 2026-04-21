/**
 * HQ Superadmin Whitelist
 * 
 * Only these Google accounts can access the HQ Superadmin portal.
 * Add/remove emails here — this is the ONLY place to manage superadmin access.
 * 
 * IMPORTANT: All emails must be lowercase.
 */
export const SUPERADMIN_WHITELIST: string[] = [
  'mk.rana.0301@gmail.com',
  'mubeenahma1123@gmail.com',
  'Khan Hubnetwork@gmail.com',
  'dilshad4408@gmail.com',
  // Add more emails here when needed
];

/**
 * Returns true if the given email is a whitelisted superadmin.
 */
export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_WHITELIST.includes(email.toLowerCase().trim());
}
