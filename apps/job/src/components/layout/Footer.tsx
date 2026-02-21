import Link from 'next/link';
import { Video } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-[#0A0F1E] text-white py-20 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20 text-center md:text-left">
                    {/* Brand Column */}
                    <div className="md:col-span-1">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-8">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 animate-pulse">
                                <Video className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-white italic tracking-tighter">
                                KhanHub<span className="text-blue-500">Jobs</span>
                            </h2>
                        </div>
                        <p className="text-slate-400 font-medium leading-relaxed mb-10 max-w-sm">
                            Hiring through video. Simple. Human. Real. Pakistan's first truly visual professional network.
                        </p>
                        <div className="flex justify-center md:justify-start gap-4">
                            {/* Social Placeholders */}
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all cursor-pointer">
                                <span className="text-xs">FB</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all cursor-pointer">
                                <span className="text-xs">IN</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all cursor-pointer">
                                <span className="text-xs">YT</span>
                            </div>
                        </div>
                    </div>

                    {/* Job Seekers Column */}
                    <div>
                        <h4 className="font-black text-xs uppercase tracking-[0.3em] mb-10 text-slate-500">For Job Seekers</h4>
                        <ul className="space-y-5">
                            <li><Link href="/browse" className="text-slate-300 hover:text-blue-400 font-medium hover:pl-2 transition-all">Browse Videos</Link></li>
                            <li><Link href="/auth/register" className="text-slate-300 hover:text-blue-400 font-medium hover:pl-2 transition-all">Register Profile</Link></li>
                            <li><Link href="/dashboard/upload-video" className="text-slate-300 hover:text-blue-400 font-medium hover:pl-2 transition-all">Upload My Video</Link></li>
                            <li><Link href="/dashboard/connections" className="text-slate-300 hover:text-blue-400 font-medium hover:pl-2 transition-all">My Connections</Link></li>
                        </ul>
                    </div>

                    {/* Employers Column */}
                    <div>
                        <h4 className="font-black text-xs uppercase tracking-[0.3em] mb-10 text-slate-500">For Employers</h4>
                        <ul className="space-y-5">
                            <li><Link href="/browse" className="text-slate-300 hover:text-orange-400 font-medium hover:pl-2 transition-all">Browse Candidates</Link></li>
                            <li><Link href="/auth/register?role=employer" className="text-slate-300 hover:text-orange-400 font-medium hover:pl-2 transition-all">Register Company</Link></li>
                            <li><Link href="/employer/connections" className="text-slate-300 hover:text-orange-400 font-medium hover:pl-2 transition-all">Company Connections</Link></li>
                            <li><Link href="/admin/login" className="text-slate-50/10 hover:text-white/20 text-[10px] font-black uppercase tracking-widest mt-10 block">Admin Access</Link></li>
                        </ul>
                    </div>

                    {/* Support Column */}
                    <div>
                        <h4 className="font-black text-xs uppercase tracking-[0.3em] mb-10 text-slate-500">Support & Legal</h4>
                        <ul className="space-y-5">
                            <li><Link href="#how-it-works" className="text-slate-300 hover:text-blue-400 font-medium hover:pl-2 transition-all">How It Works</Link></li>
                            <li><Link href="/privacy-policy" className="text-slate-300 hover:text-blue-400 font-medium hover:pl-2 transition-all">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="text-slate-300 hover:text-blue-400 font-medium hover:pl-2 transition-all">Terms of Service</Link></li>
                            <li className="pt-4">
                                <span className="text-[10px] font-black text-slate-600 block mb-2 uppercase tracking-widest">Network Email</span>
                                <span className="text-sm font-bold text-slate-300">khanhubnetwork@gmail.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-10 border-t border-white/5 text-center">
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">
                        &copy; {new Date().getFullYear()} KhanHub Jobs. Pakistan's Dedicated Video-First Job Portal.
                    </p>
                </div>
            </div>
        </footer>
    );
}
