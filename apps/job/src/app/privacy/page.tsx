'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export default function PrivacyPage() {
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
                            <Lock size={24} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight italic">
                            Privacy Policy
                        </h1>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
                        <p className="font-bold text-slate-900">
                            Your privacy is important to us. It is Khan Hub's policy to respect your privacy regarding any information we may collect from you across our website.
                        </p>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">1. Information We Collect</h2>
                            <p>
                                We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">2. Use of Information</h2>
                            <p>
                                We use your information to provide and improve our services, communicate with you, and for security and fraud prevention. Specifically, your video profile and professional data are used to match you with potential opportunities.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">3. Data Retention</h2>
                            <p>
                                We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">4. Third-Party Services</h2>
                            <p>
                                We use third-party services like Firebase (authentication and database) and Cloudinary (video storage). These services have their own privacy policies. Our website may link to external sites that are not operated by us.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm mb-4">5. Your Rights</h2>
                            <p>
                                You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services.
                            </p>
                        </section>

                        <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Last Updated: March 2024</p>
                            <Link href="/terms" className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
                                Terms of Service →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
