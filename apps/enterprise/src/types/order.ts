// Order Types for Khanhub Store

import { CartItem } from './cart';

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export type PaymentMethod =
    | 'cod'          // Cash on Delivery
    | 'jazzcash'     // JazzCash
    | 'easypaisa'    // Easypaisa
    | 'bank-transfer';

export type PaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded';

export interface ShippingAddress {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    province: string;
    postalCode?: string;
    country: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    userId?: string;
    items: CartItem[];
    shippingAddress: ShippingAddress;
    billingAddress?: ShippingAddress;
    subtotal: number;
    tax: number;
    shipping: number;
    codFee?: number; // Cash on Delivery fee (PKR 100)
    total: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    notes?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CheckoutFormData {
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    notes?: string;
    agreeToTerms: boolean;
}

export interface OrderResponse {
    success: boolean;
    message: string;
    order?: Order;
    error?: string;
}