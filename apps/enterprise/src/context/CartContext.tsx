'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { Cart, CartItem, CartContextType } from '@/types/cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<Cart>({
        items: [],
        total: 0,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        itemCount: 0,
    });

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('enterprise-cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error('Failed to load cart:', error);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('enterprise-cart', JSON.stringify(cart));
    }, [cart]);

    const calculateTotal = (items: CartItem[]) => {
        const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const tax = subtotal * 0.17; // 17% GST in Pakistan
        const shipping = subtotal > 50000 ? 0 : 500; // Free shipping over 50,000 PKR
        const itemCount = items.reduce((count, item) => count + item.quantity, 0);

        return {
            subtotal,
            tax,
            shipping,
            total: subtotal + tax + shipping,
            itemCount,
        };
    };

    const addToCart = (product: Product, quantity: number = 1) => {
        setCart(prevCart => {
            const existingItem = prevCart.items.find(item => item.product.id === product.id);

            let newItems: CartItem[];
            if (existingItem) {
                newItems = prevCart.items.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                newItems = [...prevCart.items, {
                    id: crypto.randomUUID(),
                    product,
                    quantity,
                    addedAt: new Date().toISOString()
                }];
            }

            const totals = calculateTotal(newItems);
            return { items: newItems, ...totals };
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prevCart => {
            const newItems = prevCart.items.filter(item => item.product.id !== productId);
            const totals = calculateTotal(newItems);
            return { items: newItems, ...totals };
        });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(prevCart => {
            const newItems = prevCart.items.map(item =>
                item.product.id === productId ? { ...item, quantity } : item
            );
            const totals = calculateTotal(newItems);
            return { items: newItems, ...totals };
        });
    };

    const clearCart = () => {
        setCart({
            items: [],
            total: 0,
            subtotal: 0,
            tax: 0,
            shipping: 0,
            itemCount: 0,
        });
    };

    const isInCart = (productId: string) => {
        return cart.items.some(item => item.product.id === productId);
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                isInCart,
                itemCount: cart.itemCount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}