// src/data/site.ts
// ─────────────────────────────────────────────
// Global site settings, navigation links, and metadata.
// Change anything here and it updates everywhere.
// ─────────────────────────────────────────────

export const SITE = {
  name: 'Khan Hub',
  fullName: 'Khan Hub (Pvt.) Ltd.',
  tagline: 'Healthcare • Education • Hope',
  description: 'Khan Hub is a multi-department welfare organization dedicated to providing healthcare, education, employment, and social services to underprivileged communities across Pakistan.',
  url: 'https://khanhub.com.pk',
  phone: '03006395220',
  emergency: '03006395220',
  whatsapp: '03006395220',
  email: 'khanhubnetwork@gmail.com',
  address: 'KHAN HUB (PVT.) LTD. Multan road Pir Murad, Vehari',
  googleMaps: 'https://maps.app.goo.gl/WMHn4MpwPqEDmVkHA',
  founded: 2015,
  social: {
    whatsapp: 'https://wa.me/923006395220',
    facebook: 'https://facebook.com/khanhub.com.pk/',
    instagram: 'https://instagram.com/khanhub.com.pk/',
    youtube: 'https://youtube.com/channel/UC43UJw8xOdkp9y_iJIznINg',
    tiktok: 'https://www.tiktok.com/@khanhub.com.pk',
    linkedin: '', // Icon added below, link left empty as requested
  },
  stats: [
    { label: 'Lives Impacted', value: '50,000+', icon: '❤️' },
    { label: 'Patients Treated', value: '12,000+', icon: '🏥' },
    { label: 'Students Educated', value: '8,500+', icon: '📚' },
    { label: 'Jobs Created', value: '3,200+', icon: '💼' },
  ],
};

// ─── Navigation ─────────────────────────────────
export interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'About Us', href: '/about', icon: '🏛️' },
  { label: 'Departments', href: '/departments', icon: '📂' },
  { label: 'Media', href: '/media', icon: '🎬' },
  { label: 'Certificates', href: '/certificates', icon: '📜' },
  { label: 'Contact', href: '/contact', icon: '📍' },
];

export const NAV_CTA: NavLink[] = [
  { label: 'Emergency', href: '/emergency', icon: '🚨' },
  { label: 'Donate', href: '/donate', icon: '💝' },
];

// ─── Footer Links ───────────────────────────────
export const FOOTER_LINKS = {
  organization: [
    { label: 'About Us', href: '/about' },
    { label: 'Departments', href: '/departments' },
    { label: 'Certificates', href: '/certificates' },
    { label: 'Media', href: '/media' },
  ],
  services: [
    { label: 'Donate', href: '/donate' },
    { label: 'Emergency', href: '/emergency' },
    { label: 'Download App', href: '/app-download' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms & Conditions', href: '/terms' },
  ],
};
