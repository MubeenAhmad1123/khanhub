'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
    const { cart, updateQuantity, removeFromCart } = useCart();
    const { items, subtotal, tax, shipping, total } = cart;

    if (items.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
                <div className="bg-gray-100 p-8 rounded-full mb-6">
                    <ShoppingBag className="h-16 w-16 text-gray-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
                <p className="text-gray-600 mb-8 text-center max-w-md">
                    Looks like you haven't added anything to your cart yet. Explore our professional surgical equipment and enterprise solutions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/surgical"
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                    >
                        Shop Surgical
                    </Link>
                    <Link
                        href="/enterprise"
                        className="px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center"
                    >
                        Shop Enterprise
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items List */}
                    <div className="lg:col-span-2 space-y-4">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-6"
                            >
                                {/* image */}
                                <div className="relative w-full sm:w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                    <Image
                                        src={item.product.thumbnail}
                                        alt={item.product.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>

                                {/* info */}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <Link
                                                href={`/${item.product.category}/${item.product.id}`}
                                                className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                                            >
                                                {item.product.name}
                                            </Link>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-2">SKU: {item.product.sku}</p>
                                        <p className="text-lg font-bold text-blue-600">{formatPrice(item.product.price)}</p>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg border">
                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                className="p-1.5 hover:bg-white rounded-md transition-shadow active:scale-95 shadow-sm"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <span className="w-10 text-center font-bold">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                className="p-1.5 hover:bg-white rounded-md transition-shadow active:scale-95 shadow-sm"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Item Total</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                {formatPrice(item.product.price * item.quantity)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Estimated Tax (5%)</span>
                                    <span>{formatPrice(tax)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                                </div>
                                {shipping > 0 && (
                                    <p className="text-xs text-blue-600">
                                        Free shipping on orders over PKR 5,000!
                                    </p>
                                )}
                                <div className="border-t pt-4 flex justify-between">
                                    <span className="text-lg font-bold text-gray-900">Total</span>
                                    <span className="text-2xl font-black text-blue-600">{formatPrice(total)}</span>
                                </div>
                            </div>

                            <Link
                                href="/checkout"
                                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
                            >
                                Checkout Now
                                <ArrowRight className="h-5 w-5" />
                            </Link>

                            <div className="mt-6 space-y-4">
                                <p className="text-xs text-center text-gray-500">
                                    Secure checkout powered by Khanhub Payments
                                </p>
                                <div className="flex justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                                    {/* Placeholder for payment logos */}
                                    <div className="h-6 w-10 bg-gray-200 rounded"></div>
                                    <div className="h-6 w-10 bg-gray-200 rounded"></div>
                                    <div className="h-6 w-10 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
