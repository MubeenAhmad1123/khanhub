'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '@/types/product';
import { Cart, CartItem, CartContextType } from '@/types/cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

const EMPTY_CART: Cart = {
    items: [],
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    itemCount: 0,
};

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<Cart>(EMPTY_CART);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('khanhub-cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error('Failed to parse cart from localStorage:', error);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (cart !== EMPTY_CART) {
            localStorage.setItem('khanhub-cart', JSON.stringify(cart));
        }
    }, [cart]);

    const calculateCart = useCallback((items: CartItem[]): Cart => {
        const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

        // Simple business logic for tax and shipping
        const tax = subtotal * 0.05; // 5% tax
        const shipping = subtotal > 5000 ? 0 : 250; // Free shipping over 5000 PKR
        const total = subtotal + tax + shipping;

        return {
            items,
            subtotal,
            tax,
            shipping,
            total,
            itemCount,
        };
    }, []);

    const addToCart = useCallback((product: Product, quantity: number = 1) => {
        setCart((prevCart) => {
            const existingItemIndex = prevCart.items.findIndex((item) => item.product.id === product.id);
            let newItems: CartItem[];

            if (existingItemIndex > -1) {
                newItems = [...prevCart.items];
                newItems[existingItemIndex].quantity += quantity;
            } else {
                newItems = [
                    ...prevCart.items,
                    {
                        id: `${product.id}-${Date.now()}`,
                        product,
                        quantity,
                        addedAt: new Date().toISOString(),
                    },
                ];
            }

            return calculateCart(newItems);
        });
    }, [calculateCart]);

    const removeFromCart = useCallback((productId: string) => {
        setCart((prevCart) => {
            const newItems = prevCart.items.filter((item) => item.product.id !== productId);
            return calculateCart(newItems);
        });
    }, [calculateCart]);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }

        setCart((prevCart) => {
            const newItems = prevCart.items.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            );
            return calculateCart(newItems);
        });
    }, [calculateCart, removeFromCart]);

    const clearCart = useCallback(() => {
        setCart(EMPTY_CART);
        localStorage.removeItem('khanhub-cart');
    }, []);

    const isInCart = useCallback((productId: string) => {
        return cart.items.some((item) => item.product.id === productId);
    }, [cart.items]);

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                isInCart,
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
