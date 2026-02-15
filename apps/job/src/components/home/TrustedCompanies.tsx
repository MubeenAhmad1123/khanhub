import { Building2, Command, Globe, Layout, Smartphone, Terminal, Wallet } from 'lucide-react';

export default function TrustedCompanies() {
    const companies = [
        { name: 'TechFlow', icon: <Terminal className="w-6 h-6" /> },
        { name: 'GlobalSphere', icon: <Globe className="w-6 h-6" /> },
        { name: 'SmartPay', icon: <Wallet className="w-6 h-6" /> },
        { name: 'BuildCorp', icon: <Building2 className="w-6 h-6" /> },
        { name: 'AppMaster', icon: <Smartphone className="w-6 h-6" /> },
        { name: 'DataSystems', icon: <Layout className="w-6 h-6" /> },
        { name: 'CmdLine', icon: <Command className="w-6 h-6" /> },
    ];

    return (
        <section className="py-10 bg-white border-b border-gray-100 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm font-semibold text-gray-500 mb-8 uppercase tracking-widest">
                    Trusted by industry leaders
                </p>

                <div className="relative flex overflow-x-hidden group">
                    <div className="animate-marquee whitespace-nowrap flex gap-12 sm:gap-24">
                        {[...companies, ...companies, ...companies].map((company, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-gray-400 font-bold text-xl grayscale hover:grayscale-0 hover:text-teal-600 transition-all duration-300">
                                {company.icon}
                                <span>{company.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex gap-12 sm:gap-24 ml-12 sm:ml-24">
                        {[...companies, ...companies, ...companies].map((company, idx) => (
                            <div key={`dup-${idx}`} className="flex items-center gap-3 text-gray-400 font-bold text-xl grayscale hover:grayscale-0 hover:text-teal-600 transition-all duration-300">
                                {company.icon}
                                <span>{company.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
