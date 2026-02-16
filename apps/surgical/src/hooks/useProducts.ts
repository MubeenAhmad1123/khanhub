'use client';

import { useState, useMemo, useEffect } from 'react';
import { Product, ProductFilters } from '@/types/product';
import {
    allProducts,
    getProductsByCategory,
    getProductById,
    getFeaturedProducts,
    getNewProducts,
    searchProducts,
    sortProducts,
    filterByPriceRange,
    getProductsBySubcategory,
} from '@/data';

export function useProducts(initialFilters?: ProductFilters) {
    const [filters, setFilters] = useState<ProductFilters>(initialFilters || {});
    const [isLoading, setIsLoading] = useState(false);

    // Get filtered and sorted products
    const products = useMemo(() => {
        let result = [...allProducts];

        // Filter by category
        if (filters.category) {
            result = result.filter(p => p.category === filters.category);
        }

        // Filter by subcategory
        if (filters.subcategory) {
            result = result.filter(p => p.subcategory === filters.subcategory);
        }

        // Filter by price range
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            const min = filters.minPrice || 0;
            const max = filters.maxPrice || Infinity;
            result = result.filter(p => p.price >= min && p.price <= max);
        }

        // Filter by in stock
        if (filters.inStock) {
            result = result.filter(p => p.inStock && p.stockQuantity > 0);
        }

        // Filter by brand
        if (filters.brand && filters.brand.length > 0) {
            result = result.filter(p => p.brand && filters.brand!.includes(p.brand));
        }

        // Search query
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.tags?.some(tag => tag.toLowerCase().includes(query)) ||
                p.brand?.toLowerCase().includes(query)
            );
        }

        // Sort products
        if (filters.sortBy) {
            result = sortProducts(result, filters.sortBy);
        }

        return result;
    }, [filters]);

    // Update filters
    const updateFilters = (newFilters: Partial<ProductFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    // Reset filters
    const resetFilters = () => {
        setFilters({});
    };

    // Clear specific filter
    const clearFilter = (key: keyof ProductFilters) => {
        setFilters(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    return {
        products,
        filters,
        updateFilters,
        resetFilters,
        clearFilter,
        isLoading,
        totalProducts: products.length,
    };
}

// Hook for single product
export function useProduct(id: string) {
    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        // Simulate API delay
        setTimeout(() => {
            const foundProduct = getProductById(id);
            if (foundProduct) {
                setProduct(foundProduct);
            } else {
                setError('Product not found');
            }
            setIsLoading(false);
        }, 300);
    }, [id]);

    return { product, isLoading, error };
}

// Hook for featured products
export function useFeaturedProducts(limit?: number) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        setTimeout(() => {
            setProducts(getFeaturedProducts(limit));
            setIsLoading(false);
        }, 200);
    }, [limit]);

    return { products, isLoading };
}

// Hook for new products
export function useNewProducts(limit?: number) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        setTimeout(() => {
            setProducts(getNewProducts(limit));
            setIsLoading(false);
        }, 200);
    }, [limit]);

    return { products, isLoading };
}