import { NextResponse } from 'next/server';
import { handleApiError, handleAuthError, handleSuccess } from '@/lib/api-utils';
import { analyzeImage } from '@/lib/vision-analyzer';

export async function GET() {
    const testImageUrl = 'https://shop-phinf.pstatic.net/20260206_216/1770305838220hz7jL_JPEG/104438760372546786_1961896374.jpeg';

    const results: any = {
        timestamp: new Date().toISOString(),
        config: {
            hasCredentials: !!process.env.GOOGLE_VISION_CREDENTIALS_JSON,
            projectId: process.env.GOOGLE_VISION_PROJECT_ID,
        },
        test_image: testImageUrl,
        analysis: null,
        error: null
    };

    try {
        console.log('[TEST] Starting Vision API analysis...');
        // We might need to handle the credentials JSON if it's not automatically picked up
        // If the ImageAnnotatorClient is initialized without args, it looks for GOOGLE_APPLICATION_CREDENTIALS file path

        const analysis = await analyzeImage(testImageUrl);
        results.analysis = analysis;
        console.log('[TEST] Vision API successful');
    } catch (error: any) {
        console.error('[TEST] Vision API failed:', error.message);
        results.error = {
            message: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack
        };
    }

    return NextResponse.json(results);
}
