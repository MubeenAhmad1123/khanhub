'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 md:p-12">
                    <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm mb-8 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Shield size={24} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight italic">
                            Terms of Service
                        </h1>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using Khan Hub, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">2. Use License</h2>
                            <p>
                                Permission is granted to temporarily download one copy of the materials (information or software) on Khan Hub's website for personal, non-commercial transitory viewing only.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">3. User Content (Video Profiles)</h2>
                            <p>
                                When you upload a video profile to Khan Hub, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and display that content for the purpose of provideing our services. You are solely responsible for the content you upload.
                            </p>
                            <p className="mt-2 text-red-500 font-bold italic text-xs">
                                IMPORTANT: Do not include sensitive personal information like phone numbers or exact locations in your videos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">4. Disclaimer</h2>
                            <p>
                                The materials on Khan Hub's website are provided on an 'as is' basis. Khan Hub makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">5. Limitations</h2>
                            <p>
                                In no event shall Khan Hub or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Khan Hub's website.
                            </p>
                        </section>

                        <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Last Updated: March 2024</p>
                            <Link href="/privacy" className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
                                Privacy Policy →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
