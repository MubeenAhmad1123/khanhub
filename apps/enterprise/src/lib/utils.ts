// Utility Functions for Khanhub Store

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format price in Pakistani Rupees
 */
export function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
}

/**
 * Format price without currency symbol
 */
export function formatPriceNumber(price: number): string {
    return new Intl.NumberFormat('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(originalPrice: number, salePrice: number): number {
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Calculate final price after discount
 */
export function calculateFinalPrice(price: number, discount: number): number {
    return Math.round(price - (price * discount) / 100);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate product slug from name
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Validate Pakistani phone number
 */
export function validatePakistaniPhone(phone: string): boolean {
    // Format: +92 3XX XXXXXXX or 03XX XXXXXXX
    const regex = /^(\+92|0)?3\d{9}$/;
    return regex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Format Pakistani phone number
 */
export function formatPakistaniPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('92')) {
        return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
        return `+92${cleaned.slice(1)}`;
    }
    return `+92${cleaned}`;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Format date to Pakistani locale
 */
export function formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-PK', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(dateObj);
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateObj);
}

/**
 * Calculate estimated delivery date (5-7 business days)
 */
export function calculateEstimatedDelivery(): Date {
    const today = new Date();
    const deliveryDays = 7; // Average 7 days for Pakistan
    today.setDate(today.getDate() + deliveryDays);
    return today;
}

/**
 * Get WhatsApp message link
 */
export function getWhatsAppLink(phone: string, message: string): string {
    const formattedPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Get order status color
 */
export function getOrderStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        processing: 'bg-purple-100 text-purple-800',
        shipped: 'bg-indigo-100 text-indigo-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get payment method label
 */
export function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
        cod: 'Cash on Delivery',
        jazzcash: 'JazzCash',
        easypaisa: 'Easypaisa',
        'bank-transfer': 'Bank Transfer',
    };
    return labels[method] || method;
}

/**
 * Generate unique order number
 */
export function generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `KH-${timestamp}-${random}`;
}

/**
 * Check if product is on sale
 */
export function isOnSale(originalPrice?: number, discount?: number): boolean {
    return !!(originalPrice && discount && discount > 0);
}

/**
 * Calculate cart summary
 */
export function calculateCartSummary(
    subtotal: number,
    paymentMethod: string,
    shippingFee: number = 200
): {
    subtotal: number;
    shipping: number;
    codFee: number;
    tax: number;
    total: number;
} {
    const codFee = paymentMethod === 'cod' ? 100 : 0;
    const tax = 0; // No tax for now
    const total = subtotal + shippingFee + codFee + tax;

    return {
        subtotal,
        shipping: shippingFee,
        codFee,
        tax,
        total,
    };
}