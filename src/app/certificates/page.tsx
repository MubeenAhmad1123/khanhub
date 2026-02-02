// src/app/certificates/page.tsx

import { PageHero } from '@/components/ui';
import { generateMetadata } from '@/lib/utils';
import { SITE } from '@/data/site';
import { CertificatesContent } from './CertificatesContent';

export const metadata = generateMetadata({
  title: 'Certificates',
  description:
    'Official registration documents, NGO approvals, and legal certificates of Khan Hub.',
  slug: 'certificates',
});

export default function CertificatesPage() {
  return (
    <>
      <PageHero
        badge="Transparency"
        title="Certificates & Approvals"
        subtitle="Official registrations, licenses, and audits that show Khan Hub is a serious, compliant, and long‑term welfare organization."
      />
      <CertificatesContent siteEmail={SITE.email} />
    </>
  );
}
