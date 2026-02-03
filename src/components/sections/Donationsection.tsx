'use client';
// src/components/sections/DonateCTASection.tsx - OPTIMIZED VERSION
// ─────────────────────────────────────────────────────────────────
// Optimizations:
// ✅ Performance optimized with reduced animations
// ✅ SEO optimized with semantic HTML and schema markup
// ✅ Mobile-first responsive design
// ✅ Accessibility improvements (ARIA labels, contrast)
// ✅ Memoized components to prevent re-renders
// ─────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, memo, useCallback } from 'react';
import { Heart, Shield, Lock, TrendingUp, ArrowRight } from 'lucide-react';

// Memoized Avatar Component
const DonorAvatar = memo(function DonorAvatar({
    avatar,
    color,
    index
}: {
    avatar: string;
    color: string;
    index: number
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${color} border-2 border-white flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg`}
            aria-hidden="true"
        >
            {avatar}
        </motion.div>
    );
});

// Memoized Recent Donation Item
const RecentDonationItem = memo(function RecentDonationItem({
    donation,
    color,
    index
}: {
    donation: { name: string; amount: number; time: string; avatar: string };
    color: string;
    index: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200"
        >
            <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${color} flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0`}>
                    {donation.avatar}
                </div>
                <div className="text-left">
                    <div className="font-semibold text-neutral-900 text-xs sm:text-sm">{donation.name}</div>
                    <div className="text-xs text-neutral-500">{donation.time}</div>
                </div>
            </div>
            <div className="font-bold text-primary-600 text-sm sm:text-base whitespace-nowrap">PKR {donation.amount}</div>
        </motion.div>
    );
});

// Memoized Impact Card
const ImpactCard = memo(function ImpactCard({
    emoji,
    text,
    color,
    index
}: {
    emoji: string;
    text: string;
    color: string;
    index: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -4 }}
            className={`p-3 sm:p-4 rounded-xl border-2 ${color} cursor-default touch-manipulation`}
        >
            <div className="text-xl sm:text-2xl mb-2" aria-hidden="true">{emoji}</div>
            <div className="text-xs sm:text-sm font-medium text-neutral-700">{text}</div>
        </motion.div>
    );
});

// Memoized Trust Indicator
const TrustIndicator = memo(function TrustIndicator({
    icon: Icon,
    text
}: {
    icon: React.ElementType;
    text: string
}) {
    return (
        <div className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-success-600 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium text-xs sm:text-sm">{text}</span>
        </div>
    );
});

export function DonateCTASection() {
    // Recent donations data
    const recentDonations = [
        { name: 'Ahmed K.', amount: 2000, time: '2 mins ago', avatar: 'AK' },
        { name: 'Sara M.', amount: 500, time: '5 mins ago', avatar: 'SM' },
        { name: 'Hassan R.', amount: 1000, time: '12 mins ago', avatar: 'HR' },
        { name: 'Fatima A.', amount: 1500, time: '18 mins ago', avatar: 'FA' },
        { name: 'Ali Z.', amount: 3000, time: '25 mins ago', avatar: 'AZ' },
    ];

    const avatarColors = [
        'bg-primary-500',
        'bg-success-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-pink-500',
    ];

    const impactItems = [
        { emoji: '🏥', text: 'PKR 500 = Medical Care', color: 'border-primary-200 bg-primary-50' },
        { emoji: '📚', text: 'PKR 1000 = Education', color: 'border-success-200 bg-success-50' },
        { emoji: '🍲', text: 'PKR 2000 = Food Aid', color: 'border-blue-200 bg-blue-50' },
    ];

    // Animated counter for total donors
    const [donorCount, setDonorCount] = useState(4850);

    useEffect(() => {
        const interval = setInterval(() => {
            setDonorCount((prev) => prev + Math.floor(Math.random() * 3));
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section
            className="section bg-gradient-to-b from-white to-neutral-50"
            aria-labelledby="donate-heading"
            itemScope
            itemType="https://schema.org/DonateAction"
        >
            <div className="section-inner">
                <div className="max-w-4xl mx-auto">
                    {/* Main Card */}
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-neutral-200 bg-white p-6 sm:p-8 md:p-12 text-center shadow-xl">
                        {/* Subtle Background Gradient */}
                        <div className="absolute top-0 left-0 right-0 h-32 sm:h-48 bg-gradient-to-b from-primary-50/30 to-transparent -z-10" aria-hidden="true" />

                        {/* Social Proof Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="mb-6 sm:mb-8"
                        >
                            {/* Avatar Cluster */}
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex -space-x-2 sm:-space-x-3">
                                    {recentDonations.slice(0, 5).map((donor, index) => (
                                        <DonorAvatar
                                            key={index}
                                            avatar={donor.avatar}
                                            color={avatarColors[index]}
                                            index={index}
                                        />
                                    ))}
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-neutral-600 font-bold text-xs shadow-lg">
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
                                className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 font-display"
                            >
                                {donorCount.toLocaleString()}+ donors this month
                            </motion.div>

                            {/* Trust Badge */}
                            <div className="inline-flex items-center gap-2 mt-3 px-3 sm:px-4 py-2 bg-success-50 border border-success-200 rounded-full">
                                <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-success-600" aria-hidden="true" />
                                <span className="text-xs sm:text-sm font-semibold text-success-700">Verified Organization</span>
                            </div>
                        </motion.div>

                        {/* Headline - SEO Optimized */}
                        <motion.h2
                            id="donate-heading"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight mb-4 sm:mb-6 font-display"
                            itemProp="name"
                        >
                            Join them in making <span className="text-gradient">Real Impact</span>
                        </motion.h2>

                        {/* Live Feed - Recent Donations */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="max-w-md mx-auto mb-6 sm:mb-8"
                        >
                            <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 border border-neutral-200">
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" aria-hidden="true" />
                                    <span className="text-xs sm:text-sm font-semibold text-neutral-700">Recent Donations</span>
                                </div>

                                <div className="space-y-2 sm:space-y-3" role="feed" aria-label="Recent donations">
                                    {recentDonations.slice(0, 3).map((donation, index) => (
                                        <RecentDonationItem
                                            key={index}
                                            donation={donation}
                                            color={avatarColors[index]}
                                            index={index}
                                        />
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
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 max-w-2xl mx-auto"
                        >
                            {impactItems.map((item, index) => (
                                <ImpactCard key={index} {...item} index={index} />
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
                                className="group inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl font-bold text-white text-base sm:text-lg transition-all duration-300 hover:scale-105 shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 w-full sm:w-auto justify-center touch-manipulation min-h-[56px]"
                                itemProp="url"
                            >
                                <Heart className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" aria-hidden="true" />
                                <span>Donate Now</span>
                                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                            </Link>

                            {/* Trust Indicators */}
                            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-neutral-600">
                                <TrustIndicator icon={Lock} text="Secure Payment" />
                                <div className="h-4 w-px bg-neutral-300 hidden sm:block" aria-hidden="true" />
                                <TrustIndicator icon={Shield} text="Tax Deductible" />
                                <div className="h-4 w-px bg-neutral-300 hidden sm:block" aria-hidden="true" />
                                <TrustIndicator icon={TrendingUp} text="100% Transparent" />
                            </div>
                        </motion.div>

                        {/* Bottom Text */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="text-xs sm:text-sm text-neutral-500 mt-4 sm:mt-6"
                        >
                            Every rupee goes directly to those who need it most
                        </motion.p>
                    </div>
                </div>
            </div>

            {/* SEO Schema Markup */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'DonateAction',
                        name: 'Donate to Khan Hub',
                        description: 'Support Pakistan\'s leading social welfare organization',
                        recipient: {
                            '@type': 'Organization',
                            name: 'Khan Hub',
                            url: 'https://khanhub.com.pk'
                        },
                        actionStatus: 'https://schema.org/PotentialActionStatus'
                    })
                }}
            />

            {/* Optimized Styles */}
            <style jsx>{`
        @media (max-width: 640px) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
        </section>
    );
}