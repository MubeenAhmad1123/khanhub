import ProductGrid from '@/components/products/ProductGrid';
import { getProductsByType } from '@/data';
import { Plane, Globe } from 'lucide-react';

export const metadata = {
    title: 'Imported Products - Khanhub Enterprises',
    description: 'Premium imported office equipment from international brands - HP, Canon, Epson, Dell and more',
};

export default function ImportedProductsPage() {
    const products = getProductsByType('imported');

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 mb-4 animate-fade-in-up">
                        <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                            <Plane className="h-12 w-12" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold">Imported Products</h1>
                            <p className="text-blue-100 mt-2">International brands & premium quality</p>
                        </div>
                    </div>
                    <p className="text-lg text-blue-50 max-w-3xl animate-fade-in-up animation-delay-100">
                        Explore our collection of imported office equipment from trusted international brands. Premium quality meeting global standards.
                    </p>
                    <div className="mt-6 flex items-center gap-2 animate-fade-in-up animation-delay-200">
                        <Globe className="h-5 w-5" />
                        <span className="font-semibold">{products.length} imported products</span>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <ProductGrid products={products} />
            </div>
        </div>
    );
}