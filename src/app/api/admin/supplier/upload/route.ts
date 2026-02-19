import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import * as XLSX from 'xlsx';

export const maxDuration = 300;

function parseRow(row: any): any[] {
    const imageUrls: string[] = [];
    for (let i = 1; i <= 11; i++) {
        const key = `상품이미지${i}`;
        if (row[key]) imageUrls.push(row[key]);
    }

    return [
        row['상품코드'] || '',
        row['물류바코드'] || '',
        row['상품명'] || '',
        Number(row['상품가격']) || 0,
        row['브랜드'] || '',
        row['브랜드(한글)'] || '',
        row['상태값'] || '',
        row['표기사이즈'] || '',
        row['추천사이즈'] || '',
        row['계절'] || '',
        row['성별'] || '',
        row['카테고리1'] || '',
        row['카테고리2'] || '',
        row['기장'] || '',
        row['소매기장'] || '',
        row['카테고리번호'] || '',
        row['소재감1'] || '',
        row['소재감2'] || '',
        row['소재'] || '',
        row['디테일'] || '',
        row['스타일'] || '',
        row['색상'] || '',
        row['하자여부'] || 'N',
        row['입고일'] || '',
        row['상품화완료일'] || '',
        row['재고상태'] || '',
        row['판불처리상태'] || '',
        row['판불사유'] || '',
        parseFloat(row['총장1(기본)']) || null,
        parseFloat(row['가슴단면(기본)']) || null,
        parseFloat(row['총장2(기본)']) || null,
        parseFloat(row['허리단면(기본)']) || null,
        parseFloat(row['허벅지(선택)']) || null,
        parseFloat(row['밑단(선택)']) || null,
        parseFloat(row['밑위(선택)']) || null,
        parseFloat(row['힙단면(선택)']) || null,
        parseFloat(row['어깨단면(선택)']) || null,
        parseFloat(row['팔 총장(선택)']) || null,
        parseFloat(row['잡화 세로/높이(기본)']) || null,
        parseFloat(row['잡화 가로(선택)']) || null,
        parseFloat(row['가방 너비(기본)']) || null,
        parseFloat(row['가방 폭(선택)']) || null,
        parseFloat(row['가방 높이(선택)']) || null,
        parseFloat(row['모자 머리둘레(기본)']) || null,
        parseFloat(row['모자 깊이/높이(선택)']) || null,
        parseFloat(row['모자 챙길이(선택)']) || null,
        parseFloat(row['신발 발길이(기본)']) || null,
        parseFloat(row['신발 발목높이(선택)']) || null,
        parseFloat(row['신발 발볼(선택)']) || null,
        parseFloat(row['신발 굽높이(선택)']) || null,
        JSON.stringify(imageUrls),
        row['로고이미지(선택)'] || '',
        row['라벨이미지(선택)'] || '',
    ];
}

const UPSERT_SQL = `
    INSERT INTO supplier_products (
        product_code, barcode, name, price, brand, brand_kr,
        condition_status, labeled_size, recommended_size,
        season, gender, category1, category2,
        length_type, sleeve_type, category_no,
        fabric1, fabric2, fabric_raw,
        detail, style, color, defect,
        received_at, processed_at, stock_status,
        return_status, return_reason,
        length1, chest, length2, waist,
        thigh, hem, rise, hip,
        shoulder, arm_length,
        acc_height, acc_width,
        bag_width, bag_depth, bag_height,
        hat_circumference, hat_depth, hat_brim,
        shoe_length, shoe_ankle, shoe_width, shoe_heel,
        image_urls, logo_image, label_image
    ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
        $51,$52,$53
    )
    ON CONFLICT(product_code) DO UPDATE SET
        barcode=excluded.barcode, name=excluded.name, price=excluded.price,
        brand=excluded.brand, brand_kr=excluded.brand_kr,
        condition_status=excluded.condition_status,
        labeled_size=excluded.labeled_size, recommended_size=excluded.recommended_size,
        season=excluded.season, gender=excluded.gender,
        category1=excluded.category1, category2=excluded.category2,
        length_type=excluded.length_type, sleeve_type=excluded.sleeve_type,
        category_no=excluded.category_no,
        fabric1=excluded.fabric1, fabric2=excluded.fabric2, fabric_raw=excluded.fabric_raw,
        detail=excluded.detail, style=excluded.style, color=excluded.color,
        defect=excluded.defect,
        received_at=excluded.received_at, processed_at=excluded.processed_at,
        stock_status=excluded.stock_status,
        return_status=excluded.return_status, return_reason=excluded.return_reason,
        length1=excluded.length1, chest=excluded.chest, length2=excluded.length2,
        waist=excluded.waist, thigh=excluded.thigh, hem=excluded.hem,
        rise=excluded.rise, hip=excluded.hip,
        shoulder=excluded.shoulder, arm_length=excluded.arm_length,
        acc_height=excluded.acc_height, acc_width=excluded.acc_width,
        bag_width=excluded.bag_width, bag_depth=excluded.bag_depth, bag_height=excluded.bag_height,
        hat_circumference=excluded.hat_circumference, hat_depth=excluded.hat_depth, hat_brim=excluded.hat_brim,
        shoe_length=excluded.shoe_length, shoe_ankle=excluded.shoe_ankle,
        shoe_width=excluded.shoe_width, shoe_heel=excluded.shoe_heel,
        image_urls=excluded.image_urls, logo_image=excluded.logo_image, label_image=excluded.label_image
`;

// POST: 엑셀 파일 업로드 → 파싱만 → 행 데이터 JSON 반환
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
            return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 });
        }

        const parsed: any[][] = [];
        let skipped = 0;
        for (const row of rows) {
            const params = parseRow(row);
            if (!params[0]) { skipped++; continue; }
            parsed.push(params);
        }

        return NextResponse.json({
            success: true,
            total: rows.length,
            parsed: parsed.length,
            skipped,
            rows: parsed,
        });
    } catch (error: any) {
        console.error('[Supplier Upload] Parse error:', error);
        return NextResponse.json({ error: error.message || '파싱 실패' }, { status: 500 });
    }
}

// PUT: 청크 단위 DB 저장 (클라이언트에서 반복 호출)
export async function PUT(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { chunk } = await request.json();
        if (!Array.isArray(chunk) || chunk.length === 0) {
            return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 });
        }

        let processed = 0;
        let errors = 0;

        const statements = chunk.map((params: any[]) => ({
            sql: UPSERT_SQL,
            params,
        }));

        try {
            await db.batch(statements);
            processed = chunk.length;
        } catch {
            for (const params of chunk) {
                try {
                    await db.query(UPSERT_SQL, params);
                    processed++;
                } catch {
                    errors++;
                }
            }
        }

        return NextResponse.json({ success: true, processed, errors });
    } catch (error: any) {
        console.error('[Supplier Process] Error:', error);
        return NextResponse.json({ error: error.message || '처리 실패' }, { status: 500 });
    }
}
