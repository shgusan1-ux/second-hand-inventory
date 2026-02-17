import vision from '@google-cloud/vision';

let client: any = null;

function getVisionClient() {
    if (!client) {
        // Initialize the client
        let clientConfig = {};
        const jsonEnv = process.env.GOOGLE_VISION_CREDENTIALS_JSON;
        if (jsonEnv && jsonEnv.trim()) {
            try {
                clientConfig = { credentials: JSON.parse(jsonEnv) };
            } catch (e) {
                console.error('Failed to parse GOOGLE_VISION_CREDENTIALS_JSON:', e);
            }
        }

        client = new vision.ImageAnnotatorClient(clientConfig);
    }
    return client;
}

export async function analyzeImage(imageInput: string) {
    try {
        const request: any = {
            features: [
                { type: 'LABEL_DETECTION' },
                { type: 'TEXT_DETECTION' }, // OCR
                { type: 'LOGO_DETECTION' },
                { type: 'IMAGE_PROPERTIES' }, // Color extraction
                { type: 'OBJECT_LOCALIZATION' },
            ],
        };

        // Determine if input is URL or Base64
        if (imageInput.startsWith('http') || imageInput.startsWith('https')) {
            request.image = { source: { imageUri: imageInput } };
        } else {
            // Assume Base64. Strip prefix if present.
            const base64Content = imageInput.replace(/^data:image\/\w+;base64,/, '');
            request.image = { content: base64Content };
        }

        const [result] = await getVisionClient().annotateImage(request);

        return {
            labels: result.labelAnnotations,
            text: result.textAnnotations,
            logos: result.logoAnnotations,
            colors: result.imagePropertiesAnnotation?.dominantColors?.colors,
            objects: result.localizedObjectAnnotations,
            fullResponse: result,
        };
    } catch (error) {
        console.error('Google Vision API Error:', error);
        throw new Error('Failed to analyze image with Google Vision API');
    }
}

/**
 * Extracts brand and category keywords from Vision API results
 */
export function extractKeywords(visionResult: any) {
    const brandKeywords = visionResult.logos?.map((logo: any) => logo.description) || [];
    const categoryKeywords = visionResult.labels?.map((label: any) => label.description) || [];

    // OCR Text can contain brand names or material info
    const ocrText = visionResult.text?.[0]?.description || '';

    return {
        brands: brandKeywords,
        categories: categoryKeywords,
        ocrText,
        allKeywords: [...brandKeywords, ...categoryKeywords, ocrText].join(' '),
    };
}
