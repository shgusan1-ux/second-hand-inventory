import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// KIDS → MAN/WOMAN 매핑 (같은 이름 카테고리)
const KIDS_TO_MAN: Record<string, string> = {
    '468288': '468241', // 아우터
    '468289': '468248', // 후드집업/후리스
    '468291': '468250', // 니트
    '468292': '468251', // 가디건
    '468293': '468252', // 맨투맨/후드맨투맨
    '468295': '468253', // 티셔츠
    '468296': '468258', // 셔츠
    '468297': '468264', // 팬츠
    '468298': '468270', // 데님팬츠
};

const KIDS_TO_WOMAN: Record<string, string> = {
    '468288': '468271', // 아우터
    '468289': '468279', // 후드집업/후리스
    '468291': '468276', // 니트
    '468292': '468277', // 가디건(→후드/맨투맨 대용)
    '468293': '468277', // 맨투맨→후드/맨투맨
    '468295': '468275', // 티셔츠
    '468296': '468273', // 셔츠
    '468297': '468280', // 팬츠
    '468298': '468281', // 데님팬츠
};

// 일회성 카테고리 오분류 수정
export async function GET() {
    try {
        await ensureDbInitialized();

        const kidsCategories = Object.keys(KIDS_TO_MAN);
        const placeholders = kidsCategories.map((_, i) => `$${i + 1}`).join(',');

        // KIDS 카테고리에 배정된 모든 상품 조회
        const result = await db.query(
            `SELECT id, name, category FROM products WHERE category IN (${placeholders})`,
            kidsCategories
        );

        let fixedMAN = 0, fixedWOMAN = 0, keptKIDS = 0, skipped = 0;
        const fixes: Array<{ id: string; from: string; to: string; gender: string }> = [];

        for (const row of result.rows) {
            const name = row.name || '';
            const cat = String(row.category);

            // 성별 판별 (WOMAN을 MAN보다 먼저 체크 - WOMAN에 MAN이 포함되므로)
            let gender = 'UNKNOWN';
            if (/WOMAN[-\s]/i.test(name)) gender = 'WOMAN';
            else if (/MAN[-\s]/i.test(name)) gender = 'MAN';
            else if (/UNISEX[-\s]/i.test(name)) gender = 'MAN'; // UNISEX → MAN
            else if (/KIDS[-\s]/i.test(name)) gender = 'KIDS';

            if (gender === 'KIDS') {
                keptKIDS++;
                continue; // 실제 KIDS 상품은 유지
            }

            if (gender === 'UNKNOWN') {
                skipped++;
                continue; // 성별 불명 → 건드리지 않음
            }

            const newCat = gender === 'WOMAN' ? KIDS_TO_WOMAN[cat] : KIDS_TO_MAN[cat];
            if (!newCat) {
                skipped++;
                continue;
            }

            // DB 업데이트
            await db.query(`UPDATE products SET category=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [newCat, row.id]);

            if (gender === 'WOMAN') fixedWOMAN++;
            else fixedMAN++;

            fixes.push({ id: row.id, from: cat, to: newCat, gender });
        }

        return NextResponse.json({
            success: true,
            total: result.rows.length,
            fixedMAN,
            fixedWOMAN,
            keptKIDS,
            skipped,
            fixes: fixes.slice(0, 50), // 최대 50개만 응답에 포함
        });
    } catch (error: any) {
        console.error('[Fix Categories] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
