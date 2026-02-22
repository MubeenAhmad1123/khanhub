'use client';

import React from 'react';
import { X, User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, CreditCard, Video, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toDate } from '@/lib/firebase/firestore';
import Link from 'next/link';

interface UserDetailDrawerProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserDetailDrawer({ user, isOpen, onClose }: UserDetailDrawerProps) {
    if (!user) return null;

    const registrationDate = user.createdAt
        ? format(toDate(user.createdAt), 'PPP')
        : 'Unknown';

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[101] transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 uppercase">User Profile</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
                        {/* Avatar & Basic Info */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-700 text-3xl font-black mb-4 border-4 border-blue-50">
                                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">{user.name || 'Anonymous User'}</h3>
                            <p className="text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                                <Mail className="w-4 h-4" /> {user.email}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                                    {user.role?.replace('_', ' ') || 'User'}
                                </span>
                                <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${user.profile_status === 'active' ? 'bg-green-100 text-green-700' :
                                    user.profile_status === 'video_pending' ? 'bg-blue-100 text-blue-700' :
                                        user.profile_status === 'payment_pending' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-slate-100 text-slate-500'
                                    }`}>
                                    {user.profile_status?.replace('_', ' ') || 'Incomplete'}
                                </span>
                            </div>
                        </div>

                        {/* Details Sections */}
                        <div className="space-y-6">
                            <Section title="Professional Details">
                                <DetailItem icon={<Briefcase />} label="Industry" value={user.industry || 'Not set'} />
                                <DetailItem icon={<Briefcase />} label="Subcategory" value={user.subcategory || 'Not set'} />
                                <DetailItem icon={<Shield />} label="Account Type" value={user.isPremium ? '💎 Premium' : 'Free Tier'} />
                            </Section>

                            <Section title="Contact Information">
                                <DetailItem icon={<Phone />} label="Phone" value={user.phone || 'Not provided'} />
                                <DetailItem icon={<MapPin />} label="Location" value={user.location || 'Not provided'} />
                            </Section>

                            <Section title="Platform Info">
                                <DetailItem icon={<Calendar />} label="Registered" value={registrationDate} />
                                <DetailItem icon={<CreditCard />} label="Payment Status" value={user.paymentStatus || 'Not started'} />
                                <DetailItem icon={<Video />} label="Video Upload" value={user.video_upload_enabled ? 'Enabled ✅' : 'Disabled ❌'} />
                            </Section>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <div className="grid grid-cols-1 gap-3">
                            <Link
                                href={`/admin/users/${user.uid}/edit`}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all text-sm shadow-lg shadow-slate-900/10"
                            >
                                <ExternalLink className="w-4 h-4" /> Edit Profile Details
                            </Link>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm">
                                    <Phone className="w-4 h-4" /> Call User
                                </button>
                                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-500/20">
                                    Send Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{title}</h4>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                {children}
            </div>
        </div>
    );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 shrink-0">
                {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
}
