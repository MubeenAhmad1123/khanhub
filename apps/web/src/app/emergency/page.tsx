// src/app/emergency/page.tsx

import { SITE } from '@/data/site';

export default function EmergencyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* ── Full-screen emergency hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-20 text-center relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/emergency.webp"
            alt=""
            className="w-full h-full object-cover opacity-20 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/40" />
        </div>

        {/* Red glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-600 opacity-[0.06] blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Pulsing icon */}
          <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="text-5xl">🚨</span>
          </div>

          <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
            Emergency <span style={{ color: '#f87171' }}>Services</span>
          </h1>
          <p className="text-neutral-500 text-base leading-relaxed mb-8">
            If you or someone you know is in a medical emergency, please call our 24/7 helpline immediately. Our trained staff will guide you through the situation.
          </p>

          {/* Main helpline */}
          <a href={`tel:${SITE.emergency.replace(/\D/g, '')}`}
            className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-display font-bold text-xl px-8 py-4 rounded-2xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all">
            📞 {SITE.emergency}
          </a>

          <p className="text-red-500 text-sm mt-3">Available 24 hours a day, 7 days a week</p>

          {/* Additional options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="text-2xl mb-2">🚑</div>
              <h4 className="font-display font-semibold text-white text-sm">Ambulance</h4>
              <p className="text-neutral-500 text-xs mt-1">For life-threatening emergencies requiring immediate transport.</p>
              <a href="tel:11511" className="text-red-400 text-xs font-semibold mt-3 inline-block hover:text-red-300">Call 115 (Edhi)</a>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="text-2xl mb-2">🧠</div>
              <h4 className="font-display font-semibold text-white text-sm">Mental Health Crisis</h4>
              <p className="text-neutral-500 text-xs mt-1">Sukoon Center&apos;s helpline is available for emotional distress support.</p>
              <a href={`tel:${SITE.phone.replace(/\D/g, '')}`} className="text-primary-400 text-xs font-semibold mt-3 inline-block hover:text-primary-300">{SITE.phone}</a>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="text-2xl mb-2">👮</div>
              <h4 className="font-display font-semibold text-white text-sm">Police</h4>
              <p className="text-neutral-500 text-xs mt-1">For any situation requiring immediate law enforcement.</p>
              <a href="tel:15" className="text-amber-400 text-xs font-semibold mt-3 inline-block hover:text-amber-300">Call 15</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
