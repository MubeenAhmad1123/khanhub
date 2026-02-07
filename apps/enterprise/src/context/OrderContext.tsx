'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Order, OrderResponse, CheckoutFormData } from '@/types/order';
import { Cart } from '@/types/cart';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';

interface OrderContextType {
    orders: Order[];
    currentOrder: Order | null;
    placeOrder: (formData: CheckoutFormData) => Promise<OrderResponse>;
    getOrderById: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const { cart, clearCart } = useCart();
    const { user, isAuthenticated } = useAuth();

    // Load orders from localStorage
    useEffect(() => {
        const savedOrders = localStorage.getItem('khanhub-orders');
        if (savedOrders) {
            try {
                setOrders(JSON.parse(savedOrders));
            } catch (error) {
                console.error('Failed to parse orders:', error);
            }
        }
    }, []);

    // Save orders to localStorage
    useEffect(() => {
        if (orders.length > 0) {
            localStorage.setItem('khanhub-orders', JSON.stringify(orders));
        }
    }, [orders]);

    // Filtered orders for the current user
    const userOrders = orders.filter(o =>
        (isAuthenticated && o.userId === user?.id) || (!isAuthenticated && !o.userId)
    );

    const getOrderById = useCallback((id: string) => {
        return orders.find(o => o.id === id);
    }, [orders]);

    const placeOrder = async (formData: CheckoutFormData): Promise<OrderResponse> => {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            const orderId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const newOrder: Order = {
                id: orderId,
                userId: user?.id, // Link to current user if logged in
                orderNumber: orderId,
                items: [...cart.items],
                shippingAddress: formData.shippingAddress,
                subtotal: cart.subtotal,
                tax: cart.tax,
                shipping: cart.shipping,
                codFee: formData.paymentMethod === 'cod' ? 100 : 0,
                total: cart.total + (formData.paymentMethod === 'cod' ? 100 : 0),
                paymentMethod: formData.paymentMethod,
                paymentStatus: formData.paymentMethod === 'cod' ? 'pending' : 'paid',
                orderStatus: 'pending',
                notes: formData.notes,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            setOrders(prev => [newOrder, ...prev]);
            setCurrentOrder(newOrder);
            clearCart();

            return {
                success: true,
                message: 'Order placed successfully!',
                order: newOrder
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to place order. Please try again.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    };

    return (
        <OrderContext.Provider
            value={{
                orders: userOrders, // Return filtered orders
                currentOrder,
                placeOrder,
                getOrderById
            }}
        >
            {children}
        </OrderContext.Provider>
    );
}

export function useOrders() {
    const context = useContext(OrderContext);
    if (context === undefined) {
        throw new Error('useOrders must be used within an OrderProvider');
    }
    return context;
}
