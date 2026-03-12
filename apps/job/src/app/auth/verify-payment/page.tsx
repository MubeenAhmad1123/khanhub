'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Zap, ArrowRight, Loader2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, Suspense } from 'react';

function VerifyPaymentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const [mounted, setMounted] = useState(false);
    const type = searchParams.get('type');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#FF0069] animate-spin" />
            </div>
        );
    }

    const isExtraVideo = type === 'extra_video';

    return (
        <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-6 selection:bg-[#FF0069]">
            <div className="max-w-md w-full text-center space-y-10 animate-in fade-in zoom-in duration-700">
                {/* Success Icon with Glow */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FF0069] to-[#7638FA] blur-[60px] opacity-30 animate-pulse" />
                    <div className="relative w-32 h-32 rounded-full bg-[#111111] border-2 border-[#1F1F1F] flex items-center justify-center mx-auto shadow-2xl">
                        {isExtraVideo ? (
                            <Clock className="w-16 h-16 text-[#FFD600]" />
                        ) : (
                            <CheckCircle className="w-16 h-16 text-[#FF0069]" />
                        )}
                    </div>
                    <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-[#FFD600] flex items-center justify-center text-black rotate-12 shadow-lg">
                        <Zap className="w-6 h-6" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-black font-poppins tracking-tighter uppercase italic">
                        {isExtraVideo ? (
                            <>Slot <span className="text-[#FFD600]">Pending</span></>
                        ) : (
                            <>Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0069] to-[#7638FA]">Unlocked</span></>
                        )}
                    </h1>
                    <p className="text-[#888888] font-dm-sans leading-relaxed">
                        {isExtraVideo ? (
                            <>
                                Thank you, {user?.displayName || 'User'}! Your payment for an extra video slot is being reviewed. 
                                <br /><br />
                                <span className="text-[#FFD600] font-bold">Important:</span> Once approved, your new slot will be available. 
                                Note that any videos uploaded will still follow our standard admin review process.
                            </>
                        ) : (
                            <>
                                Welcome, {user?.displayName || 'User'}! Your KHAN HUB account is ready.
                                Start browsing video opportunities or post your own reel now.
                            </>
                        )}
                    </p>
                </div>

                {/* Stats / Info Badges */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#111111] border border-[#1F1F1F] p-4 rounded-[20px] text-center">
                        <p className="text-[#888888] text-[10px] uppercase font-black tracking-widest mb-1">Status</p>
                        <p className="text-white font-bold uppercase transition-colors hover:text-[#FF0069]">
                            {isExtraVideo ? 'Pending Approval' : 'Active'}
                        </p>
                    </div>
                    <div className="bg-[#111111] border border-[#1F1F1F] p-4 rounded-[20px] text-center">
                        <p className="text-[#888888] text-[10px] uppercase font-black tracking-widest mb-1">Type</p>
                        <p className="text-[#FFD600] font-bold uppercase">
                            {isExtraVideo ? 'Extra Slot' : 'KHAN HUB Pro'}
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => router.push('/feed')}
                    className="w-full py-6 rounded-[24px] font-black font-poppins uppercase italic tracking-[0.2em] text-lg bg-gradient-to-r from-[#FF0069] to-[#7638FA] hover:shadow-[0_0_40px_rgba(255,0,105,0.4)] transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-4 group"
                >
                    {isExtraVideo ? 'Go to Feed' : 'Start Exploring'}
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </button>

                {/* Meta Info */}
                <div className="pt-8 border-t border-[#1F1F1F]">
                    <p className="text-[#888888] text-xs font-dm-sans">
                        Redirecting automatically in 5 seconds...
                    </p>
                </div>
            </div>

            {/* Background Decorative Elements */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF0069]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7638FA]/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
    );
}

export default function VerifyPaymentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#FF0069] animate-spin" />
            </div>
        }>
            <VerifyPaymentContent />
        </Suspense>
    );
}
