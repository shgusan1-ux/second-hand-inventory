import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import * as XLSX from 'xlsx';

// 엑셀 컬럼명 → DB 컬럼 매핑
function parseRow(row: any) {
    // 이미지 URL 수집 (1~11)
    const imageUrls: string[] = [];
    for (let i = 1; i <= 11; i++) {
        const key = `상품이미지${i}`;
        if (row[key]) imageUrls.push(row[key]);
    }

    return {
        product_code: row['상품코드'] || '',
        barcode: row['물류바코드'] || '',
        name: row['상품명'] || '',
        price: Number(row['상품가격']) || 0,
        brand: row['브랜드'] || '',
        brand_kr: row['브랜드(한글)'] || '',
        condition_status: row['상태값'] || '',
        labeled_size: row['표기사이즈'] || '',
        recommended_size: row['추천사이즈'] || '',
        season: row['계절'] || '',
        gender: row['성별'] || '',
        category1: row['카테고리1'] || '',
        category2: row['카테고리2'] || '',
        length_type: row['기장'] || '',
        sleeve_type: row['소매기장'] || '',
        category_no: row['카테고리번호'] || '',
        fabric1: row['소재감1'] || '',
        fabric2: row['소재감2'] || '',
        fabric_raw: row['소재'] || '',
        detail: row['디테일'] || '',
        style: row['스타일'] || '',
        color: row['색상'] || '',
        defect: row['하자여부'] || 'N',
        received_at: row['입고일'] || '',
        processed_at: row['상품화완료일'] || '',
        stock_status: row['재고상태'] || '',
        return_status: row['판불처리상태'] || '',
        return_reason: row['판불사유'] || '',
        // 의류 실측
        length1: parseFloat(row['총장1(기본)']) || null,
        chest: parseFloat(row['가슴단면(기본)']) || null,
        length2: parseFloat(row['총장2(기본)']) || null,
        waist: parseFloat(row['허리단면(기본)']) || null,
        thigh: parseFloat(row['허벅지(선택)']) || null,
        hem: parseFloat(row['밑단(선택)']) || null,
        rise: parseFloat(row['밑위(선택)']) || null,
        hip: parseFloat(row['힙단면(선택)']) || null,
        shoulder: parseFloat(row['어깨단면(선택)']) || null,
        arm_length: parseFloat(row['팔 총장(선택)']) || null,
        // 잡화/가방/모자/신발
        acc_height: parseFloat(row['잡화 세로/높이(기본)']) || null,
        acc_width: parseFloat(row['잡화 가로(선택)']) || null,
        bag_width: parseFloat(row['가방 너비(기본)']) || null,
        bag_depth: parseFloat(row['가방 폭(선택)']) || null,
        bag_height: parseFloat(row['가방 높이(선택)']) || null,
        hat_circumference: parseFloat(row['모자 머리둘레(기본)']) || null,
        hat_depth: parseFloat(row['모자 깊이/높이(선택)']) || null,
        hat_brim: parseFloat(row['모자 챙길이(선택)']) || null,
        shoe_length: parseFloat(row['신발 발길이(기본)']) || null,
        shoe_ankle: parseFloat(row['신발 발목높이(선택)']) || null,
        shoe_width: parseFloat(row['신발 발볼(선택)']) || null,
        shoe_heel: parseFloat(row['신발 굽높이(선택)']) || null,
        // 이미지
        image_urls: JSON.stringify(imageUrls),
        logo_image: row['로고이미지(선택)'] || '',
        label_image: row['라벨이미지(선택)'] || '',
    };
}

export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

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

        let inserted = 0;
        let updated = 0;
        let errors = 0;

        // 배치 처리 (50개씩)
        const batchSize = 50;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            for (const row of batch) {
                try {
                    const data = parseRow(row);
                    if (!data.product_code) {
                        errors++;
                        continue;
                    }

                    // UPSERT: 있으면 업데이트, 없으면 삽입
                    const { rows: existing } = await db.query(
                        'SELECT product_code FROM supplier_products WHERE product_code = $1',
                        [data.product_code]
                    );

                    if (existing.length > 0) {
                        await db.query(`
                            UPDATE supplier_products SET
                                barcode=$2, name=$3, price=$4, brand=$5, brand_kr=$6,
                                condition_status=$7, labeled_size=$8, recommended_size=$9,
                                season=$10, gender=$11, category1=$12, category2=$13,
                                length_type=$14, sleeve_type=$15, category_no=$16,
                                fabric1=$17, fabric2=$18, fabric_raw=$19,
                                detail=$20, style=$21, color=$22, defect=$23,
                                received_at=$24, processed_at=$25, stock_status=$26,
                                return_status=$27, return_reason=$28,
                                length1=$29, chest=$30, length2=$31, waist=$32,
                                thigh=$33, hem=$34, rise=$35, hip=$36,
                                shoulder=$37, arm_length=$38,
                                acc_height=$39, acc_width=$40,
                                bag_width=$41, bag_depth=$42, bag_height=$43,
                                hat_circumference=$44, hat_depth=$45, hat_brim=$46,
                                shoe_length=$47, shoe_ankle=$48, shoe_width=$49, shoe_heel=$50,
                                image_urls=$51, logo_image=$52, label_image=$53
                            WHERE product_code=$1
                        `, [
                            data.product_code, data.barcode, data.name, data.price,
                            data.brand, data.brand_kr, data.condition_status,
                            data.labeled_size, data.recommended_size, data.season,
                            data.gender, data.category1, data.category2,
                            data.length_type, data.sleeve_type, data.category_no,
                            data.fabric1, data.fabric2, data.fabric_raw,
                            data.detail, data.style, data.color, data.defect,
                            data.received_at, data.processed_at, data.stock_status,
                            data.return_status, data.return_reason,
                            data.length1, data.chest, data.length2, data.waist,
                            data.thigh, data.hem, data.rise, data.hip,
                            data.shoulder, data.arm_length,
                            data.acc_height, data.acc_width,
                            data.bag_width, data.bag_depth, data.bag_height,
                            data.hat_circumference, data.hat_depth, data.hat_brim,
                            data.shoe_length, data.shoe_ankle, data.shoe_width, data.shoe_heel,
                            data.image_urls, data.logo_image, data.label_image,
                        ]);
                        updated++;
                    } else {
                        await db.query(`
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
                        `, [
                            data.product_code, data.barcode, data.name, data.price,
                            data.brand, data.brand_kr, data.condition_status,
                            data.labeled_size, data.recommended_size, data.season,
                            data.gender, data.category1, data.category2,
                            data.length_type, data.sleeve_type, data.category_no,
                            data.fabric1, data.fabric2, data.fabric_raw,
                            data.detail, data.style, data.color, data.defect,
                            data.received_at, data.processed_at, data.stock_status,
                            data.return_status, data.return_reason,
                            data.length1, data.chest, data.length2, data.waist,
                            data.thigh, data.hem, data.rise, data.hip,
                            data.shoulder, data.arm_length,
                            data.acc_height, data.acc_width,
                            data.bag_width, data.bag_depth, data.bag_height,
                            data.hat_circumference, data.hat_depth, data.hat_brim,
                            data.shoe_length, data.shoe_ankle, data.shoe_width, data.shoe_heel,
                            data.image_urls, data.logo_image, data.label_image,
                        ]);
                        inserted++;
                    }
                } catch (e: any) {
                    console.error('[Supplier Upload] Row error:', e.message);
                    errors++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            total: rows.length,
            inserted,
            updated,
            errors,
        });
    } catch (error: any) {
        console.error('[Supplier Upload API] Error:', error);
        return NextResponse.json({ error: error.message || '업로드 실패' }, { status: 500 });
    }
}
