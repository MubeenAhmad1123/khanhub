// src/app/contact/page.tsx

import { PageHero } from '@/components/ui';
import { generateMetadata } from '@/lib/utils';
import { SITE } from '@/data/site';
import ContactForm from '@/components/forms/ContactForm';

export const metadata = generateMetadata({
  title: 'Contact Us',
  description: 'Get in touch with Khan Hub. We are here to help with any questions, appointments, or inquiries.',
  slug: 'contact',
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        badge="Get In Touch"
        title="Contact Us"
        subtitle="We&apos;d love to hear from you. Reach out via any of the channels below."
      />

      <section className="section">
        <div className="section-inner">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left: Contact Details ── */}
            <div className="space-y-4">
              {/* Address */}
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-xl">📍</div>
                  <h4 className="font-display font-semibold text-white text-sm">Address</h4>
                </div>
                <p className="text-neutral-500 text-xs leading-relaxed">{SITE.address}</p>
              </div>

              {/* Phone */}
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-xl">📞</div>
                  <h4 className="font-display font-semibold text-white text-sm">Phone</h4>
                </div>
                <a href={`tel:${SITE.phone.replace(/\D/g, '')}`} className="text-primary-400 text-sm hover:text-primary-300 transition-colors">{SITE.phone}</a>
              </div>

              {/* WhatsApp */}
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-xl">💬</div>
                  <h4 className="font-display font-semibold text-white text-sm">WhatsApp</h4>
                </div>
                <a href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="text-green-400 text-sm hover:text-green-300 transition-colors">
                  Chat on WhatsApp
                </a>
              </div>

              {/* Email */}
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-xl">📧</div>
                  <h4 className="font-display font-semibold text-white text-sm">Email</h4>
                </div>
                <a href={`mailto:${SITE.email}`} className="text-accent-400 text-sm hover:text-accent-300 transition-colors">{SITE.email}</a>
              </div>

              {/* Emergency */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl">🚨</div>
                  <h4 className="font-display font-semibold text-red-400 text-sm">Emergency</h4>
                </div>
                <a href={`tel:${SITE.emergency.replace(/\D/g, '')}`} className="text-red-400 text-sm font-bold hover:text-red-300 transition-colors">{SITE.emergency}</a>
                <p className="text-red-500 text-xs mt-1">Available 24/7</p>
              </div>
            </div>

            {/* ── Right: Form + Map ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Form */}
              <div className="card p-6">
                <h3 className="font-display font-semibold text-white text-lg mb-1">Send Us a Message</h3>
                <p className="text-neutral-500 text-xs mb-5">Fill out the form and we&apos;ll get back to you within 24 hours.</p>
                <ContactForm />
              </div>

              {/* Map Embed */}
              <div className="card p-4 overflow-hidden">
                <h3 className="font-display font-semibold text-white text-sm mb-3">📍 Find Us on the Map</h3>
                <div className="rounded-xl overflow-hidden" style={{ height: '240px' }}>
                  {/* Google Maps iframe — replace src with your actual embed URL */}
                  <iframe
                    title="Khan Hub Location"
                    className="w-full h-full"
                    src="https://maps.google.com/maps?q=Khan+Hub+Lahore+Pakistan&output=embed"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Data for local NGO search results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: SITE.fullName,
            image: `${SITE.url}/logo.png`,
            '@id': `${SITE.url}/contact`,
            url: `${SITE.url}/contact`,
            telephone: SITE.phone,
            address: {
              '@type': 'PostalAddress',
              streetAddress: SITE.address,
              addressLocality: 'Lahore',
              addressRegion: 'Punjab',
              addressCountry: 'PK'
            },
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday'
              ],
              opens: '00:00',
              closes: '23:59'
            },
            sameAs: [
              'https://www.facebook.com/khanhub.com.pk/',
              'https://www.instagram.com/khanhub.com.pk/'
            ]
          })
        }}
      />
    </>
  );
}
