'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { IoMail } from 'react-icons/io5';
import Link from 'next/link';

export default function LoginModal() {
    const { user, loginWithGoogle } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [hasSeenModal, setHasSeenModal] = useState(false);

    useEffect(() => {
        // Check if user has seen modal in this session
        const seen = localStorage.getItem('hasSeenLoginModal');
        setHasSeenModal(!!seen);

        // Show modal if user is not logged in and hasn't seen it recently
        if (!user && !seen) {
            // Small delay to not be improved
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleClose = () => {
        setIsOpen(false);
        // Remember that user closed it for this session
        localStorage.setItem('hasSeenLoginModal', 'true');
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle('job_seeker');
            setIsOpen(false);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    if (!isOpen || user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Unlock Full Access
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Join thousands of professionals. Sign in to view salary details, apply for jobs, and track your applications.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 group"
                        >
                            <FcGoogle className="text-2xl group-hover:scale-110 transition-transform" />
                            <span>Continue with Google</span>
                        </button>

                        <Link
                            href="/auth/login"
                            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-200"
                        >
                            <IoMail className="text-xl" />
                            <span>Sign in with Email</span>
                        </Link>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleClose}
                            className="text-sm text-gray-500 hover:text-gray-900 font-medium hover:underline"
                        >
                            I'll sign in later
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 text-center text-xs text-gray-500 border-t border-slate-100">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </div>
            </div>
        </div>
    );
}
