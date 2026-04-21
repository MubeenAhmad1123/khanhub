// src/app/contact/page.tsx

import Link from 'next/link';
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
        type="split"
        badge="Get In Touch"
        title="Contact Us"
        subtitle="We're here to help. Reach out via any of the channels below or visit our main hub for immediate assistance."
        image="/images/contact-hero.webp"
        cta={
          <Link href="#contact-grid" className="btn-primary">
            📞 Reach Us Now
          </Link>
        }
      >
        <Link
          href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary border-green-500 text-green-600 hover:bg-green-50"
        >
          💬 Chat on WhatsApp
        </Link>
      </PageHero>

      <section id="contact-grid" className="section scroll-mt-24">
        <div className="section-inner">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left: Contact Details ── */}
            <div className="space-y-4">
              {/* Address */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-5 hover:border-primary-300 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📍</div>
                  <h4 className="font-display font-semibold text-neutral-900 text-sm">Address</h4>
                </div>
                <p className="relative text-neutral-600 text-xs leading-relaxed">{SITE.address}</p>
              </div>

              {/* Phone */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-5 hover:border-primary-300 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📞</div>
                  <h4 className="font-display font-semibold text-neutral-900 text-sm">Phone</h4>
                </div>
                <a href={`tel:${SITE.phone.replace(/\D/g, '')}`} className="relative text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors">{SITE.phone}</a>
              </div>

              {/* WhatsApp */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-5 hover:border-green-300 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">💬</div>
                  <h4 className="font-display font-semibold text-neutral-900 text-sm">WhatsApp</h4>
                </div>
                <a href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="relative text-green-600 text-sm font-medium hover:text-green-700 transition-colors">
                  Chat on WhatsApp
                </a>
              </div>

              {/* Email */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-5 hover:border-accent-300 hover:shadow-xl hover:shadow-accent-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-50 border border-accent-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📧</div>
                  <h4 className="font-display font-semibold text-neutral-900 text-sm">Email</h4>
                </div>
                <a href={`mailto:${SITE.email}`} className="relative text-accent-600 text-sm font-medium hover:text-accent-700 transition-colors">{SITE.email}</a>
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
              <div className="relative p-1 lg:p-0">
                <div className="card p-6 sm:p-8 relative z-10 border-primary-100 shadow-xl shadow-primary-500/5">
                  <h3 className="font-display font-bold text-neutral-900 text-xl mb-1">Send Us a Message</h3>
                  <p className="text-neutral-600 text-sm mb-6">Fill out the form and we&quot;ll get back to you within 24 hours.</p>
                  <ContactForm />
                </div>
                {/* Decorative background */}
                <div className="absolute -inset-4 bg-primary-50/40 blur-3xl opacity-50 z-0" aria-hidden="true" />
              </div>

              {/* Map Embed */}
              <div className="card p-4 overflow-hidden border-neutral-200">
                <h3 className="font-display font-semibold text-neutral-900 text-sm mb-3 px-1">📍 Find Us on the Map</h3>
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
