'use client';

import { Product } from '@/types/product';
import ProductCard from './ProductCard';

interface ProductGridProps {
    products: Product[];
    isLoading?: boolean;
    emptyMessage?: string;
}

export default function ProductGrid({
    products,
    isLoading = false,
    emptyMessage = 'No products found',
}: ProductGridProps) {
    // Loading State
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 aspect-square rounded-lg mb-4" />
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="h-6 bg-gray-200 rounded w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty State
    if (products.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                    <svg
                        className="w-16 h-16 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {emptyMessage}
                </h3>
                <p className="text-gray-600 mb-6">
                    Try adjusting your filters or search terms
                </p>
            </div>
        );
    }

    // Product Grid
    return (
        <div>
            {/* Results Count */}
            <div className="mb-4">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{products.length}</span> {products.length === 1 ? 'product' : 'products'}
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                    />
                ))}
            </div>
        </div>
    );
}