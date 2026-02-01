'use client';
// src/components/sections/MissionSection.tsx - LIGHT THEME VERSION
// Two-in-one: Mission + Donate CTA

import Link from 'next/link';

export function MissionSection() {
  const pillars = [
    {
      icon: '🏥',
      title: 'Healthcare',
      desc: 'Free and subsidized medical services for all.',
      color: 'text-primary-600'
    },
    {
      icon: '📚',
      title: 'Education',
      desc: 'Quality learning for underprivileged students.',
      color: 'text-accent-600'
    },
    {
      icon: '💼',
      title: 'Employment',
      desc: 'Skills, jobs, and entrepreneurship support.',
      color: 'text-success-600'
    },
    {
      icon: '❤️',
      title: 'Welfare',
      desc: 'Social safety net for families in need.',
      color: 'text-warm-300'
    },
  ];

  return (
    <section className="section bg-white">
      <div className="section-inner">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Text */}
          <div>
            <span className="badge-accent inline-flex mb-5">Our Mission</span>
            <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-neutral-900 leading-tight">
              Building a future where <span className="text-gradient">no one is left behind</span>
            </h2>
            <p className="text-neutral-600 mt-6 text-base md:text-lg leading-relaxed">
              Founded in 2015, Khan Hub (Pvt.) Ltd. has grown from a single clinic into a
              multi-department organization serving over <span className="text-neutral-900 font-semibold">50,000 individuals</span> across
              Pakistan. Our mission is simple: provide dignity, opportunity, and hope to every person we touch.
            </p>
            <p className="text-neutral-600 mt-4 text-base md:text-lg leading-relaxed">
              We operate with <span className="text-primary-600 font-semibold">full transparency</span>.
              Every donation, every program, and every outcome is documented and made available
              to our stakeholders and the public.
            </p>

            {/* Stats Mini Section */}
            <div className="grid grid-cols-2 gap-4 mt-8 mb-8">
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-primary-600">16+</div>
                <div className="text-xs text-neutral-600 mt-1">Active Departments</div>
              </div>
              <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-accent-600">100%</div>
                <div className="text-xs text-neutral-600 mt-1">Transparent Operations</div>
              </div>
            </div>

            <Link
              href="/about"
              className="btn-secondary text-sm inline-flex items-center gap-2 group"
            >
              Learn More About Us
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>

          {/* Right: Pillars Grid */}
          <div className="grid grid-cols-2 gap-5">
            {pillars.map((p, index) => (
              <div
                key={p.title}
                className="card p-6 group hover:shadow-xl cursor-default"
                style={{
                  animation: 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0
                }}
              >
                <div className={`text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 ${p.color}`}>
                  {p.icon}
                </div>
                <h4 className="font-display font-semibold text-neutral-900 text-base mb-2">
                  {p.title}
                </h4>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DonateCTASection() {
  return (
    <section className="section bg-gradient-to-b from-white to-neutral-50">
      <div className="section-inner">
        <div
          className="relative rounded-3xl overflow-hidden border border-neutral-200 p-10 md:p-16 text-center bg-gradient-to-br from-primary-50/50 via-white to-accent-50/50"
        >
          {/* Decorative elements */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary-200 opacity-[0.2] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-accent-200 opacity-[0.25] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-success-200 opacity-[0.15] rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Badge */}
            <span className="badge-accent inline-flex mb-5">
              💝 Make a Difference
            </span>

            {/* Headline */}
            <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-neutral-900 leading-tight max-w-3xl mx-auto">
              Your donation changes <span className="text-gradient">real lives</span>
            </h2>

            {/* Subtitle */}
            <p className="text-neutral-600 mt-6 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Every PKR you give goes <span className="text-neutral-900 font-semibold">directly</span> toward
              healthcare, education, and welfare programs. No middlemen. Full transparency.
            </p>

            {/* Impact Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 mb-10 max-w-3xl mx-auto">
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                <div className="text-2xl mb-1">🏥</div>
                <div className="text-sm text-neutral-700 font-medium">PKR 500 = 1 Medical Consultation</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                <div className="text-2xl mb-1">📚</div>
                <div className="text-sm text-neutral-700 font-medium">PKR 1,000 = 1 Month School Supplies</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                <div className="text-2xl mb-1">🍲</div>
                <div className="text-sm text-neutral-700 font-medium">PKR 2,000 = 1 Month Food Support</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/donate"
                className="btn-accent text-base px-10 py-4 group"
              >
                💝 Donate Now
                <svg
                  className="w-5 h-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
              <Link
                href="/certificates"
                className="btn-ghost text-sm group inline-flex items-center gap-2"
              >
                View Our Certificates
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </Link>
            </div>

            {/* Trust Badge */}
            <div className="mt-10 inline-flex items-center gap-2 text-xs text-neutral-600 bg-white/60 border border-neutral-300 rounded-full px-4 py-2">
              <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Verified Non-Profit • Registered in Pakistan • Tax Deductible</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}