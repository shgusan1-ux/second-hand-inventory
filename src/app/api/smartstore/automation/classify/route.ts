import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { classifyBulkArchive } from '@/lib/archive-classifier';
import { classifyProduct, logClassification } from '@/lib/classification';
import { handleApiError, handleSuccess } from '@/lib/api-utils';

export async function POST(request: Request) {
    try {
        const { productIds, useAI = true } = await request.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ success: false, error: '분류할 상품 ID가 필요합니다.' }, { status: 400 });
        }

        // 1. 필요한 상품 데이터 조회 (이름, 브랜드)
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const { rows: products } = await db.query(
            `SELECT origin_product_no as id, name, inferred_brand as brand FROM naver_product_map WHERE origin_product_no IN (${placeholders})`,
            productIds
        );

        if (products.length === 0) {
            return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
        }

        // 2. 일괄 분류 실행 (기본 ARCHIVE 분류)
        console.log(`[Automation/Classify] Starting classification for ${products.length} products (useAI: ${useAI})`);
        const archiveResults = await classifyBulkArchive(products, useAI);

        // 3. 상세 분류 및 로그 기록
        // 3. 상세 분류 및 로그 기록
        const detailedResults = await Promise.all(products.map(async p => {
            const result = await classifyProduct(p.name);
            logClassification(p.id, p.name, result);
            return { productId: p.id, ...result };
        }));

        // 4. DB 업데이트 (product_overrides 및 naver_product_map)
        let updatedCount = 0;
        for (let i = 0; i < products.length; i++) {
            const archiveRes = archiveResults[i];
            const detailedRes = detailedResults[i];

            if (archiveRes.category) {
                // naver_product_map 업데이트
                // classification 데이터를 JSON으로 저장하기 위해 필드 확인 필요 (현재는 archive_category_id만 존재)
                await db.query(
                    `UPDATE naver_product_map SET archive_category_id = $1, last_synced_at = CURRENT_TIMESTAMP WHERE origin_product_no = $2`,
                    [archiveRes.category, archiveRes.productId]
                );
                updatedCount++;
            }
        }

        return handleSuccess({
            total: products.length,
            classified: updatedCount,
            archiveResults,
            detailedResults
        });

    } catch (error: any) {
        return handleApiError(error, 'Automation/Classify API');
    }
}
