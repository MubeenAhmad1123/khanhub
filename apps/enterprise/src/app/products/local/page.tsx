import ProductGrid from '@/components/products/ProductGrid';
import { getProductsByType } from '@/data';
import { MapPin, Heart } from 'lucide-react';

export const metadata = {
    title: 'Local Products - Khanhub Enterprises',
    description: 'Quality Made in Pakistan office equipment and furniture - support local manufacturing',
};

export default function LocalProductsPage() {
    const products = getProductsByType('local');

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 mb-4 animate-fade-in-up">
                        <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                            <MapPin className="h-12 w-12" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold">Local Products</h1>
                            <p className="text-purple-100 mt-2">Made in Pakistan with pride 🇵🇰</p>
                        </div>
                    </div>
                    <p className="text-lg text-purple-50 max-w-3xl animate-fade-in-up animation-delay-100">
                        Support local manufacturing with our range of Pakistani-made office solutions. Quality craftsmanship at competitive prices.
                    </p>
                    <div className="mt-6 flex items-center gap-2 animate-fade-in-up animation-delay-200">
                        <Heart className="h-5 w-5" />
                        <span className="font-semibold">{products.length} local products</span>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <ProductGrid products={products} />
            </div>
        </div>
    );
}