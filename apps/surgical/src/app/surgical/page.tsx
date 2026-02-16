'use client';

import { useState } from 'react';
import ProductGrid from '@/components/products/ProductGrid';
import ProductFilters from '@/components/products/ProductFilters';
import SearchSuggestions from '@/components/search/SearchSuggestions';
import Pagination from '@/components/products/Pagination';
import { useProducts } from '@/hooks/useProducts';
import { getAllBrands, getSubcategoriesByCategory, getPriceRange } from '@/data';

const ITEMS_PER_PAGE = 100;

export default function SurgicalPage() {
    const [currentPage, setCurrentPage] = useState(1);

    const { products, filters, updateFilters, resetFilters, isLoading } = useProducts({
        category: 'surgical',
    });

    const brands = getAllBrands();
    const subcategories = getSubcategoriesByCategory('surgical');
    const priceRange = getPriceRange();

    // Pagination
    const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Surgical Equipment</h1>
                    <p className="text-gray-600 mb-6">
                        Professional medical instruments and hospital furniture for healthcare providers
                    </p>
                    <div className="max-w-2xl">
                        <SearchSuggestions
                            value={filters.searchQuery || ''}
                            onChange={(value) => {
                                updateFilters({ searchQuery: value });
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
                            placeholder="Search surgical equipment..."
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="sticky top-4">
                            <ProductFilters
                                availableBrands={brands}
                                availableSubcategories={subcategories}
                                priceRange={priceRange}
                                filters={filters}
                                onFiltersChange={updateFilters}
                                onResetFilters={resetFilters}
                            />
                        </div>
                    </aside>

                    {/* Products */}
                    <div className="flex-1">
                        {/* Results Count */}
                        <div className="mb-6">
                            <p className="text-gray-600">
                                Showing <span className="font-semibold text-gray-900">{startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, products.length)}</span> of{' '}
                                <span className="font-semibold text-gray-900">{products.length}</span> products
                            </p>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading products...</p>
                                </div>
                            </div>
                        ) : paginatedProducts.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-gray-600">No products found</p>
                            </div>
                        ) : (
                            <>
                                <ProductGrid products={paginatedProducts} />

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}