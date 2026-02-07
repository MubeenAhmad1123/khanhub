'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Eye, Star } from 'lucide-react';
import { Product } from '@/types/product';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart();

    const discount = product.originalPrice
        ? calculateDiscount(product.originalPrice, product.price)
        : product.discount || 0;

    const productUrl = `/${product.category}/${product.id}`;

    return (
        <div className="group bg-white border rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 product-card">
            {/* Image Section */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Link href={productUrl}>
                    <Image
                        src={product.thumbnail || '/placeholder-product.jpg'}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                </Link>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-2">
                    {product.isNew && (
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                            NEW
                        </span>
                    )}
                    {discount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                            -{discount}%
                        </span>
                    )}
                    {!product.inStock && (
                        <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">
                            OUT OF STOCK
                        </span>
                    )}
                </div>

                {/* Quick Actions - Show on Hover */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label="Add to wishlist"
                    >
                        <Heart className="h-5 w-5" />
                    </button>
                    <Link
                        href={productUrl}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        aria-label="Quick view"
                    >
                        <Eye className="h-5 w-5" />
                    </Link>
                </div>

                {/* Quick Add to Cart - Bottom */}
                {product.inStock && (
                    <button
                        onClick={() => addToCart(product)}
                        className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white py-2 font-semibold opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 btn-premium"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        Add to Cart
                    </button>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4">
                {/* Category & Brand */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase">
                        {product.subcategory?.replace('-', ' ')}
                    </span>
                    {product.brand && (
                        <span className="text-xs text-blue-600 font-medium">{product.brand}</span>
                    )}
                </div>

                {/* Product Name */}
                <Link href={productUrl}>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors min-h-[40px]">
                        {product.name}
                    </h3>
                </Link>

                {/* Rating */}
                {product.rating && (
                    <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < Math.floor(product.rating!)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-600">
                            ({product.reviewCount || 0})
                        </span>
                    </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-bold text-blue-600">
                        {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && (
                        <span className="text-sm text-gray-400 line-through">
                            {formatPrice(product.originalPrice)}
                        </span>
                    )}
                </div>

                {/* Stock Status */}
                {product.inStock ? (
                    <p className="text-xs text-green-600 font-medium">
                        ✓ In Stock ({product.stockQuantity} available)
                    </p>
                ) : (
                    <p className="text-xs text-red-600 font-medium">✗ Out of Stock</p>
                )}
            </div>
        </div>
    );
}