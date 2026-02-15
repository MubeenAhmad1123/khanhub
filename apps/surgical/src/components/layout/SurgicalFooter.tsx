'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock, ShieldCheck, CreditCard, Truck, Headphones, ArrowRight } from 'lucide-react';

export default function SurgicalFooter() {
    const quickLinks = [
        { name: 'About Khanhub', href: '/about' },
        { name: 'Surgical Catalog', href: '/surgical' },
        { name: 'Track Order', href: '/orders' },
        { name: 'Return Policy', href: '/returns' },
        { name: 'Contact Us', href: '/contact' },
    ];

    const categories = [
        { name: 'Instruments', href: '/surgical?category=instruments' },
        { name: 'Diagnostic', href: '/surgical?category=diagnostic' },
        { name: 'Furniture', href: '/surgical?category=furniture' },
        { name: 'Specialized', href: '/surgical?category=specialized' },
    ];

    return (
        <footer className="bg-slate-900 text-slate-400 mt-24 border-t border-slate-800">
            {/* ── Trust Banner ── */}
            <div className="border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="flex items-center gap-4">
                            <Truck className="h-6 w-6 text-blue-500" />
                            <div>
                                <h5 className="text-white text-xs font-black uppercase tracking-widest">Nationwide</h5>
                                <p className="text-[10px] font-medium">Secure Delivery</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 border-l border-slate-800 pl-8 lg:pl-12">
                            <ShieldCheck className="h-6 w-6 text-blue-500" />
                            <div>
                                <h5 className="text-white text-xs font-black uppercase tracking-widest">Genuine</h5>
                                <p className="text-[10px] font-medium">100% Authentic</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 border-l border-slate-800 pl-8 lg:pl-12">
                            <Headphones className="h-6 w-6 text-blue-500" />
                            <div>
                                <h5 className="text-white text-xs font-black uppercase tracking-widest">Support</h5>
                                <p className="text-[10px] font-medium">24/7 Professional</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 border-l border-slate-800 pl-8 lg:pl-12">
                            <CreditCard className="h-6 w-6 text-blue-500" />
                            <div>
                                <h5 className="text-white text-xs font-black uppercase tracking-widest">Payments</h5>
                                <p className="text-[10px] font-medium">COD & Bank Transfer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Info */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3">
                            <Image
                                src="/logo.webp"
                                alt="Khanhub Surgical"
                                width={45}
                                height={45}
                                className="rounded-xl brightness-90"
                            />
                            <div>
                                <h3 className="text-white font-black text-xl leading-none">KHAN<span className="text-blue-500">HUB</span></h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">Surgical Solutions</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Pakistan's premier destination for high-precision surgical instruments, diagnostic equipment, and medical furniture. Committed to excellence in healthcare.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="lg:pl-8">
                        <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Store Navigation</h4>
                        <ul className="space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm hover:text-blue-400 transition-colors flex items-center group">
                                        <ArrowRight className="h-3 w-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Shop Categories */}
                    <div>
                        <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Product Catalog</h4>
                        <ul className="space-y-3">
                            {categories.map((category) => (
                                <li key={category.name}>
                                    <Link href={category.href} className="text-sm hover:text-blue-400 transition-colors flex items-center group">
                                        <ArrowRight className="h-3 w-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Detail */}
                    <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-800">
                        <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Contact Specialist</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-lg text-blue-400">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] leading-relaxed">KHAN HUB (PVT.) LTD. Multan raod Pir Murad, Vehari, Punjab, Pakistan</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-lg text-blue-400">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <a href="tel:03006395220" className="text-xs font-bold text-white hover:text-blue-400 transition-colors">03006395220</a>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-lg text-blue-400">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <a href="mailto:info@khanhub.com.pk" className="text-xs text-white hover:text-blue-400 transition-colors">info@khanhub.com.pk</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-slate-950/50 border-t border-slate-800/50 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
                        <p className="text-slate-500">© {new Date().getFullYear()} KHANHUB SURGICAL — ALL RIGHTS RESERVED.</p>
                        <div className="flex items-center gap-4">
                            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <span className="text-slate-700">|</span>
                            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                            <span className="text-slate-700">|</span>
                            <p className="text-slate-500 italic">DESIGNED BY <span className="text-blue-500">KHANHUB DEV</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
