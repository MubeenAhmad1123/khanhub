// src/app/about/page.tsx

import { PageHero, SectionHeader } from '@/components/ui';
import { generateMetadata }         from '@/lib/utils';
import { SITE }                     from '@/data/site';

export const metadata = generateMetadata({
  title:       'About Us',
  description: 'Learn about Khan Hub — our mission, vision, values, and the team behind Pakistan\'s leading welfare organization.',
  slug:        'about',
});

const VALUES = [
  { icon: '🤝', title: 'Compassion',    desc: 'We lead with empathy in everything we do.' },
  { icon: '🔍', title: 'Transparency',  desc: 'Full accountability in how donations are used.' },
  { icon: '💪', title: 'Empowerment',   desc: 'We don\'t just help — we enable independence.' },
  { icon: '🌱', title: 'Sustainability', desc: 'Programs designed for lasting, long-term impact.' },
  { icon: '⚖️', title: 'Inclusivity',   desc: 'No one is excluded based on gender, age, or background.' },
  { icon: '🎯', title: 'Excellence',    desc: 'We strive for the highest quality in every service.' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <PageHero
        badge="About Khan Hub"
        title="Who We Are"
        subtitle="A story of compassion, dedication, and transformation — serving Pakistan since 2015."
      />

      {/* Mission & Vision */}
      <section className="section">
        <div className="section-inner">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Mission */}
            <div className="card p-8">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-display font-bold text-white text-xl mb-3">Our Mission</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                To provide accessible, high-quality healthcare, education, employment, and social welfare services to underprivileged communities across Pakistan — with full transparency and genuine care.
              </p>
            </div>
            {/* Vision */}
            <div className="card p-8">
              <div className="text-3xl mb-4">🔮</div>
              <h3 className="font-display font-bold text-white text-xl mb-3">Our Vision</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                A Pakistan where every individual has access to dignity, opportunity, and the resources needed to build a better life — regardless of their socioeconomic background.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section pt-0">
        <div className="section-inner">
          <SectionHeader
            badge="Our Foundation"
            title="Values We Live By"
            subtitle="These principles guide every decision, every program, and every interaction."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUES.map((v) => (
              <div key={v.title} className="card p-5">
                <div className="text-2xl mb-3">{v.icon}</div>
                <h4 className="font-display font-semibold text-white text-sm">{v.title}</h4>
                <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Message */}
      <section className="section pt-0">
        <div className="section-inner max-w-3xl mx-auto">
          <div className="card p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-800 mx-auto mb-4 flex items-center justify-center text-3xl">👨‍⚕️</div>
            <h3 className="font-display font-bold text-white text-lg">Founder & CEO Message</h3>
            <p className="text-neutral-600 text-xs mb-4">Khan Muhammad — Founder, Khan Hub (Pvt.) Ltd.</p>
            <p className="text-neutral-500 text-sm leading-relaxed">
              "When we started Khan Hub, we had one clinic and a dream. Today, we have 16 departments, thousands of lives changed, and a team that believes in the power of compassion. But our work is far from over. Pakistan has millions of people waiting for someone to care — and Khan Hub is here to answer that call. Every donation, every volunteer hour, and every act of kindness moves us one step closer to the Pakistan we all deserve."
            </p>
          </div>
        </div>
      </section>

      {/* Legal Trust Info */}
      <section className="section pt-0">
        <div className="section-inner max-w-3xl mx-auto">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h4 className="font-display font-semibold text-white text-sm mb-3">📜 Legal & Registration</h4>
            <ul className="space-y-2">
              <li className="text-neutral-500 text-xs">✓ Registered under the Companies Act, Punjab, Pakistan</li>
              <li className="text-neutral-500 text-xs">✓ NGO Registration Certificate — Social Welfare Department</li>
              <li className="text-neutral-500 text-xs">✓ Tax Exemption Certificate — Federal Board of Revenue (FBR)</li>
              <li className="text-neutral-500 text-xs">✓ Audited financial statements available upon request</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
