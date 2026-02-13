import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-white py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="md:col-span-1">
                        <h2 className="text-3xl font-black mb-6 text-teal-400">KhanHub</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            Empowering Pakistan's workforce by connecting high-quality talent with verified opportunities.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-slate-500">For Seekers</h4>
                        <ul className="space-y-4 font-medium">
                            <li><Link href="/search" className="text-slate-300 hover:text-teal-400 transition-colors">Find Jobs</Link></li>
                            <li><Link href="/auth/register" className="text-slate-300 hover:text-teal-400 transition-colors">Create Profile</Link></li>
                            <li><Link href="/dashboard/applications" className="text-slate-300 hover:text-teal-400 transition-colors">My Applications</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-slate-500">For Employers</h4>
                        <ul className="space-y-4 font-medium">
                            <li><Link href="/auth/register?role=employer" className="text-slate-300 hover:text-teal-400 transition-colors">Post a Job</Link></li>
                            <li><Link href="/employer/dashboard" className="text-slate-300 hover:text-teal-400 transition-colors">Recruiter Dashboard</Link></li>
                            <li><Link href="/search?q=talant" className="text-slate-300 hover:text-teal-400 transition-colors">Search Talent</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-6 uppercase tracking-widest text-slate-500">Contact</h4>
                        <ul className="space-y-4 font-medium text-slate-300">
                            <li className="flex items-center gap-3">📧 support@khanhub.pk</li>
                            <li className="flex items-center gap-3">📍 Islamabad, Pakistan</li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-800 text-center text-slate-500">
                    <p className="font-bold">&copy; 2026 KhanHub. Pakistan's Dedicated Job Portal.</p>
                </div>
            </div>
        </footer>
    );
}
