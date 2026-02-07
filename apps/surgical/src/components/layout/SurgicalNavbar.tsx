'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Search, Menu, X, Phone, Mail } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { AuthButton, useAuth } from '@khanhub/auth';
import CartDrawer from './CartDrawer';

export default function SurgicalNavbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { cart } = useCart();
    const { user } = useAuth();
    const cartCount = cart.itemCount;

    const categories = [
        { name: 'Surgical Equipment', href: '/surgical', icon: '🏥' },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
        }
    };

    return (
        <>
            {/* Top Bar - Contact Info */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-2 text-sm">
                        <div className="flex items-center space-x-4">
                            <a href="tel:067-3364220" className="flex items-center hover:text-blue-200 transition-colors">
                                <Phone className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">067-3364220</span>
                            </a>
                            <a href="mailto:surgical@khanhub.com.pk" className="flex items-center hover:text-blue-200 transition-colors">
                                <Mail className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">surgical@khanhub.com.pk</span>
                            </a>
                        </div>
                        <div className="hidden sm:flex items-center">
                            <span className="text-blue-100 italic">Premium Surgical Solutions</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Navbar */}
            <nav className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-2">
                            <Image
                                src="/logo.webp"
                                alt="Khanhub Surgical"
                                width={40}
                                height={40}
                                className="rounded-lg"
                            />
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold text-blue-600">Khanhub Surgical</h1>
                                <p className="text-xs text-gray-600">Premium Surgical Solutions</p>
                            </div>
                        </Link>

                        {/* Search Bar - Desktop */}
                        <div className="hidden md:block flex-1 max-w-2xl mx-8">
                            <form onSubmit={handleSearch} className="relative">
                                <input
                                    type="text"
                                    placeholder="Search surgical equipment..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700"
                                >
                                    <Search className="h-5 w-5" />
                                </button>
                            </form>
                        </div>

                        {/* Right Side - Cart & Auth */}
                        <div className="flex items-center space-x-4">
                            <div className="hidden md:block">
                                <AuthButton />
                            </div>

                            {/* Cart */}
                            <button
                                onClick={() => setCartDrawerOpen(true)}
                                className="relative p-2 text-gray-700 hover:text-blue-600 transition-all hover:scale-110 active:scale-95"
                            >
                                <ShoppingCart className="h-6 w-6" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-black shadow-lg shadow-blue-500/50">
                                        {cartCount}
                                    </span>
                                )}
                            </button>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Categories Bar - Desktop */}
                    <div className="hidden md:flex items-center space-x-6 py-3 border-t">
                        {categories.map((category) => (
                            <Link
                                key={category.href}
                                href={category.href}
                                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
                            >
                                <span className="text-xl">{category.icon}</span>
                                <span>{category.name}</span>
                            </Link>
                        ))}
                        <Link href="/deals" className="text-red-600 font-bold hover:text-red-700">
                            🔥 Hot Deals
                        </Link>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-white">
                        {/* Mobile Search */}
                        <div className="p-4">
                            <form onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </form>
                        </div>

                        {/* Mobile Categories & Auth */}
                        <div className="px-4 pb-4 space-y-2">
                            {categories.map((category) => (
                                <Link
                                    key={category.href}
                                    href={category.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center space-x-2 py-2 text-gray-700 hover:text-blue-600"
                                >
                                    <span className="text-xl">{category.icon}</span>
                                    <span className="font-medium">{category.name}</span>
                                </Link>
                            ))}
                            <Link
                                href="/deals"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center space-x-2 py-2 text-red-600 font-bold"
                            >
                                <span className="text-xl">🔥</span>
                                <span>Hot Deals</span>
                            </Link>
                            <div className="border-t pt-4">
                                <AuthButton />
                            </div>
                        </div>
                    </div>
                )}
            </nav>
            <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
        </>
    );
}