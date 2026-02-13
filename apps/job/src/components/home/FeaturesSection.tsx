import { Target, Zap, ShieldCheck } from 'lucide-react';

export default function FeaturesSection() {
    return (
        <section className="relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                            <Target className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">AI Matching</h3>
                        <p className="text-gray-500 leading-relaxed font-medium">
                            Our advanced AI algorithms analyze your profile to find jobs that perfectly match your unique skill set and experience.
                        </p>
                    </div>

                    <div className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <Zap className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Fast Apply</h3>
                        <p className="text-gray-500 leading-relaxed font-medium">
                            One-click applications let you apply to multiple verified positions instantly. No more repetitive form filling.
                        </p>
                    </div>

                    <div className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Verified Roles</h3>
                        <p className="text-gray-500 leading-relaxed font-medium">
                            Every single job posting is strictly vetted for authenticity. Apply with complete peace of mind to trusted employers.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
