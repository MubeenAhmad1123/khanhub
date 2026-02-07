import Link from 'next/link';
import { Building2, Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';

export default function EnterpriseFooter() {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="h-8 w-8 text-primary-400" />
                            <div>
                                <div className="text-xl font-bold">Khanhub</div>
                                <div className="text-sm text-primary-400">Enterprise</div>
                            </div>
                        </div>
                        <p className="text-gray-400 mb-4">
                            Your trusted partner for office equipment, furniture, and business solutions in Pakistan.
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-800 rounded-full hover:bg-primary-600 transition-colors"
                            >
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-800 rounded-full hover:bg-primary-600 transition-colors"
                            >
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-800 rounded-full hover:bg-primary-600 transition-colors"
                            >
                                <Linkedin className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/products" className="text-gray-400 hover:text-white transition-colors">
                                    All Products
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Product Categories */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Categories</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/products/new" className="text-gray-400 hover:text-white transition-colors">
                                    New Products
                                </Link>
                            </li>
                            <li>
                                <Link href="/products/imported" className="text-gray-400 hover:text-white transition-colors">
                                    Imported Items
                                </Link>
                            </li>
                            <li>
                                <Link href="/products/local" className="text-gray-400 hover:text-white transition-colors">
                                    Local Products
                                </Link>
                            </li>
                            <li>
                                <Link href="/products/old" className="text-gray-400 hover:text-white transition-colors">
                                    Budget Deals
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Contact Us</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2">
                                <MapPin className="h-5 w-5 text-primary-400 flex-shrink-0 mt-1" />
                                <span className="text-gray-400">
                                    Khanhub Plaza, Main Road<br />
                                    Bahawalpur, Punjab, Pakistan
                                </span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-5 w-5 text-primary-400" />
                                <a href="tel:+92300000000" className="text-gray-400 hover:text-white">
                                    +92 300 0000000
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-primary-400" />
                                <a href="mailto:enterprise@khanhub.com" className="text-gray-400 hover:text-white">
                                    enterprise@khanhub.com
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Khanhub Enterprise. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}