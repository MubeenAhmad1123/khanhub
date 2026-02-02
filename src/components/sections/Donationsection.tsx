'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function DonateCTASection() {
    // Recent donations (this would come from your backend in production)
    const recentDonations = [
        { name: 'Ahmed K.', amount: 2000, time: '2 mins ago', avatar: 'AK' },
        { name: 'Sara M.', amount: 500, time: '5 mins ago', avatar: 'SM' },
        { name: 'Hassan R.', amount: 1000, time: '12 mins ago', avatar: 'HR' },
        { name: 'Fatima A.', amount: 1500, time: '18 mins ago', avatar: 'FA' },
        { name: 'Ali Z.', amount: 3000, time: '25 mins ago', avatar: 'AZ' },
    ];

    // Animated counter for total donors
    const [donorCount, setDonorCount] = useState(4850);

    useEffect(() => {
        // Simulate live updates
        const interval = setInterval(() => {
            setDonorCount(prev => prev + Math.floor(Math.random() * 3));
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    // Avatar colors
    const avatarColors = [
        'bg-primary-500',
        'bg-success-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-pink-500',
    ];

    return (
        <section className="section bg-gradient-to-b from-white to-neutral-50">
            <div className="section-inner">
                <div className="max-w-4xl mx-auto">

                    {/* Main Card */}
                    <div className="relative rounded-3xl overflow-hidden border-2 border-neutral-200 bg-white p-8 md:p-12 text-center shadow-xl">

                        {/* Subtle Background Gradient */}
                        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary-50/30 to-transparent -z-10" />

                        {/* Social Proof Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="mb-8"
                        >
                            {/* Avatar Cluster */}
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex -space-x-3">
                                    {recentDonations.slice(0, 5).map((donor, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, scale: 0 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: index * 0.1, duration: 0.3 }}
                                            className={`w-12 h-12 rounded-full ${avatarColors[index]} border-2 border-white flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                                        >
                                            {donor.avatar}
                                        </motion.div>
                                    ))}
                                    <div className="w-12 h-12 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-neutral-600 font-bold text-xs shadow-lg">
                                        +99
                                    </div>
                                </div>
                            </div>

                            {/* Donor Count with Animation */}
                            <motion.div
                                key={donorCount}
                                initial={{ scale: 1.1, opacity: 0.8 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl md:text-3xl font-bold text-neutral-900 font-display"
                            >
                                {donorCount.toLocaleString()}+ donors this month
                            </motion.div>

                            {/* Trust Badge */}
                            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-success-50 border border-success-200 rounded-full">
                                <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-semibold text-success-700">Verified Organization</span>
                            </div>
                        </motion.div>

                        {/* Headline */}
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight mb-6 font-display"
                        >
                            Join them in making <span className="text-gradient">Real Impact</span>
                        </motion.h2>

                        {/* Live Feed - Recent Donations */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="max-w-md mx-auto mb-8"
                        >
                            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-semibold text-neutral-700">Recent Donations</span>
                                </div>

                                <div className="space-y-3">
                                    {recentDonations.slice(0, 3).map((donation, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.4 + (index * 0.1), duration: 0.5 }}
                                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full ${avatarColors[index]} flex items-center justify-center text-white font-bold text-sm`}>
                                                    {donation.avatar}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-semibold text-neutral-900 text-sm">{donation.name}</div>
                                                    <div className="text-xs text-neutral-500">{donation.time}</div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-primary-600">PKR {donation.amount}</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Impact Preview */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto"
                        >
                            {[
                                { emoji: '🏥', text: 'PKR 500 = Medical Care', color: 'border-primary-200 bg-primary-50' },
                                { emoji: '📚', text: 'PKR 1000 = Education', color: 'border-success-200 bg-success-50' },
                                { emoji: '🍲', text: 'PKR 2000 = Food Aid', color: 'border-blue-200 bg-blue-50' },
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    whileHover={{ scale: 1.05, y: -4 }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                    className={`p-4 rounded-xl border-2 ${item.color} cursor-default`}
                                >
                                    <div className="text-2xl mb-2">{item.emoji}</div>
                                    <div className="text-sm font-medium text-neutral-700">{item.text}</div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Primary CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="space-y-4"
                        >
                            <Link
                                href="/donate"
                                className="group inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl font-bold text-white text-lg transition-all duration-300 hover:scale-105 shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40"
                            >
                                <span className="text-2xl">💝</span>
                                Donate Now
                                <svg
                                    className="w-6 h-6 group-hover:translate-x-1 transition-transform"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>

                            {/* Secondary Info */}
                            <div className="flex items-center justify-center gap-6 text-sm text-neutral-600">
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">Secure Payment</span>
                                </div>
                                <div className="h-4 w-px bg-neutral-300" />
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">Tax Deductible</span>
                                </div>
                                <div className="h-4 w-px bg-neutral-300" />
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">100% Transparent</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Bottom subtle text */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="text-sm text-neutral-500 mt-6"
                        >
                            Every rupee goes directly to those who need it most
                        </motion.p>
                    </div>
                </div>
            </div>
        </section>
    );
}