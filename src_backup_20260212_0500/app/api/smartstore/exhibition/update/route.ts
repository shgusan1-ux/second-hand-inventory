import { NextResponse } from 'next/server';
import { naverRequest } from '@/lib/naver/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productNo, categoryIds } = body;

        if (!productNo || !categoryIds) {
            return NextResponse.json({ success: false, error: 'Missing productNo or categoryIds' }, { status: 400 });
        }

        // To update exhibition categories, we need to use the product update API
        // PATCH /v1/products/{originProductNo}
        // Note: Naver documentation says updating exhibition categories might be a separate field
        // or part of the general product update.

        const response = await naverRequest(`/v2/products/origin-products/${productNo}`, {
            method: 'PATCH',
            body: JSON.stringify({
                smartstoreChannelProduct: {
                    exhibitionCategoryIds: categoryIds
                }
            }),
        });

        return NextResponse.json({
            success: true,
            data: response
        });
    } catch (error: any) {
        console.error('Failed to update Naver product category:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
