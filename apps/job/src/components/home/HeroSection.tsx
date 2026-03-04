'use client';

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-slate-900 py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl italic uppercase">
                    Welcome to <span className="text-blue-500">KhanHub</span> Job Portal
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-300">
                    The future of video-first recruitment. Connect, engage, and find your next opportunity.
                </p>
            </div>
        </section>
    );
}

export function StatsSection() {
    return <div className="bg-white py-12 border-b border-slate-100"><div className="max-w-7xl mx-auto px-6 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Stats Section Placeholder</div></div>;
}

export function FeaturesSection() {
    return <div className="bg-slate-50 py-20"><div className="max-w-7xl mx-auto px-6 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Features Section Placeholder</div></div>;
}

export function WhoIsThisFor() {
    return <div className="bg-white py-20"><div className="max-w-7xl mx-auto px-6 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Who Is This For Section Placeholder</div></div>;
}

export function CategorySection() {
    return <div className="bg-slate-50 py-20"><div className="max-w-7xl mx-auto px-6 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Category Section Placeholder</div></div>;
}

export function TrustSection() {
    return <div className="bg-white py-20"><div className="max-w-7xl mx-auto px-6 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Trust Section Placeholder</div></div>;
}

export function FinalCTA() {
    return <div className="bg-blue-600 py-20"><div className="max-w-7xl mx-auto px-6 text-center text-white font-bold uppercase tracking-widest text-xs">Final CTA Placeholder</div></div>;
}
