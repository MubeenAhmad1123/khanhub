'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package, ChevronRight, ShoppingBag, Clock, CheckCircle2, Truck } from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { formatPrice } from '@/lib/utils';
import { OrderStatus } from '@/types/order';

export default function OrdersPage() {
    const { orders } = useOrders();

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'confirmed': return 'bg-blue-100 text-blue-700';
            case 'processing': return 'bg-purple-100 text-purple-700';
            case 'shipped': return 'bg-sky-100 text-sky-700';
            case 'delivered': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (orders.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="bg-gray-100 p-8 rounded-full mb-6">
                    <Package className="h-16 w-16 text-gray-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">No orders found</h1>
                <p className="text-gray-600 mb-8 max-w-md">
                    You haven't placed any orders yet. Once you do, they'll appear here for you to track.
                </p>
                <Link
                    href="/"
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Order History</h1>
                    <div className="text-sm text-gray-500">
                        Showing <span className="font-bold">{orders.length}</span> orders
                    </div>
                </div>

                <div className="space-y-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Order Header */}
                            <div className="bg-gray-50 p-4 sm:p-6 border-b flex flex-wrap gap-4 justify-between items-center text-sm">
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Date Placed</p>
                                        <p className="font-semibold text-gray-900">{new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Total Amount</p>
                                        <p className="font-bold text-blue-600">{formatPrice(order.total)}</p>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Ship To</p>
                                        <p className="font-semibold text-gray-900">{order.shippingAddress.fullName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Order Number</p>
                                    <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                                </div>
                            </div>

                            {/* Order Body */}
                            <div className="p-4 sm:p-6">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Items Preview */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(order.orderStatus)}`}>
                                                {order.orderStatus}
                                            </span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs text-gray-500">Method: {order.paymentMethod.toUpperCase()}</span>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {order.items.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="relative w-16 h-16 bg-gray-50 rounded-lg border overflow-hidden flex-shrink-0 group">
                                                    <Image
                                                        src={item.product.thumbnail}
                                                        alt={item.product.name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform"
                                                    />
                                                    <span className="absolute bottom-0 right-0 bg-gray-900 text-white text-[10px] px-1 rounded-tl z-10">x{item.quantity}</span>
                                                </div>
                                            ))}
                                            {order.items.length > 3 && (
                                                <div className="w-16 h-16 flex items-center justify-center bg-gray-50 border rounded-lg text-xs text-gray-500 font-bold">
                                                    +{order.items.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Links */}
                                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center lg:w-48">
                                        <Link
                                            href={`/orders/${order.id}`}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                                        >
                                            Track Order
                                        </Link>
                                        <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors">
                                            Order Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
