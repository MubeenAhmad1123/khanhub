'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { ArrowRight, Shield, MapPin, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Lazy load Lottie animation to reduce initial bundle
const CarLottie = dynamic(() => import('@/components/CarLottie'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-auto aspect-square max-w-[240px] sm:max-w-xs lg:max-w-md min-h-[180px] bg-white/5 rounded-lg animate-pulse" />
  ),
});

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

// Optimized Custom Hooks
function useCountUp(end: number, duration: number = 2000, shouldStart: boolean = true) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!shouldStart) return;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setCount(progress * end);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, shouldStart]);

  return count;
}

function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = { threshold: 0.1 }
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    const element = ref.current;
    if (!element || isIntersecting) return;

    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observerRef.current?.disconnect();
      }
    }, options);

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref, isIntersecting, options]);

  return isIntersecting;
}

// Components
const StatCard = memo(({ stat, index, isVisible }: { stat: Stat; index: number; isVisible: boolean }) => {
  const count = useCountUp(isVisible ? stat.value : 0, 2000, isVisible);
  const displayValue = stat.decimals !== undefined ? count.toFixed(stat.decimals) : Math.floor(count);

  return (
    <div
      className="text-center px-2 sm:px-4 transition-opacity duration-500"
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2F5D50] mb-2 tracking-tight">
        {displayValue}{stat.suffix}
      </div>
      <div className="text-[#2F5D50] font-semibold uppercase tracking-wider text-[10px] sm:text-xs">
        {stat.label}
      </div>
      <div className="text-xs sm:text-sm text-[#2F5D50]/70 mt-1">
        {stat.labelUrdu}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

const FleetSlider = memo(() => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(sliderRef);

  // Touch state — stored in refs so they never trigger re-renders
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  // Tracks whether the gesture has been classified as a horizontal swipe
  // so we know when to call preventDefault.
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleSlideChange = (direction: 'next' | 'prev') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) =>
      direction === 'next'
        ? (prev + 1) % FLEET_VEHICLES.length
        : (prev - 1 + FLEET_VEHICLES.length) % FLEET_VEHICLES.length
    );
    setTimeout(() => setIsAnimating(false), 300);
  };

  const resetTouchState = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
    isHorizontalSwipe.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const viewportWidth = window.innerWidth;

    // Ignore touches that start within 30 px of either screen edge —
    // those are reserved for browser back/forward navigation gestures.
    if (startX < 30 || startX > viewportWidth - 30) {
      resetTouchState();
      return;
    }

    touchStartX.current = startX;
    touchStartY.current = touch.clientY;
    touchEndX.current = null;
    touchEndY.current = null;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If we never recorded a valid start, bail immediately so we never
    // accidentally swallow an arrow-button tap.
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;

    const deltaX = Math.abs(touch.clientX - touchStartX.current);
    const deltaY = Math.abs(touch.clientY - touchStartY.current);

    // Classify the gesture once we have enough movement signal (10 px).
    if (isHorizontalSwipe.current === null && (deltaX > 10 || deltaY > 10)) {
      isHorizontalSwipe.current = deltaX > deltaY;
    }

    // Only prevent default (which would block clicks) when we are confident
    // this is a horizontal swipe. This keeps vertical scrolls and taps free.
    if (isHorizontalSwipe.current === true) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    // If we never recorded a valid start, nothing to do.
    if (
      touchStartX.current === null ||
      touchStartY.current === null ||
      touchEndX.current === null ||
      touchEndY.current === null
    ) {
      resetTouchState();
      return;
    }

    const deltaX = touchStartX.current - touchEndX.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(touchStartY.current - touchEndY.current);
    const minSwipeDistance = 40;

    // Trigger slide change only for a clear horizontal swipe.
    if (absDeltaX > minSwipeDistance && absDeltaX > absDeltaY * 1.5) {
      if (deltaX > 0) {
        // Swiped left → next slide
        handleSlideChange('next');
      } else {
        // Swiped right → previous slide
        handleSlideChange('prev');
      }
    }

    resetTouchState();
  };

  const currentVehicle = FLEET_VEHICLES[currentSlide];

  return (
    <div
      ref={sliderRef}
      className="relative w-full transition-opacity duration-700"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {/*
        Touch handlers live on this gradient wrapper.
        overflow-hidden prevents any gap / background bleed during transitions.
        touch-action: pan-y lets the browser handle vertical scrolls natively
        while our JS takes over only for confirmed horizontal swipes.
      */}
      <div
        className="relative bg-gradient-to-br from-[#1a362e] via-[#2F5D50] to-[#1a362e] py-8 sm:py-12 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Decorative blobs — pointer-events:none so they never eat touch */}
        <div
          className="absolute top-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[#3FA58E]/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/*
          Vehicle Image stack.
          - Fixed height so the container never collapses between slides.
          - overflow-hidden + relative so images never escape the box.
          - We keep ALL slides in the DOM (opacity:0 → opacity:1); there is
            always at least one fully-opaque slide, so we never see a blank frame.
        */}
        <div className="relative mb-6 sm:mb-8 overflow-hidden">
          <div className="relative h-[200px] sm:h-[280px] lg:h-[320px]">
            {FLEET_VEHICLES.map((vehicle, index) => (
              <div
                key={vehicle.id}
                className="absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-300"
                style={{
                  opacity: index === currentSlide ? 1 : 0,
                  // Keep inactive slides out of the pointer-event flow
                  pointerEvents: index === currentSlide ? 'auto' : 'none',
                  // Keep inactive slides visually present but hidden so
                  // there is no gap in the stacking context
                  visibility: index === currentSlide ? 'visible' : 'hidden',
                }}
              >
                <Image
                  src={vehicle.image}
                  alt={`${vehicle.name} - ${vehicle.nameUrdu}`}
                  width={1200}
                  height={700}
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 80vw, 1200px"
                  className="max-h-full w-auto object-contain drop-shadow-2xl"
                  priority={index === 0}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="text-center max-w-4xl mx-auto px-4 sm:px-6 pb-4 relative z-20">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-[#3FA58E] px-4 py-2 rounded-full text-xs font-bold mb-4">
            <Shield className="w-4 h-4" aria-hidden="true" />
            <span>{currentVehicle.capacity} SEATS / {currentVehicle.capacity} نشستیں</span>
          </div>

          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 leading-tight drop-shadow-lg">
            {currentVehicle.name}
          </h3>
          <p className="text-xl sm:text-2xl lg:text-3xl text-[#3FA58E] font-semibold mb-4 drop-shadow-md">
            {currentVehicle.nameUrdu}
          </p>

          <p className="text-sm sm:text-base lg:text-lg text-white/90 font-medium leading-relaxed mb-1 max-w-3xl mx-auto">
            {currentVehicle.description}
          </p>
          <p className="text-xs sm:text-sm lg:text-base text-white/70 leading-relaxed max-w-3xl mx-auto mb-6">
            {currentVehicle.descriptionUrdu}
          </p>

          <Link
            href="/book"
            className="inline-flex items-center gap-3 px-7 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-[#3FA58E] to-[#2dd4bf] hover:from-[#2dd4bf] hover:to-[#3FA58E] text-white font-bold rounded-xl transition-opacity duration-300 text-base shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <span className="flex flex-col leading-tight">
              <span>Book This Vehicle</span>
              <span className="text-xs font-normal text-white/90">
                یہ گاڑی ابھی بُک کریں
              </span>
            </span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>

          {/* Navigation Hint Text */}
          <div className="flex flex-col items-center gap-3 mt-6">
            <p className="text-white/60 text-xs sm:text-sm font-medium">
              Swipe or use arrows to view all vehicles • تمام گاڑیاں دیکھنے کے لیے سوائپ کریں یا تیر استعمال کریں
            </p>

            {/* Slide Indicators / Dots */}
            <div className="flex justify-center gap-2">
              {FLEET_VEHICLES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!isAnimating && index !== currentSlide) {
                      setIsAnimating(true);
                      setCurrentSlide(index);
                      setTimeout(() => setIsAnimating(false), 300);
                    }
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'w-10 bg-[#3FA58E] shadow-lg'
                      : 'w-2.5 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/*
          Navigation Arrows.
          z-30 ensures they sit above the touch-capture layer.
          min-w / min-h guarantees a large enough tap target on mobile.
          We do NOT use disabled={isAnimating} here on purpose — on mobile,
          the 300 ms animation window is short enough that a missed tap
          during that window is confusing. Instead handleSlideChange guards
          with the isAnimating check internally.
        */}
        <button
          onClick={() => handleSlideChange('prev')}
          aria-label="Previous vehicle"
          className="absolute left-2 sm:left-4 lg:left-12 top-1/2 -translate-y-1/2 z-30
            flex items-center justify-center
            min-w-[44px] min-h-[44px]
            bg-white/10 backdrop-blur-md hover:bg-gradient-to-r hover:from-[#3FA58E] hover:to-[#2dd4bf]
            text-white border border-white/20
            p-3 sm:p-4 rounded-full shadow-2xl
            transition-opacity duration-300
            disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={() => handleSlideChange('next')}
          aria-label="Next vehicle"
          className="absolute right-2 sm:right-4 lg:right-12 top-1/2 -translate-y-1/2 z-30
            flex items-center justify-center
            min-w-[44px] min-h-[44px]
            bg-white/10 backdrop-blur-md hover:bg-gradient-to-r hover:from-[#3FA58E] hover:to-[#2dd4bf]
            text-white border border-white/20
            p-3 sm:p-4 rounded-full shadow-2xl
            transition-opacity duration-300
            disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
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
      className="bg-gray-50 p-6 sm:p-8 lg:p-10 rounded-xl border border-gray-100 hover:border-[#3FA58E]/30 hover:shadow-lg transition-opacity duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="text-[#3FA58E] mb-6">
        {feature.icon}
      </div>
      <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#2F5D50] mb-3 leading-snug">
        {feature.title}
      </h3>
      <p className="text-[#2F5D50]/75 font-medium leading-relaxed text-sm sm:text-base">
        {feature.description}
      </p>
    </article>
  );
});

FeatureCard.displayName = 'FeatureCard';

function HeroSection() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowContent(true);
  }, []);

  return (
    <section
      className="relative min-h-[550px] sm:min-h-[650px] lg:min-h-[750px] xl:min-h-[85vh] flex items-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/Home hero.webp"
          alt="Premium medical transport services in Pakistan"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
          quality={85}
        />
      </div>

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(to right, #2F5D50 0%, #2F5D50 45%, rgba(47, 93, 80, 0.85) 65%, rgba(47, 93, 80, 0.4) 85%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 max-w-7xl relative z-10 py-16 sm:py-20 lg:py-28">
        <div className="max-w-full sm:max-w-2xl lg:max-w-3xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[#3FA58E] text-xs font-bold mb-6 transition-opacity duration-700"
            style={{ opacity: showContent ? 1 : 0 }}
          >
            <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span>Pakistan&apos;s Most Trusted Medical Transport Platform</span>
              <span className="hidden sm:inline text-white/80">•</span>
              <span className="text-white/90 text-[10px] sm:text-xs">
                پاکستان کی قابلِ اعتماد میڈیکل ٹرانسپورٹ سروس
              </span>
            </div>
          </div>

          {/* Main Heading */}
          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-3 text-white leading-[1.05] tracking-tight transition-opacity duration-700 drop-shadow-2xl"
            style={{ opacity: showContent ? 1 : 0, transitionDelay: '150ms' }}
          >
            Care That{' '}
            <span className="bg-gradient-to-r from-[#3FA58E] to-[#2dd4bf] bg-clip-text text-transparent">
              Moves
            </span>{' '}
            You
          </h1>

          <p
            className="text-base sm:text-lg lg:text-xl text-white/95 mb-4 font-semibold drop-shadow-lg transition-opacity duration-700"
            style={{ opacity: showContent ? 1 : 0, transitionDelay: '300ms' }}
          >
            خیال جو آپ کو منزل تک پہنچائے
          </p>

          <p
            className="text-sm sm:text-base lg:text-lg xl:text-xl mb-8 sm:mb-10 text-white/95 leading-relaxed max-w-2xl font-medium drop-shadow-lg transition-opacity duration-700"
            style={{ opacity: showContent ? 1 : 0, transitionDelay: '450ms' }}
          >
            Bridging the gap between home and healthcare with premium, hospital-grade transport solutions.
            <span className="text-white/90 text-xs sm:text-sm lg:text-base block mt-2">
              گھر اور ہسپتال کے درمیان محفوظ، آرام دہ اور معیاری سفر کی مکمل سہولت۔
            </span>
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 transition-opacity duration-700"
            style={{ opacity: showContent ? 1 : 0, transitionDelay: '600ms' }}
          >
            <Link
              href="/book"
              className="group px-8 py-4 bg-[#3FA58E] hover:bg-white text-white hover:text-[#2F5D50] font-bold rounded-lg transition-opacity duration-300 text-center flex items-center justify-center gap-3 shadow-2xl hover:scale-105"
            >
              <span className="flex flex-col leading-tight">
                <span>Book Your Ride</span>
                <span className="text-xs font-normal text-white/90 group-hover:text-[#2F5D50]/80">
                  اپنی سواری ابھی بُک کریں
                </span>
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>

            <Link
              href="/auth/register"
              className="px-8 py-4 bg-white/10 backdrop-blur-md hover:bg-white text-white hover:text-[#2F5D50] font-bold rounded-lg transition-opacity duration-300 text-center border border-white/30 hover:scale-105 shadow-lg"
            >
              <span className="flex flex-col leading-tight">
                <span>Get Started</span>
                <span className="text-xs font-normal text-white/90">
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

function YourCareOnTheMoveSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="relative bg-gradient-to-br from-[#1a362e] via-[#2F5D50] to-[#1a362e] py-12 sm:py-16 lg:py-20 overflow-hidden"
      aria-label="Your care on the move"
    >
      <div
        className="absolute top-0 right-0 w-[500px] lg:w-[600px] h-[500px] lg:h-[600px] bg-[#3FA58E]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] lg:w-[600px] h-[500px] lg:h-[600px] bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text - Always first on mobile */}
          <div
            className="text-center lg:text-left order-1 transition-opacity duration-700"
            style={{ opacity: isVisible ? 1 : 0 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 leading-tight">
              Your Care,{' '}
              <span className="bg-gradient-to-r from-[#3FA58E] to-[#2dd4bf] bg-clip-text text-transparent">
                On The Move
              </span>
            </h2>
            <p className="text-base sm:text-lg text-white/85 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-2">
              Experience seamless medical transport with our advanced tracking and specialized care.
            </p>
            <p className="text-sm text-white/65 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              ہماری جدید ٹریکنگ اور خصوصی نگہداشت کے ساتھ آسان میڈیکل ٹرانسپورٹ کا تجربہ کریں۔
            </p>
          </div>

          {/*
            Lottie Animation — compact sizing, second on mobile.
            The wrapper has a fixed aspect-square + overflow-hidden so the
            height is reserved from the start, preventing layout shift when
            the lazy-loaded animation mounts.
          */}
          <div
            className="flex items-center justify-center lg:justify-end order-2 transition-opacity duration-700"
            style={{ opacity: isVisible ? 1 : 0, transitionDelay: '200ms' }}
          >
            <div className="w-full max-w-[240px] sm:max-w-xs md:max-w-sm lg:max-w-md aspect-square overflow-hidden">
              {isVisible && <CarLottie />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const statsRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(statsRef);

  return (
    <section
      ref={statsRef}
      className="relative z-20 py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-gray-50"
      aria-label="Platform statistics"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 max-w-7xl">
        <div className="bg-white border border-gray-100 px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10 shadow-2xl">
          {STATS.map((stat, index) => (
            <StatCard key={index} stat={stat} index={index} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section
      className="py-16 sm:py-20 lg:py-28 bg-white"
      aria-labelledby="features-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 max-w-7xl">
        <header className="text-center mb-12 lg:mb-16 max-w-3xl mx-auto">
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2F5D50] mb-3 tracking-tight"
          >
            Standard of Excellence
          </h2>
          <p className="text-sm sm:text-base text-[#2F5D50]/75 mb-4 font-medium">
            معیاری اور محفوظ میڈیکل ٹرانسپورٹ کا اعلی معیار
          </p>
          <div className="w-20 h-1.5 bg-[#3FA58E] mx-auto rounded-full mb-6" aria-hidden="true"></div>
          <p className="text-base sm:text-lg text-[#2F5D50]/70 font-medium leading-relaxed">
            Every journey is backed by our commitment to safety, reliability, and professional care.
            <span className="text-[#2F5D50]/65 text-sm block mt-2">
              ہر سفر میں ہماری ترجیح حفاظت، اعتماد اور پیشہ ورانہ خیال رکھنا ہے۔
            </span>
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FleetSection() {
  return (
    <section
      className="py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-gray-50 to-white"
      aria-labelledby="fleet-heading"
    >
      <div className="w-full">
        <header className="text-center mb-12 lg:mb-16 px-4 sm:px-6">
          <h2
            id="fleet-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2F5D50] mb-3 tracking-tight"
          >
            Our Premium Fleet
          </h2>
          <p className="text-sm sm:text-base text-[#2F5D50]/75 mb-4 font-medium">
            ہماری معیاری گاڑیوں کی رینج
          </p>
          <div className="w-20 h-1.5 bg-[#3FA58E] mx-auto rounded-full mb-6" aria-hidden="true"></div>
          <p className="text-base sm:text-lg text-[#2F5D50]/70 font-medium max-w-3xl mx-auto leading-relaxed">
            Choose the perfect vehicle for your medical journey with comfort, safety, and professionalism.
            <span className="text-[#2F5D50]/65 text-sm block mt-2">
              اپنے میڈیکل سفر کے لیے ایسی گاڑی منتخب کریں جو آرام دہ، محفوظ اور پیشہ ورانہ معیار کے مطابق ہو۔
            </span>
          </p>
        </header>

        <FleetSlider />
      </div>
    </section>
  );
}

function CTASection() {
  const ctaRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(ctaRef);

  return (
    <section
      ref={ctaRef}
      className="py-16 sm:py-20 lg:py-28 bg-white"
      aria-labelledby="cta-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 max-w-7xl">
        <div
          className="bg-gradient-to-br from-[#E6F1EC] to-white p-8 sm:p-14 lg:p-20 rounded-3xl text-center border border-[#2F5D50]/10 shadow-2xl transition-opacity duration-700"
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <div className="max-w-3xl mx-auto">
            <h2
              id="cta-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2F5D50] mb-3 leading-tight tracking-tight"
            >
              Your Journey to Wellness Starts Here
            </h2>
            <p className="text-sm sm:text-base text-[#2F5D50]/80 mb-6">
              آپ کی صحت مند زندگی کا سفر یہیں سے شروع ہوتا ہے
            </p>

            <blockquote className="text-lg sm:text-xl lg:text-2xl text-[#2F5D50]/70 mb-10 font-medium italic">
              &quot;We aren&apos;t just a transport service. We are your partner in healing.&quot;
              <cite className="not-italic text-sm sm:text-base text-[#2F5D50]/80 block mt-2">
                ہم صرف ٹرانسپورٹ سروس نہیں، بلکہ آپ کے علاج اور صحت یابی کے سفر کے ساتھی ہیں۔
              </cite>
            </blockquote>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/book"
                className="px-10 py-5 bg-[#2F5D50] hover:bg-[#3FA58E] text-white font-bold rounded-lg transition-opacity duration-300 shadow-lg hover:scale-105"
              >
                <span className="flex flex-col leading-tight">
                  <span>Schedule Appointment</span>
                  <span className="text-xs font-normal text-white/90">
                    اپنی سواری یا اپوائنٹمنٹ شیڈول کریں
                  </span>
                </span>
              </Link>

              <Link
                href="/auth/register"
                className="px-10 py-5 bg-white text-[#2F5D50] border-2 border-[#2F5D50]/20 font-bold rounded-lg transition-opacity duration-300 hover:border-[#3FA58E] hover:scale-105"
              >
                <span className="flex flex-col leading-tight">
                  <span>Open Account</span>
                  <span className="text-xs font-normal text-[#2F5D50]/80">
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