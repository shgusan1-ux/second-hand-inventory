
export const KEYWORDS = {
    MILITARY: ['M-65', 'MA-1', 'N-3B', 'Army', 'Navy', 'Military', 'Combat', 'Field', '미군', '군용', '개파카'],
    WORKWEAR: ['Carhartt', 'Dickies', 'Pointer', 'Work', 'Chore', 'Overall', '워크웨어', '칼하트', '디키즈'],
    JAPAN: ['Visvim', 'Kapital', '45rpm', 'Evisu', 'Porter', 'Beams', 'United Arrows', '일본', '빔즈', '니들스'],
    EUROPE: ['French', 'German', 'Swedish', 'Italian', 'European', 'Euro', '유럽', '프랑스', '독일'],
    BRITISH: ['Burberry', 'Aquascutum', 'Grenfell', 'Barbour', 'Mackintosh', 'British', '영국', '바버', '버버리']
};

export interface MatchResult {
    matchedKeywords: string[];
    score: number;
}

export function matchKeywords(text: string, categoryKeywords: string[]): MatchResult {
    const lowerText = text.toLowerCase();
    const matchedKeywords: string[] = [];
    let score = 0;

    categoryKeywords.forEach(kw => {
        if (lowerText.includes(kw.toLowerCase())) {
            matchedKeywords.push(kw);
            score += 20; // 각 키워드당 20점 (최대 60점으로 제한할 예정)
        }
    });

    return {
        matchedKeywords,
        score: Math.min(60, score) // 텍스트 매칭 점수는 최대 60점
    };
}
