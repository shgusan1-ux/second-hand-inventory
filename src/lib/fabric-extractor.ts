/**
 * Fabric Extractor
 * Extracts fabric composition from OCR text provided by Google Vision API
 */

interface FabricInfo {
    originalText: string;
    composition: string;
    confidence: number;
}

// Common fabric keywords in Korean and English
const FABRIC_KEYWORDS = [
    '면', 'cotton', '코튼',
    '폴리에스터', 'polyester', '폴리',
    '나일론', 'nylon',
    '울', 'wool', '모',
    '레이온', 'rayon',
    '마', 'linen', '린넨',
    '아크릴', 'acrylic',
    '스판', 'spandex', 'elastane', 'polyurethane', '폴리우레탄',
    '실크', 'silk', '견',
    '캐시미어', 'cashmere',
    '가죽', 'leather',
    '다운', 'down', 'duck', 'goose', '구스', '오리털'
];

export function extractFabricFromOCR(ocrText: string): string | null {
    if (!ocrText) return null;

    // Clean up text (remove special chars, normalize spaces)
    const cleanText = ocrText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

    // Strategy 1: Pattern matching for "Material: Cotton 100%" or "겉감: 면 100%"
    // Regex to find fabric name followed by percentage (e.g., "면 100%", "Cotton 100%", "Polyester 65%")
    // Creates a mapping of found fabrics with percentages

    const foundFabrics: string[] = [];

    // 1. Look for patterns like "면 100%" or "Cotton 50%"
    // Regex explains: 
    // ([가-힣a-zA-Z]+) -> Fabric name
    // [\s:.-]* -> Separators
    // (\d{1,3})\s*% -> Percentage
    const percentageRegex = /([가-힣a-zA-Z]+)[\s:.-]*(\d{1,3})\s*%/g;

    let match;
    while ((match = percentageRegex.exec(cleanText)) !== null) {
        const rawFabric = match[1].toLowerCase();
        const percentage = match[2];

        // Validate if the captured word is actually a fabric
        const isFabric = FABRIC_KEYWORDS.some(k => rawFabric.includes(k) || k.includes(rawFabric));

        if (isFabric) {
            // Normalize fabric name (e.g., 'cotton' -> '면')
            const normalizedName = normalizeFabricName(match[1]);
            foundFabrics.push(`${normalizedName} ${percentage}%`);
        }
    }

    if (foundFabrics.length > 0) {
        return [...new Set(foundFabrics)].join(', ');
    }

    // Strategy 2: If no percentages found, look for just fabric keywords near "Fabric" or "Material" keywords
    // (Simplified for now, focusing on percentage accuracy first)

    return null;
}

function normalizeFabricName(rawName: string): string {
    const lower = rawName.toLowerCase();

    if (lower.includes('cotton') || lower.includes('코튼')) return '면';
    if (lower.includes('polyester') || lower.includes('폴리')) return '폴리에스터';
    if (lower.includes('nylon')) return '나일론';
    if (lower.includes('wool')) return '울';
    if (lower.includes('rayon')) return '레이온';
    if (lower.includes('linen') || lower.includes('린넨')) return '린넨';
    if (lower.includes('acrylic')) return '아크릴';
    if (lower.includes('spandex') || lower.includes('elastane') || lower.includes('polyurethane')) return '스판';
    if (lower.includes('silk')) return '실크';
    if (lower.includes('cashmere')) return '캐시미어';
    if (lower.includes('leather')) return '가죽';

    return rawName; // Return original if no mapping found (e.g., Korean '면' stays '면')
}
