'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, ChevronDown, ChevronUp, ShieldCheck, CreditCard, Truck, Headphones, ArrowRight, Heart } from 'lucide-react';

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
        <footer className="bg-[#020617] text-slate-400 mt-24 border-t border-slate-800">
            {/* ── Trust Banner ── */}
            <div className="border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <Truck className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <h5 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Nationwide</h5>
                                <p className="text-[10px] font-bold text-slate-500">Secure Delivery</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 lg:border-l lg:border-slate-800 lg:pl-12">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <ShieldCheck className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <h5 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Genuine</h5>
                                <p className="text-[10px] font-bold text-slate-500">100% Authentic</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 lg:border-l lg:border-slate-800 lg:pl-12">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <Headphones className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <h5 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Support</h5>
                                <p className="text-[10px] font-bold text-slate-500">24/7 Professional</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 lg:border-l lg:border-slate-800 lg:pl-12">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <CreditCard className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <h5 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Payments</h5>
                                <p className="text-[10px] font-bold text-slate-500">COD & Bank Transfer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Brand Info */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 group">
                            <Image
                                src="/logo.webp"
                                alt="Khanhub Surgical"
                                width={45}
                                height={45}
                                className="rounded-xl brightness-90 group-hover:scale-110 transition-transform duration-500"
                            />
                            <div>
                                <h3 className="text-white font-black text-xl leading-none tracking-tight">KHAN<span className="text-blue-500">HUB</span></h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Surgical Solutions</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
                            Pakistan's premier destination for high-precision surgical instruments, diagnostic equipment, and medical furniture.
                        </p>
                    </div>

                    {/* Navigation */}
                    <FooterAccordion title="Navigation">
                        <ul className="space-y-4 py-2">
                            {quickLinks.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm hover:text-blue-400 transition-colors flex items-center group">
                                        <ArrowRight className="h-3 w-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </FooterAccordion>

                    {/* Shop Categories */}
                    <FooterAccordion title="Catalog">
                        <ul className="space-y-4 py-2">
                            {categories.map((category) => (
                                <li key={category.name}>
                                    <Link href={category.href} className="text-sm hover:text-blue-400 transition-colors flex items-center group">
                                        <ArrowRight className="h-3 w-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </FooterAccordion>

                    {/* Contact Detail */}
                    <FooterAccordion title="Contact Specialist">
                        <div className="py-2 space-y-6">
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3 group">
                                    <div className="p-2 bg-slate-800 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] leading-relaxed">KHAN HUB (PVT.) LTD. Multan raod Pir Murad, Vehari, Punjab, Pakistan</span>
                                </li>
                                <li className="flex items-center gap-3 group">
                                    <div className="p-2 bg-slate-800 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <a href="tel:03006395220" className="text-xs font-bold text-white hover:text-blue-400 transition-colors">03006395220</a>
                                </li>
                                <li className="flex items-center gap-3 group">
                                    <div className="p-2 bg-slate-800 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <a href="mailto:khanhubnetwork@gmail.com" className="text-xs text-white hover:text-blue-400 transition-colors">khanhubnetwork@gmail.com</a>
                                </li>
                            </ul>
                        </div>
                    </FooterAccordion>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-slate-950/80 border-t border-slate-800/50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
                        <p className="text-slate-500">© {new Date().getFullYear()} KHANHUB SURGICAL — ALL RIGHTS RESERVED.</p>
                        <div className="flex items-center gap-6">
                            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <span className="text-slate-800">|</span>
                            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                            <span className="text-slate-800">|</span>
                            <p className="text-slate-500 flex items-center gap-2">
                                Crafted with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> by <span className="text-blue-500">KHANHUB DEV</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-slate-800/50 lg:border-none">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 lg:py-0 lg:cursor-default flex items-center justify-between group"
            >
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    {title}
                </h4>
                <span className="lg:hidden transition-transform duration-300">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 lg:h-auto lg:opacity-100 lg:mt-6 ${isOpen ? "max-h-[500px] opacity-100 mb-6" : "max-h-0 opacity-0 lg:max-h-none"
                }`}>
                {children}
            </div>
        </div>
    );
}
