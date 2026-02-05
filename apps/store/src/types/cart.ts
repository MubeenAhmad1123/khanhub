// Cart Types for Khanhub Store

import { Product } from './product';

export interface CartItem {
    id: string;
    product: Product;
    quantity: number;
    addedAt: string;
}

export interface Cart {
    items: CartItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    itemCount: number;
}

export interface CartContextType {
    cart: Cart;
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    isInCart: (productId: string) => boolean;
}

export interface AddToCartResponse {
    success: boolean;
    message: string;
    cart: Cart;
}