import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// 우리 상품과 공급사 원본 데이터를 자동 매칭
// 매칭 우선순위: 1. 바코드 2. 브랜드+사이즈+카테고리 유사매칭
export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('id'); // 우리 상품 ID
        const brand = searchParams.get('brand');
        const name = searchParams.get('name');
        const size = searchParams.get('size');

        if (!brand && !name && !productId) {
            return NextResponse.json({ error: '매칭 파라미터가 필요합니다.' }, { status: 400 });
        }

        // 0차: product_code 직접 매칭 (가장 정확)
        if (productId) {
            const { rows: directRows } = await db.query(
                `SELECT * FROM supplier_products WHERE product_code = $1`,
                [productId]
            );
            if (directRows.length > 0) {
                return NextResponse.json({
                    matched: true,
                    score: 100,
                    candidates_count: 1,
                    data: directRows[0],
                });
            }
        }

        // 1차: 브랜드 정확 매칭 + 이름/사이즈 유사 매칭
        let candidates: any[] = [];

        if (brand) {
            // 브랜드로 후보 필터링 (영문/한글 모두 비교)
            const brandUpper = brand.toUpperCase().trim();
            const { rows } = await db.query(
                `SELECT * FROM supplier_products
                 WHERE UPPER(brand) = $1 OR brand_kr = $2
                 LIMIT 100`,
                [brandUpper, brand.trim()]
            );
            candidates = rows;
        }

        if (candidates.length === 0 && name) {
            // 브랜드 매칭 실패 시 이름에서 브랜드 추출 시도
            const nameParts = name.split(' ');
            if (nameParts.length > 0) {
                const { rows } = await db.query(
                    `SELECT * FROM supplier_products
                     WHERE UPPER(brand) = $1 OR name LIKE $2
                     LIMIT 100`,
                    [nameParts[0].toUpperCase(), `%${nameParts[0]}%`]
                );
                candidates = rows;
            }
        }

        if (candidates.length === 0) {
            return NextResponse.json({ matched: false, data: null });
        }

        // 2차: 사이즈 + 이름 유사도로 최적 매칭
        let bestMatch = candidates[0];
        let bestScore = 0;

        for (const candidate of candidates) {
            let score = 0;

            // 사이즈 매칭 (추천사이즈 기준)
            if (size && candidate.recommended_size) {
                if (candidate.recommended_size.toUpperCase() === size.toUpperCase()) score += 3;
                if (candidate.labeled_size && candidate.labeled_size.toUpperCase() === size.toUpperCase()) score += 1;
            }

            // 이름 유사도 (공통 단어 수)
            if (name) {
                const nameWords = name.toUpperCase().split(/[\s,()]+/).filter(Boolean);
                const candidateWords = candidate.name.toUpperCase().split(/[\s,()]+/).filter(Boolean);
                const common = nameWords.filter((w: string) => candidateWords.includes(w));
                score += common.length * 0.5;

                // 카테고리 키워드 매칭
                const categoryKeywords = [candidate.category1, candidate.category2].filter(Boolean).map((s: string) => s.toUpperCase());
                for (const kw of categoryKeywords) {
                    if (name.toUpperCase().includes(kw)) score += 1;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = candidate;
            }
        }

        return NextResponse.json({
            matched: true,
            score: bestScore,
            candidates_count: candidates.length,
            data: bestMatch,
        });
    } catch (error: any) {
        console.error('[Supplier Match API] Error:', error);
        return NextResponse.json({ error: error.message || '매칭 실패' }, { status: 500 });
    }
}
