'use client';

import { useState } from 'react';
import { ProductFilters as FilterType } from '@/types/product';
import { formatPriceNumber } from '@/lib/utils';
import { X, SlidersHorizontal } from 'lucide-react';

interface ProductFiltersProps {
    filters: FilterType;
    onFiltersChange: (filters: Partial<FilterType>) => void;
    onResetFilters: () => void;
    availableBrands?: string[];
    availableSubcategories?: string[];
    priceRange?: { min: number; max: number };
}

export default function ProductFilters({
    filters,
    onFiltersChange,
    onResetFilters,
    availableBrands = [],
    availableSubcategories = [],
    priceRange = { min: 0, max: 500000 },
}: ProductFiltersProps) {
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const handlePriceRangeChange = (type: 'min' | 'max', value: string) => {
        const numValue = parseInt(value) || 0;
        if (type === 'min') {
            onFiltersChange({ minPrice: numValue });
        } else {
            onFiltersChange({ maxPrice: numValue });
        }
    };

    const handleBrandToggle = (brand: string) => {
        const currentBrands = filters.brand || [];
        const updated = currentBrands.includes(brand)
            ? currentBrands.filter((b) => b !== brand)
            : [...currentBrands, brand];
        onFiltersChange({ brand: updated });
    };

    const handleSubcategoryChange = (subcategory: string) => {
        onFiltersChange({ subcategory });
    };

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFiltersChange({ sortBy: e.target.value as any });
    };

    const activeFiltersCount = [
        filters.subcategory,
        filters.minPrice,
        filters.maxPrice,
        filters.brand?.length,
        filters.inStock,
    ].filter(Boolean).length;

    const FiltersContent = () => (
        <div className="space-y-6">
            {/* Sort By */}
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Sort By
                </label>
                <select
                    value={filters.sortBy || ''}
                    onChange={handleSortChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Default</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                </select>
            </div>

            {/* Subcategories */}
            {availableSubcategories.length > 0 && (
                <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Category
                    </label>
                    <div className="space-y-2">
                        <button
                            onClick={() => onFiltersChange({ subcategory: undefined })}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!filters.subcategory
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'hover:bg-gray-100'
                                }`}
                        >
                            All Categories
                        </button>
                        {availableSubcategories.map((sub) => (
                            <button
                                key={sub}
                                onClick={() => handleSubcategoryChange(sub)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${filters.subcategory === sub
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'hover:bg-gray-100'
                                    }`}
                            >
                                {sub.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Price Range */}
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Price Range (PKR)
                </label>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-600">Min Price</label>
                        <input
                            type="number"
                            min={priceRange.min}
                            max={priceRange.max}
                            value={filters.minPrice || ''}
                            onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                            placeholder={formatPriceNumber(priceRange.min)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600">Max Price</label>
                        <input
                            type="number"
                            min={priceRange.min}
                            max={priceRange.max}
                            value={filters.maxPrice || ''}
                            onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                            placeholder={formatPriceNumber(priceRange.max)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Brands */}
            {availableBrands.length > 0 && (
                <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Brands
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableBrands.map((brand) => (
                            <label key={brand} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                    type="checkbox"
                                    checked={filters.brand?.includes(brand) || false}
                                    onChange={() => handleBrandToggle(brand)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{brand}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Availability */}
            <div>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                        type="checkbox"
                        checked={filters.inStock || false}
                        onChange={(e) => onFiltersChange({ inStock: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                        In Stock Only
                    </span>
                </label>
            </div>

            {/* Reset Filters */}
            {activeFiltersCount > 0 && (
                <button
                    onClick={onResetFilters}
                    className="w-full py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    Reset All Filters ({activeFiltersCount})
                </button>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
                <button
                    onClick={() => setShowMobileFilters(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    <SlidersHorizontal className="h-5 w-5" />
                    <span className="font-medium">Filters</span>
                    {activeFiltersCount > 0 && (
                        <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block">
                <div className="bg-white border rounded-lg p-4 sticky top-20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                        {activeFiltersCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </div>
                    <FiltersContent />
                </div>
            </div>

            {/* Mobile Filters Drawer */}
            {showMobileFilters && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                        onClick={() => setShowMobileFilters(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-50 overflow-y-auto lg:hidden">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <FiltersContent />
                        </div>
                    </div>
                </>
            )}
        </>
    );
}