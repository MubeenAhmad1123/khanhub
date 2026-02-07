// Product Types for Khanhub Store

export type ProductCategory = 'surgical' | 'enterprise';

export type SurgicalSubcategory =
    | 'medical-instruments'
    | 'hospital-furniture'
    | 'diagnostic-tools'
    | 'lab-equipment'
    | 'surgical-supplies'
    | 'examination-tools'
    | 'orthopedic-instruments'
    | 'anesthesia-airway'
    | 'operating-room-equipment'
    | 'specialized-surgical-sets'
    | 'cardiovascular-thoracic'
    | 'neurosurgery-equipment'
    | 'urological-surgery'
    | 'pediatric-obstetric'
    | 'emergency-trauma';

export type EnterpriseSubcategory =
    | 'office-equipment'
    | 'business-supplies'
    | 'industrial-tools'
    | 'electronics'
    | 'furniture';

export interface Product {
    id: string;
    name: string;
    description: string;
    shortDescription: string;
    category: ProductCategory;
    subcategory: SurgicalSubcategory | EnterpriseSubcategory;
    price: number;
    originalPrice?: number; // For showing discounts
    discount?: number; // Percentage discount
    images: string[];
    thumbnail: string;
    inStock: boolean;
    stockQuantity: number;
    sku: string;
    brand?: string;
    specifications?: ProductSpecification[];
    features?: string[];
    warranty?: string;
    rating?: number;
    reviewCount?: number;
    isFeatured?: boolean;
    isNew?: boolean;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ProductSpecification {
    label: string;
    value: string;
}

export interface ProductFilters {
    category?: ProductCategory;
    subcategory?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    brand?: string[];
    sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popular' | 'rating';
    searchQuery?: string;
}

export interface ProductResponse {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}