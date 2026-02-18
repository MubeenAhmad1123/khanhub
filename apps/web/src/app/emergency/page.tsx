// src/app/emergency/page.tsx

import Link from 'next/link';
import { PageHero } from '@/components/ui';
import { SITE } from '@/data/site';

export default function EmergencyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Split Hero — dark theme to match section below ── */}
      <PageHero
        type="split"
        badge="🚨 Emergency Services"
        title="24/7 Emergency Helpline"
        subtitle="If you or someone you know is in a medical emergency, call our helpline immediately. Our trained staff will guide you through the situation."
        image="/emergency.webp"
        className="bg-neutral-950 text-white [&_.badge]:bg-red-500/10 [&_.badge]:border-red-500/30 [&_.badge]:text-red-400 [&_h1]:text-white [&_p]:text-neutral-400"
        cta={
          <a
            href={`tel:${SITE.emergency.replace(/\D/g, '')}`}
            className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all"
          >
            📞 {SITE.emergency}
          </a>
        }
      >
        <Link
          href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-green-500/40 text-green-400 hover:bg-green-500/10 font-semibold transition-all"
        >
          💬 WhatsApp Us
        </Link>
      </PageHero>


      {/* ── Additional Emergency Options ── */}
      <section className="section bg-neutral-950">
        <div className="section-inner">
          <p className="text-center text-red-400 text-sm font-bold uppercase tracking-widest mb-10 animate-pulse">
            Available 24 hours a day, 7 days a week
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center hover:border-red-500/30 transition-colors">
              <div className="text-3xl mb-3">🚑</div>
              <h4 className="font-display font-semibold text-white text-sm mb-2">Ambulance</h4>
              <p className="text-neutral-500 text-xs leading-relaxed mb-3">For life-threatening emergencies requiring immediate transport.</p>
              <a href="tel:11511" className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors">Call 115 (Edhi)</a>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center hover:border-primary-500/30 transition-colors">
              <div className="text-3xl mb-3">🧠</div>
              <h4 className="font-display font-semibold text-white text-sm mb-2">Mental Health Crisis</h4>
              <p className="text-neutral-500 text-xs leading-relaxed mb-3">Sukoon Center&apos;s helpline is available for emotional distress support.</p>
              <a href={`tel:${SITE.phone.replace(/\D/g, '')}`} className="text-primary-400 text-xs font-bold hover:text-primary-300 transition-colors">{SITE.phone}</a>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center hover:border-amber-500/30 transition-colors">
              <div className="text-3xl mb-3">👮</div>
              <h4 className="font-display font-semibold text-white text-sm mb-2">Police</h4>
              <p className="text-neutral-500 text-xs leading-relaxed mb-3">For any situation requiring immediate law enforcement.</p>
              <a href="tel:15" className="text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors">Call 15</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

