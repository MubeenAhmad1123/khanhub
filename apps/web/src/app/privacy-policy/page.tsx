// src/app/privacy-policy/page.tsx

import { PageHero }        from '@/components/ui';
import { generateMetadata } from '@/lib/utils';

export const metadata = generateMetadata({ title: 'Privacy Policy', slug: 'privacy-policy' });

const SECTIONS = [
  {
    title: 'Information We Collect',
    content: 'We collect information you voluntarily provide to us, such as your name, email address, phone number, and any messages you send through our contact or inquiry forms. We may also collect non-personal data such as browser type, IP address, and pages visited for analytics purposes.',
  },
  {
    title: 'How We Use Your Information',
    content: 'Your information is used to respond to your inquiries, process donations, send appointment confirmations, and improve our services. We do not sell or share your personal information with third parties without your consent, except as required by law.',
  },
  {
    title: 'Data Storage & Security',
    content: 'All data is stored securely using Firebase (Google Cloud Platform) with encryption at rest and in transit. We implement industry-standard security measures to protect your information from unauthorized access.',
  },
  {
    title: 'Cookies',
    content: 'Our website may use cookies to enhance your browsing experience. These are small files stored on your device. You can disable cookies through your browser settings, though this may affect some website functionality.',
  },
  {
    title: 'Your Rights',
    content: 'You have the right to access, correct, or delete your personal data at any time. Simply contact us at info@khanhub.com.pk with your request, and we will process it within 7 business days.',
  },
  {
    title: 'Changes to This Policy',
    content: 'We may update this privacy policy from time to time. Any changes will be posted on this page with an updated date. We encourage you to review this policy periodically.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero badge="Legal" title="Privacy Policy" subtitle="How we collect, use, and protect your personal information." />
      <section className="section">
        <div className="section-inner max-w-3xl mx-auto">
          <p className="text-neutral-600 text-xs mb-8">Last updated: January 2025</p>
          <p className="text-neutral-500 text-sm leading-relaxed mb-8">
            Khan Hub (Pvt.) Ltd. is committed to protecting your privacy. This policy explains how we handle your personal information when you visit our website or use our services.
          </p>
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
