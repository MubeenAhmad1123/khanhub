const RAW_ALLOWED_EMAILS = process.env.NEXT_PUBLIC_HQ_PORTAL_ALLOWED_EMAILS || '';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getAllowedHqPortalEmails() {
  return RAW_ALLOWED_EMAILS
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

export function canAccessHqPortal(email?: string | null) {
  if (!email) return false;
  const allowed = getAllowedHqPortalEmails();
  return allowed.includes(normalizeEmail(email));
}
