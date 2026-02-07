'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Package, ArrowRight, Home, LayoutDashboard } from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { formatPrice } from '@/lib/utils';

export default function CheckoutSuccessPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('id');
    const { getOrderById } = useOrders();
    const order = orderId ? getOrderById(orderId) : null;

    if (!order) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
                <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-10 w-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Finding your order...</h1>
                <p className="text-gray-600 mb-8">This might take a moment if you just placed it.</p>
                <Link href="/" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                    <Home className="h-4 w-4" /> Go back home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Success Animation/Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-100 rounded-full animate-ping scale-150 opacity-20"></div>
                        <div className="relative h-24 w-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                            <CheckCircle2 className="h-12 w-12 text-white" />
                        </div>
                    </div>
                </div>

                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Order Placed Successfully!</h1>
                <p className="text-lg text-gray-600 mb-8">
                    Thank you for your purchase. We've sent a confirmation email to <span className="font-bold text-gray-900">{order.shippingAddress.email}</span>.
                </p>

                {/* Order Summary Card */}
                <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8 mb-8 text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b">
                        <div>
                            <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Order Number</p>
                            <p className="text-xl font-black text-blue-600">#{order.orderNumber}</p>
                        </div>
                        <div className="text-sm sm:text-right">
                            <p className="text-gray-500">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                            <p className="font-bold text-gray-900">Total: {formatPrice(order.total)}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Delivery Info */}
                        <div className="flex gap-4">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Shipping to:</h3>
                                <p className="text-gray-600 text-sm">{order.shippingAddress.fullName}</p>
                                <p className="text-gray-600 text-sm">{order.shippingAddress.address}, {order.shippingAddress.city}</p>
                            </div>
                        </div>

                        {/* Order Timeline Preview */}
                        <div className="pt-4 border-t">
                            <h3 className="font-bold text-gray-900 mb-4">What's Next?</h3>
                            <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                                <div className="relative before:absolute before:-left-[25px] before:top-1 before:h-[12px] before:w-[12px] before:rounded-full before:bg-blue-600">
                                    <p className="text-sm font-bold text-gray-900">Order Confirmed</p>
                                    <p className="text-xs text-gray-500">We've received your order and are processing it.</p>
                                </div>
                                <div className="relative before:absolute before:-left-[25px] before:top-1 before:h-[12px] before:w-[12px] before:rounded-full before:bg-gray-300">
                                    <p className="text-sm font-medium text-gray-400">Processing</p>
                                    <p className="text-xs text-gray-400">Your items are being packed for shipping.</p>
                                </div>
                                <div className="relative before:absolute before:-left-[25px] before:top-1 before:h-[12px] before:w-[12px] before:rounded-full before:bg-gray-300">
                                    <p className="text-sm font-medium text-gray-400">Dispatched</p>
                                    <p className="text-xs text-gray-400">Coming soon!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/orders"
                        className="px-8 py-4 bg-white border border-gray-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        View All Orders
                    </Link>
                    <Link
                        href="/"
                        className="px-8 py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                    >
                        Continue Shopping
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
