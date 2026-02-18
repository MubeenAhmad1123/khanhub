// src/app/certificates/page.tsx
// ============================================================================
// CERTIFICATES PAGE - Official registrations and legal documentation
// Route file with SEO metadata and page structure
// ============================================================================

import type { Metadata } from 'next';
import { PageHero } from '@/components/ui';
import { SITE } from '@/data/site';
import { CertificatesContent } from './CertificatesContent';

// ============================================================================
// SEO METADATA - Optimized for search engines and social sharing
// ============================================================================
export const metadata: Metadata = {
  title: 'Official Certificates & Legal Registration | Khan Hub Pakistan',
  description:
    'View Khan Hub\'s official registration certificates, NGO approvals, healthcare accreditations, and legal compliance documents. Verified welfare organization registered with SECP, FBR, and Punjab Health Department since 2015.',

  keywords: [
    'Khan Hub certificates',
    'NGO registration Pakistan',
    'SECP registration certificate',
    'healthcare accreditation Pakistan',
    'welfare organization licenses',
    'FBR tax exemption certificate',
    'medical facility license Pakistan',
    'charity registration Punjab',
    'verified NGO Pakistan',
    'legal compliance certificates',
    'DRAP medical license',
    'social welfare registration',
    'nonprofit documentation Pakistan',
    'charity transparency Pakistan'
  ],

  openGraph: {
    title: 'Official Certificates & Legal Registrations - Khan Hub',
    description:
      'Official registration documents, NGO approvals, healthcare accreditations, and legal certificates of Khan Hub - Pakistan\'s trusted welfare organization since 2015.',
    url: `${SITE.url || 'https://khanhub.com.pk'}/certificates`,
    type: 'website',
    images: [
      {
        url: '/og-certificates.jpg',
        width: 1200,
        height: 630,
        alt: 'Khan Hub Official Certificates and Legal Registrations',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Official Certificates & Registrations - Khan Hub',
    description:
      'View our official registration documents, NGO approvals, and healthcare accreditations.',
    images: ['/twitter-certificates.jpg'],
  },

  alternates: {
    canonical: `${SITE.url || 'https://khanhub.com.pk'}/certificates`,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================
export default function CertificatesPage() {
  return (
    <>
      {/* Semantic HTML: article element for main content */}
      <article itemScope itemType="https://schema.org/AboutPage">
        {/* Hero Section - SEO optimized with clear messaging */}
        <PageHero
          backgroundImage="/certificate.webp"
          badge="Transparency & Trust"
          title="Certificates & Legal Approvals"
          subtitle="Official registrations, licenses, and compliance certificates demonstrating Khan Hub's legitimacy as a verified welfare and healthcare organization in Pakistan since 2015."
        />

        {/* Main Content Component */}
        <CertificatesContent siteEmail={SITE.email} />

        {/* Schema.org structured data for NGO certification */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'NGO',
              name: 'Khan Hub',
              url: SITE.url || 'https://khanhub.com.pk',
              description:
                'Verified welfare and healthcare organization in Pakistan with official registrations from SECP, FBR, and Punjab Health Department',
              foundingDate: '2015',
              certifications: [
                {
                  '@type': 'Certification',
                  name: 'SECP Company Registration',
                  issuedBy: {
                    '@type': 'Organization',
                    name: 'Securities & Exchange Commission of Pakistan',
                  },
                  dateIssued: '2015',
                },
                {
                  '@type': 'Certification',
                  name: 'NGO Registration',
                  issuedBy: {
                    '@type': 'Organization',
                    name: 'Social Welfare Department, Punjab',
                  },
                  dateIssued: '2015',
                },
                {
                  '@type': 'Certification',
                  name: 'FBR Tax Exemption Certificate',
                  issuedBy: {
                    '@type': 'Organization',
                    name: 'Federal Board of Revenue',
                  },
                  dateIssued: '2016',
                },
                {
                  '@type': 'Certification',
                  name: 'Medical Facility License',
                  issuedBy: {
                    '@type': 'Organization',
                    name: 'Drug Regulatory Authority of Pakistan',
                  },
                  dateIssued: '2018',
                },
                {
                  '@type': 'Certification',
                  name: 'Health Department Approval',
                  issuedBy: {
                    '@type': 'Organization',
                    name: 'Punjab Health Department',
                  },
                  dateIssued: '2018',
                },
              ],
              address: {
                '@type': 'PostalAddress',
                streetAddress: SITE.address,
                addressCountry: 'PK',
                addressRegion: 'Punjab',
              },
              telephone: SITE.phone,
              email: SITE.email,
            }),
          }}
        />
      </article>
    </>
  );
}