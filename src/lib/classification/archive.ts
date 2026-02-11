
import { ARCHIVE_KEYWORDS } from './keywords';

export type ArchiveCategory = 'MILITARY' | 'WORKWEAR' | 'JAPAN' | 'EUROPE' | 'BRITISH';

export interface ArchiveClassification {
    category: ArchiveCategory | 'UNCATEGORIZED';
    score: number;
    confidence: 'high' | 'medium' | 'low';
    breakdown: {
        textScore: number;
        visionScore: number;
        textMatches: string[];
        visionLabels: string[];
    };
}

export function classifyArchive(productName: string, visionLabels: string[] = []): ArchiveClassification {
    const lowerName = productName.toLowerCase();
    const lowerLabels = visionLabels.map(l => l.toLowerCase());

    const results = Object.entries(ARCHIVE_KEYWORDS).map(([cat, keywords]) => {
        const textMatches: string[] = [];
        const visionMatches: string[] = [];
        let textScore = 0;
        let visionScore = 0;

        keywords.forEach(kw => {
            const lowKw = kw.toLowerCase();
            if (lowerName.includes(lowKw)) {
                textMatches.push(kw);
                textScore += 20;
            }
            if (lowerLabels.includes(lowKw)) {
                visionMatches.push(kw);
                visionScore += 10;
            }
        });

        const finalRowScore = (Math.min(60, textScore) * 1.0) + (Math.min(40, visionScore) * 1.0); // 60/40 weighted max? No, requested: 60% text, 40% vision. 
        // Logic: Text matches up to 60 points, Vision matches up to 40 points. Total 100.

        return {
            category: cat as ArchiveCategory,
            score: Math.min(100, (Math.min(60, textScore) + Math.min(40, visionScore))),
            textScore: Math.min(60, textScore),
            visionScore: Math.min(40, visionScore),
            textMatches,
            visionLabels: visionMatches
        };
    });

    results.sort((a, b) => b.score - a.score);
    const top = results[0];

    if (!top || top.score === 0) {
        return {
            category: 'UNCATEGORIZED',
            score: 0,
            confidence: 'low',
            breakdown: { textScore: 0, visionScore: 0, textMatches: [], visionLabels: [] }
        };
    }

    return {
        category: top.category,
        score: top.score,
        confidence: top.score > 70 ? 'high' : top.score > 40 ? 'medium' : 'low',
        breakdown: {
            textScore: top.textScore,
            visionScore: top.visionScore,
            textMatches: top.textMatches,
            visionLabels: top.visionLabels
        }
    };
}
