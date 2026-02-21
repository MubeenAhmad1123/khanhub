'use client';

import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/hooks/useAuth';
import { Users, Loader2, Phone, Mail, Building2, ExternalLink, Calendar, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function EmployerConnectionsPage() {
    const { connections, loading } = useConnections();
    const { user } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFF] p-4 md:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contact Reveals</h1>
                        <p className="text-slate-500 font-bold">Candidates you have requested to connect with</p>
                    </div>
                </div>

                {connections.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No reveals yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-8">
                            Browse candidates and click "Connect & Reveal" to unlock their contact information.
                        </p>
                        <Link href="/browse" className="px-8 py-4 bg-orange-600 text-white rounded-full font-bold shadow-lg shadow-orange-500/20">
                            Browse Candidates
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {connections.map((conn) => (
                            <div key={conn.id} className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <ShieldCheck className="w-5 h-5 text-orange-600" />
                                        <h3 className="text-lg font-black text-slate-900">{conn.seekerName}</h3>
                                        <div className={cn(
                                            "ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            conn.status === 'approved' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                        )}>
                                            {conn.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {conn.createdAt ? format(conn.createdAt.toDate(), 'PPP') : 'Just now'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {conn.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-orange-500" />}
                                            {conn.status === 'approved' ? 'Revealed' : 'Verification Pending'}
                                        </div>
                                    </div>

                                    {conn.status !== 'approved' && (
                                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-4">
                                            <p className="text-xs text-orange-800 font-bold leading-relaxed">
                                                Our team is verifying your payment for this reveal. Once approved, the candidate's contact info will appear here.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="md:w-80 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Candidate Details</p>
                                    {conn.status === 'approved' ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-xl">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                +92 300 1234567
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-xl">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                candidate@example.com
                                            </div>
                                            <button className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                                <ExternalLink className="w-3 h-3" />
                                                View LinkedIn
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                                            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                                            <div className="h-10 bg-slate-100 rounded-xl animate-pulse opacity-50" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
