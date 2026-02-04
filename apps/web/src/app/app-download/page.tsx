// src/app/app-download/page.tsx

import { PageHero } from '@/components/ui';

export default function AppDownloadPage() {
  return (
    <>
      <PageHero badge="Mobile" title="Download Our App" subtitle="Stay connected with Khan Hub on the go." />
      <section className="section">
        <div className="section-inner max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">📱</div>
          <h3 className="font-display font-bold text-white text-xl">Coming Soon</h3>
          <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
            The Khan Hub mobile app is currently under development. It will include appointment booking, donation tracking, department info, and emergency access — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3">
              <span className="text-2xl">🍎</span>
              <div className="text-left">
                <p className="text-neutral-500 text-xs">Download on the</p>
                <p className="text-white font-semibold text-sm">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3">
              <span className="text-2xl">▶️</span>
              <div className="text-left">
                <p className="text-neutral-500 text-xs">Get it on</p>
                <p className="text-white font-semibold text-sm">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
