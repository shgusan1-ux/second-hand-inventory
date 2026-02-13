
import { calculateLifecycle, LifecycleStage } from './lifecycle-manager';
import { KEYWORDS, matchKeywords } from './keyword-matcher';

export type ArchiveCategory = 'MILITARY' | 'WORKWEAR' | 'JAPAN' | 'EUROPE' | 'BRITISH' | 'UNCATEGORIZED';

export interface ClassificationResult {
    stage: 'NEW' | 'CURATED' | 'ARCHIVE' | 'CLEARANCE';
    archiveCategory?: ArchiveCategory;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    lifecycle: LifecycleStage;
}

export async function classifyProduct(product: any, visionLabels: string[] = []): Promise<ClassificationResult> {
    const lifecycle = await calculateLifecycle(product.regDate, product.overrideDate);
    const text = `${product.name} ${product.sellerManagementCode || ''} ${product.description || ''}`;

    // 기본 결과 (NEW, CURATED, CLEARANCE 단계는 라이프사이클 우선)
    let result: ClassificationResult = {
        stage: lifecycle.stage,
        score: 100,
        confidence: 'high',
        reasoning: lifecycle.reason,
        lifecycle
    };

    // ARCHIVE 단계인 경우 5중 분류 시도
    if (lifecycle.stage === 'ARCHIVE') {
        const scores: { category: ArchiveCategory; score: number; reasoning: string }[] = [];

        Object.entries(KEYWORDS).forEach(([category, kws]) => {
            // 1. 텍스트 분석 (60%)
            const textMatch = matchKeywords(text, kws);

            // 2. Vision 분석 (40%)
            const matchedVision: string[] = [];
            let visionScore = 0;
            const lowerVisionLabels = visionLabels.map(l => l.toLowerCase());

            kws.forEach(kw => {
                if (lowerVisionLabels.includes(kw.toLowerCase())) {
                    matchedVision.push(kw);
                    visionScore += 10;
                }
            });
            visionScore = Math.min(40, visionScore);

            const totalScore = textMatch.score + visionScore;

            if (totalScore > 0) {
                scores.push({
                    category: category as ArchiveCategory,
                    score: totalScore,
                    reasoning: `텍스트 매칭: ${textMatch.matchedKeywords.join(', ')} (${textMatch.score}%), Vision 매칭: ${matchedVision.join(', ')} (${visionScore}%)`
                });
            }
        });

        if (scores.length > 0) {
            scores.sort((a, b) => b.score - a.score);
            const top = scores[0];
            result.archiveCategory = top.category;
            result.score = top.score;
            result.reasoning = top.reasoning;
            result.confidence = top.score >= 80 ? 'high' : top.score >= 40 ? 'medium' : 'low';
        } else {
            result.archiveCategory = 'UNCATEGORIZED';
            result.score = 0;
            result.reasoning = 'ARCHIVE 대상이나 매칭되는 키워드가 없습니다.';
            result.confidence = 'low';
        }
    }

    return result;
}
