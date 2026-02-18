import { NextResponse } from 'next/server';
import { detectBadgeInImage } from '@/lib/vision/badge-detector';

export async function POST(request: Request) {
    try {
        const { imageUrls } = await request.json();

        if (!Array.isArray(imageUrls)) {
            return NextResponse.json({ error: 'imageUrls array required' }, { status: 400 });
        }

        // 병렬 처리 (제한된 개수씩)
        const results = [];
        const CONCURRENCY = 5;

        for (let i = 0; i < imageUrls.length; i += CONCURRENCY) {
            const batch = imageUrls.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(batch.map(async (url) => {
                const detection = await detectBadgeInImage(url);
                return { url, ...detection };
            }));
            results.push(...batchResults);
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
