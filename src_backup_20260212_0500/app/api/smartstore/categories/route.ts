import { NextResponse } from 'next/server';
import { naverRequest } from '@/lib/naver/client';

export async function GET() {
    try {
        // Try multiple likely endpoints for exhibition categories
        const endpoints = ['/v1/seller-categories', '/v1/exhibition/categories'];
        let lastError = null;

        for (const ep of endpoints) {
            try {
                const response = await naverRequest(ep);
                if (response) {
                    return NextResponse.json({ success: true, data: response });
                }
            } catch (e: any) {
                lastError = e.message;
            }
        }

        return NextResponse.json({
            success: false,
            error: `Failed to fetch categories: ${lastError}`
        }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
