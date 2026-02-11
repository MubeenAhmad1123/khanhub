// File: apps/transport/src/components/layout/TransportNavbar.tsx

'use client';

import { firebaseSignOut } from '@/lib/firebase/config';
import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthUser } from '@/hooks/useAuthUser';

export default function TransportNavbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuthUser();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      setIsProfileOpen(false);
      setIsMobileOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileOpen]);

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    transition: 'all 0.3s ease',
    backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0',
    borderBottom: scrolled ? '1px solid rgba(229, 231, 235, 0.8)' : '1px solid rgba(229, 231, 235, 0.4)',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 24px',
  };

  const innerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '72px',
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  };

  const logoIconStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    backgroundColor: '#2F5D50',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '18px',
  };

  const logoTextStyle: React.CSSProperties = {
    fontSize: '19px',
    fontWeight: 600,
    color: '#111827',
    letterSpacing: '-0.01em',
  };

  const desktopNavStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '36px',
  };

  const navLinkStyle: React.CSSProperties = {
    color: '#4B5563',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '15px',
    padding: '8px 0',
    position: 'relative',
    transition: 'color 0.2s ease',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const loginBtnStyle: React.CSSProperties = {
    padding: '9px 20px',
    color: '#2F5D50',
    fontWeight: 600,
    fontSize: '14px',
    border: '1.5px solid #2F5D50',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  };

  const registerBtnStyle: React.CSSProperties = {
    padding: '10px 24px',
    backgroundColor: '#2F5D50',
    color: 'white',
    fontWeight: 600,
    fontSize: '14px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  };

  const skeletonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const skeletonCircleStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '9999px',
    backgroundColor: '#E5E7EB',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  };

  const skeletonLineStyle: React.CSSProperties = {
    width: '80px',
    height: '14px',
    borderRadius: '4px',
    backgroundColor: '#E5E7EB',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  };

  const profilePillStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px 6px 6px',
    borderRadius: '9999px',
    border: '1px solid #E5E7EB',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const menuBtnStyle: React.CSSProperties = {
    display: 'none',
    padding: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  };

  const mobileMenuStyle: React.CSSProperties = {
    display: isMobileOpen ? 'block' : 'none',
    backgroundColor: 'white',
    borderTop: '1px solid #E5E7EB',
    padding: '20px 24px',
  };

  const mobileLinkStyle: React.CSSProperties = {
    display: 'block',
    padding: '14px 16px',
    color: '#374151',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '15px',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  };

  const dropdownLinkStyle: React.CSSProperties = {
    display: 'block',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    transition: 'background-color 0.15s ease',
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .transport-nav-desktop { display: flex !important; }
            .transport-nav-mobile-btn { display: none !important; }
            .transport-nav-link:hover { color: #2F5D50 !important; }
            .transport-nav-link::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              width: 0;
              height: 2px;
              background-color: #2F5D50;
              transition: width 0.25s ease;
            }
            .transport-nav-link:hover::after { width: 100%; }
            .transport-login-btn:hover { 
              background-color: #2F5D50 !important; 
              color: white !important; 
            }
            .transport-register-btn:hover { 
              background-color: #3FA58E !important; 
            }
            .transport-profile-pill:hover {
              background-color: #F9FAFB !important;
              border-color: #D1D5DB !important;
            }
            .transport-mobile-link:hover { background-color: #F3F4F6 !important; }
            .transport-dropdown-link:hover { background-color: #F3F4F6 !important; }
            @media (max-width: 1024px) {
              .transport-nav-desktop { display: none !important; }
              .transport-nav-mobile-btn { display: block !important; }
            }
          `,
        }}
      />

      <nav style={navStyle}>
        <div style={containerStyle}>
          <div style={innerStyle}>
            <Link href="/" style={logoStyle}>
              <div style={logoIconStyle}>K</div>
              <span style={logoTextStyle}>Khanhub Transport</span>
            </Link>

            <div style={desktopNavStyle} className="transport-nav-desktop">
              <Link href="/" style={navLinkStyle} className="transport-nav-link">
                Home
              </Link>
              <Link href="/driver" style={navLinkStyle} className="transport-nav-link">
                Driver
              </Link>
              <Link href="/book" style={navLinkStyle} className="transport-nav-link">
                Book Ride
              </Link>
            </div>

            <div style={buttonContainerStyle} className="transport-nav-desktop">
              {loading ? (
                <div style={skeletonStyle}>
                  <div style={skeletonCircleStyle} />
                  <div style={skeletonLineStyle} />
                </div>
              ) : user ? (
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
                    onClick={() => setIsProfileOpen((v) => !v)}
                    style={profilePillStyle}
                    className="transport-profile-pill"
                    aria-label="Profile menu"
                  >
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt="Profile"
                        width={32}
                        height={32}
                        style={{ borderRadius: '9999px' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '9999px',
                          backgroundColor: '#2F5D50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#111827',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.displayName || user.email?.split('@')[0] || 'Passenger'}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <path
                        d="M5 7L10 12L15 7"
                        stroke="#9CA3AF"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {isProfileOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        width: '240px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        padding: '12px',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <div style={{ padding: '8px', marginBottom: '8px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px',
                          }}
                        >
                          {user.photoURL ? (
                            <Image
                              src={user.photoURL}
                              alt="Profile"
                              width={40}
                              height={40}
                              style={{ borderRadius: '9999px' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '9999px',
                                backgroundColor: '#2F5D50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: 600,
                              }}
                            >
                              {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#111827',
                                marginBottom: '2px',
                              }}
                            >
                              {user.displayName || 'Passenger'}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#6B7280',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '8px 0' }} />

                      <Link
                        href="/profile"
                        style={dropdownLinkStyle}
                        className="transport-dropdown-link"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        My profile
                      </Link>
                      <Link
                        href="/rides"
                        style={dropdownLinkStyle}
                        className="transport-dropdown-link"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        My rides
                      </Link>

                      <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '8px 0' }} />

                      <button
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#DC2626',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background-color 0.15s ease',
                        }}
                        className="transport-dropdown-link"
                        onClick={handleSignOut}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/auth/login" style={loginBtnStyle} className="transport-login-btn">
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    style={registerBtnStyle}
                    className="transport-register-btn"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            <button
              style={menuBtnStyle}
              className="transport-nav-mobile-btn"
              onClick={() => setIsMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {isMobileOpen ? (
                <svg width="24" height="24" fill="none" stroke="#1C1C1C" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              ) : (
                <svg width="24" height="24" fill="none" stroke="#1C1C1C" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div style={mobileMenuStyle}>
          <Link
            href="/"
            style={mobileLinkStyle}
            className="transport-mobile-link"
            onClick={() => setIsMobileOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/driver"
            style={mobileLinkStyle}
            className="transport-mobile-link"
            onClick={() => setIsMobileOpen(false)}
          >
            Driver
          </Link>
          <Link
            href="/book"
            style={mobileLinkStyle}
            className="transport-mobile-link"
            onClick={() => setIsMobileOpen(false)}
          >
            Book Ride
          </Link>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
            {loading ? (
              <div style={{ ...skeletonStyle, justifyContent: 'center' }}>
                <div style={skeletonCircleStyle} />
                <div style={skeletonLineStyle} />
              </div>
            ) : user ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '10px',
                    marginBottom: '12px',
                  }}
                >
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt="Profile"
                      width={44}
                      height={44}
                      style={{ borderRadius: '9999px' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '9999px',
                        backgroundColor: '#2F5D50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 600,
                      }}
                    >
                      {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                      {user.displayName || 'Passenger'}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#6B7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.email}
                    </div>
                  </div>
                </div>
                <Link
                  href="/profile"
                  style={{
                    ...mobileLinkStyle,
                    backgroundColor: 'transparent',
                  }}
                  className="transport-mobile-link"
                  onClick={() => setIsMobileOpen(false)}
                >
                  My profile
                </Link>
                <Link
                  href="/rides"
                  style={{
                    ...mobileLinkStyle,
                    backgroundColor: 'transparent',
                  }}
                  className="transport-mobile-link"
                  onClick={() => setIsMobileOpen(false)}
                >
                  My rides
                </Link>
                <button
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#DC2626',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#FEF2F2',
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  href="/auth/login"
                  style={{ ...loginBtnStyle, textAlign: 'center', display: 'block' }}
                  className="transport-login-btn"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  style={{ ...registerBtnStyle, textAlign: 'center', display: 'block' }}
                  className="transport-register-btn"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div style={{ height: '72px' }} />
    </>
  );
}