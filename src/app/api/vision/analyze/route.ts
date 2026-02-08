import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, extractKeywords } from '@/lib/google-vision';

export async function POST(req: NextRequest) {
    try {
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        // Call Vision API helper
        const analysis = await analyzeImage(imageUrl);
        const keywords = extractKeywords(analysis);

        return NextResponse.json({
            success: true,
            analysis,
            keywords,
        });
    } catch (error: any) {
        console.error('Vision API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze image' },
            { status: 500 }
        );
    }
}
