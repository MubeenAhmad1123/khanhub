'use client';

import { useEffect, useState, useRef, useMemo, memo } from 'react';
import { ArrowRight, Shield, MapPin, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Vehicle {
  id: number;
  name: string;
  nameUrdu: string;
  capacity: number;
  description: string;
  descriptionUrdu: string;
  image: string;
}

interface Feature {
  icon: JSX.Element;
  title: string;
  description: string;
}

interface Stat {
  value: number;
  suffix: string;
  label: string;
  labelUrdu: string;
  decimals?: number;
}

// Constants
const FLEET_VEHICLES: Vehicle[] = [
  {
    id: 1,
    name: 'Executive Sedan',
    nameUrdu: 'ایگزیکٹو سیڈان',
    capacity: 4,
    description: 'Optimal for city transit and professional medical commutes with premium comfort and style.',
    descriptionUrdu: 'شہر کے اندر سفر اور میڈیکل وزٹ کے لیے آرام دہ اور معیاری گاڑی۔',
    image: '/images/1.webp',
  },
  {
    id: 2,
    name: 'Premium SUV',
    nameUrdu: 'پریمیئم ایس یو وی',
    capacity: 5,
    description: 'High-end comfort for patient transfers and long-distance medical travel with spacious interior.',
    descriptionUrdu: 'مریضوں کو ایک جگہ سے دوسری جگہ لے جانے اور لمبے سفر کے لیے آرام دہ گاڑی۔',
    image: '/images/2.webp',
  },
  {
    id: 3,
    name: 'Medical Van',
    nameUrdu: 'میڈیکل وین',
    capacity: 8,
    description: 'Spacious and accessible for small groups with full wheelchair support and medical equipment.',
    descriptionUrdu: 'کشادہ گاڑی، چھوٹے گروپ اور وہیل چیئر کی سہولت کے ساتھ آسان سفر کے لیے۔',
    image: '/images/3.webp',
  },
];

const FEATURES: Feature[] = [
  {
    icon: <Shield className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" aria-hidden="true" />,
    title: 'Medical-Grade Safety / میڈیکل معیار کی حفاظت',
    description:
      'All vehicles strictly sanitized with hospital-grade protocols after every journey for maximum patient protection. ہر سفر کے بعد گاڑیوں کو ہسپتال کے معیار کے مطابق صاف کیا جاتا ہے تاکہ مریض مکمل حفاظت کے ساتھ سفر کر سکیں۔',
  },
  {
    icon: <MapPin className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" aria-hidden="true" />,
    title: 'Real-Time Tracking / ریئل ٹائم ٹریکنگ',
    description:
      'Hospitals and families can track patient locations in real-time with complete journey transparency. ہسپتال اور گھر والے مریض کی لوکیشن کو ریئل ٹائم میں دیکھ سکتے ہیں، تاکہ پورے سفر کی مکمل معلومات سامنے رہے۔',
  },
  {
    icon: <Award className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" aria-hidden="true" />,
    title: 'Trained Professionals / تربیت یافتہ ڈرائیور',
    description:
      'Our drivers undergo specialized training in medical etiquette and emergency response procedures. ہمارے ڈرائیورز میڈیکل آداب اور ایمرجنسی کی صورت میں درست ردِ عمل کے لیے خصوصی تربیت یافتہ ہیں۔',
  },
];

const STATS: Stat[] = [
  {
    value: 10,
    suffix: 'k+',
    label: 'Total Rides',
    labelUrdu: 'کل مکمل کیے گئے سفر',
  },
  {
    value: 50,
    suffix: '+',
    label: 'Expert Drivers',
    labelUrdu: 'تجربہ کار اور تربیت یافتہ ڈرائیور',
  },
  {
    value: 36,
    suffix: '+',
    label: 'Hospitals Linked',
    labelUrdu: 'ملک بھر کے منسلک ہسپتال',
  },
  {
    value: 4.2,
    suffix: '',
    label: 'Patient Rating',
    labelUrdu: 'مریضوں کی اطمینان بخش ریٹنگ',
    decimals: 1,
  },
];

// Custom Hooks
function useCountUp(end: number, duration: number = 2000, start: number = 0, shouldStart: boolean = true) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    if (!shouldStart) return;

    let startTimestamp: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * (end - start) + start);
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      }
    };

    setCount(start);
    animationFrame = window.requestAnimationFrame(step);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, start, shouldStart]);

  return count;
}

function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isIntersecting) {
        setIsIntersecting(true);
      }
    }, { threshold: 0.1, ...options });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, isIntersecting, options]);

  return isIntersecting;
}

// Components
const StatCard = memo(({ stat, index, isVisible }: { stat: Stat; index: number; isVisible: boolean }) => {
  const count = useCountUp(isVisible ? stat.value : 0, 2500, 0, isVisible);
  const displayValue = stat.decimals !== undefined ? count.toFixed(stat.decimals) : count.toFixed(0);

  return (
    <div 
      className="text-center px-2 sm:px-3 md:px-4 transform transition-all duration-700 ease-out"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      {/* Mobile-optimized stat number: smaller on mobile, scales up */}
      <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#2F5D50] mb-1 sm:mb-2 tracking-tight">
        {displayValue}{stat.suffix}
      </div>
      {/* Mobile-optimized labels: smaller font, tighter spacing */}
      <div className="text-[#2F5D50] font-semibold uppercase tracking-wider text-[9px] sm:text-[10px] md:text-xs">
        {stat.label}
      </div>
      <div className="text-[10px] sm:text-[11px] md:text-xs text-[#2F5D50]/70 mt-0.5 sm:mt-1">
        {stat.labelUrdu}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

/* RESPONSIVE FLEET SLIDER: Optimized card heights, better mobile layout */
const FleetSlider = memo(() => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(sliderRef);

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % FLEET_VEHICLES.length);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev - 1 + FLEET_VEHICLES.length) % FLEET_VEHICLES.length);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const currentVehicle = FLEET_VEHICLES[currentSlide];

  return (
    <div 
      ref={sliderRef}
      className="relative w-full"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s ease-out',
      }}
    >
      {/* Reduced padding on mobile: py-6 mobile, py-8 tablet, py-10 desktop */}
      <div className="relative bg-gradient-to-br from-[#1a362e] via-[#2F5D50] to-[#1a362e] py-6 sm:py-8 md:py-10 lg:py-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-[#3FA58E]/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" aria-hidden="true" />

        {/* Vehicle Image: Mobile-first height scaling */}
        <div className="relative mb-4 sm:mb-6 md:mb-8">
          {/* Height: mobile 180px, sm 220px, md 260px, lg 300px */}
          <div className="relative h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] flex items-center justify-center px-3 sm:px-4">
            {FLEET_VEHICLES.map((vehicle, index) => (
              <div
                key={vehicle.id}
                className="absolute inset-0 flex items-center justify-center transition-all duration-400 ease-out"
                style={{
                  opacity: index === currentSlide ? 1 : 0,
                  transform: index === currentSlide ? 'scale(1)' : 'scale(0.95)',
                  pointerEvents: index === currentSlide ? 'auto' : 'none',
                }}
              >
                <Image
                  src={vehicle.image}
                  alt={`${vehicle.name} - ${vehicle.nameUrdu} - Premium medical transport vehicle with ${vehicle.capacity} seats for healthcare services in Pakistan`}
                  width={1200}
                  height={700}
                  className="max-h-full w-auto object-contain drop-shadow-2xl"
                  priority={index === 0}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content: Reduced padding and spacing on mobile */}
        <div className="text-center max-w-4xl mx-auto px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 relative z-20">
          {/* Capacity Badge: Smaller on mobile */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-[#3FA58E] px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full text-[10px] sm:text-xs md:text-sm font-bold mb-3 sm:mb-4">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
            <span>{currentVehicle.capacity} SEATS / {currentVehicle.capacity} نشستیں</span>
          </div>

          {/* Vehicle Name: Mobile-first sizing */}
          <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-1.5 sm:mb-2 leading-tight drop-shadow-lg">
            {currentVehicle.name}
          </h3>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#3FA58E] font-semibold mb-3 sm:mb-4 drop-shadow-md">
            {currentVehicle.nameUrdu}
          </p>

          {/* Description: Tighter spacing on mobile */}
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 font-medium leading-relaxed mb-1 sm:mb-1.5 max-w-3xl mx-auto drop-shadow-md">
            {currentVehicle.description}
          </p>
          <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-white/70 leading-relaxed max-w-3xl mx-auto drop-shadow-md mb-4 sm:mb-5 md:mb-6">
            {currentVehicle.descriptionUrdu}
          </p>

          {/* Button: Mobile-optimized sizing */}
          <Link
            href="/book"
            className="relative z-30 inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-7 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-4 lg:py-5 bg-gradient-to-r from-[#3FA58E] to-[#2dd4bf] hover:from-[#2dd4bf] hover:to-[#3FA58E] text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 text-sm sm:text-base md:text-lg shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <span className="flex flex-col leading-tight">
              <span>Book This Vehicle</span>
              <span className="text-[10px] sm:text-xs font-normal text-white/90">
                یہ گاڑی ابھی بُک کریں
              </span>
            </span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </Link>

          {/* Slide Indicators: Smaller on mobile */}
          <div className="flex justify-center gap-2 sm:gap-2.5 mt-4 sm:mt-5 md:mt-6">
            {FLEET_VEHICLES.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isAnimating && index !== currentSlide) {
                    setIsAnimating(true);
                    setCurrentSlide(index);
                    setTimeout(() => setIsAnimating(false), 400);
                  }
                }}
                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 sm:w-10 bg-[#3FA58E] shadow-lg shadow-[#3FA58E]/50'
                    : 'w-2 sm:w-2.5 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Arrows: Smaller on mobile, hidden on very small screens */}
        <button
          onClick={prevSlide}
          disabled={isAnimating}
          className="hidden sm:flex absolute left-2 sm:left-4 md:left-8 lg:left-12 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-gradient-to-r hover:from-[#3FA58E] hover:to-[#2dd4bf] text-white border border-white/20 p-2 sm:p-3 md:p-4 lg:p-5 rounded-full shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group z-10 hover:scale-110"
          aria-label="Previous vehicle"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={nextSlide}
          disabled={isAnimating}
          className="hidden sm:flex absolute right-2 sm:right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-gradient-to-r hover:from-[#3FA58E] hover:to-[#2dd4bf] text-white border border-white/20 p-2 sm:p-3 md:p-4 lg:p-5 rounded-full shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group z-10 hover:scale-110"
          aria-label="Next vehicle"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
});

FleetSlider.displayName = 'FleetSlider';

const FeatureCard = memo(({ feature, index }: { feature: Feature; index: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(cardRef);

  return (
    <article
      ref={cardRef}
      /* Reduced padding on mobile: p-5 mobile, p-7 tablet, p-10 desktop */
      className="bg-gray-50 p-5 sm:p-6 md:p-8 lg:p-10 xl:p-12 rounded-lg sm:rounded-xl border border-gray-100 hover:border-[#3FA58E]/30 hover:shadow-lg transition-all duration-300 group"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-out',
        transitionDelay: `${index * 150}ms`,
      }}
    >
      <div className="text-[#3FA58E] mb-4 sm:mb-5 md:mb-6 lg:mb-8 group-hover:scale-110 transition-transform duration-300">
        {feature.icon}
      </div>
      {/* Mobile-first heading sizes */}
      <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-[#2F5D50] mb-2 sm:mb-3 md:mb-4 leading-snug">
        {feature.title}
      </h3>
      {/* Mobile-first description sizes */}
      <p className="text-[#2F5D50]/75 font-medium leading-relaxed text-xs sm:text-sm md:text-base lg:text-lg">
        {feature.description}
      </p>
    </article>
  );
});

FeatureCard.displayName = 'FeatureCard';

/* RESPONSIVE HERO: Mobile-first, gradient on left, content left-aligned */
function HeroSection() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section 
      /* Mobile-first min-height: 500px mobile, 600px sm, 700px md, 750px lg, 85vh xl */
      className="relative min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:min-h-[750px] xl:min-h-[85vh] flex items-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/Home hero.webp"
          alt="Premium medical transport services in Pakistan - Professional healthcare transportation with trained drivers and hospital-grade safety"
          fill
          className="object-cover object-center"
          priority
          quality={95}
        />
      </div>

      {/* Gradient: stronger on mobile for better text contrast */}
      <div 
        className="absolute inset-0 z-[1]" 
        style={{
          background: 'linear-gradient(to right, #2F5D50 0%, #2F5D50 50%, rgba(47, 93, 80, 0.8) 70%, rgba(47, 93, 80, 0.3) 90%, transparent 100%)'
        }}
        aria-hidden="true"
      />

      {/* Mobile-first padding: py-12 mobile, scales up */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32">
        {/* Content: max-w adjusted for mobile */}
        <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          {/* Badge: Mobile-optimized */}
          <div 
            className="inline-flex items-center gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[#3FA58E] text-[10px] sm:text-xs md:text-sm font-bold mb-4 sm:mb-6 md:mb-8 lg:mb-10 transition-all duration-1000 ease-out"
            style={{
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateX(0)' : 'translateX(-30px)',
            }}
          >
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" aria-hidden="true" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-center sm:text-left">
              <span className="text-[10px] sm:text-xs md:text-sm">Pakistan&apos;s Most Trusted Medical Transport Platform</span>
              <span className="hidden sm:inline text-white/80" aria-hidden="true">•</span>
              <span className="text-white/90 text-[9px] sm:text-[10px] md:text-sm">
                پاکستان کی قابلِ اعتماد میڈیکل ٹرانسپورٹ سروس
              </span>
            </div>
          </div>

          {/* Main Heading: Mobile-first sizing */}
          <h1 
            id="hero-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black mb-2 sm:mb-3 md:mb-4 text-white leading-[1.05] tracking-tight transition-all duration-1000 ease-out drop-shadow-2xl"
            style={{
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateY(0)' : 'translateY(30px)',
              transitionDelay: '200ms',
            }}
          >
            Care That{' '}
            <span className="bg-gradient-to-r from-[#3FA58E] to-[#2dd4bf] bg-clip-text text-transparent">
              Moves
            </span>{' '}
            You
          </h1>
          
          {/* Urdu tagline: Mobile-optimized */}
          <p 
            className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white/95 mb-3 sm:mb-4 md:mb-6 font-semibold drop-shadow-lg transition-all duration-1000 ease-out"
            style={{
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateY(0)' : 'translateY(30px)',
              transitionDelay: '400ms',
            }}
          >
            خیال جو آپ کو منزل تک پہنچائے
          </p>

          {/* Description: Mobile-first sizing, line breaks adjusted */}
          <p 
            className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-6 sm:mb-8 md:mb-10 lg:mb-12 text-white/95 leading-relaxed max-w-full sm:max-w-xl md:max-w-2xl font-medium drop-shadow-lg transition-all duration-1000 ease-out"
            style={{
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateY(0)' : 'translateY(30px)',
              transitionDelay: '600ms',
            }}
          >
            Bridging the gap between home and healthcare with premium, hospital-grade transport solutions.
            <br className="hidden sm:block" />
            <span className="text-white/90 text-xs sm:text-sm md:text-base lg:text-lg block mt-1 sm:mt-2">
              گھر اور ہسپتال کے درمیان محفوظ، آرام دہ اور معیاری سفر کی مکمل سہولت۔
            </span>
          </p>

          {/* CTA Buttons: Mobile-first, stack on mobile, row on tablet+ */}
          <div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-5 transition-all duration-1000 ease-out"
            style={{
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'scale(1)' : 'scale(0.9)',
              transitionDelay: '800ms',
            }}
          >
            {/* Primary button: Mobile-optimized sizing */}
            <Link
              href="/book"
              className="group px-6 sm:px-7 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-4 lg:py-5 bg-[#3FA58E] hover:bg-white text-white hover:text-[#2F5D50] font-bold rounded-lg transition-all duration-300 text-center text-sm sm:text-base md:text-lg flex items-center justify-center gap-2 sm:gap-3 shadow-2xl hover:shadow-xl hover:scale-105"
            >
              <span className="flex flex-col leading-tight">
                <span>Book Your Ride</span>
                <span className="text-[10px] sm:text-xs font-normal text-white/90 group-hover:text-[#2F5D50]/80">
                  اپنی سواری ابھی بُک کریں
                </span>
              </span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>

            {/* Secondary button: Mobile-optimized sizing */}
            <Link
              href="/auth/register"
              className="px-6 sm:px-7 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-4 lg:py-5 bg-white/10 backdrop-blur-md hover:bg-white text-white hover:text-[#2F5D50] font-bold rounded-lg transition-all duration-300 text-center text-sm sm:text-base md:text-lg border border-white/30 hover:scale-105 shadow-lg"
            >
              <span className="flex flex-col leading-tight">
                <span>Get Started</span>
                <span className="text-[10px] sm:text-xs font-normal text-white/90">
                  اپنا اکاؤنٹ بنائیں
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* RESPONSIVE "YOUR CARE ON THE MOVE": Reduced height on mobile */
function YourCareOnTheMoveSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(sectionRef);

  return (
    <section
      ref={sectionRef}
      /* Mobile-first padding: py-10 mobile, scales up */
      className="relative bg-gradient-to-br from-[#1a362e] via-[#2F5D50] to-[#1a362e] py-10 sm:py-12 md:py-14 lg:py-16 overflow-hidden"
      aria-label="Your care on the move - Medical transport commitment"
    >
      {/* Background decorations: smaller on mobile */}
      <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] md:w-[500px] lg:w-[600px] h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] bg-[#3FA58E]/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-[300px] sm:w-[400px] md:w-[500px] lg:w-[600px] h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] bg-[#2dd4bf]/10 rounded-full blur-3xl" aria-hidden="true" />

      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        {/* Mobile: stack vertically, tablet+: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center">
          {/* Text: order-2 on mobile (animation first), order-1 on lg+ */}
          <div 
            ref={textRef}
            className="text-center lg:text-left order-2 lg:order-1"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
            }}
          >
            {/* Mobile-first heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
              Your Care,{' '}
              <span className="bg-gradient-to-r from-[#3FA58E] to-[#2dd4bf] bg-clip-text text-transparent">
                On The Move
              </span>
            </h2>
            {/* Mobile-first description */}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/85 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-1.5 sm:mb-2">
              Experience seamless medical transport with our advanced tracking and specialized care.
            </p>
            <p className="text-xs sm:text-sm md:text-base text-white/65 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              ہماری جدید ٹریکنگ اور خصوصی نگہداشت کے ساتھ آسان میڈیکل ٹرانسپورٹ کا تجربہ کریں۔
            </p>
          </div>

          {/* Lottie Animation: order-1 on mobile (shows first), smaller size */}
          <div 
            ref={animationRef}
            className="flex items-center justify-center lg:justify-end order-1 lg:order-2"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.8s ease-out 0.2s, transform 0.8s ease-out 0.2s',
            }}
          >
            {/* Mobile: max-w-xs, tablet: max-w-sm, desktop: max-w-md/lg */}
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
              <CarLottie />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* CAR LOTTIE: Responsive sizing */
function CarLottie() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let animationInstance: any = null;

    import('lottie-web').then((lottie) => {
      fetch('/car.json')
        .then((response) => response.json())
        .then((data) => {
          if (containerRef.current && !animationInstance) {
            animationInstance = lottie.default.loadAnimation({
              container: containerRef.current,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: data,
            });
            setIsLoaded(true);
          }
        })
        .catch((error) => {
          console.error('Error loading Lottie animation:', error);
        });
    });

    return () => {
      if (animationInstance) {
        animationInstance.destroy();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      /* Mobile: min-height 150px, scales up */
      className="w-full h-auto aspect-square"
      style={{
        minHeight: '150px',
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.5s ease-in',
      }}
      aria-label="Animated medical transport vehicle illustration"
      role="img"
    />
  );
}

/* RESPONSIVE STATS: Tighter spacing on mobile */
function StatsSection() {
  const statsRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(statsRef);

  const statCards = useMemo(
    () => STATS.map((stat, index) => (
      <StatCard key={index} stat={stat} index={index} isVisible={isVisible} />
    )),
    [isVisible]
  );

  return (
    <section 
      ref={statsRef} 
      /* Mobile-first padding */
      className="relative z-20 py-12 sm:py-14 md:py-16 lg:py-20 xl:py-24 bg-gradient-to-b from-white to-gray-50"
      aria-label="Platform statistics and achievements - Total rides, expert drivers, hospitals, patient ratings"
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Reduced padding on mobile: px-3 py-4, scales up */}
        <div className="bg-white border border-gray-100 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-10 lg:py-10 rounded-xl sm:rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-10 shadow-2xl">
          {statCards}
        </div>
      </div>
    </section>
  );
}

/* RESPONSIVE FEATURES: Mobile-optimized card layout */
function FeaturesSection() {
  const featureCards = useMemo(
    () => FEATURES.map((feature, index) => (
      <FeatureCard key={index} feature={feature} index={index} />
    )),
    []
  );

  return (
    <section 
      /* Mobile-first padding */
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-white"
      aria-labelledby="features-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Header: Mobile-optimized spacing */}
        <header className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16 xl:mb-20 max-w-3xl mx-auto">
          <h2 
            id="features-heading"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-[#2F5D50] mb-1.5 sm:mb-2 md:mb-3 tracking-tight"
          >
            Standard of Excellence
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-[#2F5D50]/75 mb-2 sm:mb-3 md:mb-4 font-medium">
            معیاری اور محفوظ میڈیکل ٹرانسپورٹ کا اعلی معیار
          </p>
          <div className="w-16 sm:w-20 md:w-24 h-1 sm:h-1.5 bg-[#3FA58E] mx-auto rounded-full mb-3 sm:mb-4 md:mb-6" aria-hidden="true"></div>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-[#2F5D50]/70 font-medium px-4 leading-relaxed">
            Every journey is backed by our commitment to safety, reliability, and professional care.
            <br className="hidden sm:block" />
            <span className="text-[#2F5D50]/65 text-xs sm:text-sm md:text-base block mt-1 sm:mt-2">
              ہر سفر میں ہماری ترجیح حفاظت، اعتماد اور پیشہ ورانہ خیال رکھنا ہے۔
            </span>
          </p>
        </header>

        {/* Grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12">
          {featureCards}
        </div>
      </div>
    </section>
  );
}

/* RESPONSIVE FLEET SECTION */
function FleetSection() {
  return (
    <section 
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-gradient-to-b from-gray-50 to-white"
      aria-labelledby="fleet-heading"
    >
      <div className="w-full">
        {/* Header: Mobile-optimized */}
        <header className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16 xl:mb-20 px-4 sm:px-6">
          <h2 
            id="fleet-heading"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-[#2F5D50] mb-1.5 sm:mb-2 md:mb-3 tracking-tight"
          >
            Our Premium Fleet
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-[#2F5D50]/75 mb-2 sm:mb-3 font-medium">
            ہماری معیاری گاڑیوں کی رینج
          </p>
          <div className="w-16 sm:w-20 md:w-24 h-1 sm:h-1.5 bg-[#3FA58E] mx-auto rounded-full mb-3 sm:mb-4 md:mb-6" aria-hidden="true"></div>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-[#2F5D50]/70 font-medium max-w-3xl mx-auto leading-relaxed">
            Choose the perfect vehicle for your medical journey with comfort, safety, and professionalism.
            <br className="hidden sm:block" />
            <span className="text-[#2F5D50]/65 text-xs sm:text-sm md:text-base block mt-1 sm:mt-2">
              اپنے میڈیکل سفر کے لیے ایسی گاڑی منتخب کریں جو آرام دہ، محفوظ اور پیشہ ورانہ معیار کے مطابق ہو۔
            </span>
          </p>
        </header>

        <FleetSlider />
      </div>
    </section>
  );
}

/* RESPONSIVE CTA SECTION */
function CTASection() {
  const ctaRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(ctaRef);

  return (
    <section 
      ref={ctaRef}
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-white"
      aria-labelledby="cta-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div 
          /* Reduced padding on mobile: p-6 mobile, scales up */
          className="bg-gradient-to-br from-[#E6F1EC] to-white p-6 sm:p-10 md:p-14 lg:p-20 xl:p-24 rounded-xl sm:rounded-2xl md:rounded-3xl text-center border border-[#2F5D50]/10 shadow-2xl transition-all duration-1000 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Mobile-first heading */}
            <h2 
              id="cta-heading"
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-[#2F5D50] mb-1.5 sm:mb-2 md:mb-3 leading-tight tracking-tight"
            >
              Your Journey to Wellness Starts Here
            </h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-[#2F5D50]/80 mb-3 sm:mb-4 md:mb-6">
              آپ کی صحت مند زندگی کا سفر یہیں سے شروع ہوتا ہے
            </p>

            {/* Quote: Mobile-optimized */}
            <blockquote className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#2F5D50]/70 mb-6 sm:mb-8 md:mb-10 lg:mb-12 font-medium italic">
              &quot;We aren&apos;t just a transport service. We are your partner in healing.&quot;
              <br />
              <cite className="not-italic text-xs sm:text-sm md:text-base lg:text-lg text-[#2F5D50]/80 block mt-1 sm:mt-2">
                ہم صرف ٹرانسپورٹ سروس نہیں، بلکہ آپ کے علاج اور صحت یابی کے سفر کے ساتھی ہیں۔
              </cite>
            </blockquote>

            {/* Buttons: Stack on mobile, row on tablet+ */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center">
              <Link
                href="/book"
                className="px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 lg:py-6 bg-[#2F5D50] hover:bg-[#3FA58E] text-white font-bold rounded-lg transition-all duration-300 text-sm sm:text-base md:text-lg shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span className="flex flex-col leading-tight">
                  <span>Schedule Appointment</span>
                  <span className="text-[10px] sm:text-xs font-normal text-white/90">
                    اپنی سواری یا اپوائنٹمنٹ شیڈول کریں
                  </span>
                </span>
              </Link>

              <Link
                href="/auth/register"
                className="px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 lg:py-6 bg-white text-[#2F5D50] border-2 border-[#2F5D50]/20 font-bold rounded-lg transition-all duration-300 hover:border-[#3FA58E] hover:shadow-lg hover:scale-105 text-sm sm:text-base md:text-lg"
              >
                <span className="flex flex-col leading-tight">
                  <span>Open Account</span>
                  <span className="text-[10px] sm:text-xs font-normal text-[#2F5D50]/80">
                    اپنا خان ہب اکاؤنٹ بنائیں
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Main Page Component
export default function MedicalTransportPage() {
  return (
    <main className="bg-white">
      <HeroSection />
      <YourCareOnTheMoveSection />
      <StatsSection />
      <FeaturesSection />
      <FleetSection />
      <CTASection />
    </main>
  );
}