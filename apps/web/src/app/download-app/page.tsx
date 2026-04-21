'use client';

// src/app/download-app/page.tsx
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Download, Smartphone, Star, ShieldCheck } from 'lucide-react';

export default function DownloadAppPage() {
    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col pt-20">

            {/* ─── Hero Section ─── */}
            <section className="relative overflow-hidden bg-gradient-to-b from-primary-500/10 to-transparent pb-16 pt-8 sm:pt-16">

                {/* Animated Background Blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-20 -right-20 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl opacity-50"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], rotate: [0, -45, 0] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute top-40 -left-20 w-72 h-72 bg-success-500/10 rounded-full blur-3xl opacity-50"
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
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 text-primary-600 font-bold text-sm mb-4 border border-primary-500/20">
                                <Smartphone className="w-4 h-4" />
                                Official Mobile App
                            </span>
                            <h1 className="text-4xl md:text-6xl font-black text-neutral-900 leading-tight font-display mb-4">
                                Keep Khan Hub <br />
                                <span className="text-primary-600 drop-shadow-sm">In Your Pocket</span>
                            </h1>
                            <p className="text-lg text-neutral-600 max-w-xl mx-auto md:mx-0 leading-relaxed">
                                Experience seamless access to our services, instant emergency requests, and quick donations right from your phone. Download the official Android app today!
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
                                <ShieldCheck className="w-5 h-5 text-success-500" />
                                <span className="text-sm font-semibold text-neutral-700">100% Secure</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                                <span className="text-sm font-semibold text-neutral-700">Top Rated</span>
                            </div>
                        </motion.div>

                        {/* Download CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="pt-4 flex justify-center md:justify-start"
                        >
                            <a
                                href="/Khan Hub.apk"
                                download="Khan Hub.apk"
                                className="group inline-flex items-center gap-3 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                            >
                                <Download className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                                Download Full Application
                            </a>
                        </motion.div>
                        <p className="text-xs text-neutral-400 mt-2 text-center md:text-left">File Size: ~30MB • Requires Android 8.0+</p>
                    </div>

                    {/* Hero Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 relative w-full max-w-lg"
                    >
                        <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500">
                            <Image
                                src="/apk-hero.webp"
                                alt="Khan Hub Mobile App Preview"
                                fill
                                className="object-cover"
                                priority
                            />

                            {/* Floating elements */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50 max-w-[200px]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                                        <Download className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs font-bold text-neutral-800">Fast Download</div>
                                </div>
                                <div className="text-xs text-neutral-600">"Get the app in seconds!"</div>
                            </motion.div>
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* ─── Features Section ─── */}
            <section className="py-16 md:py-24 px-4 bg-white relative z-20">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 font-display">Why Download Our App?</h2>
                        <p className="text-neutral-600 max-w-2xl mx-auto">Experience a faster, smoother, and more integrated Khan Hub right on your mobile device.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-3xl bg-neutral-50 hover:bg-primary-50/50 transition-all border border-neutral-100 shadow-sm hover:shadow-md"
                        >
                            <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
                                <Smartphone className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 mb-3">Easy Access</h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">Access all our departments and services instantly from your home screen without opening a browser.</p>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-3xl bg-neutral-50 hover:bg-success-50/50 transition-all border border-neutral-100 shadow-sm hover:shadow-md"
                        >
                            <div className="w-14 h-14 bg-success-100 text-success-600 rounded-2xl flex items-center justify-center mb-6">
                                <Star className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 mb-3">Smooth Experience</h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">Enjoy a blazingly fast native-like experience optimized specifically for your Android device.</p>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-3xl bg-neutral-50 hover:bg-red-50/50 transition-all border border-neutral-100 shadow-sm hover:shadow-md"
                        >
                            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 mb-3">Emergency Ready</h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">Get our quickest access to emergency contacts, ambulance services, and rescue response forms.</p>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
}
