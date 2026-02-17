'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Mail, Phone, MapPin, Heart, ArrowRight } from 'lucide-react';

export default function TransportFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#2F5D50] text-slate-100/80 border-t border-[#3FA58E]/20">
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        <div className="mb-6">
                            <h3 className="text-white font-serif text-3xl font-medium tracking-tight">
                                Khanhub<span className="text-[#E6F1EC]">Transport</span>
                            </h3>
                            <p className="text-[10px] text-[#6B8E7F] font-bold uppercase tracking-[0.2em] mt-2">
                                Premium Medical Travel
                            </p>
                        </div>
                        <p className="text-sm leading-relaxed mb-8 max-w-xs">
                            Elevating patient transport with luxury comfort, specialized care, and unwavering safety standards.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <FooterAccordion title="Quick Links">
                        <ul className="space-y-4 py-2">
                            <li><Link href="/" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                For Riders
                            </Link></li>
                            <li><Link href="/driver" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                For Drivers
                            </Link></li>
                            <li><Link href="/book" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                Book a Ride
                            </Link></li>
                            <li><Link href="/about" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                About Our Mission
                            </Link></li>
                        </ul>
                    </FooterAccordion>

                    {/* Support */}
                    <FooterAccordion title="Support & Safety">
                        <ul className="space-y-4 py-2">
                            <li><Link href="/faq" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                Frequently Asked
                            </Link></li>
                            <li><Link href="/safety" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                Safety Standards
                            </Link></li>
                            <li><Link href="/contact" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                Get in Touch
                            </Link></li>
                            <li><Link href="/terms" className="text-sm hover:text-white transition-all flex items-center gap-3 group">
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                Terms of Service
                            </Link></li>
                        </ul>
                    </FooterAccordion>

                    {/* Contact */}
                    <FooterAccordion title="Concierge">
                        <div className="py-2 space-y-6">
                            <ul className="space-y-4">
                                <li className="flex items-start gap-4 group">
                                    <MapPin className="w-4 h-4 text-[#6B8E7F] group-hover:text-white transition-colors shrink-0 mt-0.5" />
                                    <span className="text-xs leading-relaxed">
                                        Multan Road, Vehari,<br />
                                        Punjab, Pakistan
                                    </span>
                                </li>
                                <li className="flex items-center gap-4 group">
                                    <Phone className="w-4 h-4 text-[#6B8E7F] group-hover:text-white transition-colors shrink-0" />
                                    <a href="tel:03006395220" className="text-sm font-medium text-white">03006395220</a>
                                </li>
                                <li className="flex items-center gap-4 group">
                                    <Mail className="w-4 h-4 text-[#6B8E7F] group-hover:text-white transition-colors shrink-0" />
                                    <a href="mailto:khanhubnetwork@gmail.com" className="text-sm hover:text-white transition-colors break-all">khanhubnetwork@gmail.com</a>
                                </li>
                            </ul>
                        </div>
                    </FooterAccordion>
                </div>

                <div className="border-t border-[#3FA58E]/20 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-medium uppercase tracking-widest text-slate-100/40">
                    <p>© {currentYear} Khanhub Transport. Elite Medical Logistics.</p>
                    <p className="flex items-center gap-2">
                        Premium Experience <Heart className="w-3 h-3 text-[#3FA58E] fill-[#3FA58E]" /> Developed by Khanhub
                    </p>
                </div>
            </div>
        </footer>
    );
}

function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-[#3FA58E]/10 lg:border-none">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 lg:py-0 lg:cursor-default flex items-center justify-between group"
            >
                <h4 className="text-white font-serif text-lg font-medium flex items-center gap-3">
                    <span className="w-1 h-5 bg-[#3FA58E] rounded-full"></span>
                    {title}
                </h4>
                <span className="lg:hidden transition-transform duration-300">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#6B8E7F]" /> : <ChevronDown className="w-4 h-4 text-[#6B8E7F]" />}
                </span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 lg:h-auto lg:opacity-100 lg:mt-6 ${isOpen ? "max-h-[500px] opacity-100 mb-6" : "max-h-0 opacity-0 lg:max-h-none"
                }`}>
                {children}
            </div>
        </div>
    );
}
