'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Mail, Phone, MapPin, Heart } from 'lucide-react';

export default function JobFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#0f172a] text-slate-400 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        <div className="mb-6">
                            <h3 className="text-white font-black text-2xl tracking-tight">
                                KHANHUB<span className="text-teal-500">JOBS</span>
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
                                Premier Talent Network
                            </p>
                        </div>
                        <p className="text-sm leading-relaxed mb-8 max-w-xs">
                            Pakistan's most trusted job placement ecosystem connecting high-potential talent with industry-leading opportunities.
                        </p>
                    </div>

                    {/* For Job Seekers */}
                    <FooterAccordion title="For Job Seekers">
                        <ul className="space-y-4 py-2">
                            <li><Link href="/search" className="text-sm hover:text-teal-400 transition-colors flex items-center gap-2 group">
                                <span className="w-1.5 h-1.5 bg-slate-700 group-hover:bg-teal-500 rounded-full transition-all"></span>
                                Browse Jobs
                            </Link></li>
                            <li><Link href="/dashboard" className="text-sm hover:text-teal-400 transition-colors flex items-center gap-2 group">
                                <span className="w-1.5 h-1.5 bg-slate-700 group-hover:bg-teal-500 rounded-full transition-all"></span>
                                My Dashboard
                            </Link></li>
                            <li><Link href="/dashboard/premium" className="text-sm hover:text-teal-400 transition-colors flex items-center gap-2 group">
                                <span className="w-1.5 h-1.5 bg-slate-700 group-hover:bg-teal-500 rounded-full transition-all"></span>
                                Premium Services
                            </Link></li>
                        </ul>
                    </FooterAccordion>

                    {/* For Employers */}
                    <FooterAccordion title="For Employers">
                        <ul className="space-y-4 py-2">
                            <li><Link href="/employer/post-job" className="text-sm hover:text-teal-400 transition-colors flex items-center gap-2 group">
                                <span className="w-1.5 h-1.5 bg-slate-700 group-hover:bg-teal-500 rounded-full transition-all"></span>
                                Post a Vacancy
                            </Link></li>
                            <li><Link href="/employer/dashboard" className="text-sm hover:text-teal-400 transition-colors flex items-center gap-2 group">
                                <span className="w-1.5 h-1.5 bg-slate-700 group-hover:bg-teal-500 rounded-full transition-all"></span>
                                Employer Console
                            </Link></li>
                        </ul>
                    </FooterAccordion>

                    {/* Support & Contact */}
                    <FooterAccordion title="Support">
                        <div className="py-2 space-y-6">
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3 group">
                                    <MapPin className="w-4 h-4 text-slate-500 group-hover:text-teal-500 transition-colors shrink-0 mt-0.5" />
                                    <span className="text-xs leading-relaxed">
                                        KHAN HUB (PVT.) LTD.<br />
                                        Multan road Pir Murad, Vehari
                                    </span>
                                </li>
                                <li className="flex items-center gap-3 group">
                                    <Phone className="w-4 h-4 text-slate-500 group-hover:text-teal-500 transition-colors shrink-0" />
                                    <a href="tel:03006395220" className="text-sm font-semibold text-white hover:text-teal-400 transition-colors">03006395220</a>
                                </li>
                                <li className="flex items-center gap-3 group">
                                    <Mail className="w-4 h-4 text-slate-500 group-hover:text-teal-500 transition-colors shrink-0" />
                                    <a href="mailto:khanhubnetwork@gmail.com" className="text-sm hover:text-teal-400 transition-colors">khanhubnetwork@gmail.com</a>
                                </li>
                            </ul>
                            <div className="flex gap-4 pt-2">
                                <Link href="/terms" className="text-xs font-bold uppercase tracking-wider hover:text-white transition-colors">Terms</Link>
                                <span className="text-slate-800">|</span>
                                <Link href="/privacy" className="text-xs font-bold uppercase tracking-wider hover:text-white transition-colors">Privacy</Link>
                            </div>
                        </div>
                    </FooterAccordion>
                </div>

                <div className="border-t border-slate-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                    <p>© {currentYear} Khanhub Jobs. All rights reserved.</p>
                    <p className="flex items-center gap-1">
                        Built with <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> for Pakistan's Future
                    </p>
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
                className="w-full py-5 lg:py-0 lg:cursor-default flex items-center justify-between group"
            >
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1 h-4 bg-teal-500 rounded-full"></span>
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
