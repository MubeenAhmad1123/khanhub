// Product Types - Khanhub Enterprises

export type ProductType = 'new' | 'imported' | 'local' | 'old';
export type ProductCategory =
    | 'office-equipment'
    | 'furniture'
    | 'electronics'
    | 'stationery'
    | 'communication'
    | 'safety-security';

export interface Product {
    id: string;
    name: string;
    description: string;
    shortDescription: string;
    category: ProductCategory;
    subcategory?: string;
    productType: ProductType;
    price: number;
    originalPrice?: number;
    discount?: number;
    images: string[];
    thumbnail: string;
    inStock: boolean;
    stockQuantity: number;
    sku: string;
    brand: string;
    specifications: Specification[];
    features: string[];
    warranty: string;
    rating: number;
    reviewCount: number;
    isFeatured: boolean;
    isNew: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Specification {
    label: string;
    value: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface Cart {
    items: CartItem[];
    total: number;
    subtotal: number;
    tax?: number;
    shipping?: number;
}

export interface ProductFilters {
    category?: ProductCategory;
    subcategory?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    brand?: string[];
    searchQuery?: string;
    sortBy?: 'price-low' | 'price-high' | 'newest' | 'rating' | 'discount';
}