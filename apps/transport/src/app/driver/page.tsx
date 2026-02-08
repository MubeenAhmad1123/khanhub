'use client';

import { useEffect, useState, useRef } from 'react';
import {
  CheckCircle,
  Clock,
  Shield,
  TrendingUp,
  Users,
  Award,
  ArrowRight,
  Zap,
  Star,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

/* ================================
   VEHICLE DATA (slider)
   ================================ */
const VEHICLES = [
  {
    id: 1,
    name: 'Executive Sedan',
    capacity: 4,
    description: 'Comfort-first sedan ideal for short medical visits and doctor follow-ups.',
    image:
      'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=1600&auto=format',
  },
  {
    id: 2,
    name: 'Premium SUV',
    capacity: 5,
    description:
      'Spacious SUV built for longer procedures, family-accompanied rides, and highway trips.',
    image:
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1600&auto=format',
  },
  {
    id: 3,
    name: 'Medical Van',
    capacity: 8,
    description:
      'High-roof van with easy access, perfect for wheelchairs and small medical teams.',
    image:
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1600&auto=format',
  },
];

/* ================================
   STATS CONFIG (values only)
   ================================ */
const DRIVER_VALUES = {
  verifiedPartners: 10,
  monthlyTransports: 50,
  safetyIndex: 99.9,
  payoutCycle: 7, // days
};

export default function DriverPage() {
  return (
    <div className="bg-white">
      <DriverHero />
      <DriverStats />
      <DriverBenefits />
      <DriverVehicles />
      <DriverSteps />
      <DriverCTA />
    </div>
  );
}

/* ================================
   Count-up hook
   ================================ */
function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    setCount(start);
    window.requestAnimationFrame(step);

    return () => {
      startTimestamp = null;
    };
  }, [end, duration, start]);

  return count;
}

/* ================================
   HERO
   ================================ */
function DriverHero() {
  return (
    <section className="relative h-[90vh] min-h-[700px] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2000&auto=format"
          alt="Professional Healthcare Driver"
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1a362e]/95 via-[#2F5D50]/80 to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[#3FA58E] text-sm font-bold mb-8 floating-animation">
            <Star className="w-4 h-4 fill-current" />
            <span>Join Pakistan&apos;s First Dedicated Healthcare Transit Network</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold mb-8 text-white leading-[1.1]">
            Drive for <span className="text-gradient font-black">Impact.</span>
            <br />
            Earn with <span className="text-white">Pride.</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-white/90 leading-relaxed max-w-xl">
            Empowering professional drivers to bridge the gap in healthcare accessibility. Secure, steady, and noble
            work.
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            <Link
              href="/auth/register"
              className="group px-10 py-5 bg-[#3FA58E] hover:bg-white text-white hover:text-[#2F5D50] font-black rounded-2xl transition-all duration-300 text-center shadow-[0_20px_50px_rgba(63,165,142,0.3)] hover:scale-105 flex items-center justify-center gap-2"
            >
              Start Earning Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="px-10 py-5 bg-white/5 hover:bg-white/10 backdrop-blur-xl text-white font-bold border border-white/20 rounded-2xl transition-all duration-300 text-center hover:scale-105"
            >
              Driver Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================
   ANIMATED STATS (original labels)
   ================================ */
function DriverStats() {
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const verified = useCountUp(inView ? DRIVER_VALUES.verifiedPartners : 0, 2200);
  const monthly = useCountUp(inView ? DRIVER_VALUES.monthlyTransports : 0, 2200);
  const safety = useCountUp(inView ? DRIVER_VALUES.safetyIndex : 0, 2200);
  const payout = useCountUp(inView ? DRIVER_VALUES.payoutCycle : 0, 2200);

  return (
    <section className="relative z-20 -mt-6 pb-24 bg-white">
      <div className="container mx-auto px-6">
        <div
          ref={statsRef}
          className="bg-white border border-gray-100 px-6 py-8 md:px-10 md:py-10 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 premium-shadow"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black text-[#2F5D50] mb-2">
              {verified.toFixed(0)}+
            </div>
            <div className="text-gray-500 font-semibold uppercase tracking-[0.18em] text-[10px] md:text-xs">
              Verified Partners
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black text-[#2F5D50] mb-2">
              {monthly.toFixed(0)}k+
            </div>
            <div className="text-gray-500 font-semibold uppercase tracking-[0.18em] text-[10px] md:text-xs">
              Monthly Transports
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black text-[#2F5D50] mb-2">
              {safety.toFixed(1)}%
            </div>
            <div className="text-gray-500 font-semibold uppercase tracking-[0.18em] text-[10px] md:text-xs">
              Safety Index
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black text-[#2F5D50] mb-2">
              {payout.toFixed(0)}d
            </div>
            <div className="text-gray-500 font-semibold uppercase tracking-[0.18em] text-[10px] md:text-xs">
              Payout Cycle
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================
   BENEFITS – clean cards
   ================================ */
function DriverBenefits() {
  const benefits = [
    {
      icon: <TrendingUp className="w-7 h-7" />,
      title: 'Steady Medical Demand',
      description:
        'Hospital partnerships ensure you drive scheduled, pre-approved medical journeys—not random street pickups.',
    },
    {
      icon: <ShieldCheck className="w-7 h-7" />,
      title: 'Protected, Verified Work',
      description:
        'Background checks and verified IDs give you and patients a safe, professional environment.',
    },
    {
      icon: <Award className="w-7 h-7" />,
      title: 'Tiered Earning Potential',
      description:
        'Climb from standard to elite tiers and unlock higher payouts and long-term incentives.',
    },
    {
      icon: <Clock className="w-7 h-7" />,
      title: 'Smart Scheduling',
      description:
        'Blend fixed hospital slots with flexible hours to match your lifestyle and fuel costs.',
    },
  ];

  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-20">
          <h2 className="text-5xl font-black text-[#2F5D50] mb-6">Why Choose Khanhub?</h2>
          <p className="text-gray-500 max-w-2xl text-lg font-medium italic">
            &quot;Leading the future of medical logistics with professional excellence.&quot;
          </p>
          <div className="w-24 h-1.5 bg-[#3FA58E] rounded-full mt-4" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-2xl border border-gray-100 p-8 flex flex-col gap-5 premium-shadow-hover transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#E6F1EC] text-[#2F5D50] flex items-center justify-center">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-black text-[#2F5D50]">{benefit.title}</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================
   VEHICLE SLIDER – 3 images
   ================================ */
function DriverVehicles() {
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % VEHICLES.length);
  };

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + VEHICLES.length) % VEHICLES.length);
  };

  const activeVehicle = VEHICLES[current];

  return (
    <section className="py-32 bg-gray-50 relative overflow-hidden">
      {/* Soft background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-[#E6F1EC] rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 opacity-60" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-[#2F5D50] mb-6 tracking-tight">
            The Elite Fleet
          </h2>
          <p className="text-gray-600 text-lg md:text-xl font-medium">
            See the vehicles available for healthcare journeys. Each tier supports different types of patient needs.
          </p>
        </div>
      </div>

      {/* Full-width slider */}
      <div className="relative w-full">
        <div className="relative w-full max-w-7xl mx-auto rounded-3xl overflow-hidden premium-shadow bg-black">
          <img
            key={activeVehicle.id}
            src={activeVehicle.image}
            alt={activeVehicle.name}
            className="w-full h-[360px] sm:h-[420px] md:h-[520px] object-cover transition-all duration-700"
          />

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Left previous arrow */}
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-8">
            <button
              onClick={handlePrev}
              className="glass-panel-dark premium-shadow-hover w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white border border-white/20 text-2xl"
              aria-label="Previous vehicle"
            >
              ‹
            </button>
          </div>

          {/* Right next arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-8">
            <button
              onClick={handleNext}
              className="glass-panel-dark premium-shadow-hover w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white border border-white/20 text-2xl"
              aria-label="Next vehicle"
            >
              ›
            </button>
          </div>

          {/* Bottom info card for driver */}
          <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-6 sm:pb-10">
            <div className="max-w-xl bg-white/95 rounded-2xl p-5 sm:p-6 premium-shadow">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-xl sm:text-2xl font-black text-[#2F5D50]">
                  {activeVehicle.name}
                </h3>
                <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-[#E6F1EC] text-[#2F5D50]">
                  {activeVehicle.capacity} seats
                </span>
              </div>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                {activeVehicle.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================
   STEPS
   ================================ */
function DriverSteps() {
  const steps = [
    {
      title: 'Digital Sign-up',
      text: 'Register your interest via our secure onboarding portal with personal credentials.',
    },
    {
      title: 'Asset Verification',
      text: 'Submit vehicle legalities and undergo a multi-point safety inspection.',
    },
    {
      title: 'Expert Induction',
      text: 'Complete a specialized healthcare etiquette and emergency protocol course.',
    },
    {
      title: 'Activation',
      text: 'Receive your partner kit and start accepting premium healthcare requests.',
    },
  ];

  return (
    <section className="py-32 bg-[#2F5D50] text-white relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] border-[100px] border-white rounded-full" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-black mb-12 leading-tight">
              Elevate Your Career in Four Steps.
            </h2>
            <div className="grid gap-10">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center font-black text-3xl group-hover:bg-[#3FA58E] group-hover:rotate-6 transition-all duration-300">
                    {i + 1}
                  </div>
                  <div className="pt-2">
                    <h4 className="text-2xl font-black mb-3 text-[#3FA58E]">{step.title}</h4>
                    <p className="text-white/70 text-lg leading-relaxed font-medium">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-[#3FA58E] rounded-[4rem] rotate-6 scale-95 opacity-50 blur-2xl group-hover:rotate-3 transition-transform duration-700" />
            <div className="relative rounded-[4rem] overflow-hidden shadow-2xl floating-animation">
              <img
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                alt="Khanhub Professional Partner"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2F5D50] via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-10 left-10">
                <div className="text-3xl md:text-4xl font-black">Trusted By Hospitals.</div>
                <div className="text-[#3FA58E] font-bold">Official Logistics Partner.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================
   CTA
   ================================ */
function DriverCTA() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="relative bg-[#E6F1EC] p-16 md:p-24 rounded-[4rem] text-center overflow-hidden border border-[#2F5D50]/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#3FA58E]/20 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#2F5D50] mb-8 leading-tight">
              Ready to Drive the Future?
            </h2>
            <p className="text-xl text-[#2F5D50]/70 mb-12 font-medium leading-relaxed italic">
              &quot;Join the movement that’s redefining medical logistics and earning potential for drivers across the
              region.&quot;
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/auth/register"
                className="px-12 py-6 bg-[#2F5D50] hover:bg-[#3FA58E] text-white font-black rounded-[2rem] transition-all shadow-[0_20px_60px_rgba(47,93,80,0.3)] hover:scale-110 active:scale-95 text-lg md:text-xl"
              >
                Become a Partner
              </Link>
              <Link
                href="/about"
                className="px-12 py-6 bg-white text-[#2F5D50] border-2 border-[#2F5D50]/10 font-black rounded-[2rem] transition-all hover:bg-white/50 hover:scale-110 active:scale-95 text-lg md:text-xl"
              >
                Our Mission
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
