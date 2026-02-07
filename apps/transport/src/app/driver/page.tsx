// FILE: apps/transport/src/app/driver/page.tsx
// DESCRIPTION: Driver page for Khanhub Transport
// Path: C:\Users\abc\Documents\Khanhub\khanhub\apps\transport\src\app\driver

'use client'

import { useEffect, useState } from 'react'

const VEHICLES = [
  { id: 1, name: 'Toyota Corolla', capacity: 4, description: 'Perfect for solo driving, high demand routes' },
  { id: 2, name: 'Honda Civic', capacity: 4, description: 'Premium segment with better earnings' },
  { id: 3, name: 'Toyota Hiace', capacity: 8, description: 'Group bookings, higher per-trip income' },
  { id: 4, name: 'Toyota Coaster', capacity: 16, description: 'Medical group transfers, premium rates' },
  { id: 5, name: 'Daewoo Bus', capacity: 30, description: 'Maximum capacity, highest earnings potential' },
]

export default function DriverPage() {
  return (
    <>
      <DriverHero />
      <DriverBenefits />
      <DriverVehicles />
      <DriverSteps />
      <DriverCTA />
    </>
  )
}

function DriverHero() {
  return (
    <section className="hero">
      <img 
        src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2000" 
        alt="Professional driver" 
        className="hero-image"
      />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="container">
          <div className="hero-text">
            <h1>Drive with Khanhub Transport</h1>
            <p>
              Join our professional network of medical transport drivers. Earn while helping 
              patients and families reach their healthcare destinations safely and comfortably.
            </p>
            <div className="hero-cta">
              <a href="/auth/register" className="btn btn-primary">Become a Driver</a>
              <a href="/auth/login" className="btn btn-secondary">Driver Login</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DriverBenefits() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h2>Why Drive with Us</h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-500)', marginTop: 'var(--space-sm)' }}>
            Professional opportunities with meaningful impact
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>Predictable Income</h3>
            <p>
              Hospital-linked trips mean steady work. Consistent demand from patients, staff, 
              and medical appointments ensures reliable earnings.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3>Hospital-Approved</h3>
            <p>
              Be part of the official Khanhub network. Gain trust and credibility as a 
              hospital-verified professional driver.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3>24/7 Support</h3>
            <p>
              Never drive alone. Our driver support team is available around the clock for 
              any assistance you need.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3>Flexible Schedule</h3>
            <p>
              Choose your own hours and work when it suits you. Full-time or part-time, 
              you're in control of your schedule.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3>Professional Training</h3>
            <p>
              Comprehensive training in medical transport, patient care, and emergency 
              response procedures.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3>Welfare Network</h3>
            <p>
              Access to healthcare benefits, insurance coverage, and welfare support as part 
              of the Khanhub family.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function DriverVehicles() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slidesPerView, setSlidesPerView] = useState(1)

  useEffect(() => {
    const updateSlidesPerView = () => {
      if (window.innerWidth >= 1024) {
        setSlidesPerView(3)
      } else if (window.innerWidth >= 768) {
        setSlidesPerView(2)
      } else {
        setSlidesPerView(1)
      }
    }

    updateSlidesPerView()
    window.addEventListener('resize', updateSlidesPerView)
    return () => window.removeEventListener('resize', updateSlidesPerView)
  }, [])

  const maxIndex = Math.max(0, VEHICLES.length - slidesPerView)

  const next = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex))
  const prev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0))

  return (
    <section className="vehicles-section">
      <div className="container-wide">
        <div className="vehicles-header">
          <h2>Vehicle Options</h2>
          <p>Choose your preferred vehicle category and earnings potential</p>
        </div>

        <div className="vehicles-slider-wrapper">
          {currentIndex > 0 && (
            <button className="slider-nav prev" onClick={prev} aria-label="Previous">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div className="vehicles-slider">
            <div 
              className="vehicles-track" 
              style={{ transform: `translateX(-${currentIndex * (100 / slidesPerView)}%)` }}
            >
              {VEHICLES.map((vehicle) => (
                <div key={vehicle.id} className="vehicle-slide">
                  <div className="vehicle-item">
                    <div className="vehicle-image-placeholder">
                      <svg fill="none" stroke="#2F5D50" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div className="vehicle-info">
                      <h3 className="vehicle-name">{vehicle.name}</h3>
                      <p className="vehicle-description">{vehicle.description}</p>
                      <div className="vehicle-capacity">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Capacity: {vehicle.capacity} passengers
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {currentIndex < maxIndex && (
            <button className="slider-nav next" onClick={next} aria-label="Next">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function DriverSteps() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h2>How to Get Started</h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-500)', marginTop: 'var(--space-sm)' }}>
            Four simple steps to begin your journey with us
          </p>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {[
            {
              number: 1,
              title: 'Register Your Account',
              description: 'Fill out our driver application form with your basic information, contact details, and vehicle information.'
            },
            {
              number: 2,
              title: 'Submit Documents',
              description: 'Upload required documents: valid driver\'s license (CNIC), vehicle registration, insurance documents, and background check clearance.'
            },
            {
              number: 3,
              title: 'Complete Verification',
              description: 'Our team will review your application and documents. We\'ll conduct a brief interview and vehicle inspection.'
            },
            {
              number: 4,
              title: 'Start Driving',
              description: 'Once approved, download the driver app, complete orientation, and start accepting rides!'
            }
          ].map((step) => (
            <div key={step.number} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
              <div style={{
                width: '56px',
                height: '56px',
                backgroundColor: 'var(--color-primary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'var(--color-white)',
                flexShrink: 0
              }}>
                {step.number}
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>{step.title}</h3>
                <p style={{ color: 'var(--color-gray-500)' }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DriverCTA() {
  return (
    <section className="section" style={{ backgroundColor: 'var(--color-gray-50)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Ready to Start Earning?</h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-500)', marginBottom: 'var(--space-xl)' }}>
            Join hundreds of professional drivers in the Khanhub Transport network. 
            Start your application today.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth/register" className="btn btn-primary">Become a Driver</a>
            <a href="/auth/login" className="btn btn-outline">Driver Login</a>
          </div>
        </div>
      </div>
    </section>
  )
}