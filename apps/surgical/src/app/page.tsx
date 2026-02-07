import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShoppingBag, Stethoscope, Building2, Truck, Shield, HeadphonesIcon } from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import { getFeaturedProducts, getNewProducts } from '@/data';

export default function HomePage() {
    const featuredProducts = getFeaturedProducts(8);
    const newProducts = getNewProducts(4);

    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                Premium Medical Solutions
                            </h1>
                            <p className="text-xl mb-6 text-blue-100">
                                Quality surgical equipment and medical instruments for professionals across Pakistan
                            </p>
                            <div className="flex gap-4">
                                <Link
                                    href="/surgical"
                                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
                                >
                                    Shop Now
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                            </div>
                        </div>
                        <div className="hidden lg:block">
                            <div className="relative h-96">
                                <Image
                                    src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1600"
                                    alt="Medical Equipment"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <Link
                            href="/surgical"
                            className="group relative overflow-hidden rounded-xl bg-white border-2 hover:border-blue-600 transition-all p-8 flex"
                        >
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-600 transition-colors">
                                    <Stethoscope className="h-12 w-12 text-blue-600 group-hover:text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold mb-2">Surgical Equipment</h3>
                                    <p className="text-gray-600 mb-3">
                                        Professional medical instruments and hospital furniture
                                    </p>
                                    <span className="text-blue-600 font-semibold flex items-center gap-2">
                                        Explore Catalog <ArrowRight className="h-5 w-5" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Products */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
                            <p className="text-gray-600 mt-2">Handpicked products for you</p>
                        </div>
                        <Link
                            href="/surgical"
                            className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-2"
                        >
                            View All <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                    <ProductGrid products={featuredProducts} />
                </div>
            </section>

            {/* New Arrivals */}
            {newProducts.length > 0 && (
                <section className="py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">New Arrivals</h2>
                                <p className="text-gray-600 mt-2">Latest products in stock</p>
                            </div>
                            <Link
                                href="/surgical"
                                className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-2"
                            >
                                View All <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>
                        <ProductGrid products={newProducts} />
                    </div>
                </section>
            )}

            {/* Features */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                                <Truck className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Fast Delivery</h3>
                            <p className="text-gray-600">Nationwide shipping across Pakistan</p>
                        </div>
                        <div className="text-center">
                            <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                                <Shield className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Quality Guaranteed</h3>
                            <p className="text-gray-600">100% authentic products with warranty</p>
                        </div>
                        <div className="text-center">
                            <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                                <HeadphonesIcon className="h-8 w-8 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">24/7 Support</h3>
                            <p className="text-gray-600">Customer support via call or WhatsApp</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}