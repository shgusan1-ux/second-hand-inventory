import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { generateProductDetailHTML, prepareProductWithSupplierData } from '@/lib/product-detail-generator';
import * as XLSX from 'xlsx';

export const maxDuration = 60;

// 카테고리 참조 시트 데이터
const CATEGORY_SHEET_DATA = [
    ['카테고리 코드', '분류', '카테고리명'],
    [468327, '유니크', '악세사리'], [468326, '유니크', '팬츠'],
    [468325, '유니크', '티셔츠/맨투맨'], [468324, '유니크', '니트/가디건'],
    [468323, '유니크', '셔츠'], [468322, '유니크', '아우터'],
    [468317, '악세사리', '벨트 및 기타'], [468316, '악세사리', '신발'],
    [468315, '악세사리', '타월'], [468314, '악세사리', '양말'],
    [468313, '악세사리', '모자'], [468312, '악세사리', '가방'],
    [468311, '악세사리', '머플러,스카프,행거치프'], [468310, '악세사리', '넥타이'],
    [468302, 'KIDS', '악세사리'], [468300, 'KIDS', '스커트'],
    [468299, 'KIDS', '원피스'], [468298, 'KIDS', '데님팬츠'],
    [468297, 'KIDS', '팬츠'], [468296, 'KIDS', '셔츠'],
    [468295, 'KIDS', '티셔츠'], [468293, 'KIDS', '맨투맨/후드맨투맨'],
    [468292, 'KIDS', '가디건'], [468291, 'KIDS', '니트'],
    [468289, 'KIDS', '후드집업/후리스'], [468288, 'KIDS', '아우터'],
    [468281, 'WOMAN', '데님팬츠'], [468280, 'WOMAN', '팬츠'],
    [468279, 'WOMAN', '스커트'], [468278, 'WOMAN', '원피스'],
    [468277, 'WOMAN', '후드/맨투맨'], [468276, 'WOMAN', '니트/가디건'],
    [468275, 'WOMAN', '티셔츠'], [468274, 'WOMAN', '블라우스'],
    [468273, 'WOMAN', '셔츠'], [468272, 'WOMAN', '코트'],
    [468271, 'WOMAN', '아우터'], [468270, 'MAN', '데님팬츠'],
    [468269, 'MAN', '1/2 팬츠'], [468264, 'MAN', '팬츠'],
    [468263, 'MAN', '1/2 셔츠'], [468259, 'MAN', '데님셔츠'],
    [468258, 'MAN', '셔츠'], [468257, 'MAN', '1/2 티셔츠'],
    [468253, 'MAN', '티셔츠'], [468252, 'MAN', '맨투맨'],
    [468251, 'MAN', '가디건'], [468250, 'MAN', '니트'],
    [468249, 'MAN', '스포츠'], [468248, 'MAN', '후드집업/후리스'],
    [468247, 'MAN', '블레이저'], [468244, 'MAN', '데님자켓'],
    [468243, 'MAN', '패딩'], [468242, 'MAN', '사파리'],
    [468241, 'MAN', '아우터'], [468234, 'MAN', '코트'],
];

// POST: 선택한 상품 ID 목록으로 신규등록 엑셀 다운로드
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

        return buildNewExcelResponse(products);
    } catch (error: any) {
        console.error('[PlayAuto New Export POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function buildNewExcelResponse(products: any[]) {
    // 플레이오토 신규등록 양식 헤더 (쇼핑몰상품 시트)
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
        '무게', '제조일자', '유효일자',
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
        const prepared = prepareProductWithSupplierData(p);
        const images = prepared.image_url
            ? prepared.image_url.split(',').map((u: string) => u.trim()).filter(Boolean)
            : [];
        const mainImage = images[0] || '';
        const additionalImages = images.slice(1);

        const detailHTML = generateProductDetailHTML(prepared);

        return [
            p.id || '',                             // 판매자관리코드
            p.category || '',                       // 카테고리코드 (DB)
            p.name || '',                           // 온라인 상품명
            1,                                      // 판매수량
            p.price_sell || 0,                      // 판매가
            0,                                      // 공급가
            0,                                      // 원가
            p.price_consumer || p.price_sell || 0,  // 시중가
            '옵션없음',                              // 옵션조합
            '옵션없음',                              // 옵션
            '',                                     // SKU
            '',                                     // 배송처코드
            0,                                      // 옵션 추가금액
            '',                                     // 옵션 판매수량
            '',                                     // 출고수량
            '',                                     // 옵션 무게
            '',                                     // 옵션 상태
            '',                                     // 입력형 옵션
            '',                                     // 추가구매 옵션
            '',                                     // 추가구매 옵션 SKU
            '',                                     // 추가구매 옵션 배송처코드
            '',                                     // 추가구매 옵션 추가금액
            '',                                     // 추가구매 옵션 판매수량
            '',                                     // 추가구매 옵션 출고수량
            '',                                     // 추가구매 옵션 무게
            '',                                     // 추가구매 옵션 상태
            '해외=아시아=일본',                       // 원산지
            'N',                                    // 복수원산지 여부
            '과세',                                  // 과세여부
            '선결제',                                // 배송방법
            0,                                      // 배송비
            mainImage,                              // 기본이미지
            additionalImages[0] || '',              // 추가이미지1
            additionalImages[1] || '',              // 추가이미지2
            additionalImages[2] || '',              // 추가이미지3
            additionalImages[3] || '',              // 추가이미지4
            additionalImages[4] || '',              // 추가이미지5
            additionalImages[5] || '',              // 추가이미지6
            additionalImages[6] || '',              // 추가이미지7
            additionalImages[7] || '',              // 추가이미지8
            additionalImages[8] || '',              // 추가이미지9
            detailHTML,                             // 상세설명
            '',                                     // 머리말/꼬리말 템플릿코드
            p.id || '',                             // 모델명 (자체상품코드)
            p.brand || '',                          // 브랜드 (상품 브랜드)
            '',                                     // 제조사
            'Y',                                    // 미성년자 구매
            '',                                     // UPC/EAN코드
            '',                                     // ISBN코드
            '',                                     // 바코드
            '',                                     // 키워드
            '2',                                    // 인증유형
            '',                                     // 인증정보
            '',                                     // HS코드
            '',                                     // 사은품
            '',                                     // 해외배송 여부
            '',                                     // 무게
            '',                                     // 제조일자
            '',                                     // 유효일자
            // 상품정보제공고시 1~24
            '01',                                   // 상품정보제공고시 1 (의류)
            '상세설명참조', '상세설명참조', '상세설명참조',
            '상세설명참조', '상세설명참조', '상세설명참조',
            '상세설명참조', '상세설명참조',
            // 10~24 빈값
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        ];
    });

    // 엑셀 생성 (멀티시트)
    const wb = XLSX.utils.book_new();

    // 1. 쇼핑몰상품 시트
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 15 },  // 판매자관리코드
        { wch: 12 },  // 카테고리코드
        { wch: 50 },  // 온라인 상품명
        { wch: 8 },   // 판매수량
        { wch: 10 },  // 판매가
    ];
    XLSX.utils.book_append_sheet(wb, ws, '쇼핑몰상품');

    // 2. 카테고리 참조 시트
    const catWs = XLSX.utils.aoa_to_sheet(CATEGORY_SHEET_DATA);
    catWs['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, catWs, '카테고리');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `playauto_new_${today}_${products.length}건.xlsx`;

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
    });
}
