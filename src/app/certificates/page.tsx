// src/app/certificates/page.tsx

import { PageHero } from '@/components/ui';
import { generateMetadata } from '@/lib/utils';

export const metadata = generateMetadata({
  title:       'Certificates',
  description: 'Official registration documents, NGO approvals, and legal certificates of Khan Hub.',
  slug:        'certificates',
});

const CERTIFICATES = [
  {
    category: 'Registration',
    items: [
      { title: 'Company Registration Certificate',    issuer: 'Securities & Exchange Commission of Pakistan (SECP)', year: 2015, icon: '📄' },
      { title: 'NGO Registration Certificate',         issuer: 'Social Welfare Department, Punjab',                  year: 2015, icon: '📄' },
      { title: 'Tax Exemption Certificate',            issuer: 'Federal Board of Revenue (FBR)',                     year: 2016, icon: '📄' },
    ],
  },
  {
    category: 'Approvals & Compliance',
    items: [
      { title: 'Annual Audit Report',                  issuer: 'Certified Public Accountants',                      year: 2024, icon: '✅' },
      { title: 'SECP Annual Compliance Certificate',   issuer: 'Securities & Exchange Commission',                  year: 2024, icon: '✅' },
      { title: 'Charity Commission Approval',          issuer: 'Attorney General Office, Punjab',                   year: 2017, icon: '✅' },
    ],
  },
  {
    category: 'Healthcare Accreditation',
    items: [
      { title: 'Medical Facility License',             issuer: 'Drug Regulatory Authority of Pakistan (DRAP)',      year: 2018, icon: '🏥' },
      { title: 'Health Department Approval',           issuer: 'Punjab Health Department',                          year: 2018, icon: '🏥' },
    ],
  },
];

export default function CertificatesPage() {
  return (
    <>
      <PageHero
        badge="Transparency"
        title="Certificates & Approvals"
        subtitle="Full documentation of our legal standing, registrations, and compliance — because trust is earned."
      />

      <section className="section">
        <div className="section-inner max-w-4xl mx-auto space-y-10">
          {CERTIFICATES.map((group) => (
            <div key={group.category}>
              <h3 className="font-display font-semibold text-white text-lg mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary-500" />
                {group.category}
              </h3>
              <div className="space-y-3">
                {group.items.map((cert) => (
                  <div key={cert.title} className="card flex items-start gap-4 p-5">
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-xl flex-shrink-0">
                      {cert.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-semibold text-white text-sm">{cert.title}</h4>
                      <p className="text-neutral-500 text-xs mt-0.5">{cert.issuer}</p>
                    </div>
                    <span className="text-neutral-600 text-xs font-semibold bg-neutral-800 px-2.5 py-1 rounded-lg flex-shrink-0">
                      {cert.year}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
