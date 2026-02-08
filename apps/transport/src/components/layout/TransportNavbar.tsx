'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TransportNavbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.1)' : 'none',
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
        height: '80px',
    };

    const logoStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textDecoration: 'none',
    };

    const logoIconStyle: React.CSSProperties = {
        width: '44px',
        height: '44px',
        backgroundColor: '#2F5D50',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '20px',
    };

    const logoTextStyle: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 600,
        color: '#1C1C1C',
    };

    const desktopNavStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
    };

    const navLinkStyle: React.CSSProperties = {
        color: '#374151',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: '15px',
        padding: '8px 0',
        position: 'relative' as const,
    };

    const buttonContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    };

    const loginBtnStyle: React.CSSProperties = {
        padding: '10px 24px',
        color: '#2F5D50',
        fontWeight: 600,
        fontSize: '15px',
        border: '2px solid #2F5D50',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
    };

    const registerBtnStyle: React.CSSProperties = {
        padding: '12px 28px',
        backgroundColor: '#2F5D50',
        color: 'white',
        fontWeight: 600,
        fontSize: '15px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(47, 93, 80, 0.3)',
    };

    const menuBtnStyle: React.CSSProperties = {
        display: 'none',
        padding: '12px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
    };

    const mobileMenuStyle: React.CSSProperties = {
        display: isMenuOpen ? 'block' : 'none',
        backgroundColor: 'white',
        borderTop: '1px solid #E5E7EB',
        padding: '24px',
    };

    const mobileLinkStyle: React.CSSProperties = {
        display: 'block',
        padding: '16px',
        color: '#374151',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: '16px',
        borderRadius: '8px',
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
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
                    transition: width 0.3s ease;
                }
                .transport-nav-link:hover::after { width: 100%; }
                .transport-login-btn:hover { 
                    background-color: #2F5D50 !important; 
                    color: white !important; 
                }
                .transport-register-btn:hover { 
                    background-color: #3FA58E !important; 
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(47, 93, 80, 0.4) !important;
                }
                .transport-mobile-link:hover { background-color: #E6F1EC !important; }
                @media (max-width: 1024px) {
                    .transport-nav-desktop { display: none !important; }
                    .transport-nav-mobile-btn { display: block !important; }
                }
            ` }} />

            <nav style={navStyle}>
                <div style={containerStyle}>
                    <div style={innerStyle}>
                        {/* Logo */}
                        <Link href="/" style={logoStyle}>
                            <div style={logoIconStyle}>K</div>
                            <span style={logoTextStyle}>Khanhub Transport</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div style={desktopNavStyle} className="transport-nav-desktop">
                            <Link href="/" style={navLinkStyle} className="transport-nav-link">Home</Link>
                            <Link href="/driver" style={navLinkStyle} className="transport-nav-link">Driver</Link>
                            <Link href="/book" style={navLinkStyle} className="transport-nav-link">Book Ride</Link>
                        </div>

                        {/* Buttons */}
                        <div style={buttonContainerStyle} className="transport-nav-desktop">
                            <Link href="/auth/login" style={loginBtnStyle} className="transport-login-btn">
                                Login
                            </Link>
                            <Link href="/auth/register" style={registerBtnStyle} className="transport-register-btn">
                                Get Started
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            style={menuBtnStyle}
                            className="transport-nav-mobile-btn"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? (
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

                {/* Mobile Menu */}
                <div style={mobileMenuStyle}>
                    <Link href="/" style={mobileLinkStyle} className="transport-mobile-link" onClick={() => setIsMenuOpen(false)}>Home</Link>
                    <Link href="/driver" style={mobileLinkStyle} className="transport-mobile-link" onClick={() => setIsMenuOpen(false)}>Driver</Link>
                    <Link href="/book" style={mobileLinkStyle} className="transport-mobile-link" onClick={() => setIsMenuOpen(false)}>Book Ride</Link>
                    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                        <Link href="/auth/login" style={{ ...loginBtnStyle, textAlign: 'center' as const, display: 'block' }} className="transport-login-btn" onClick={() => setIsMenuOpen(false)}>
                            Login
                        </Link>
                        <Link href="/auth/register" style={{ ...registerBtnStyle, textAlign: 'center' as const, display: 'block' }} className="transport-register-btn" onClick={() => setIsMenuOpen(false)}>
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Spacer for fixed navbar */}
            <div style={{ height: '80px' }}></div>
        </>
    );
}
