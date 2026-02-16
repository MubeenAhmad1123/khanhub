'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Eye, Star, ShieldCheck, Zap } from 'lucide-react';
import { Product } from '@/types/product';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart();
    const [isHovered, setIsHovered] = useState(false);

    const discount = product.originalPrice
        ? calculateDiscount(product.originalPrice, product.price)
        : product.discount || 0;

    const productUrl = `/${product.category}/${product.id}`;

    return (
        <div
            className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* ── Image & Badges ── */}
            <div className="relative aspect-square bg-slate-50 overflow-hidden">
                <Link href={productUrl} className="block w-full h-full">
                    <Image
                        src={product.thumbnail || '/images/products/instruments/scissors-set-premium.webp'}
                        alt={product.name}
                        fill
                        className={`object-contain p-4 transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
                    />
                </Link>

                {/* Glassmorphism Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                    {product.isNew && (
                        <span className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <Zap className="h-3 w-3 fill-current" />
                            NEW
                        </span>
                    )}
                    {discount > 0 && (
                        <span className="bg-red-500/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                            SAVE {discount}%
                        </span>
                    )}
                    {!product.inStock && (
                        <span className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                            RESTOCKING
                        </span>
                    )}
                </div>

                {/* ── Hover Overlay ── */}
                <div className={`absolute inset-0 bg-blue-900/10 backdrop-blur-[2px] transition-opacity duration-300 flex items-center justify-center gap-3 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-blue-600 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95">
                        <Heart className="h-5 w-5" />
                    </button>
                    <Link href={productUrl} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-blue-600 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95">
                        <Eye className="h-5 w-5" />
                    </Link>
                </div>

                {/* ── Quick Add to Cart Button ── */}
                <div className={`absolute bottom-3 left-3 right-3 transition-all duration-500 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                    {product.inStock && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                addToCart(product);
                            }}
                            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-2xl"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Add to Cart
                        </button>
                    )}
                </div>
            </div>

            {/* ── Product Info ── */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                        {product.subcategory?.replace('-', ' ')}
                    </span>
                    {product.brand && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            {product.brand}
                        </span>
                    )}
                </div>

                <Link href={productUrl}>
                    <h3 className="text-sm font-bold text-slate-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors min-h-[40px]">
                        {product.name}
                    </h3>
                </Link>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`h-3 w-3 ${i < Math.floor(product.rating || 4.5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold">({product.reviewCount || 24})</span>
                </div>

                {/* Pricing & Stock */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">
                                {formatPrice(product.price)}
                            </span>
                            {product.originalPrice && (
                                <span className="text-xs text-slate-400 line-through font-medium">
                                    {formatPrice(product.originalPrice)}
                                </span>
                            )}
                        </div>
                        {product.inStock ? (
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter mt-1">
                                ✓ Available for Immediate Dispatch
                            </p>
                        ) : (
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter mt-1">
                                ⚠ Currently Low Stock
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}