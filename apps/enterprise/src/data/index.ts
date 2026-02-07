// Product Data Helpers - Khanhub Enterprises

import { enterpriseProducts } from './enterprise-products';
import { Product, ProductType, ProductCategory } from '@/types/product';

export const allProducts = enterpriseProducts;

// Get products by type
export const getProductsByType = (type: ProductType): Product[] => {
    return allProducts.filter(p => p.productType === type);
};

// Get products by category
export const getProductsByCategory = (category: ProductCategory): Product[] => {
    return allProducts.filter(p => p.category === category);
};

// Get product by ID
export const getProductById = (id: string): Product | undefined => {
    return allProducts.find(p => p.id === id);
};

// Get featured products
export const getFeaturedProducts = (limit = 8): Product[] => {
    return allProducts.filter(p => p.isFeatured).slice(0, limit);
};

// Get new arrivals
export const getNewProducts = (limit = 8): Product[] => {
    return allProducts.filter(p => p.isNew).slice(0, limit);
};

// Alias for backward compatibility if needed
export const getNewArrivals = getNewProducts;

// Get products by subcategory
export const getProductsBySubcategory = (subcategory: string): Product[] => {
    return allProducts.filter(p => p.subcategory === subcategory);
};

// Filter by price range
export const filterByPriceRange = (min: number, max: number): Product[] => {
    return allProducts.filter(p => p.price >= min && p.price <= max);
};

// Sort products
export const sortProducts = (
    products: Product[],
    sortBy: 'price-low' | 'price-high' | 'newest' | 'rating' | 'discount'
): Product[] => {
    let sorted = [...products];

    switch (sortBy) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
            sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
        case 'rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'discount':
            sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
            break;
    }

    return sorted;
};

// Search products
export const searchProducts = (query: string): Product[] => {
    const q = query.toLowerCase();
    return allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
    );
};

// Get type statistics
export const getTypeStats = () => {
    return {
        new: getProductsByType('new').length,
        imported: getProductsByType('imported').length,
        local: getProductsByType('local').length,
        old: getProductsByType('old').length,
        total: allProducts.length,
    };
};

// Get category statistics
export const getCategoryStats = () => {
    const categories: ProductCategory[] = [
        'office-equipment',
        'furniture',
        'electronics',
        'stationery',
        'communication',
        'safety-security',
    ];

    return categories.map(cat => ({
        category: cat,
        count: getProductsByCategory(cat).length,
    }));
};

// Filter and sort (Unified helper)
export const filterAndSortProducts = (
    products: Product[],
    filters: {
        category?: ProductCategory;
        type?: ProductType;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
        brand?: string;
    },
    sortBy: 'price-low' | 'price-high' | 'newest' | 'popular' | 'rating' | 'discount' = 'newest'
): Product[] => {
    let filtered = [...products];

    if (filters.category) {
        filtered = filtered.filter(p => p.category === filters.category);
    }
    if (filters.type) {
        filtered = filtered.filter(p => p.productType === filters.type);
    }
    if (filters.minPrice !== undefined) {
        filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
        filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }
    if (filters.inStock) {
        filtered = filtered.filter(p => p.inStock);
    }
    if (filters.brand) {
        filtered = filtered.filter(p => p.brand === filters.brand);
    }

    // Sort using the dedicated helper but adjusting for 'popular' mapping to 'rating'
    const sortKey = sortBy === 'popular' ? 'rating' : (sortBy as any);
    return sortProducts(filtered, sortKey);
};

export { enterpriseProducts };