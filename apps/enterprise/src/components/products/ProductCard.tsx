'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '@/types/product';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart();

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart(product);
    };

    const getProductTypeBadge = () => {
        switch (product.productType) {
            case 'new':
                return <span className="badge-new">New</span>;
            case 'imported':
                return <span className="badge-imported">Imported</span>;
            case 'local':
                return <span className="badge-local">Local</span>;
            case 'old':
                return <span className="badge-old">Budget</span>;
            default:
                return null;
        }
    };

    return (
        <Link href={`/products/${product.id}`} className="card group hover:shadow-xl transition-shadow">
            <div className="relative aspect-square overflow-hidden">
                <Image
                    src={product.thumbnail}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.discount && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold">
                        -{product.discount}%
                    </div>
                )}
                <div className="absolute top-2 left-2">
                    {getProductTypeBadge()}
                </div>
                {!product.inStock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold">
                            Out of Stock
                        </span>
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {product.name}
                </h3>

                {product.rating && (
                    <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600">
                            {product.rating} ({product.reviewCount})
                        </span>
                    </div>
                )}

                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-2xl font-bold text-gray-900">
                            Rs. {product.price.toLocaleString()}
                        </p>
                        {product.originalPrice && (
                            <p className="text-sm text-gray-500 line-through">
                                Rs. {product.originalPrice.toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className={`w-full py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${product.inStock
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    <ShoppingCart className="h-4 w-4" />
                    {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
            </div>
        </Link>
    );
}