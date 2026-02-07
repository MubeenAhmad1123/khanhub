'use client';

import Link from 'next/link';

export default function TransportFooter() {
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
                            <li><Link href="/">For Riders</Link></li>
                            <li><Link href="/driver">For Drivers</Link></li>
                            <li><Link href="/book">Book a Ride</Link></li>
                            <li><Link href="/about">About Us</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4>Support</h4>
                        <ul className="footer-links">
                            <li><Link href="/faq">FAQ</Link></li>
                            <li><Link href="/safety">Safety Standards</Link></li>
                            <li><Link href="/contact">Contact Us</Link></li>
                            <li><Link href="/terms">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4>Contact</h4>
                        <ul className="footer-links">
                            <li><Link href="tel:+92">24/7: +92-XXX-XXXXXXX</Link></li>
                            <li><Link href="mailto:transport@khanhub.com.pk">transport@khanhub.com.pk</Link></li>
                            <li><Link href="https://wa.me/92">WhatsApp Support</Link></li>
                            <li>Multan Road, Vehari, Pakistan</li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2024 Khanhub Transport. All rights reserved. Hospital & Welfare Network.</p>
                </div>
            </div>
        </footer>
    );
}
