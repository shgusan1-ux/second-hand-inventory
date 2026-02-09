import { ImageAnnotatorClient } from '@google-cloud/vision';

// Setup Google Vision Client
// Note: Credentials should be provided via GOOGLE_VISION_CREDENTIALS_JSON or ENV
const client = new ImageAnnotatorClient();

export interface VisionAnalysisResult {
    labels: string[];
    objects: string[];
    dominantColors: string[];
    text: string;
    confidence: number;
}

export async function analyzeImage(imageUrl: string): Promise<VisionAnalysisResult> {
    try {
        const [result] = await client.annotateImage({
            image: { source: { imageUri: imageUrl } },
            features: [
                { type: 'LABEL_DETECTION', maxResults: 15 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'IMAGE_PROPERTIES' },
                { type: 'TEXT_DETECTION' }
            ],
        });

        const labels = result.labelAnnotations?.map(label => label.description || '') || [];
        const objects = result.localizedObjectAnnotations?.map(obj => obj.name || '') || [];
        const colors = result.imagePropertiesAnnotation?.dominantColors?.colors || [];
        const dominantColors = colors.slice(0, 3).map(c =>
            `rgb(${c.color?.red},${c.color?.green},${c.color?.blue})`
        );
        const text = result.fullTextAnnotation?.text || '';

        // Calculate a rough confidence score based on average label score
        const confidence = result.labelAnnotations?.reduce((acc, l) => acc + (l.score || 0), 0) || 0;
        const avgConfidence = labels.length > 0 ? (confidence / labels.length) : 0;

        return {
            labels,
            objects,
            dominantColors,
            text,
            confidence: avgConfidence
        };
    } catch (error) {
        console.error('Vision API Error:', error);
        throw error;
    }
}

export function extractFeatures(visionData: VisionAnalysisResult) {
    // Basic extraction of relevant clothing features
    const keywords = [...visionData.labels, ...visionData.objects].map(k => k.toLowerCase());

    return {
        isClothing: keywords.some(k => ['clothing', 'apparel', 'shirt', 'jacket', 'pants', 'vintage'].includes(k)),
        isMilitary: keywords.some(k => ['military', 'army', 'camouflage', 'uniform'].includes(k)),
        isWorkwear: keywords.some(k => ['workwear', 'canvas', 'denim', 'rugged'].includes(k)),
        colorProfile: visionData.dominantColors,
        rawKeywords: keywords
    };
}
