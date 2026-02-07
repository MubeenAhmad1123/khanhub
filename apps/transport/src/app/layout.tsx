<<<<<<< HEAD
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TransportNavbar from '@/components/layout/TransportNavbar';
import TransportFooter from '@/components/layout/TransportFooter';
import AuthProviderWrapper from '@/components/providers/AuthProviderWrapper';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Khanhub Transport - Reliable Rides in Pakistan',
    description: 'Fast, safe and comfortable rides at your fingertips with Khanhub Transport.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen flex flex-col`}>
                <AuthProviderWrapper>
                    <TransportNavbar />
                    <main className="flex-grow flex flex-col">{children}</main>
                    <TransportFooter />
                </AuthProviderWrapper>
            </body>
        </html>
    );
=======
// FILE: apps/transport/src/app/layout.tsx
// DESCRIPTION: Root layout with Fixed Premium Navbar - No Glitches
// Path: C:\Users\abc\Documents\Khanhub\khanhub\apps\transport\src\app

'use client'

import '../styles/globals.css'
import { useEffect, useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PremiumNavbar />
        {children}
        <Footer />
      </body>
    </html>
  )
>>>>>>> fda6b24 (working)
}

function PremiumNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Prevent body scroll when menu is open
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Header */}
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header-content">
            <a href="/" className="logo-wrapper">
              <div className="logo-icon">K</div>
              <div className="logo-text">Khanhub Transport</div>
            </a>

            <button 
              className={`menu-btn ${isMenuOpen ? 'active' : ''}`}
              onClick={toggleMenu}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <span className="menu-line menu-line-top"></span>
              <span className="menu-line menu-line-bottom"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Overlay */}
      <nav className={`nav-overlay-horizontal ${isMenuOpen ? 'active' : ''}`}>
        {/* Circle expansion from top-right corner */}
        <div className="nav-circle-expand"></div>
        
        {/* Navigation menu */}
        <div className="nav-menu-horizontal">
          <ul className="nav-list-horizontal">
            <li className="nav-item-horizontal">
              <a href="/" className="nav-link-horizontal" onClick={closeMenu}>
                Home
              </a>
            </li>
            <li className="nav-item-horizontal">
              <a href="/driver" className="nav-link-horizontal" onClick={closeMenu}>
                Driver
              </a>
            </li>
            <li className="nav-item-horizontal">
              <a href="/book" className="nav-link-horizontal" onClick={closeMenu}>
                Book Ride
              </a>
            </li>
            <li className="nav-item-horizontal">
              <a href="/about" className="nav-link-horizontal" onClick={closeMenu}>
                About
              </a>
            </li>
            <li className="nav-item-horizontal">
              <a href="/auth/login" className="nav-link-horizontal" onClick={closeMenu}>
                Login
              </a>
            </li>
            <li className="nav-item-horizontal">
              <a href="/auth/register" className="nav-link-horizontal" onClick={closeMenu}>
                Register
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section">
            <h4>Khanhub Transport</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.7' }}>
              Premium medical transport services combining healthcare excellence with luxurious comfort. 
              Your wellbeing is our journey.
            </p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><a href="/">For Riders</a></li>
              <li><a href="/driver">For Drivers</a></li>
              <li><a href="/book">Book a Ride</a></li>
              <li><a href="/about">About Us</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <ul className="footer-links">
              <li><a href="/faq">FAQ</a></li>
              <li><a href="/safety">Safety Standards</a></li>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="/terms">Terms of Service</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <ul className="footer-links">
              <li><a href="tel:+92">24/7: +92-XXX-XXXXXXX</a></li>
              <li><a href="mailto:transport@khanhub.com.pk">transport@khanhub.com.pk</a></li>
              <li><a href="https://wa.me/92">WhatsApp Support</a></li>
              <li>Multan Road, Vehari, Pakistan</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 Khanhub Transport. All rights reserved. Hospital & Welfare Network.</p>
        </div>
      </div>
    </footer>
  )
}