'use client';

import { useEffect, useState, useRef } from 'react';
import { ArrowRight, Shield, MapPin, Award } from 'lucide-react';
import Link from 'next/link';

const VEHICLES = [
  {
    id: 1,
    name: 'Executive Sedan',
    capacity: 4,
    description:
      'Optimal for city transit and professional medical commutes with premium comfort.',
    image:
      'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=800&auto=format',
  },
  {
    id: 2,
    name: 'Premium SUV',
    capacity: 5,
    description:
      'High-end comfort for patient transfers and long-distance medical travel.',
    image:
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format',
  },
  {
    id: 3,
    name: 'Medical Van',
    capacity: 8,
    description:
      'Spacious and accessible for small groups with wheelchair support.',
    image:
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=800&auto=format',
  },
];

const FEATURES = [
  {
    icon: <Shield className="w-12 h-12" />,
    title: 'Medical-Grade Safety',
    description:
      'All vehicles strictly sanitized with hospital-grade protocols after every journey for maximum patient protection.',
  },
  {
    icon: <MapPin className="w-12 h-12" />,
    title: 'Real-Time Tracking',
    description:
      'Hospitals and families can track patient locations in real-time with complete journey transparency.',
  },
  {
    icon: <Award className="w-12 h-12" />,
    title: 'Trained Professionals',
    description:
      'Our drivers undergo specialized training in medical etiquette and emergency response procedures.',
  },
];

export default function HomePage() {
  return (
    <div className="bg-white">
      <HeroWithStats />
      <FeaturesSection />
      <FleetSection />
      <CTASection />
    </div>
  );
}

// Count‑up hook
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

function HeroWithStats() {
  const [showCTA, setShowCTA] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCTA(true), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsInView) {
          setStatsInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [statsInView]);

  useEffect(() => {
    const timer = setTimeout(() => setStatsInView(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Your desired values: 10, 50, 36, 4.2
  const ridesCount = useCountUp(statsInView ? 10 : 0, 2500);
  const driversCount = useCountUp(statsInView ? 50 : 0, 2500);
  const hospitalsCount = useCountUp(statsInView ? 36 : 0, 2500);
  const ratingCount = useCountUp(statsInView ? 4.2 : 0, 2500);

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[75vh] min-h-[650px] flex items-center overflow-hidden bg-gradient-to-br from-[#1a362e] via-[#2F5D50] to-[#1a362e]">
        <div className="absolute inset-0 z-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=2000&auto=format"
            alt="Professional Healthcare Transit"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="container mx-auto px-6 md:px-12 relative z-10 pb-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[#3FA58E] text-sm font-bold mb-10">
              <Shield className="w-5 h-5" />
              <span>Pakistan&apos;s Most Trusted Medical Transport Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 text-white leading-[1.05] tracking-tight">
              Care That <span className="text-gradient">Moves</span> You
            </h1>

            <p className="text-xl md:text-2xl mb-12 text-white/90 leading-relaxed max-w-2xl font-medium">
              Bridging the gap between home and healthcare with premium, hospital-grade transport solutions.
            </p>

            <div
              className={`flex flex-col sm:flex-row gap-5 transition-all duration-1000 transform ${
                showCTA ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              <Link
                href="/book"
                className="group px-10 py-5 bg-[#3FA58E] hover:bg-white text-white hover:text-[#2F5D50] font-bold rounded-lg transition-all duration-300 text-center text-lg flex items-center justify-center gap-3"
              >
                Book Your Ride
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/auth/register"
                className="px-10 py-5 bg-white/10 backdrop-blur-md hover:bg-white text-white hover:text-[#2F5D50] font-bold rounded-lg transition-all duration-300 text-center text-lg border border-white/30"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative z-20 -mt-10 pb-20">
        <div className="container mx-auto px-6 md:px-12">
          <div className="bg-white border border-gray-100 px-6 py-8 md:px-10 md:py-10 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 premium-shadow">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-[#2F5D50] mb-3">
                {ridesCount.toFixed(0)}k+
              </div>
              <div className="text-gray-500 font-semibold uppercase tracking-wider text-xs md:text-sm">
                Total Rides
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-[#2F5D50] mb-3">
                {driversCount.toFixed(0)}+
              </div>
              <div className="text-gray-500 font-semibold uppercase tracking-wider text-xs md:text-sm">
                Expert Drivers
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-[#2F5D50] mb-3">
                {hospitalsCount.toFixed(0)}+
              </div>
              <div className="text-gray-500 font-semibold uppercase tracking-wider text-xs md:text-sm">
                Hospitals Linked
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-[#2F5D50] mb-3">
                {ratingCount.toFixed(1)}
              </div>
              <div className="text-gray-500 font-semibold uppercase tracking-wider text-xs md:text-sm">
                Patient Rating
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FeaturesSection() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#2F5D50] mb-6 tracking-tight">
            Standard of Excellence
          </h2>
          <div className="w-24 h-1.5 bg-[#3FA58E] mx-auto rounded-full mb-6"></div>
          <p className="text-lg md:text-xl text-gray-600 font-medium">
            Every journey is backed by our commitment to safety, reliability, and professional care.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {FEATURES.map((item, i) => (
            <div
              key={i}
              className="bg-gray-50 p-10 md:p-12 rounded-xl border border-gray-100 hover:border-[#3FA58E]/30 transition-all duration-300 group"
            >
              <div className="text-[#3FA58E] mb-8 group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-[#2F5D50] mb-5">
                {item.title}
              </h3>
              <p className="text-gray-600 font-medium leading-relaxed text-base md:text-lg">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FleetSection() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#2F5D50] mb-6 tracking-tight">
              Our Premium Fleet
            </h2>
            <p className="text-gray-600 text-lg md:text-xl font-medium leading-relaxed">
              Choose the perfect vehicle for your medical journey with comfort, safety, and professionalism.
            </p>
          </div>

          <Link
            href="/book"
            className="px-10 py-5 bg-[#2F5D50] text-white font-bold rounded-lg hover:bg-[#3FA58E] transition-all duration-300 text-lg whitespace-nowrap"
          >
            View All Vehicles
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
          {VEHICLES.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-[#3FA58E]/40 transition-all duration-300 group"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={vehicle.image}
                  alt={vehicle.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-8">
                <div className="flex justify-between items-start mb-5">
                  <h3 className="text-2xl md:text-3xl font-black text-[#2F5D50]">
                    {vehicle.name}
                  </h3>
                  <div className="bg-[#E6F1EC] text-[#2F5D50] px-3 py-1.5 rounded-lg text-xs font-bold">
                    {vehicle.capacity} SEATS
                  </div>
                </div>

                <p className="text-gray-600 font-medium mb-8 leading-relaxed">
                  {vehicle.description}
                </p>

                <Link
                  href="/book"
                  className="flex items-center justify-between text-[#2F5D50] font-bold uppercase tracking-wide pt-6 border-t border-gray-100 group-hover:text-[#3FA58E] transition-colors"
                >
                  <span>Book This Ride</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6 md:px-12">
        <div className="bg-[#E6F1EC] p-16 md:p-24 rounded-2xl text-center border border-[#2F5D50]/10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#2F5D50] mb-8 leading-tight tracking-tight">
              Your Journey to Wellness Starts Here
            </h2>

            <p className="text-xl md:text-2xl text-[#2F5D50]/70 mb-12 font-medium italic">
              &quot;We aren&apos;t just a transport service. We are your partner in healing.&quot;
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/book"
                className="px-12 py-6 bg-[#2F5D50] hover:bg-[#3FA58E] text-white font-bold rounded-lg transition-all duration-300 text-lg"
              >
                Schedule Appointment
              </Link>

              <Link
                href="/auth/register"
                className="px-12 py-6 bg-white text-[#2F5D50] border-2 border-[#2F5D50]/20 font-bold rounded-lg transition-all duration-300 hover:border-[#3FA58E] text-lg"
              >
                Open Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
