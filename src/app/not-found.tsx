// src/app/not-found.tsx
// ─────────────────────────────────────────────
// Custom 404 page. Next.js automatically uses this
// when no route matches.
// ─────────────────────────────────────────────

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* Number */}
      <div className="font-display font-bold text-[200px] md:text-[280px] leading-none text-transparent"
        style={{ WebkitTextStroke: '2px #0099b0', opacity: 0.3 }}>
        404
      </div>

      <div className="-mt-16 relative z-10">
        <h1 className="font-display font-bold text-3xl md:text-4xl text-white">
          Page Not Found
        </h1>
        <p className="text-neutral-500 text-base mt-3 max-w-md mx-auto leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link href="/" className="btn-primary text-sm px-6 py-2.5">
            🏠 Go Home
          </Link>
          <Link href="/departments" className="btn-secondary text-sm px-6 py-2.5">
            📂 Browse Departments
          </Link>
          <Link href="/contact" className="btn-ghost text-sm">
            📞 Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
