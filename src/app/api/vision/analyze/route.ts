import { NextResponse } from 'next/server';
const vision = require('@google-cloud/vision');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageUrl } = body;

        if (!imageUrl) {
            return NextResponse.json({ success: false, error: 'Missing image URL' }, { status: 400 });
        }

        const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS_JSON || '{}');
        if (!credentials.project_id) {
            throw new Error('Google Vision credentials missing or invalid');
        }

        const client = new vision.ImageAnnotatorClient({ credentials });

        // Perform label detection, set object detection for clothing
        const [result] = await client.annotateImage({
            image: { source: { imageUri: imageUrl } },
            features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'TEXT_DETECTION' }
            ],
        });

        return NextResponse.json({
            success: true,
            data: {
                labels: result.labelAnnotations || [],
                objects: result.localizedObjectAnnotations || [],
                text: result.fullTextAnnotation?.text || ''
            }
        });
    } catch (error: any) {
        console.error('Vision API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
