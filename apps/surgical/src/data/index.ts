// Product Data Index - Khanhub Store

import { surgicalProducts } from './surgical-products';
import { enterpriseProducts } from './enterprise-products';
import { Product } from '@/types/product';

// All products combined
export const allProducts: Product[] = [
    ...surgicalProducts,
    ...enterpriseProducts,
];

// Export individual categories
export { surgicalProducts, enterpriseProducts };

// Get products by category
export function getProductsByCategory(category: 'surgical' | 'enterprise'): Product[] {
    return allProducts.filter(product => product.category === category);
}

// Get product by ID
export function getProductById(id: string): Product | undefined {
    return allProducts.find(product => product.id === id);
}

// Get featured products
export function getFeaturedProducts(limit?: number): Product[] {
    const featured = allProducts.filter(product => product.isFeatured);
    return limit ? featured.slice(0, limit) : featured;
}

// Get new products
export function getNewProducts(limit?: number): Product[] {
    const newProducts = allProducts.filter(product => product.isNew);
    return limit ? newProducts.slice(0, limit) : newProducts;
}

// Search products
export function searchProducts(query: string): Product[] {
    const lowerQuery = query.toLowerCase();
    return allProducts.filter(product =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.description.toLowerCase().includes(lowerQuery) ||
        product.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}

// Get products by subcategory
export function getProductsBySubcategory(subcategory: string): Product[] {
    return allProducts.filter(product => product.subcategory === subcategory);
}

// Filter products by price range
export function filterByPriceRange(min: number, max: number): Product[] {
    return allProducts.filter(product => product.price >= min && product.price <= max);
}

// Sort products
export function sortProducts(
    products: Product[],
    sortBy: 'price-asc' | 'price-desc' | 'newest' | 'popular' | 'rating'
): Product[] {
    const sorted = [...products];

    switch (sortBy) {
        case 'price-asc':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price-desc':
            return sorted.sort((a, b) => b.price - a.price);
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        case 'popular':
            return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        case 'rating':
            return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        default:
            return sorted;
    }
}

// Get price range for filtering
export function getPriceRange(): { min: number; max: number } {
    const prices = allProducts.map(p => p.price);
    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
    };
}

// Get all brands
export function getAllBrands(): string[] {
    const brands = allProducts
        .map(p => p.brand)
        .filter((brand): brand is string => !!brand);
    return [...new Set(brands)].sort();
}

// Get all subcategories by category
export function getSubcategoriesByCategory(category: 'surgical' | 'enterprise'): string[] {
    const products = getProductsByCategory(category);
    const subcategories = products.map(p => p.subcategory);
    return [...new Set(subcategories)];
}