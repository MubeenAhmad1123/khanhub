'use client';

import { useState } from 'react';
import ProductGrid from '@/components/products/ProductGrid';
import ProductFilters from '@/components/products/ProductFilters';
import { useProducts } from '@/hooks/useProducts';
import { getAllBrands, getSubcategoriesByCategory, getPriceRange } from '@/data';

export default function EnterprisePage() {
    const { products, filters, updateFilters, resetFilters, isLoading } = useProducts({
        category: 'enterprise',
    });

    const brands = getAllBrands();
    const subcategories = getSubcategoriesByCategory('enterprise');
    const priceRange = getPriceRange();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Enterprise Products</h1>
                    <p className="text-gray-600">
                        Office equipment and business supplies to enhance your workplace
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <ProductFilters
                            filters={filters}
                            onFiltersChange={updateFilters}
                            onResetFilters={resetFilters}
                            availableBrands={brands}
                            availableSubcategories={subcategories}
                            priceRange={priceRange}
                        />
                    </div>

                    {/* Products Grid */}
                    <div className="lg:col-span-3">
                        <ProductGrid
                            products={products}
                            isLoading={isLoading}
                            emptyMessage="No enterprise products found matching your filters"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}