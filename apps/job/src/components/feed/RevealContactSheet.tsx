'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Copy, Check, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

interface RevealContactSheetProps {
    isOpen: boolean;
    onClose: () => void;
    targetName: string;
    userId: string;
}

export function RevealContactSheet({ isOpen, onClose, targetName, userId }: RevealContactSheetProps) {
    const [copied, setCopied] = useState(false);
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

    const jazzCashNumber = "0300-1234567";
    const amount = "1,000";
    const reference = `JOBREEL-${userId.slice(-6).toUpperCase()}`;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = () => {
        if (!screenshot) return;
        setStatus('submitting');
        // Simulate submission
        setTimeout(() => {
            setStatus('success');
        }, 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="fixed bottom-0 left-0 right-0 bg-[--bg-secondary] border-t border-[--border] rounded-t-[32px] p-8 z-[70] pb-12 overflow-y-auto max-h-[90vh]"
                    >
                        <div className="w-12 h-1 bg-[--border] rounded-full mx-auto mb-6" />

                        {status === 'success' ? (
                            <div className="py-12 flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                                    <Check className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold font-syne mb-2">Payment Submitted!</h3>
                                <p className="text-[--text-muted]">We are verifying your payment. {targetName}'s contact info will be revealed within 2-4 hours.</p>
                                <button
                                    onClick={onClose}
                                    className="mt-8 px-8 py-3 bg-white text-black font-bold font-syne rounded-full uppercase tracking-widest text-xs"
                                >
                                    Back to Feed
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-[--accent]/20 flex items-center justify-center">
                                                <Phone className="w-4 h-4 text-[--accent]" />
                                            </div>
                                            <h3 className="text-[--accent] font-black font-syne uppercase tracking-wider text-sm">Contact Hidden</h3>
                                        </div>
                                        <h2 className="text-2xl font-bold font-syne leading-tight">
                                            Unlock {targetName}'s contact info
                                        </h2>
                                    </div>
                                    <button onClick={onClose} className="p-2 text-[--text-muted] hover:text-white transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="p-4 rounded-2xl bg-black border border-[--border] space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[--text-muted]">JazzCash Number</span>
                                            <button
                                                onClick={() => handleCopy(jazzCashNumber)}
                                                className="flex items-center gap-2 font-bold text-white hover:text-[--accent] transition-colors"
                                            >
                                                {jazzCashNumber}
                                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[--text-muted]">Amount</span>
                                            <span className="font-bold text-white text-lg">Rs. {amount}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[--text-muted]">Reference Nickname</span>
                                            <button
                                                onClick={() => handleCopy(reference)}
                                                className="font-bold text-[--accent] hover:underline"
                                            >
                                                {reference}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 text-[10px] text-[--text-muted] leading-relaxed">
                                        <ShieldCheck className="w-6 h-6 text-[--accent] shrink-0" />
                                        <p>Pay exactly <span className="text-white">Rs. {amount}</span>. Once verified, you'll receive a notification and the contact details will be shown on this profile.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-3">Upload Screenshot</label>
                                        <div
                                            className="border-2 border-dashed border-[--border] rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-[--accent] transition-colors cursor-pointer"
                                            onClick={() => document.getElementById('screenshot-upload')?.click()}
                                        >
                                            {screenshot ? (
                                                <div className="flex items-center gap-2 text-[--accent]">
                                                    <Check className="w-5 h-5" />
                                                    <span className="text-sm font-bold">{screenshot.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-full bg-[--bg-card] flex items-center justify-center mb-3">
                                                        <PlusSquare size={24} className="text-[--text-muted]" />
                                                    </div>
                                                    <span className="text-xs text-[--text-muted]">Tap to upload payment confirmation</span>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            id="screenshot-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                                        />
                                    </div>

                                    <button
                                        disabled={!screenshot || status === 'submitting'}
                                        onClick={handleSubmit}
                                        className="w-full py-4 bg-[--accent] disabled:opacity-50 disabled:grayscale text-black font-black font-syne uppercase tracking-widest text-sm rounded-2xl shadow-[0_0_24px_var(--accent-glow)] transition-all active:scale-[0.98]"
                                    >
                                        {status === 'submitting' ? 'Verifying...' : 'Submit for Verification →'}
                                    </button>

                                    <p className="text-center text-[10px] text-[--text-muted] uppercase tracking-[0.2em]">
                                        Verified within 2-4 hours
                                    </p>
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

import { PlusSquare } from 'lucide-react';
