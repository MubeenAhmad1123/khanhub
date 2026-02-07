'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ChevronLeft, CreditCard, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrderContext';
import { formatPrice } from '@/lib/utils';
import { CheckoutFormData, PaymentMethod, ShippingAddress } from '@/types/order';

export default function CheckoutPage() {
    const router = useRouter();
    const { cart } = useCart();
    const { placeOrder } = useOrders();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<CheckoutFormData>({
        shippingAddress: {
            fullName: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            province: 'Punjab',
            country: 'Pakistan'
        },
        paymentMethod: 'cod',
        notes: '',
        agreeToTerms: false
    });

    useEffect(() => {
        if (!isSubmitting && cart.items.length === 0) {
            router.push('/cart');
        }
    }, [cart.items.length, isSubmitting, router]);

    if (cart.items.length === 0) {
        return null;
    }

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData((prev) => ({
                ...prev,
                [parent]: {
                    ...(prev[parent as keyof CheckoutFormData] as any),
                    [child]: value
                }
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.agreeToTerms) {
            alert('Please agree to the terms and conditions');
            return;
        }

        setIsSubmitting(true);
        const response = await placeOrder(formData);
        setIsSubmitting(false);

        if (response.success) {
            router.push(`/checkout/success?id=${response.order?.id}`);
        } else {
            alert(response.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/cart" className="p-2 hover:bg-white rounded-full transition-colors border">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Shipping Info */}
                        <section className="bg-white p-6 rounded-xl border shadow-sm">
                            <div className="flex items-center gap-2 mb-6 text-blue-600">
                                <Truck className="h-6 w-6" />
                                <h2 className="text-xl font-bold text-gray-900">Shipping Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        name="shippingAddress.fullName"
                                        value={formData.shippingAddress.fullName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        name="shippingAddress.email"
                                        value={formData.shippingAddress.email}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        required
                                        type="tel"
                                        name="shippingAddress.phone"
                                        value={formData.shippingAddress.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0300-1234567"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                                    <textarea
                                        required
                                        name="shippingAddress.address"
                                        value={formData.shippingAddress.address}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Street, Area, Building..."
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        required
                                        type="text"
                                        name="shippingAddress.city"
                                        value={formData.shippingAddress.city}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Lahore, Karachi..."
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                                    <select
                                        name="shippingAddress.province"
                                        value={formData.shippingAddress.province}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Punjab">Punjab</option>
                                        <option value="Sindh">Sindh</option>
                                        <option value="KPK">KPK</option>
                                        <option value="Balochistan">Balochistan</option>
                                        <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                                        <option value="AJK">AJK</option>
                                        <option value="ICT">Islamabad Capital Territory</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Payment Method */}
                        <section className="bg-white p-6 rounded-xl border shadow-sm">
                            <div className="flex items-center gap-2 mb-6 text-blue-600">
                                <CreditCard className="h-6 w-6" />
                                <h2 className="text-xl font-bold text-gray-900">Payment Method</h2>
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="cod"
                                        checked={formData.paymentMethod === 'cod'}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-blue-600"
                                    />
                                    <div className="ml-4 flex-1">
                                        <p className="font-bold text-gray-900">Cash on Delivery (COD)</p>
                                        <p className="text-sm text-gray-500">Pay when your items arrive. (Fee: PKR 100)</p>
                                    </div>
                                </label>

                                <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'jazzcash' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="jazzcash"
                                        checked={formData.paymentMethod === 'jazzcash'}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-blue-600"
                                    />
                                    <div className="ml-4 flex-1">
                                        <p className="font-bold text-gray-900">JazzCash</p>
                                        <p className="text-sm text-gray-500">Secure mobile wallet payment</p>
                                    </div>
                                </label>

                                <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'easypaisa' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="easypaisa"
                                        checked={formData.paymentMethod === 'easypaisa'}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-blue-600"
                                    />
                                    <div className="ml-4 flex-1">
                                        <p className="font-bold text-gray-900">Easypaisa</p>
                                        <p className="text-sm text-gray-500">Quick and easy payment via Easypaisa</p>
                                    </div>
                                </label>
                            </div>
                        </section>

                        {/* Additional Notes */}
                        <section className="bg-white p-6 rounded-xl border shadow-sm">
                            <label className="block text-lg font-bold text-gray-900 mb-2">Order Notes (Optional)</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={2}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Special instructions for delivery..."
                            />
                        </section>
                    </div>

                    {/* Order Summary Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl border shadow-sm sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                            {/* Items List Snapshot */}
                            <div className="space-y-4 mb-6 max-h-48 overflow-y-auto">
                                {cart.items.map((item) => (
                                    <div key={item.id} className="flex gap-3 text-sm">
                                        <div className="w-12 h-12 relative flex-shrink-0 bg-gray-100 rounded">
                                            <Image src={item.product.thumbnail} alt={item.product.name} fill className="object-cover rounded" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                                            <p className="text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="font-semibold">{formatPrice(item.product.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatPrice(cart.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax</span>
                                    <span>{formatPrice(cart.tax)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span>{cart.shipping === 0 ? 'FREE' : formatPrice(cart.shipping)}</span>
                                </div>
                                {formData.paymentMethod === 'cod' && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>COD Fee</span>
                                        <span>{formatPrice(100)}</span>
                                    </div>
                                )}
                                <div className="pt-4 border-t flex justify-between">
                                    <span className="text-lg font-bold">Total</span>
                                    <span className="text-2xl font-black text-blue-600">
                                        {formatPrice(cart.total + (formData.paymentMethod === 'cod' ? 100 : 0))}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        required
                                        type="checkbox"
                                        checked={formData.agreeToTerms}
                                        onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                                        className="mt-1 h-4 w-4 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-600 text-left">
                                        I agree to the <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 disabled:bg-gray-400"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Place Order
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>

                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-green-600">
                                <ShieldCheck className="h-4 w-4" />
                                <span>SSL Secure Payment</span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
