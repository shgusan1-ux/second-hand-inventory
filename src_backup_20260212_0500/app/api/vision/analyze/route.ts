import { NextResponse } from 'next/server';
import { analyzeImage } from '@/lib/vision-analyzer';

export async function POST(request: Request) {
    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
        }

        const analysis = await analyzeImage(imageUrl);

        return NextResponse.json({
            success: true,
            data: analysis
        });
    } catch (error: any) {
        console.error('Vision API Route Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
