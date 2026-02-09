export interface ClassificationResult {
    category: string;
    subCategory?: string;
    score: number;
    reasoning: string;
    confidence: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'MILITARY': ['m-65', 'ma-1', 'n-3b', 'army', 'navy', 'military', '미군', '군용', '개파카', 'M65', 'M51'],
    'WORKWEAR': ['carhartt', 'dickies', 'pointer', 'work', 'chore', '워크웨어', '칼하트', '디키즈', '엔지니어드', '베스트', '커버올'],
    'JAPAN': ['visvim', 'kapital', '45rpm', 'evisu', 'porter', 'beams', 'united arrows', '일본', '빔즈', '니들스', '캐피탈'],
    'EUROPE': ['french', 'german', 'swedish', 'italian', 'european', '유럽', '프랑스', '독일', '이탈리아', '빈티지유럽', '바우어'],
    'BRITISH': ['burberry', 'aquascutum', 'grenfell', 'barbour', 'british', '영국', '바버', '버버리', '해리스트위드', '마가렛호웰']
};

export function getLifecycleStage(regDate: string, overrideDate?: string): 'NEW' | 'CURATED' | 'ARCHIVE' | 'CLEARANCE' {
    const dateStr = overrideDate || regDate;
    if (!dateStr) return 'NEW';

    const cleanDate = new Date(dateStr);
    if (isNaN(cleanDate.getTime())) return 'NEW';

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - cleanDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return 'NEW';
    if (diffDays <= 60) return 'CURATED';
    if (diffDays <= 150) return 'ARCHIVE';
    return 'CLEARANCE';
}

export function calculateArchiveScores(text: string, visionKeywords: string[]): { category: string; score: number; reasoning: string }[] {
    const results: { category: string; score: number; reasoning: string }[] = [];
    const lowerText = text.toLowerCase();
    const lowerVision = visionKeywords.map(k => k.toLowerCase());

    Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
        let textScore = 0;
        let visionScore = 0;
        const matchedText: string[] = [];
        const matchedVision: string[] = [];

        keywords.forEach(kw => {
            const kwLower = kw.toLowerCase();
            if (lowerText.includes(kwLower)) {
                textScore += 20; // Up to 60 (3 matches)
                matchedText.push(kw);
            }
            if (lowerVision.includes(kwLower)) {
                visionScore += 10; // Up to 40 (4 matches)
                matchedVision.push(kw);
            }
        });

        const finalScore = Math.min(100, (Math.min(60, textScore) + Math.min(40, visionScore)));

        if (finalScore > 0) {
            results.push({
                category,
                score: finalScore,
                reasoning: `텍스트 매칭: ${matchedText.join(', ')} (${Math.min(60, textScore)}%), AI 비전 매칭: ${matchedVision.join(', ')} (${Math.min(40, visionScore)}%)`
            });
        }
    });

    return results.sort((a, b) => b.score - a.score);
}

export function classifyProduct(product: any, visionData?: any): ClassificationResult {
    const stage = getLifecycleStage(product.regDate, product.overrideDate);

    // Default result
    let result: ClassificationResult = {
        category: stage,
        score: 100,
        reasoning: `등록일(${product.regDate}) 기준 라이프사이클 분류`,
        confidence: 0.95
    };

    if (stage === 'ARCHIVE') {
        const text = `${product.name} ${product.sellerManagementCode || ''} ${product.description || ''}`;
        const visionKeywords = visionData?.labels || [];
        const archiveScores = calculateArchiveScores(text, visionKeywords);

        if (archiveScores.length > 0) {
            result.subCategory = archiveScores[0].category;
            result.score = archiveScores[0].score;
            result.reasoning = archiveScores[0].reasoning;
            result.confidence = archiveScores[0].score / 100;
        } else {
            result.subCategory = 'UNCATEGORIZED';
            result.reasoning = 'ARCHIVE 대상이나 매칭되는 키워드 점수가 없습니다.';
            result.confidence = 0.5;
        }
    }

    return result;
}

export function generateTags(product: any, classification: ClassificationResult): string[] {
    const tags = new Set<string>();

    // Add category tags
    tags.add(classification.category);
    if (classification.subCategory && classification.subCategory !== 'UNCATEGORIZED') {
        tags.add(classification.subCategory);
    }

    // Extract potential brands/models from name
    const brands = ['burberry', 'barbour', 'carhartt', 'dickies', 'evisu', 'porter', 'beams'];
    const lowerName = product.name.toLowerCase();
    brands.forEach(b => {
        if (lowerName.includes(b)) tags.add(b.toUpperCase());
    });

    // Static vintage tags
    tags.add('VINTAGE');
    tags.add('SECONDHAND');

    return Array.from(tags).slice(0, 10);
}
