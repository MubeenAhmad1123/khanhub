// src/app/terms/page.tsx

import { PageHero }        from '@/components/ui';
import { generateMetadata } from '@/lib/utils';

export const metadata = generateMetadata({ title: 'Terms & Conditions', slug: 'terms' });

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    content: 'By accessing and using the Khan Hub website, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our website.',
  },
  {
    title: 'Use of the Website',
    content: 'You may use this website for lawful purposes only. You must not use it in any way that violates applicable laws, infringes on others\' rights, or interferes with the website\'s functionality. Unauthorized access or misuse of the site may result in legal action.',
  },
  {
    title: 'Donations',
    content: 'All donations made through Khan Hub are voluntary and non-refundable unless otherwise stated. Donations are used exclusively for healthcare, education, and welfare programs. Khan Hub reserves the right to allocate donations to the most impactful programs.',
  },
  {
    title: 'Intellectual Property',
    content: 'All content on the Khan Hub website, including text, images, logos, and videos, is the intellectual property of Khan Hub (Pvt.) Ltd. You may not reproduce, distribute, or use this content without explicit written permission.',
  },
  {
    title: 'Limitation of Liability',
    content: 'Khan Hub shall not be liable for any direct or indirect damages arising from the use of this website, including but not limited to loss of data, business interruption, or any other damages.',
  },
  {
    title: 'Governing Law',
    content: 'These terms are governed by and construed in accordance with the laws of Punjab, Pakistan. Any disputes shall be resolved in the courts of Lahore, Punjab.',
  },
  {
    title: 'Changes to Terms',
    content: 'Khan Hub reserves the right to modify these terms at any time. Changes will be posted on this page. Continued use of the website after changes constitutes acceptance of the new terms.',
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero badge="Legal" title="Terms & Conditions" subtitle="Please read these terms carefully before using our website and services." />
      <section className="section">
        <div className="section-inner max-w-3xl mx-auto">
          <p className="text-neutral-600 text-xs mb-8">Effective: January 2025</p>
          <div className="space-y-8">
            {SECTIONS.map((sec, i) => (
              <div key={sec.title}>
                <h3 className="font-display font-semibold text-white text-base mb-2">
                  <span className="text-primary-500 mr-2">{i + 1}.</span>{sec.title}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{sec.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
