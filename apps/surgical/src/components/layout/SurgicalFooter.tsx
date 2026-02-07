'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function SurgicalFooter() {
    const quickLinks = [
        { name: 'About Us', href: '/about' },
        { name: 'Contact', href: '/contact' },
        { name: 'Track Order', href: '/orders' },
        { name: 'FAQs', href: '/faq' },
        { name: 'Shipping Info', href: '/shipping' },
    ];

    const categories = [
        { name: 'Surgical Equipment', href: '/surgical' },
        { name: 'Enterprise Products', href: '/enterprise' },
        { name: 'Hot Deals', href: '/deals' },
        { name: 'New Arrivals', href: '/new' },
    ];

    const policies = [
        { name: 'Privacy Policy', href: '/privacy-policy' },
        { name: 'Terms & Conditions', href: '/terms' },
        { name: 'Return Policy', href: '/returns' },
        { name: 'Warranty Policy', href: '/warranty' },
    ];

    return (
        <footer className="bg-gray-900 text-gray-300 mt-16">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <Image
                                src="/logo.webp"
                                alt="Khanhub Surgical"
                                width={40}
                                height={40}
                                className="rounded-lg"
                            />
                            <div>
                                <h3 className="text-white font-bold text-lg">Khanhub Surgical</h3>
                                <p className="text-sm text-gray-400">Trusted Since 2020</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Professional medical equipment and surgical instruments for healthcare providers across Pakistan.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-blue-100">
                            <li><Link href="/surgical" className="hover:text-white transition-colors">Our Catalog</Link></li>
                            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Categories</h4>
                        <ul className="space-y-2">
                            {categories.map((category) => (
                                <li key={category.href}>
                                    <Link href={category.href} className="text-sm hover:text-white transition-colors">
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Contact Us</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start">
                                <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Multan Road Peer Murad, Vehari, Punjab, Pakistan</span>
                            </li>
                            <li className="flex items-center">
                                <Phone className="h-5 w-5 mr-2 flex-shrink-0" />
                                <a href="tel:067-3364220" className="hover:text-white">067-3364220</a>
                            </li>
                            <li className="flex items-center">
                                <Mail className="h-5 w-5 mr-2 flex-shrink-0" />
                                <a href="mailto:surgical@khanhub.com.pk" className="hover:text-white">surgical@khanhub.com.pk</a>
                            </li>
                            <li className="flex items-start">
                                <Clock className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p>Mon - Sat: 9:00 AM - 8:00 PM</p>
                                    <p>Sunday: Closed</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-gray-950 py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
                        <p>© {new Date().getFullYear()} Khanhub Surgical. All rights reserved.</p>
                        <p className="mt-2 md:mt-0">
                            Part of <Link href="https://khanhub.com.pk" className="text-blue-400 hover:text-blue-300">Khan Hub (Pvt.) Ltd.</Link>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}