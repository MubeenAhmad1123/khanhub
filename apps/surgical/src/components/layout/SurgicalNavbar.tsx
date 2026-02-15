'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Search, Menu, X, Phone, Mail, Clock, ShieldCheck, Heart, User, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { AuthButton, useAuth } from '@khanhub/auth';
import CartDrawer from './CartDrawer';

export default function SurgicalNavbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);

    const { cart } = useCart();
    const { user } = useAuth();
    const cartCount = cart.itemCount;

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const categories = [
        { name: 'Instruments', href: '/surgical?category=instruments', icon: '🛠️' },
        { name: 'Diagnostic', href: '/surgical?category=diagnostic', icon: '🔍' },
        { name: 'Furniture', href: '/surgical?category=furniture', icon: '🏥' },
        { name: 'Supplies', href: '/surgical?category=supplies', icon: '📦' },
        { name: 'Operating Room', href: '/surgical?category=operating-room', icon: '🎬' },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
        }
    };

    return (
        <header className="relative w-full z-50">
            {/* ── Top Utility Bar ── */}
            <div className="bg-slate-900 text-slate-300 py-2 border-b border-slate-800 hidden sm:block">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-[11px] uppercase tracking-widest font-bold">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                            <span>ISO Certified Quality</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-400" />
                            <span>24/7 Professional Support</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <a href="tel:03006395220" className="hover:text-white transition-colors flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            03006395220
                        </a>
                        <Link href="/track-order" className="hover:text-white transition-colors">Track Your Order</Link>
                    </div>
                </div>
            </div>

            {/* ── Main Header ── */}
            <div className={`transition-all duration-300 border-b ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' : 'bg-white py-4'
                } sticky top-0`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center gap-4">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-3 shrink-0 group">
                            <div className="relative overflow-hidden rounded-xl shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/20 transition-all duration-500 group-hover:scale-105">
                                <Image
                                    src="/logo.webp"
                                    alt="Khanhub Surgical"
                                    width={45}
                                    height={45}
                                    className="object-cover"
                                />
                            </div>
                            <div className="hidden lg:block">
                                <h1 className="text-xl font-black text-slate-900 leading-none">
                                    KHAN<span className="text-blue-600">HUB</span>
                                </h1>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">Surgical Solutions</p>
                            </div>
                        </Link>

                        {/* Advanced Search Bar */}
                        <div className="hidden md:flex flex-1 max-w-xl mx-8">
                            <form onSubmit={handleSearch} className="relative w-full group">
                                <div className="absolute inset-0 bg-blue-500/5 blur-xl group-focus-within:bg-blue-500/10 transition-all duration-500" />
                                <input
                                    type="text"
                                    placeholder="Search precision instruments e.g. 'scissors'..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="relative w-full bg-slate-50 border border-slate-200 px-5 py-2.5 pr-12 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                            </form>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 sm:space-x-5">
                            <div className="hidden lg:flex items-center space-x-1">
                                <button className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
                                    <Heart className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
                                    <User className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="hidden sm:block h-6 w-px bg-slate-200" />

                            {/* Cart */}
                            <button
                                onClick={() => setCartDrawerOpen(true)}
                                className="relative group p-2 rounded-full hover:bg-blue-50 transition-all active:scale-90"
                            >
                                <ShoppingCart className="h-6 w-6 text-slate-700 group-hover:text-blue-600 transition-colors" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-black shadow-lg shadow-blue-500/40 animate-in zoom-in-50 duration-300">
                                        {cartCount}
                                    </span>
                                )}
                            </button>

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>

                            <div className="hidden md:block">
                                <AuthButton />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Secondary Navigation Bar (Categories) ── */}
            <div className={`bg-white border-b border-slate-100 hidden md:block transition-all duration-300 ${scrolled ? 'opacity-0 -translate-y-full pointer-events-none absolute' : 'opacity-100 translate-y-0 relative'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-8">
                            <button className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-widest hover:text-blue-600 transition-colors py-3 border-b-2 border-transparent hover:border-blue-600 group">
                                <Menu className="h-4 w-4" />
                                All Departments
                            </button>
                            <div className="h-4 w-px bg-slate-200" />
                            <div className="flex items-center space-x-6">
                                {categories.map((cat) => (
                                    <Link
                                        key={cat.name}
                                        href={cat.href}
                                        className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-colors py-3 border-b-2 border-transparent hover:border-blue-600"
                                    >
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <Link href="/deals" className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all hover:scale-105 active:scale-95">
                            <span className="animate-pulse">🔥</span>
                            Exclusive Deals
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Mobile Menu Sidebar ── */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute top-0 right-0 w-4/5 max-w-sm h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black text-slate-900">MENU</h2>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Mobile Search */}
                            <form onSubmit={handleSearch} className="relative mb-8">
                                <input
                                    type="text"
                                    placeholder="Search equipment..."
                                    className="w-full bg-slate-100 border-none px-4 py-3 rounded-xl text-sm"
                                />
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </form>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Product Categories</h3>
                                    <div className="grid grid-cols-1 gap-1">
                                        {categories.map((cat) => (
                                            <Link
                                                key={cat.name}
                                                href={cat.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-700 font-bold transition-all"
                                            >
                                                <span className="text-xl">{cat.icon}</span>
                                                {cat.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 border-t font-bold">
                                    <Link href="/deals" className="flex items-center gap-3 p-3 rounded-xl text-red-600">
                                        <span>🔥</span>
                                        Hot Deals
                                    </Link>
                                    <Link href="/about" className="flex items-center gap-3 p-3 rounded-xl text-slate-700">
                                        <span>🏢</span>
                                        About Us
                                    </Link>
                                    <Link href="/contact" className="flex items-center gap-3 p-3 rounded-xl text-slate-700">
                                        <span>📞</span>
                                        Contact Support
                                    </Link>
                                </div>

                                <div className="mt-8">
                                    <AuthButton />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
        </header>
    );
}