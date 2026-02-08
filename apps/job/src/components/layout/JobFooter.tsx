import Link from 'next/link';

export default function JobFooter() {
    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* About */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-4">Khanhub Jobs</h3>
                        <p className="text-sm text-gray-400">
                            Pakistan's premier job placement platform connecting talent with opportunities.
                        </p>
                    </div>

                    {/* For Job Seekers */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">For Job Seekers</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/search" className="hover:text-teal-400">Browse Jobs</Link></li>
                            <li><Link href="/dashboard" className="hover:text-teal-400">My Dashboard</Link></li>
                            <li><Link href="/dashboard/premium" className="hover:text-teal-400">Premium</Link></li>
                        </ul>
                    </div>

                    {/* For Employers */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">For Employers</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/employer/post-job" className="hover:text-teal-400">Post a Job</Link></li>
                            <li><Link href="/employer/dashboard" className="hover:text-teal-400">Dashboard</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="mailto:support@khanhub.com" className="hover:text-teal-400">Contact Us</a></li>
                            <li><Link href="/terms" className="hover:text-teal-400">Terms</Link></li>
                            <li><Link href="/privacy" className="hover:text-teal-400">Privacy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
                    © 2026 Khanhub Jobs. All rights reserved. Built with ❤️ in Pakistan
                </div>
            </div>
        </footer>
    );
}