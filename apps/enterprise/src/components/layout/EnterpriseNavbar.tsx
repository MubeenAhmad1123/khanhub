'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCart, Menu, X, Search, Building2, Package, Plane, MapPin, PackageCheck, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { AuthButton, useAuth } from '@khanhub/auth';

export default function EnterpriseNavbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { itemCount } = useCart();
    const { user } = useAuth();

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <Building2 className="h-8 w-8 text-primary-600" />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-gray-900">Khanhub</span>
                            <span className="text-xs text-primary-600 -mt-1">Enterprise</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                            Home
                        </Link>

                        {/* Product Types Dropdown */}
                        <div className="relative group">
                            <button className="text-gray-700 hover:text-primary-600 font-medium transition-colors flex items-center gap-1">
                                Products
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                <Link
                                    href="/products/new"
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                    <PackageCheck className="h-5 w-5 text-green-600" />
                                    <div>
                                        <div className="font-medium text-gray-900">New Products</div>
                                        <div className="text-xs text-gray-500">Latest additions</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/products/imported"
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                    <Plane className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <div className="font-medium text-gray-900">Imported</div>
                                        <div className="text-xs text-gray-500">International brands</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/products/local"
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                    <MapPin className="h-5 w-5 text-purple-600" />
                                    <div>
                                        <div className="font-medium text-gray-900">Local</div>
                                        <div className="text-xs text-gray-500">Made in Pakistan</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/products/old"
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-b-lg"
                                >
                                    <Package className="h-5 w-5 text-orange-600" />
                                    <div>
                                        <div className="font-medium text-gray-900">Budget Deals</div>
                                        <div className="text-xs text-gray-500">Refurbished & used</div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        <Link href="/about" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                            About
                        </Link>
                        <Link href="/contact" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                            Contact
                        </Link>
                    </div>

                    {/* Right side icons */}
                    <div className="flex items-center gap-4">
                        <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Search className="h-5 w-5 text-gray-700" />
                        </button>

                        <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ShoppingCart className="h-5 w-5 text-gray-700" />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {itemCount}
                                </span>
                            )}
                        </Link>

                        <div className="hidden md:block">
                            <AuthButton />
                        </div>

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? (
                                <X className="h-6 w-6 text-gray-700" />
                            ) : (
                                <Menu className="h-6 w-6 text-gray-700" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t">
                        <div className="flex flex-col space-y-4">
                            <Link
                                href="/"
                                className="text-gray-700 hover:text-primary-600 font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Home
                            </Link>
                            <div className="pl-4 space-y-3">
                                <div className="text-sm font-semibold text-gray-500">Product Types:</div>
                                <Link
                                    href="/products/new"
                                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <PackageCheck className="h-4 w-4 text-green-600" />
                                    New Products
                                </Link>
                                <Link
                                    href="/products/imported"
                                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Plane className="h-4 w-4 text-blue-600" />
                                    Imported
                                </Link>
                                <Link
                                    href="/products/local"
                                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <MapPin className="h-4 w-4 text-purple-600" />
                                    Local
                                </Link>
                                <Link
                                    href="/products/old"
                                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Package className="h-4 w-4 text-orange-600" />
                                    Budget Deals
                                </Link>
                            </div>
                            <Link
                                href="/about"
                                className="text-gray-700 hover:text-primary-600 font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                About
                            </Link>
                            <Link
                                href="/contact"
                                className="text-gray-700 hover:text-primary-600 font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Contact
                            </Link>

                            <div className="pt-4 border-t">
                                <AuthButton />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}