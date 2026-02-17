'use client';

// src/app/whatsapp/page.tsx
// ─────────────────────────────────────────────────────────────────
// WhatsApp Contact Page - "Super Cool" Version
// Features:
// - Animated Hero Section with Floating Elements
// - Direct Message Form (Redirects to wa.me)
// - Premium Glassmorphism UI
// - Mobile Optimized
// ─────────────────────────────────────────────────────────────────

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Phone, ArrowRight } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';

export default function WhatsAppPage() {
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        const phoneNumber = '923006395220'; // Khan Hub WhatsApp
        const encodedMessage = encodeURIComponent(
            `Hello Khan Hub,\n\nMy name is ${name}.\n\n${message}`
        );
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col pt-20">

            {/* ─── Hero Section ─── */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#25D366]/10 to-transparent pb-16 pt-8 sm:pt-16">

                {/* Animated Background Blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-20 -right-20 w-96 h-96 bg-[#25D366]/20 rounded-full blur-3xl opacity-50"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], rotate: [0, -45, 0] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute top-40 -left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl opacity-50"
                    />
                </div>

                <div className="container-custom relative z-10 flex flex-col md:flex-row items-center gap-12">

                    {/* Text Content */}
                    <div className="flex-1 text-center md:text-left space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/10 text-[#25D366] font-bold text-sm mb-4 border border-[#25D366]/20">
                                <SiWhatsapp className="w-4 h-4" />
                                Direct Priority Support
                            </span>
                            <h1 className="text-4xl md:text-6xl font-black text-neutral-900 leading-tight font-display mb-4">
                                Chat with us on <br />
                                <span className="text-[#25D366] drop-shadow-sm">WhatsApp</span>
                            </h1>
                            <p className="text-lg text-neutral-600 max-w-xl mx-auto md:mx-0 leading-relaxed">
                                Connect instantly with our support team. Whether you need help with donations, departments, or emergency services, we're just a message away.
                            </p>
                        </motion.div>

                        {/* Quick Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="flex flex-wrap justify-center md:justify-start gap-6 pt-4"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-semibold text-neutral-700">Online Now</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-sm font-semibold text-neutral-700">Avg. Reply: &lt; 5 mins</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Hero Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 relative w-full max-w-lg"
                    >
                        <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500">
                            {/* 
                  NOTE: User requested 'whatsapp-hero.webp'.
                  Ensure this image exists in public folder.
               */}
                            <Image
                                src="/whatsapp-hero.webp"
                                alt="Khan Hub WhatsApp Support"
                                fill
                                className="object-cover"
                                priority
                            />

                            {/* Floating elements */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50 max-w-[200px]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div className="text-xs font-bold text-neutral-800">Support Team</div>
                                </div>
                                <div className="text-xs text-neutral-600">"How can we help you today?"</div>
                            </motion.div>
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* ─── Form Section ─── */}
            <section className="py-16 md:py-24 px-4">
                <div className="max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-3xl shadow-xl shadow-neutral-200/50 overflow-hidden border border-neutral-100"
                    >
                        <div className="bg-[#25D366] p-6 text-white text-center">
                            <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
                            <p className="opacity-90 text-sm">Fill out the form below to message us directly on WhatsApp</p>
                        </div>

                        <form onSubmit={handleSend} className="p-6 md:p-10 space-y-6">

                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-bold text-neutral-700 ml-1">Your Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    placeholder="e.g. Ali Khan"
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/10 outline-none transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-bold text-neutral-700 ml-1">Message</label>
                                <textarea
                                    id="message"
                                    required
                                    rows={4}
                                    placeholder="Type your message here..."
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/10 outline-none transition-all resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl shadow-lg shadow-[#25D366]/30 hover:shadow-[#25D366]/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group"
                            >
                                <span>Continue to WhatsApp</span>
                                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="text-center pt-4">
                                <p className="text-xs text-neutral-500">
                                    By clicking continue, you will be redirected to WhatsApp.
                                </p>
                            </div>

                        </form>
                    </motion.div>
                </div>
            </section>

        </div>
    );
}
