'use client';

import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProductDetail from '@/components/products/ProductDetail';
import { useProduct } from '@/hooks/useProducts';

interface PageProps {
    params: { id: string } | Promise<{ id: string }>;
}

export default function SurgicalProductPage({ params }: PageProps) {
    const [productId, setProductId] = useState<string | null>(null);

    useEffect(() => {
        // Handle both Promise and direct object
        if (params instanceof Promise) {
            params.then(({ id }) => setProductId(id));
        } else {
            setProductId(params.id);
        }
    }, [params]);

    const { product, isLoading, error } = useProduct(productId || '');

    if (!productId || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading product...</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        notFound();
    }

    return <ProductDetail product={product} />;
}