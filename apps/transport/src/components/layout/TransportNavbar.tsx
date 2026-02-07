'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, Car, Briefcase, Menu, X, Landmark, Gavel, User, MenuSquare, LayoutDashboard, Settings, LogOut, Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@khanhub/shared-ui';
import { AuthButton } from '@khanhub/auth';

export default function TransportNavbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <Image
                            src="/logo.webp"
                            alt="Khanhub Transport"
                            width={40}
                            height={40}
                            className="rounded-lg"
                        />
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold text-blue-600">Khanhub Transport</h1>
                            <p className="text-xs text-gray-600">Anywhere you want to go</p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/"
                            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        >
                            Home
                        </Link>
                        <Link
                            href="/safety"
                            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        >
                            Safety
                        </Link>
                        <Link
                            href="/drive-with-us"
                            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        >
                            Drive
                        </Link>
                        <AuthButton />
                        <Link href="/post-ride">
                            <Button variant="primary" className="!bg-emerald-600 hover:!bg-emerald-700 !rounded-full !px-8 font-black shadow-lg shadow-emerald-600/20 active:scale-95">
                                Post a Ride
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-gray-700"
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-white pb-6 pt-2">
                        <div className="px-4 space-y-2">
                            <Link
                                href="/"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block py-3 text-gray-700 hover:text-blue-600 font-medium"
                            >
                                Home
                            </Link>
                            <Link
                                href="/safety"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block py-3 text-gray-700 hover:text-blue-600 font-medium"
                            >
                                Safety
                            </Link>
                            <Link
                                href="/drive-with-us"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block py-3 text-gray-700 hover:text-blue-600 font-medium"
                            >
                                Drive
                            </Link>
                            <div className="border-t pt-4">
                                <AuthButton />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
