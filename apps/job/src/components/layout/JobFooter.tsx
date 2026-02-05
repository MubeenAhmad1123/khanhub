'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail } from 'lucide-react';

export default function JobFooter() {
    const jobCategories = [
        { name: 'Healthcare Jobs', href: '/search?category=healthcare' },
        { name: 'IT Jobs', href: '/search?category=it' },
        { name: 'Engineering Jobs', href: '/search?category=engineering' },
        { name: 'Sales Jobs', href: '/search?category=sales' },
        { name: 'Marketing Jobs', href: '/search?category=marketing' },
    ];

    const quickLinks = [
        { name: 'Find Jobs', href: '/search' },
        { name: 'Companies', href: '/companies' },
        { name: 'Post a Job', href: '/post-job' },
        { name: 'About Us', href: '/about' },
        { name: 'Contact', href: '/contact' },
    ];

    const jobSeekers = [
        { name: 'My Applications', href: '/dashboard/applications' },
        { name: 'Saved Jobs', href: '/dashboard/saved-jobs' },
        { name: 'Profile', href: '/account/profile' },
        { name: 'Job Alerts', href: '/alerts' },
    ];

    return (
        <footer className="bg-gray-900 text-gray-300 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <Image
                                src="/logo.webp"
                                alt="Khanhub Jobs"
                                width={40}
                                height={40}
                                className="rounded-lg"
                            />
                            <div>
                                <h3 className="text-white font-bold text-lg">Khanhub Jobs</h3>
                                <p className="text-sm text-gray-400">Find Your Career</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Pakistan's trusted job portal connecting talented individuals with leading companies.
                        </p>

                        {/* Social Media */}
                        <div className="flex space-x-3">
                            <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                            <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                </svg>
                            </a>
                            <a href="https://wa.me/923006395220" target="_blank" className="text-gray-400 hover:text-green-500 transition-colors">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Job Categories */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Popular Categories</h4>
                        <ul className="space-y-2">
                            {jobCategories.map((category) => (
                                <li key={category.href}>
                                    <Link href={category.href} className="text-sm hover:text-white transition-colors">
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            {quickLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                                        {link.name}
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
                                <Phone className="h-5 w-5 mr-2 flex-shrink-0" />
                                <a href="tel:+923006395220" className="hover:text-white">+92 300 6395220</a>
                            </li>
                            <li className="flex items-center">
                                <Mail className="h-5 w-5 mr-2 flex-shrink-0" />
                                <a href="mailto:jobs@khanhub.com.pk" className="hover:text-white">jobs@khanhub.com.pk</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-gray-950 py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
                        <p>© {new Date().getFullYear()} Khanhub Jobs. All rights reserved.</p>
                        <div className="flex gap-4 mt-2 md:mt-0">
                            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
                            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}