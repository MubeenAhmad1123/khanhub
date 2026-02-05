'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Search, Menu, X, Phone, Mail, User as UserIcon, LogOut, Settings, Package, History } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CartDrawer from './CartDrawer';

export default function StoreNavbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { cart } = useCart();
    const { user, isAuthenticated, logout } = useAuth();
    const cartCount = cart.itemCount;

    const categories = [
        { name: 'Surgical Equipment', href: '/surgical', icon: '🏥' },
        { name: 'Enterprise Products', href: '/enterprise', icon: '🏢' },
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
                            <a href="mailto:store@khanhub.com.pk" className="flex items-center hover:text-blue-200 transition-colors">
                                <Mail className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">store@khanhub.com.pk</span>
                            </a>
                        </div>
                        <div className="flex items-center space-x-4">
                            {isAuthenticated ? (
                                <>
                                    <span className="text-blue-100 italic">Welcome, {user?.fullName.split(' ')[0]}</span>
                                    <Link href="/orders" className="hover:text-blue-200 transition-colors flex items-center gap-1">
                                        <History className="h-3 w-3" /> Track Order
                                    </Link>
                                    <button onClick={logout} className="hover:text-red-200 transition-colors flex items-center gap-1">
                                        <LogOut className="h-3 w-3" /> Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/auth/login" className="hover:text-blue-200 transition-colors font-bold">Login</Link>
                                    <span className="opacity-50">|</span>
                                    <Link href="/auth/register" className="hover:text-blue-200 transition-colors font-bold">Register</Link>
                                </>
                            )}
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
                                alt="Khanhub Store"
                                width={40}
                                height={40}
                                className="rounded-lg"
                            />
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold text-blue-600">Khanhub Store</h1>
                                <p className="text-xs text-gray-600">Medical & Enterprise Solutions</p>
                            </div>
                        </Link>

                        {/* Search Bar - Desktop */}
                        <div className="hidden md:block flex-1 max-w-2xl mx-8">
                            <form onSubmit={handleSearch} className="relative">
                                <input
                                    type="text"
                                    placeholder="Search surgical equipment, office supplies..."
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

                        {/* Right Side - Cart & Mobile Menu */}
                        <div className="flex items-center space-x-4">
                            {/* User Account - Desktop */}
                            <div className="hidden md:block relative">
                                {isAuthenticated ? (
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                                    >
                                        <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                            {user?.fullName[0]}
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{user?.fullName.split(' ')[0]}</span>
                                    </button>
                                ) : (
                                    <Link
                                        href="/auth/login"
                                        className="flex items-center gap-2 p-2 text-gray-700 hover:text-blue-600 transition-colors"
                                    >
                                        <UserIcon className="h-6 w-6" />
                                        <span className="text-sm font-bold">Sign In</span>
                                    </Link>
                                )}

                                {userMenuOpen && isAuthenticated && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 glass">
                                        <Link href="/account" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                            <Settings className="h-4 w-4" /> Account Settings
                                        </Link>
                                        <Link href="/orders" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                            <Package className="h-4 w-4" /> My Orders
                                        </Link>
                                        <hr className="my-2 border-gray-100" />
                                        <button
                                            onClick={logout}
                                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-bold"
                                        >
                                            <LogOut className="h-4 w-4" /> Sign Out
                                        </button>
                                    </div>
                                )}
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

                        {/* Mobile Categories */}
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
                        </div>
                    </div>
                )}
            </nav>
            <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
        </>
    );
}