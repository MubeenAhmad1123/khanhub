"use client";

import Link from 'next/link';
import { Globe, MapPin, Phone, Mail, Heart, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function EnterpriseFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#0a0a0b] text-zinc-400 border-t border-zinc-900">
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
                    {/* Brand Info */}
                    <div className="lg:col-span-1">
                        <div className="mb-8">
                            <h2 className="text-white font-black text-2xl tracking-tighter flex items-center gap-2">
                                <Globe className="w-8 h-8 text-indigo-500" />
                                KHANHUB<span className="text-zinc-500">ENT</span>
                            </h2>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2 ml-10">
                                Enterprise Ecosystem
                            </p>
                        </div>
                        <p className="text-sm leading-relaxed mb-8 max-w-xs">
                            Empowering large-scale organizations with integrated digital infrastructure, human resource capital, and operational excellence solutions.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <FooterAccordion title="Quick Links">
                        <ul className="space-y-4 py-2">
                            {[
                                { label: 'Corporate Home', href: '/' },
                                { label: 'Our Solutions', href: '/products' },
                                { label: 'Executive Team', href: '/about' },
                                { label: 'Global Offices', href: '/contact' },
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm hover:text-white transition-all flex items-center gap-2 group">
                                        <span className="w-1.5 h-[1px] bg-zinc-800 group-hover:w-4 group-hover:bg-indigo-500 transition-all"></span>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </FooterAccordion>

                    {/* Product Categories */}
                    <FooterAccordion title="Our Portfolio">
                        <ul className="space-y-4 py-2">
                            {[
                                { label: 'Integrated Systems', href: '/products?category=General Items' },
                                { label: 'Resource Management', href: '/products?category=General Items' },
                                { label: 'Infrastructure', href: '/products?category=General Items' },
                                { label: 'Consultancy', href: '/products?category=General Items' },
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm hover:text-white transition-all flex items-center gap-2 group">
                                        <span className="w-1.5 h-[1px] bg-zinc-800 group-hover:w-4 group-hover:bg-indigo-500 transition-all"></span>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </FooterAccordion>

                    {/* Contact Details */}
                    <FooterAccordion title="Global Support">
                        <div className="py-2 space-y-6">
                            <ul className="space-y-4">
                                <li className="flex items-start gap-4 group">
                                    <MapPin className="w-4 h-4 text-zinc-700 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
                                    <span className="text-xs leading-relaxed">
                                        Khan Hub (Pvt.) Ltd.<br />
                                        Multan Road, Vehari, Pakistan
                                    </span>
                                </li>
                                <li className="flex items-center gap-4 group">
                                    <Phone className="w-4 h-4 text-zinc-700 group-hover:text-indigo-500 transition-colors shrink-0" />
                                    <a href="tel:03006395220" className="text-sm font-semibold text-white">03006395220</a>
                                </li>
                                <li className="flex items-center gap-4 group">
                                    <Mail className="w-4 h-4 text-zinc-700 group-hover:text-indigo-500 transition-colors shrink-0" />
                                    <a href="mailto:khanhubnetwork@gmail.com" className="text-sm hover:text-white transition-colors">khanhubnetwork@gmail.com</a>
                                </li>
                            </ul>
                        </div>
                    </FooterAccordion>
                </div>

                <div className="border-t border-zinc-900 mt-20 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                    <p>© {currentYear} KHANHUB ENTERPRISE. ALL RIGHTS RESERVED.</p>
                    <p className="flex items-center gap-2">
                        Engineered with <Heart className="w-3 h-3 text-red-900 fill-red-900" /> for Pakistan
                    </p>
                </div>
            </div>
        </footer>
    );
}

function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-zinc-900 lg:border-none">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 lg:py-0 lg:cursor-default flex items-center justify-between group"
            >
                <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                    {title}
                </h3>
                <span className="lg:hidden transition-transform duration-300">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                </span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 lg:h-auto lg:opacity-100 lg:mt-8 ${isOpen ? "max-h-[500px] opacity-100 mb-8" : "max-h-0 opacity-0 lg:max-h-none"
                }`}>
                {children}
            </div>
        </div>
    );
}