'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
    ChevronLeft,
    Printer,
    Clock,
    CheckCircle2,
    Truck,
    Box,
    Phone,
    Mail,
    MapPin,
    CreditCard
} from 'lucide-react';
import { useOrders } from '@/context/OrderContext';
import { formatPrice } from '@/lib/utils';
import { OrderStatus } from '@/types/order';

interface OrderDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
    const { id } = use(params);
    const { getOrderById } = useOrders();
    const order = getOrderById(id);

    if (!order) {
        notFound();
    }

    const steps = [
        { status: 'pending', label: 'Order Placed', icon: Clock, description: 'We have received your order.' },
        { status: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2, description: 'Your order has been verified.' },
        { status: 'processing', label: 'Processing', icon: Box, description: 'Items are being packed for shipping.' },
        { status: 'shipped', label: 'Dispatched', icon: Truck, description: 'Your package is on its way.' },
        { status: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Order reached its destination.' }
    ];

    const currentStepIndex = steps.findIndex(s => s.status === order.orderStatus);

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/orders" className="p-2 bg-white border rounded-full hover:bg-gray-100 transition-colors">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                            <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 font-bold transition-colors">
                        <Printer className="h-4 w-4" />
                        Print Invoice
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Status Tracker */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-8">Order Tracking</h2>
                            <div className="relative">
                                {/* Connection Line */}
                                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-100 hidden sm:block"></div>

                                <div className="space-y-8 relative">
                                    {steps.map((step, idx) => {
                                        const isCompleted = idx <= currentStepIndex && order.orderStatus !== 'cancelled';
                                        const isActive = idx === currentStepIndex && order.orderStatus !== 'cancelled';
                                        const Icon = step.icon;

                                        return (
                                            <div key={idx} className="flex gap-6 sm:gap-10">
                                                <div className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isCompleted ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-gray-100'
                                                    }`}>
                                                    <Icon className={`h-5 w-5 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                                                    {isActive && (
                                                        <div className="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-25"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`font-bold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</h3>
                                                    <p className="text-sm text-gray-500">{step.description}</p>
                                                    {isActive && (
                                                        <p className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">
                                                            LATEST UPDATE: {new Date(order.updatedAt).toLocaleTimeString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                            <div className="p-6 border-b">
                                <h2 className="text-lg font-bold text-gray-900">Order Items</h2>
                            </div>
                            <div className="divide-y">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="p-6 flex gap-4">
                                        <div className="h-20 w-20 relative bg-gray-50 rounded-lg border flex-shrink-0 overflow-hidden">
                                            <Image
                                                src={item.product.thumbnail}
                                                alt={item.product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{item.product.name}</p>
                                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                            <p className="text-sm font-bold text-blue-600 mt-1">{formatPrice(item.product.price)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">{formatPrice(item.product.price * item.quantity)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Details */}
                    <div className="space-y-8">
                        {/* Summary Card */}
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Summary
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span>{order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax</span>
                                    <span>{formatPrice(order.tax)}</span>
                                </div>
                                {order.codFee && order.codFee > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>COD Fee</span>
                                        <span>{formatPrice(order.codFee)}</span>
                                    </div>
                                )}
                                <div className="pt-3 border-t flex justify-between">
                                    <span className="font-bold text-gray-900">Total</span>
                                    <span className="text-xl font-black text-blue-600">{formatPrice(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Details */}
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Delivery Address
                            </h3>
                            <div className="text-sm text-gray-600 space-y-2">
                                <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.province}</p>
                                <div className="flex items-center gap-2 pt-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span>{order.shippingAddress.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span>{order.shippingAddress.email}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Status */}
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" /> Payment
                            </h3>
                            <div className="flex items-center justify-between text-sm">
                                <span className="uppercase text-xs font-bold text-gray-500">{order.paymentMethod}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {order.paymentStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
