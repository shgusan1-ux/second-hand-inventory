import { NextRequest, NextResponse } from 'next/server';
import { estimateClothingSize } from '@/lib/measurement';

export async function POST(req: NextRequest) {
    try {
        const { imageUrl, referenceWidth } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
        }

        const result = await estimateClothingSize(imageUrl, referenceWidth || 42);

        return NextResponse.json({
            success: true,
            result
        });
    } catch (error: any) {
        console.error('API Error (estimate-size):', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'AI measurement failed'
        }, { status: 500 });
    }
}
