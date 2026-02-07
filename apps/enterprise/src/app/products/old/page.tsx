import ProductGrid from '@/components/products/ProductGrid';
import { getProductsByType } from '@/data';
import { Package, DollarSign } from 'lucide-react';

export const metadata = {
    title: 'Budget Deals - Khanhub Enterprises',
    description: 'Affordable refurbished and used office equipment - tested, certified, and great value for money',
};

export default function OldProductsPage() {
    const products = getProductsByType('old');

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 mb-4 animate-fade-in-up">
                        <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                            <Package className="h-12 w-12" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold">Budget Deals</h1>
                            <p className="text-orange-100 mt-2">Refurbished & used products</p>
                        </div>
                    </div>
                    <p className="text-lg text-orange-50 max-w-3xl animate-fade-in-up animation-delay-100">
                        Get great value with our refurbished and used office equipment. All items professionally tested and cleaned. Perfect for startups and budget-conscious businesses.
                    </p>
                    <div className="mt-6 flex items-center gap-2 animate-fade-in-up animation-delay-200">
                        <DollarSign className="h-5 w-5" />
                        <span className="font-semibold">{products.length} budget products</span>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <ProductGrid products={products} />
            </div>
        </div>
    );
}