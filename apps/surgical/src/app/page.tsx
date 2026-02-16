import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowRight,
    ShoppingBag,
    Stethoscope,
    Building2,
    Truck,
    ShieldCheck,
    HeadphonesIcon,
    ChevronRight,
    Star,
    Award,
    Zap,
    Users
} from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import { getFeaturedProducts, getNewProducts } from '@/data';

export default function HomePage() {
    const featuredProducts = getFeaturedProducts(8);
    const newProducts = getNewProducts(4);

    const mainCategories = [
        { name: 'Surgical Instruments', count: '120+ Products', icon: '🛠️', href: '/surgical?category=instruments', color: 'bg-blue-50 text-blue-600', image: '/images/products/instruments/scissors-set-premium.webp' },
        { name: 'Diagnostic Tools', count: '85+ Products', icon: '🔍', href: '/surgical?category=diagnostic', color: 'bg-emerald-50 text-emerald-600', image: '/images/products/diagnostic/ultrasound-portable-3d.webp' },
        { name: 'Hospital Furniture', count: '40+ Products', icon: '🏥', href: '/surgical?category=furniture', color: 'bg-indigo-50 text-indigo-600', image: '/images/products/furniture/examination-bed-electric.webp' },
        { name: 'Surgical Supplies', count: '200+ Products', icon: '📦', href: '/surgical?category=supplies', color: 'bg-amber-50 text-amber-600', image: '/images/products/supplies/surgical-gloves-latex.webp' },
    ];

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* ── Premium Hero Section ── */}
            <section className="relative overflow-hidden bg-slate-900 pt-16 pb-24 lg:pt-32 lg:pb-40">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="animate-in fade-in slide-in-from-left duration-1000">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-6">
                                <Award className="h-4 w-4" />
                                Pakistan's #1 Hospital Supplier
                            </span>
                            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-8">
                                Precision in Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Instrument.</span>
                            </h1>
                            <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-lg">
                                Equip your facility with industrial-grade surgical tools and hospital furniture. Trusted by over 500+ clinics nationwide.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/surgical"
                                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/25 hover:scale-105 active:scale-95"
                                >
                                    Explore Catalog
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                                <Link
                                    href="/contact"
                                    className="bg-white/5 backdrop-blur-md border border-white/10 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                                >
                                    Bulk Inquiries
                                </Link>
                            </div>

                            <div className="mt-12 flex items-center gap-8 grayscale opacity-50">
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-2xl">ISO-9001</span>
                                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Certified</span>
                                </div>
                                <div className="h-10 w-px bg-slate-800" />
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-2xl">FDA</span>
                                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Compliant</span>
                                </div>
                                <div className="h-10 w-px bg-slate-800" />
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-2xl">CE</span>
                                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Marked</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative hidden lg:block animate-in fade-in zoom-in duration-1000 delay-200">
                            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
                            <div className="relative z-10 bg-slate-800/50 backdrop-blur-3xl border border-white/10 p-4 rounded-[40px] shadow-2xl rotate-3">
                                <div className="aspect-[4/3] rounded-[30px] overflow-hidden bg-slate-900 flex items-center justify-center">
                                    <Image
                                        src="/images/products/instruments/scissors-set-premium.webp"
                                        alt="Premium Surgical Equipment"
                                        width={800}
                                        height={600}
                                        className="object-contain p-12 -rotate-3 group-hover:scale-110 transition-transform duration-700"
                                    />
                                </div>
                                {/* Floating Trust Card */}
                                <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl animate-bounce-slow">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-emerald-100 p-3 rounded-2xl">
                                            <Users className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Trusted by</p>
                                            <p className="text-xl font-black text-slate-900">5,000+ Doctors</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SHOP BY CATEGORY ── */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4 block">Quick Navigation</span>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">Shop by Category</h2>
                        <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {mainCategories.map((category) => (
                            <Link
                                key={category.name}
                                href={category.href}
                                className="group relative bg-white p-8 rounded-[32px] border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2"
                            >
                                <div className={`w-16 h-16 ${category.color} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                                    {category.icon}
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 truncate">{category.name}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">{category.count}</p>
                                <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                                    Browse Collection
                                    <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURED PRODUCTS ── */}
            <section className="py-24 bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div className="max-w-lg">
                            <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4 block">Our Best Sellers</span>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">Featured Surgical Equipment</h2>
                        </div>
                        <Link
                            href="/surgical"
                            className="group flex items-center gap-4 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all"
                        >
                            View All Products
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <ProductGrid products={featuredProducts} />
                </div>
            </section>

            {/* ── TRUST SIGNALS ── */}
            <section className="py-24 bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {[
                            { icon: <Truck className="h-8 w-8" />, title: 'Fast Delivery', desc: 'Secure shipping to all provinces including AKJ and Northern areas.' },
                            { icon: <ShieldCheck className="h-8 w-8" />, title: 'Quality Warranty', desc: 'Up to 2 years manufacturer warranty on all surgical instruments.' },
                            { icon: <HeadphonesIcon className="h-8 w-8" />, title: '24/7 Support', desc: 'Direct access to medical instrument specialists via call or WhatsApp.' },
                            { icon: <Award className="h-8 w-8" />, title: 'Certified Store', desc: 'Authorized distributor for leading global medical brands.' }
                        ].map((feature, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="inline-flex p-5 rounded-[24px] bg-white/5 border border-white/10 text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 group-hover:scale-110">
                                    {feature.icon}
                                </div>
                                <h4 className="text-lg font-black text-white mb-2 uppercase tracking-wider">{feature.title}</h4>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}