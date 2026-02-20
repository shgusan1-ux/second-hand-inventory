import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { generateProductDetailHTML, prepareProductWithSupplierData } from '@/lib/product-detail-generator';
import * as XLSX from 'xlsx';

export const maxDuration = 60;

// 플레이오토 수정양식 엑셀 다운로드
// POST: 선택한 상품 ID 목록으로 다운로드
// GET: ai_completed 또는 전체
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const { ids } = await request.json() as { ids: string[] };

        if (!ids || ids.length === 0) {
            return NextResponse.json({ error: '상품 ID가 없습니다.' }, { status: 400 });
        }

        const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
        const { rows: products } = await db.query(`
            SELECT p.*, c.name as category_name, c.classification as category_classification,
                sp.shoulder, sp.chest, sp.waist, sp.arm_length as sleeve,
                sp.length1 as total_length, sp.hem, sp.rise, sp.thigh, sp.length2 as inseam,
                sp.hip, sp.fabric1 as sp_fabric1, sp.fabric2 as sp_fabric2,
                sp.image_urls as sp_image_urls, sp.label_image as sp_label_image
            FROM products p
            LEFT JOIN categories c ON p.category = c.id
            LEFT JOIN supplier_products sp ON p.id = sp.product_code
            WHERE p.id IN (${placeholders})
            ORDER BY p.created_at DESC
        `, ids);

        if (products.length === 0) {
            return NextResponse.json({ error: '해당 상품이 없습니다.' }, { status: 404 });
        }

        return buildExcelResponse(products);
    } catch (error: any) {
        console.error('[PlayAuto Export POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || 'ai_completed';

        let whereClause = "WHERE p.status = '판매중'";
        if (filter === 'ai_completed') {
            whereClause += ' AND p.ai_completed = 1';
        }

        const { rows: products } = await db.query(`
            SELECT p.*, c.name as category_name, c.classification as category_classification,
                sp.shoulder, sp.chest, sp.waist, sp.arm_length as sleeve,
                sp.length1 as total_length, sp.hem, sp.rise, sp.thigh, sp.length2 as inseam,
                sp.hip, sp.fabric1 as sp_fabric1, sp.fabric2 as sp_fabric2,
                sp.image_urls as sp_image_urls, sp.label_image as sp_label_image
            FROM products p
            LEFT JOIN categories c ON p.category = c.id
            LEFT JOIN supplier_products sp ON p.id = sp.product_code
            ${whereClause}
            ORDER BY p.created_at DESC
        `);

        if (products.length === 0) {
            return NextResponse.json({ error: '해당 상품이 없습니다.' }, { status: 404 });
        }

        return buildExcelResponse(products);
    } catch (error: any) {
        console.error('[PlayAuto Export GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function buildExcelResponse(products: any[]) {

        // 플레이오토 양식 헤더 (쇼핑몰상품 시트)
        const headers = [
            '판매자관리코드', '카테고리코드', '온라인 상품명', '판매수량', '판매가',
            '공급가', '원가', '시중가', '옵션조합', '옵션', 'SKU', '배송처코드',
            '옵션 추가금액', '옵션 판매수량', '출고수량', '옵션 무게(kg)', '옵션 상태',
            '입력형 옵션', '추가구매 옵션', '추가구매 옵션 SKU', '추가구매 옵션 배송처코드',
            '추가구매 옵션 추가금액', '추가구매 옵션 판매수량', '추가구매 옵션 출고수량',
            '추가구매 옵션 무게(kg)', '추가구매 옵션 상태', '원산지', '복수원산지 여부',
            '과세여부', '배송방법', '배송비', '기본이미지', '추가이미지1', '추가이미지2',
            '추가이미지3', '추가이미지4', '추가이미지5', '추가이미지6', '추가이미지7',
            '추가이미지8', '추가이미지9', '상세설명', '머리말/꼬리말 템플릿코드',
            '모델명', '브랜드', '제조사', '미성년자 구매', 'UPC/EAN코드', 'ISBN코드',
            '바코드', '키워드', '인증유형', '인증정보', 'HS코드', '사은품', '해외배송 여부',
            '무게', '제조일자', '유효일자', '상품분류코드',
            '상품정보제공고시 1', '상품정보제공고시 2', '상품정보제공고시 3',
            '상품정보제공고시 4', '상품정보제공고시 5', '상품정보제공고시 6',
            '상품정보제공고시 7', '상품정보제공고시 8', '상품정보제공고시 9',
            '상품정보제공고시 10', '상품정보제공고시 11', '상품정보제공고시 12',
            '상품정보제공고시 13', '상품정보제공고시 14', '상품정보제공고시 15',
            '상품정보제공고시 16', '상품정보제공고시 17', '상품정보제공고시 18',
            '상품정보제공고시 19', '상품정보제공고시 20', '상품정보제공고시 21',
            '상품정보제공고시 22', '상품정보제공고시 23', '상품정보제공고시 24',
        ];

        // 상품 데이터 매핑
        const rows = products.map((p: any) => {
            // 공급사 데이터 병합 (실측사이즈, 이미지, 라벨 이미지, 원단 등)
            const prepared = prepareProductWithSupplierData(p);
            const images = prepared.image_url
                ? prepared.image_url.split(',').map((u: string) => u.trim()).filter(Boolean)
                : [];
            const mainImage = images[0] || '';
            const additionalImages = images.slice(1);

            const detailHTML = generateProductDetailHTML(prepared);

            // 브랜드 추출 (상품명에서 영문 브랜드)
            const brandMatch = p.brand || (p.name || '').split(' ')[0] || '';

            return [
                p.id || '',                           // 판매자관리코드
                p.category || '',                     // 카테고리코드
                p.name || '',                         // 온라인 상품명
                1,                                    // 판매수량
                p.price_sell || 0,                    // 판매가
                0,                                    // 공급가
                0,                                    // 원가
                p.price_consumer || p.price_sell || 0, // 시중가
                '옵션없음',                            // 옵션조합
                '옵션없음',                            // 옵션
                '',                                   // SKU
                '',                                   // 배송처코드
                0,                                    // 옵션 추가금액
                '',                                   // 옵션 판매수량
                '',                                   // 출고수량
                0,                                    // 옵션 무게
                '',                                   // 옵션 상태
                '',                                   // 입력형 옵션
                '',                                   // 추가구매 옵션
                '',                                   // 추가구매 옵션 SKU
                '',                                   // 추가구매 옵션 배송처코드
                '',                                   // 추가구매 옵션 추가금액
                '',                                   // 추가구매 옵션 판매수량
                '',                                   // 추가구매 옵션 출고수량
                '',                                   // 추가구매 옵션 무게
                '',                                   // 추가구매 옵션 상태
                '해외=아시아=일본',                     // 원산지
                'N',                                  // 복수원산지 여부
                '과세',                                // 과세여부
                '선결제',                              // 배송방법
                0,                                    // 배송비
                mainImage,                            // 기본이미지
                additionalImages[0] || '',            // 추가이미지1
                additionalImages[1] || '',            // 추가이미지2
                additionalImages[2] || '',            // 추가이미지3
                additionalImages[3] || '',            // 추가이미지4
                additionalImages[4] || '',            // 추가이미지5
                additionalImages[5] || '',            // 추가이미지6
                additionalImages[6] || '',            // 추가이미지7
                additionalImages[7] || '',            // 추가이미지8
                additionalImages[8] || '',            // 추가이미지9
                detailHTML,                           // 상세설명
                '',                                   // 머리말/꼬리말 템플릿코드
                p.id || '',                           // 모델명 (자체상품코드)
                brandMatch,                           // 브랜드
                '',                                   // 제조사
                'Y',                                  // 미성년자 구매
                '',                                   // UPC/EAN코드
                '',                                   // ISBN코드
                '',                                   // 바코드
                '',                                   // 키워드
                '2',                                  // 인증유형
                '',                                   // 인증정보
                '',                                   // HS코드
                '',                                   // 사은품
                '',                                   // 해외배송 여부
                '',                                   // 무게
                '',                                   // 제조일자
                '',                                   // 유효일자
                '',                                   // 상품분류코드
                // 상품정보제공고시 1~24
                '01',                                 // 상품정보제공고시 1 (의류)
                '상세설명참조', '상세설명참조', '상세설명참조',
                '상세설명참조', '상세설명참조', '상세설명참조',
                '상세설명참조', '상세설명참조',
                // 10~24 빈값
                '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
            ];
        });

        // 엑셀 생성
        const wb = XLSX.utils.book_new();
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // 컬럼 너비 설정
        ws['!cols'] = [
            { wch: 15 },  // 판매자관리코드
            { wch: 10 },  // 카테고리코드
            { wch: 50 },  // 온라인 상품명
            { wch: 8 },   // 판매수량
            { wch: 10 },  // 판매가
        ];

        XLSX.utils.book_append_sheet(wb, ws, '쇼핑몰상품');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `playauto_update_${today}_${products.length}건.xlsx`;

        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            },
        });
}
