// src/app/donate/page.tsx

import Link from 'next/link';
import { PageHero } from '@/components/ui';
import { generateMetadata } from '@/lib/utils';
import DonationForm from '@/components/forms/DonationForm';
import { SITE } from '@/data/site';

export const metadata = generateMetadata({
  title: 'Donate',
  description: 'Make a donation to Khan Hub and help us provide healthcare, education, and welfare services to communities in need.',
  slug: 'donate',
});

const IMPACT_EXAMPLES = [
  { amount: 'PKR 500', impact: 'Provides medicine for one patient for a week.', icon: '💊' },
  { amount: 'PKR 1,000', impact: 'Covers one student\'s school supplies for a month.', icon: '📒' },
  { amount: 'PKR 2,500', impact: 'Funds one day of free medical consultation.', icon: '🩺' },
  { amount: 'PKR 5,000', impact: 'Supports a family\'s ration for one month.', icon: '🍚' },
  { amount: 'PKR 10,000', impact: 'Sponsors one child\'s education for an entire year.', icon: '🎓' },
];

export default function DonatePage() {
  return (
    <>
      <PageHero
        type="split"
        badge="Give Back"
        title="Make a Difference"
        subtitle="Every single rupee you donate goes directly into programs that save lives, educate minds, and rebuild hope."
        image="/images/donate-hero.webp"
        cta={
          <Link href="#donation-form" className="btn-success h-full">
            💝 Donate Now
          </Link>
        }
      >
        <div className="flex items-center gap-3 px-4 py-2 bg-success-50 rounded-lg border border-success-100 ring-1 ring-success-500/20 shadow-sm">
          <span className="text-xl">✅</span>
          <span className="text-[10px] sm:text-xs font-bold text-success-700 uppercase leading-tight">
            Zakat Eligible &<br className="hidden sm:block" /> Tax Exempted
          </span>
        </div>
      </PageHero>

      <section className="section">
        <div className="section-inner">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* ── Left: Impact Examples ── */}
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="font-display font-semibold text-neutral-900 text-lg sm:text-xl mb-5 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-sm">💡</span>
                  Your Donation Impact
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {IMPACT_EXAMPLES.map((ex, idx) => (
                    <div
                      key={ex.amount}
                      className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-4 sm:p-5 flex items-center gap-4 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                        {ex.icon}
                      </div>
                      <div className="relative">
                        <span className="font-display font-bold text-primary-600 text-sm sm:text-base leading-none">{ex.amount}</span>
                        <p className="text-neutral-600 text-xs sm:text-sm mt-1 leading-relaxed">{ex.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust signals */}
              <div className="bg-success-50/50 border border-success-100/50 rounded-2xl p-6 sm:p-8">
                <h4 className="font-display font-bold text-success-800 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                  Why Trust Us?
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "Registered NGO — Punjab, Pakistan",
                    "FBR Tax Exemption Certificate",
                    "Audited financial statements",
                    "0% overhead on donations"
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-3 text-neutral-700 text-xs sm:text-sm leading-tight">
                      <div className="w-5 h-5 rounded-full bg-success-500/10 border border-success-200 flex items-center justify-center text-[10px] text-success-600 flex-shrink-0">✓</div>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Right: Donation Form ── */}
            <div id="donation-form" className="relative p-1 lg:p-0 scroll-mt-32">
              <div className="card p-6 sm:p-8 relative z-10 border-primary-100">
                <h3 className="font-display font-bold text-neutral-900 text-xl sm:text-2xl mb-2 flex items-center gap-2">
                  💝 Donate Now
                </h3>
                <p className="text-neutral-600 text-sm mb-6 leading-relaxed">Choose an amount and complete your donation securely.</p>
                <DonationForm />
              </div>
              {/* Decorative background for form */}
              <div className="absolute -inset-4 bg-primary-50/50 blur-3xl opacity-50 z-0" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* Structured Data for Donate Action */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DonateAction',
            name: 'Donate to Khan Hub',
            description: 'Support Pakistan\'s leading social welfare organization',
            recipient: {
              '@type': 'NGO',
              name: SITE.fullName,
              url: SITE.url
            },
            url: `${SITE.url}/donate`
          })
        }}
      />
    </>
  );
}
