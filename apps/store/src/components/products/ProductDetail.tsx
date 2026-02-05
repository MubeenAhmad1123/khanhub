'use client';

import { useState } from 'react';
import { ShoppingCart, Heart, Truck, Shield, Star, Minus, Plus, CheckCircle, Package, Phone } from 'lucide-react';
import { Product } from '@/types/product';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

interface ProductDetailProps {
    product: Product;
}

export default function ProductDetail({ product }: ProductDetailProps) {
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useCart();

    const handleQuantityChange = (delta: number) => {
        const newQuantity = quantity + delta;
        if (newQuantity >= 1 && newQuantity <= product.stockQuantity) {
            setQuantity(newQuantity);
        }
    };

    const handleAddToCart = () => {
        addToCart(product, quantity);
    };

    const whatsappMessage = `Hi, I'm interested in ${product.name} (${product.sku}). Price: ${formatPrice(product.price)}`;
    const whatsappLink = getWhatsAppLink('923006395220', whatsappMessage);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
                        {/* Product Image Placeholder */}
                        <div>
                            <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl overflow-hidden flex items-center justify-center">
                                <div className="text-center">
                                    <Package className="h-32 w-32 text-blue-400 mx-auto mb-4" />
                                    <p className="text-gray-600 font-medium">{product.name}</p>
                                    <p className="text-sm text-gray-500 mt-2">SKU: {product.sku}</p>
                                </div>
                                {product.discount && product.discount > 0 && (
                                    <span className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                                        -{product.discount}% OFF
                                    </span>
                                )}
                                {product.isNew && (
                                    <span className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                                        NEW
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Product Info */}
                        <div className="flex flex-col">
                            <div className="flex-1">
                                {/* Product Name */}
                                <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

                                {/* Rating */}
                                {product.rating && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-5 w-5 ${i < Math.floor(product.rating || 0)
                                                            ? 'text-yellow-400 fill-yellow-400'
                                                            : 'text-gray-300'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-gray-600 font-medium">
                                            {product.rating?.toFixed(1)} ({product.reviewCount || 0} reviews)
                                        </span>
                                    </div>
                                )}

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-4xl font-bold text-blue-600">{formatPrice(product.price)}</span>
                                        {product.discount && product.discount > 0 && product.originalPrice && (
                                            <span className="text-2xl text-gray-400 line-through">
                                                {formatPrice(product.originalPrice)}
                                            </span>
                                        )}
                                    </div>
                                    {product.discount && product.discount > 0 && product.originalPrice && (
                                        <p className="text-green-600 font-semibold mt-2">
                                            You save {formatPrice(product.originalPrice - product.price)}!
                                        </p>
                                    )}
                                </div>

                                {/* Stock Status */}
                                <div className="mb-6">
                                    {product.inStock ? (
                                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                                            <CheckCircle className="h-5 w-5" />
                                            <span>In Stock ({product.stockQuantity} available)</span>
                                        </div>
                                    ) : (
                                        <div className="text-red-600 font-semibold">Out of Stock</div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3>
                                    <p className="text-gray-600 leading-relaxed">{product.description}</p>
                                </div>

                                {/* Features */}
                                {product.features && product.features.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">Key Features</h3>
                                        <ul className="space-y-2">
                                            {product.features.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-2">
                                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                    <span className="text-gray-700">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Specifications */}
                                {product.specifications && product.specifications.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">Specifications</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <dl className="space-y-2">
                                                {product.specifications.map((spec, index) => (
                                                    <div key={index} className="flex justify-between border-b border-gray-200 pb-2 last:border-0">
                                                        <dt className="text-gray-600 font-medium">{spec.label}:</dt>
                                                        <dd className="text-gray-900 font-semibold">{spec.value}</dd>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                                    <dt className="text-gray-600 font-medium">Brand:</dt>
                                                    <dd className="text-gray-900 font-semibold">{product.brand}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quantity & Action Buttons */}
                            {product.inStock && (
                                <div className="border-t pt-6 mt-auto">
                                    {/* Quantity Selector */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">Quantity</label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border-2 border-gray-300 rounded-lg">
                                                <button
                                                    onClick={() => handleQuantityChange(-1)}
                                                    disabled={quantity <= 1}
                                                    className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus className="h-5 w-5" />
                                                </button>
                                                <span className="px-6 py-3 font-bold text-lg border-x-2 border-gray-300">
                                                    {quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleQuantityChange(1)}
                                                    disabled={quantity >= product.stockQuantity}
                                                    className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Plus className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <span className="text-gray-600">
                                                Total: <span className="font-bold text-blue-600 text-xl">{formatPrice(product.price * quantity)}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={handleAddToCart}
                                            className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                        >
                                            <ShoppingCart className="h-6 w-6" />
                                            Add to Cart
                                        </button>
                                        <a
                                            href={whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 bg-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                        >
                                            <Phone className="h-6 w-6" />
                                            Order via WhatsApp
                                        </a>
                                    </div>

                                    {/* Trust Badges */}
                                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                                        <div className="text-center">
                                            <Truck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                            <p className="text-xs font-semibold text-gray-900">Free Delivery</p>
                                            <p className="text-xs text-gray-500">On orders above PKR 5,000</p>
                                        </div>
                                        <div className="text-center">
                                            <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                            <p className="text-xs font-semibold text-gray-900">Warranty</p>
                                            <p className="text-xs text-gray-500">{product.warranty || '1 Year'}</p>
                                        </div>
                                        <div className="text-center">
                                            <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                                            <p className="text-xs font-semibold text-gray-900">Quality Assured</p>
                                            <p className="text-xs text-gray-500">100% Authentic</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}