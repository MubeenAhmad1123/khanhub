// FILE: apps/transport/src/app/page.tsx
// DESCRIPTION: Home (Rider) page for Khanhub Transport with Premium Animations
// Path: C:\Users\abc\Documents\Khanhub\khanhub\apps\transport\src\app

'use client'

import { useEffect, useRef, useState } from 'react'

const VEHICLES = [
  { 
    id: 1, 
    name: 'Toyota Corolla', 
    capacity: 4, 
    description: 'Comfortable sedan for city rides and hospital visits. Perfect for individual patients and small families.',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=800'
  },
  { 
    id: 2, 
    name: 'Honda Civic', 
    capacity: 4, 
    description: 'Premium comfort for your medical journeys with advanced safety features and luxurious interiors.',
    image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=800'
  },
  { 
    id: 3, 
    name: 'Toyota Hiace', 
    capacity: 8, 
    description: 'Spacious van for small group transport with wheelchair accessibility and medical equipment support.',
    image: 'https://images.unsplash.com/photo-1527186763489-b257f6b4a0a8?q=80&w=800'
  },
  { 
    id: 4, 
    name: 'Toyota Coaster', 
    capacity: 16, 
    description: 'Ideal for medium group hospital transfers with professional medical attendant support.',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800'
  },
]

const FEATURES = [
  {
    id: 1,
    title: 'Medical-Grade Safety',
    description: 'All vehicles equipped with advanced medical monitoring systems, emergency equipment, and trained medical staff for your peace of mind.',
    image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?q=80&w=800'
  },
  {
    id: 2,
    title: '24/7 Availability',
    description: 'Round-the-clock service ensures premium medical transport day or night.',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=800'
  },
  {
    id: 3,
    title: 'Door-to-Door Service',
    description: 'Seamless transfers from home to hospital with personalized care.',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800'
  },
]

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CarAnimationSection />
      <VehiclesSection />
      <FeaturesSection />
      <CTASection />
    </>
  )
}

function HeroSection() {
  const [showCTA, setShowCTA] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCTA(true)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="hero">
      <img 
        src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2000" 
        alt="Premium medical transport at night" 
        className="hero-image"
      />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="container">
          <div className="hero-text">
            <h1>Journey to Wellness Begins Here</h1>
            <p>
              Experience the pinnacle of medical travel excellence. Our dedicated fleet 
              combines hospital-grade safety standards with the comfort of premium transport. 
              From your doorstep to our world-class facilities, every mile is designed around 
              your wellbeing.
            </p>
            <div className={`hero-cta ${showCTA ? 'show' : ''}`}>
              <a href="/book" className="btn btn-primary">Book Your Journey</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CarAnimationSection() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const sectionTop = rect.top
      const sectionHeight = rect.height

      if (sectionTop < windowHeight && sectionTop + sectionHeight > 0) {
        const progress = Math.max(
          0,
          Math.min(1, (windowHeight - sectionTop) / (windowHeight + sectionHeight / 2))
        )
        setScrollProgress(progress)

        if (progress > 0.4 && !showContent) {
          setShowContent(true)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showContent])

  const carPosition = scrollProgress * 100

  return (
    <section ref={sectionRef} className="car-animation-section">
      <div className="container">
        <div className="car-animation-wrapper">
          <div 
            className="car-moving" 
            style={{ 
              left: `${carPosition}%`,
              transform: `translateX(-50%) translateY(-50%)`
            }}
          >
            <img 
              src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400" 
              alt="Medical transport vehicle"
              style={{ width: '280px', height: 'auto', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}
            />
          </div>

          <div className={`car-animation-content ${showContent ? 'visible' : ''}`}>
            <h2>Your Health, Our Priority</h2>
            <p>
              Every journey with Khanhub Transport is more than just a ride—it's a commitment 
              to your wellbeing. Our medical-grade vehicles and trained professionals ensure 
              that your comfort and safety are never compromised.
            </p>
            <a href="/book" className="btn btn-primary">Schedule Your Ride</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function VehiclesSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentVehicle = VEHICLES[currentIndex]

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % VEHICLES.length)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + VEHICLES.length) % VEHICLES.length)
  }

  return (
    <section className="vehicles-premium-section">
      <div className="container">
        <div className="section-header">
          <h2>Our Premium Fleet</h2>
          <p>Choose the perfect vehicle for your medical journey</p>
        </div>

        <div className="vehicle-showcase">
          {/* Left: Details box (30%) */}
          <div className="vehicle-showcase-details">
            <h3>{currentVehicle.name}</h3>
            <div className="vehicle-showcase-capacity">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Capacity: {currentVehicle.capacity} passengers
            </div>
            <p>{currentVehicle.description}</p>

            <div className="vehicle-showcase-actions">
              <button type="button" className="btn btn-outline" onClick={handlePrev}>
                Previous
              </button>
              <button type="button" className="btn btn-outline" onClick={handleNext}>
                Next
              </button>
              <a href="/book" className="btn btn-primary">
                Book This Vehicle
              </a>
            </div>

            <div className="vehicle-showcase-indicator">
              {currentIndex + 1} / {VEHICLES.length}
            </div>
          </div>

          {/* Right: Image (70%) */}
          <div className="vehicle-showcase-image-wrapper">
            <div className="vehicle-showcase-image">
              <img src={currentVehicle.image} alt={currentVehicle.name} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


function FeaturesSection() {
  const [visibleFeatures, setVisibleFeatures] = useState<number[]>([])
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]) // <-- missing ) fixed

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = featureRefs.current.indexOf(entry.target as HTMLDivElement)
            if (index !== -1 && !visibleFeatures.includes(index)) {
              setVisibleFeatures((prev) => [...prev, index])
            }
          }
        })
      },
      { threshold: 0.2 }
    )

    featureRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [visibleFeatures])

  return (
    <section className="features-premium-section">
      <div className="container">
        <div className="section-header">
          <h2>Why Choose Khanhub Transport</h2>
          <p>Premium medical transport with uncompromising safety</p>
        </div>

        <div className="features-premium-grid">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.id}
              ref={(el) => { featureRefs.current[index] = el }}
              className={`feature-premium-item ${
                index % 2 === 0 ? 'text-left' : 'text-right'
              } ${visibleFeatures.includes(index) ? 'visible' : ''}`}
            >
              <div className="feature-premium-text">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
              <div className="feature-premium-image">
                <img src={feature.image} alt={feature.title} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


function CTASection() {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-content">
          <h2>Ready to Book Your Ride?</h2>
          <p>
            Experience premium medical transport. Our team is ready to coordinate your personalized journey.
          </p>
          <div className="cta-buttons">
            <a href="/book" className="btn btn-primary">Book Now</a>
            <a href="/auth/login" className="btn btn-outline">Login</a>
          </div>
        </div>
      </div>
    </section>
  )
}
