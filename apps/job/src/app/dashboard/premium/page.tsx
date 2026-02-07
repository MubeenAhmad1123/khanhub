'use client';

import { useRouter } from 'next/navigation';
import { Crown, Check, Zap, Star, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePayment } from '@/hooks/usePayment';
import PremiumBadge from '@/components/premium/PremiumBadge';

export default function PremiumUpgradePage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const { submitPayment, uploading, success } = usePayment();

    if (profile?.isPremium) {
        return (
            <div className="min-h-screen bg-jobs-neutral py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-12 rounded-3xl shadow-2xl text-white text-center">
                        <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <Crown className="h-12 w-12" />
                        </div>
                        <h1 className="text-4xl font-black mb-4">You're Already Premium!</h1>
                        <p className="text-white/90 text-lg mb-6">
                            Enjoy unlimited applications and full access to all features
                        </p>
                        {profile.premiumExpiresAt && (
                            <p className="text-white/80">
                                Your premium membership expires on {new Date(profile.premiumExpiresAt).toLocaleDateString()}
                            </p>
                        )}
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-8 bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-jobs-accent via-orange-500 to-red-500 py-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-white/30 px-6 py-3 rounded-full mb-6 backdrop-blur-sm">
                        <Crown className="h-5 w-5 text-white" />
                        <span className="text-white font-bold">Premium Membership</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
                        Unlock Your Career Potential
                    </h1>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Get unlimited applications, see full company details, and gain priority support
                    </p>
                </div>

                {/* Pricing Card */}
                <div className="max-w-2xl mx-auto mb-16">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-jobs-accent to-orange-600 p-8 text-white text-center">
                            <PremiumBadge className="mx-auto mb-4" />
                            <div className="text-6xl font-black mb-2">Rs. 10,000</div>
                            <div className="text-xl opacity-90">per month</div>
                        </div>

                        <div className="p-10">
                            <h3 className="text-2xl font-black text-jobs-dark mb-6 text-center">
                                Premium Features
                            </h3>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-start gap-4">
                                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-jobs-dark">Unlimited Applications</div>
                                        <div className="text-sm text-jobs-dark/60">
                                            Apply to as many jobs as you want (free users: 10 max)
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-jobs-dark">Full Company Details</div>
                                        <div className="text-sm text-jobs-dark/60">
                                            View company email, phone, and address (hidden for free users)
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-jobs-dark">Priority Support</div>
                                        <div className="text-sm text-jobs-dark/60">
                                            Get faster responses from our support team
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-jobs-dark">Premium Badge</div>
                                        <div className="text-sm text-jobs-dark/60">
                                            Stand out with a premium badge on your profile
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-jobs-dark">Advanced Analytics</div>
                                        <div className="text-sm text-jobs-dark/60">
                                            Track your application performance and views
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-jobs-dark">Early Access</div>
                                        <div className="text-sm text-jobs-dark/60">
                                            Be first to see new job postings
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push('/auth/verify-payment?type=premium')}
                                className="w-full bg-gradient-to-r from-jobs-accent to-orange-600 text-white py-5 rounded-xl font-black text-lg hover:opacity-90 transition-all shadow-xl shadow-jobs-accent/30 flex items-center justify-center gap-2"
                            >
                                <Zap className="h-6 w-6" />
                                Upgrade to Premium Now
                            </button>

                            <p className="text-center text-sm text-jobs-dark/50 mt-4">
                                Secure payment via JazzCash screenshot verification
                            </p>
                        </div>
                    </div>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-center">
                        <div className="bg-white/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Star className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Stand Out</h3>
                        <p className="text-white/80 text-sm">
                            Get noticed by employers with your premium badge
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-center">
                        <div className="bg-white/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <TrendingUp className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Unlimited Growth</h3>
                        <p className="text-white/80 text-sm">
                            Apply to unlimited jobs and maximize your opportunities
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-center">
                        <div className="bg-white/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Direct Contact</h3>
                        <p className="text-white/80 text-sm">
                            See full company contact details and reach out directly
                        </p>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-3xl p-10 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-black text-jobs-dark mb-8 text-center">
                        Frequently Asked Questions
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-jobs-dark mb-2">How do I pay for premium?</h3>
                            <p className="text-jobs-dark/70 text-sm">
                                Click "Upgrade to Premium Now" and you'll be redirected to upload your JazzCash payment screenshot. Once approved by our admin team, your premium membership will be activated.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-jobs-dark mb-2">What happens after one month?</h3>
                            <p className="text-jobs-dark/70 text-sm">
                                Your premium membership lasts for 30 days. You'll receive an email reminder before it expires. You can renew by making another payment.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-jobs-dark mb-2">Can I cancel anytime?</h3>
                            <p className="text-jobs-dark/70 text-sm">
                                Premium membership is monthly. If you don't renew, you'll automatically return to the free plan after expiration, but you'll keep access until the end of your paid period.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-jobs-dark mb-2">What's included in the free plan?</h3>
                            <p className="text-jobs-dark/70 text-sm">
                                Free users can apply to up to 10 jobs, but company contact details are hidden. Premium removes these limitations and adds exclusive features.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-16">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-white/80 hover:text-white font-bold underline"
                    >
                        Maybe Later - Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
