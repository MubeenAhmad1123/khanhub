// src/app/donate/page.tsx

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
        badge="Give Back"
        title="Make a Difference"
        subtitle="Every single rupee you donate goes directly into programs that save lives, educate minds, and rebuild hope."
      />

      <section className="section">
        <div className="section-inner">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* ── Left: Impact Examples ── */}
            <div>
              <h3 className="font-display font-semibold text-white text-lg mb-5">💡 Your Donation Impact</h3>
              <div className="space-y-3">
                {IMPACT_EXAMPLES.map((ex) => (
                  <div key={ex.amount} className="card flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-xl flex-shrink-0">
                      {ex.icon}
                    </div>
                    <div>
                      <span className="font-display font-bold text-primary-400 text-sm">{ex.amount}</span>
                      <p className="text-neutral-500 text-xs mt-0.5">{ex.impact}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust signals */}
              <div className="mt-8 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
                <h4 className="font-display font-semibold text-white text-xs uppercase tracking-wider mb-3">Why Trust Us?</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-neutral-500 text-xs">
                    <span className="text-green-400">✓</span> Registered NGO — Punjab, Pakistan
                  </li>
                  <li className="flex items-center gap-2 text-neutral-500 text-xs">
                    <span className="text-green-400">✓</span> FBR Tax Exemption Certificate
                  </li>
                  <li className="flex items-center gap-2 text-neutral-500 text-xs">
                    <span className="text-green-400">✓</span> Audited financial statements — 100% transparent
                  </li>
                  <li className="flex items-center gap-2 text-neutral-500 text-xs">
                    <span className="text-green-400">✓</span> 0% overhead on donations — all goes to programs
                  </li>
                </ul>
              </div>
            </div>

            {/* ── Right: Donation Form ── */}
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white text-lg mb-1">💝 Donate Now</h3>
              <p className="text-neutral-500 text-xs mb-5">Choose an amount and complete your donation securely.</p>
              <DonationForm />
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
