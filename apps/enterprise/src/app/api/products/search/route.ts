import { NextRequest, NextResponse } from 'next/server';
import { enterpriseProducts } from '@/data/enterprise-products';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
        return NextResponse.json({ products: [] });
    }

    const allProducts = [...enterpriseProducts];

    const results = allProducts
        .filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.tags?.some(tag => tag.toLowerCase().includes(query))
        )
        .slice(0, limit)
        .map(product => ({
            id: product.id,
            name: product.name,
            category: 'Enterprise Equipment',
        }));

    return NextResponse.json({ products: results });
}
