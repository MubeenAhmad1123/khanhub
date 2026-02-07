'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function TransportFooter() {
    return (
        <footer className="bg-gray-900 text-gray-300 mt-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <Image
                                src="/logo.webp"
                                alt="Khanhub Transport"
                                width={40}
                                height={40}
                                className="rounded-lg"
                            />
                            <div>
                                <h3 className="text-white font-bold text-lg">Khanhub Transport</h3>
                                <p className="text-sm text-gray-400">Reliable Rides Since 2020</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Your trusted partner for fast and safe transport services in Pakistan.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Services</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/" className="hover:text-white transition-colors">Book a Ride</Link></li>
                            <li><Link href="/drive-with-us" className="hover:text-white transition-colors">Become a Driver</Link></li>
                            <li><Link href="/safety" className="hover:text-white transition-colors">Safety Features</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Contact</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                <a href="tel:067-3364220" className="hover:text-white">067-3364220</a>
                            </li>
                            <li className="flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                <a href="mailto:transport@khanhub.com.pk" className="hover:text-white">transport@khanhub.com.pk</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-gray-950 py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
                        <p>© {new Date().getFullYear()} Khanhub Transport. All rights reserved.</p>
                        <p className="mt-2 md:mt-0">
                            Part of <Link href="https://khanhub.com.pk" className="text-blue-400 hover:text-blue-300">Khan Hub (Pvt.) Ltd.</Link>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
