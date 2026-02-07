import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Package, PackageCheck, Plane, MapPin, Shield, Truck, HeadphonesIcon, Star, TrendingUp } from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import { getFeaturedProducts, getNewArrivals, getTypeStats } from '@/data';

export const metadata = {
    title: 'Khanhub Enterprises - Complete Office & Business Solutions',
    description: 'Leading supplier of office equipment, furniture, and business solutions in Pakistan. New, imported, and budget-friendly products available.',
};

export default function HomePage() {
    const featuredProducts = getFeaturedProducts(8);
    const newArrivals = getNewArrivals(4);
    const stats = getTypeStats();

    return (
        <div>
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-400 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="animate-fade-in-up">
                            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold mb-4">
                                🎉 Welcome to Khanhub Enterprises
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                Complete Office &
                                <span className="text-gradient block mt-2">Business Solutions</span>
                            </h1>
                            <p className="text-xl mb-8 text-blue-100 leading-relaxed">
                                Quality office equipment, furniture, and supplies for modern businesses.
                                Choose from new, imported, local, or budget-friendly products.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link
                                    href="/products/new"
                                    className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 inline-flex items-center gap-2 shadow-hover hover:scale-105 active:scale-95"
                                >
                                    Shop New Products
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                                <Link
                                    href="/products/old"
                                    className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-primary-600 transition-all duration-300 hover:scale-105 active:scale-95"
                                >
                                    Budget Deals
                                </Link>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mt-12">
                                <div className="animate-fade-in animation-delay-100">
                                    <div className="text-3xl font-bold">{stats.total}+</div>
                                    <div className="text-blue-200 text-sm">Products</div>
                                </div>
                                <div className="animate-fade-in animation-delay-200">
                                    <div className="text-3xl font-bold">All PK</div>
                                    <div className="text-blue-200 text-sm">Delivery</div>
                                </div>
                                <div className="animate-fade-in animation-delay-300">
                                    <div className="text-3xl font-bold">24/7</div>
                                    <div className="text-blue-200 text-sm">Support</div>
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block relative animate-fade-in-right">
                            <div className="relative h-[500px] animate-bounce-subtle">
                                <Image
                                    src="https://placehold.co/600x500/0ea5e9/ffffff/png?text=Office+Solutions"
                                    alt="Office Equipment"
                                    fill
                                    className="object-contain drop-shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Product Type Categories */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 animate-fade-in-up">
                        <h2 className="section-header">Shop by Product Type</h2>
                        <p className="section-subtitle">Find exactly what you need for your business</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* New Products */}
                        <Link
                            href="/products/new"
                            className="category-card animate-fade-in-up"
                        >
                            <div className="p-8 text-center">
                                <div className="inline-block p-4 bg-green-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <PackageCheck className="h-12 w-12 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">New Products</h3>
                                <p className="text-gray-600 mb-4">Latest additions to our inventory</p>
                                <div className="inline-flex items-center gap-2 text-primary-600 font-semibold">
                                    {stats.new} Products
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>

                        {/* Imported Products */}
                        <Link
                            href="/products/imported"
                            className="category-card animate-fade-in-up animation-delay-100"
                        >
                            <div className="p-8 text-center">
                                <div className="inline-block p-4 bg-blue-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Plane className="h-12 w-12 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Imported</h3>
                                <p className="text-gray-600 mb-4">International brands & quality</p>
                                <div className="inline-flex items-center gap-2 text-primary-600 font-semibold">
                                    {stats.imported} Products
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>

                        {/* Local Products */}
                        <Link
                            href="/products/local"
                            className="category-card animate-fade-in-up animation-delay-200"
                        >
                            <div className="p-8 text-center">
                                <div className="inline-block p-4 bg-purple-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <MapPin className="h-12 w-12 text-purple-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Local</h3>
                                <p className="text-gray-600 mb-4">Made in Pakistan products</p>
                                <div className="inline-flex items-center gap-2 text-primary-600 font-semibold">
                                    {stats.local} Products
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>

                        {/* Old/Budget Products */}
                        <Link
                            href="/products/old"
                            className="category-card animate-fade-in-up animation-delay-300"
                        >
                            <div className="p-8 text-center">
                                <div className="inline-block p-4 bg-orange-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Package className="h-12 w-12 text-orange-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Budget Deals</h3>
                                <p className="text-gray-600 mb-4">Refurbished & used products</p>
                                <div className="inline-flex items-center gap-2 text-primary-600 font-semibold">
                                    {stats.old} Products
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Products */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8 animate-fade-in-up">
                        <div>
                            <h2 className="section-header">Featured Products</h2>
                            <p className="text-gray-600">Top picks for your business</p>
                        </div>
                        <Link
                            href="/products"
                            className="hidden md:flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 hover:gap-3 transition-all"
                        >
                            View All
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                    <ProductGrid products={featuredProducts} />
                    <div className="text-center mt-8 md:hidden">
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700"
                        >
                            View All Products
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* New Arrivals */}
            {newArrivals.length > 0 && (
                <section className="py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
                            <div>
                                <h2 className="section-header">New Arrivals</h2>
                                <p className="text-gray-600">Latest products in stock</p>
                            </div>
                            <Link
                                href="/products/new"
                                className="hidden md:flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 hover:gap-3 transition-all"
                            >
                                View All
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>
                        <ProductGrid products={newArrivals} />
                    </div>
                </section>
            )}

            {/* Features */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 animate-fade-in-up">
                        <h2 className="section-header">Why Choose Us?</h2>
                        <p className="section-subtitle">Your trusted partner for business solutions</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center group animate-fade-in-up">
                            <div className="inline-block p-6 bg-primary-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Truck className="h-12 w-12 text-primary-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Fast Delivery</h3>
                            <p className="text-gray-600">Nationwide shipping across Pakistan with reliable courier services</p>
                        </div>

                        <div className="text-center group animate-fade-in-up animation-delay-100">
                            <div className="inline-block p-6 bg-green-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Shield className="h-12 w-12 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Quality Assured</h3>
                            <p className="text-gray-600">100% authentic products with manufacturer warranty</p>
                        </div>

                        <div className="text-center group animate-fade-in-up animation-delay-200">
                            <div className="inline-block p-6 bg-purple-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                <HeadphonesIcon className="h-12 w-12 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
                            <p className="text-gray-600">Customer support via call, WhatsApp, or email anytime</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="animate-fade-in-up">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Need Bulk Orders?</h2>
                        <p className="text-xl text-blue-100 mb-8">
                            Get special pricing for bulk purchases. Contact us for custom quotes.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href="tel:+923006395220"
                                className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 hover:scale-105 active:scale-95"
                            >
                                Call Now: +92 300 6395220
                            </a>
                            <a
                                href="https://wa.me/923006395220"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-primary-600 transition-all duration-300 hover:scale-105 active:scale-95"
                            >
                                WhatsApp Us
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}