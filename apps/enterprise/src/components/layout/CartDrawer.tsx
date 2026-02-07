'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { cart, updateQuantity, removeFromCart } = useCart();
    const cartItems = cart.items;
    const subtotal = cart.subtotal;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    {cartItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                            <p className="text-gray-600 mb-6">Add some products to get started</p>
                            <Link
                                href="/surgical"
                                onClick={onClose}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex gap-4 p-3 border rounded-lg">
                                    {/* Product Image */}
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <Image
                                            src={item.product.thumbnail}
                                            alt={item.product.name}
                                            fill
                                            className="object-cover rounded"
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                                            {item.product.name}
                                        </h3>
                                        <p className="text-sm font-bold text-blue-600">
                                            {formatPrice(item.product.price)}
                                        </p>

                                        {/* Quantity Controls */}
                                        <button
                                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                            className="p-1 border rounded hover:bg-gray-50"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-medium">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                            className="p-1 border rounded hover:bg-gray-50"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Checkout */}
                {cartItems.length > 0 && (
                    <div className="border-t p-4 bg-gray-50">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-xl font-bold text-gray-900">
                                {formatPrice(subtotal)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            Shipping and taxes calculated at checkout
                        </p>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            <Link
                                href="/checkout"
                                onClick={onClose}
                                className="block w-full py-3 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Proceed to Checkout
                            </Link>
                            <Link
                                href="/cart"
                                onClick={onClose}
                                className="block w-full py-3 bg-white border border-gray-300 text-gray-900 text-center font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                View Cart
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}